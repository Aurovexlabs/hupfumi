import jwt from "jsonwebtoken";
import sanitizeHtml from "sanitize-html";
import { Server } from "socket.io";
import Message, { Conversation } from "../models/Message.js";
import User from "../models/User.js";

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "hupfumi_access_secret_dev";
const onlineUsers = new Map(); // userId → socketId
const CLIENT_ORIGINS = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const sanitizeText = (text) =>
  sanitizeHtml(String(text ?? ""), {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();

export function initSocketIO(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        if (!origin || CLIENT_ORIGINS.includes(origin)) return cb(null, true);
        return cb(new Error("CORS origin denied"));
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];
      if (!token) return next(new Error("Unauthorized"));
      const { id } = jwt.verify(token, ACCESS_SECRET);
      const user = await User.findById(id)
        .select("fullName username avatar availabilityStatus")
        .lean();
      if (!user) return next(new Error("User not found"));
      socket.userId = String(id);
      socket.userDoc = user;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const uid = socket.userId;
    onlineUsers.set(uid, socket.id);
    socket.broadcast.emit("user:online", { userId: uid });
    console.log(`${socket.userDoc.fullName} connected`);

    // Join personal room for notifications
    socket.join(`user:${uid}`);

    // ── Conversation ──────────────────────────────────────────
    socket.on("conversation:join", ({ conversationId }) => {
      if (conversationId) socket.join(`convo:${conversationId}`);
    });
    socket.on("conversation:leave", ({ conversationId }) => {
      if (conversationId) socket.leave(`convo:${conversationId}`);
    });

    // ── Messages ──────────────────────────────────────────────
    socket.on(
      "message:send",
      async ({ conversationId, text, attachments = [] }) => {
        try {
          const safeText = sanitizeText(text);
          if (!conversationId || !safeText) return;
          const convo = await Conversation.findOne({
            _id: conversationId,
            participants: uid,
          });
          if (!convo) return;

          const msg = await Message.create({
            conversation: conversationId,
            sender: uid,
            text: safeText,
            attachments,
          });

          const populated = await msg.populate(
            "sender",
            "fullName username avatar",
          );

          // Update conversation
          const otherIds = convo.participants.filter((p) => String(p) !== uid);
          const unreadIncrements = {};
          otherIds.forEach((oid) => {
            unreadIncrements[`unreadCounts.${oid}`] = 1;
          });

          await Conversation.findByIdAndUpdate(
            conversationId,
            {
              $set: {
                lastMessage: msg._id,
                lastMessagePreview: safeText.slice(0, 80),
                lastMessageAt: new Date(),
              },
              ...(Object.keys(unreadIncrements).length > 0
                ? { $inc: unreadIncrements }
                : {}),
            },
            { new: false },
          );

          // Broadcast message to everyone in the conversation
          io.to(`convo:${conversationId}`).emit("message:new", populated);

          // Notify offline participants
          for (const oid of otherIds) {
            io.to(`user:${oid}`).emit("notification:new", {
              type: "message",
              title: `New message from ${socket.userDoc.fullName}`,
              body: safeText.slice(0, 100),
              link: "/messages",
            });
          }
        } catch (err) {
          socket.emit("error", { message: err.message });
        }
      },
    );

    // ── Typing ────────────────────────────────────────────────
    socket.on("typing:start", ({ conversationId }) => {
      if (conversationId)
        socket
          .to(`convo:${conversationId}`)
          .emit("typing:start", { conversationId, userId: uid });
    });
    socket.on("typing:stop", ({ conversationId }) => {
      if (conversationId)
        socket
          .to(`convo:${conversationId}`)
          .emit("typing:stop", { conversationId, userId: uid });
    });

    // ── Read receipts ─────────────────────────────────────────
    socket.on("messages:read", async ({ conversationId }) => {
      try {
        if (!conversationId) return;
        await Message.updateMany(
          { conversation: conversationId, sender: { $ne: uid }, isRead: false },
          { $set: { isRead: true } },
        );
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: { [`unreadCounts.${uid}`]: 0 },
        });
        socket
          .to(`convo:${conversationId}`)
          .emit("messages:read", { conversationId, readBy: uid });
      } catch {}
    });

    // ── Disconnect ────────────────────────────────────────────
    socket.on("disconnect", () => {
      onlineUsers.delete(uid);
      socket.broadcast.emit("user:offline", { userId: uid });
      console.log(`${socket.userDoc.fullName} disconnected`);
    });
  });

  return io;
}

export const getIO = () => global._io;
