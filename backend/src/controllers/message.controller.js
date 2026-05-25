import { z } from "zod";
import {
  listConversationMessages,
  listConversations,
  sendMessage,
  startConversation,
} from "../services/message.service.js";
import { handleControllerError } from "../utils/controller.js";
import { fail, ok } from "../utils/response.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const startSchema = z.object({
  userId: objectIdSchema,
});

const sendSchema = z.object({
  text: z.string().trim().min(1),
});

export const getConversations = async (req, res) => {
  try {
    const convos = await listConversations(req.user._id);
    return ok(res, { data: convos });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getConversationMessages = async (req, res) => {
  try {
    const parsed = objectIdSchema.safeParse(req.params.id);
    if (!parsed.success) return fail(res, "Conversation not found", 404);

    const messages = await listConversationMessages(req.user._id, parsed.data);
    return ok(res, { data: messages });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postStartConversation = async (req, res) => {
  try {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "userId required", 400);

    const convo = await startConversation(req.user._id, parsed.data.userId);
    return ok(res, convo, "Conversation ready");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postSendMessage = async (req, res) => {
  try {
    const idParsed = objectIdSchema.safeParse(req.params.id);
    if (!idParsed.success) return fail(res, "Conversation not found", 404);

    const bodyParsed = sendSchema.safeParse(req.body);
    if (!bodyParsed.success) return fail(res, "Text required", 400);

    const result = await sendMessage(
      req.user._id,
      idParsed.data,
      bodyParsed.data.text,
    );

    const io = global._io;
    if (io) {
      io.to(`convo:${idParsed.data}`).emit("message:new", result.message);

      for (const recipientId of result.recipients || []) {
        io.to(`user:${recipientId}`).emit("notification:new", {
          type: "message",
          title: `New message from ${req.user.fullName}`,
          body: String(result.preview || "").slice(0, 100),
          link: "/messages",
        });
      }
    }

    return ok(res, result.message, "Message sent");
  } catch (error) {
    return handleControllerError(res, error);
  }
};
