import Message, { Conversation } from "../models/Message.js";
import User from "../models/User.js";
import { ensure } from "../utils/appError.js";

export const listConversations = async (userId) => {
  return Conversation.find({ participants: userId })
    .sort("-lastMessageAt")
    .populate("participants", "fullName username avatar availabilityStatus")
    .lean();
};

export const listConversationMessages = async (userId, conversationId) => {
  const convo = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });
  ensure(convo, "Conversation not found", 404);

  return Message.find({ conversation: conversationId })
    .sort("createdAt")
    .populate("sender", "fullName username avatar")
    .lean();
};

export const startConversation = async (userId, otherUserId) => {
  ensure(
    String(userId) !== String(otherUserId),
    "Cannot message yourself",
    400,
  );

  const recipient = await User.findOne({
    _id: otherUserId,
    isEmailVerified: true,
    accountStatus: "active",
  })
    .select("_id")
    .lean();

  ensure(recipient, "Recipient not available", 404);

  let convo = await Conversation.findOne({
    participants: { $all: [userId, otherUserId], $size: 2 },
  });

  if (!convo) {
    convo = await Conversation.create({ participants: [userId, otherUserId] });
  }

  return convo;
};

export const sendMessage = async (userId, conversationId, text) => {
  const convo = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
  });
  ensure(convo, "Conversation not found", 404);

  const trimmed = text.trim();
  ensure(trimmed.length > 0, "Message text is required", 400);

  const msg = await Message.create({
    conversation: conversationId,
    sender: userId,
    text: trimmed,
  });

  const populated = await msg.populate("sender", "fullName username avatar");

  const recipients = (convo.participants || [])
    .map((entry) => String(entry))
    .filter((entry) => entry !== String(userId));

  const unreadIncrements = {};
  recipients.forEach((recipientId) => {
    unreadIncrements[`unreadCounts.${recipientId}`] = 1;
  });

  await Conversation.findByIdAndUpdate(
    conversationId,
    {
      $set: {
        lastMessage: msg._id,
        lastMessagePreview: trimmed.slice(0, 80),
        lastMessageAt: new Date(),
      },
      ...(Object.keys(unreadIncrements).length > 0
        ? { $inc: unreadIncrements }
        : {}),
    },
    { new: false },
  );

  return {
    message: populated.toObject ? populated.toObject() : populated,
    recipients,
    preview: trimmed.slice(0, 80),
  };
};
