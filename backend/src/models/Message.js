import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  participants:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastMessage:        { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  lastMessagePreview: String,
  lastMessageAt:      Date,
  unreadCounts:       { type: Map, of: Number, default: {} },
  relatedOrder:       { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
}, { timestamps: true });

conversationSchema.index({ participants: 1 });

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:         String,
  attachments:  [{ url: String, name: String, type: String }],
  isRead:       { type: Boolean, default: false },
  isDeleted:    { type: Boolean, default: false },
  readBy:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
export default mongoose.model('Message', messageSchema);
