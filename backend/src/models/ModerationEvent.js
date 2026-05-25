import mongoose from "mongoose";

const moderationEventSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ["job", "service", "product"],
      required: true,
      index: true,
    },
    entityId: { type: String, required: true, index: true },
    contentOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    origin: {
      type: String,
      enum: ["system", "admin", "user"],
      default: "system",
      index: true,
    },
    action: {
      type: String,
      enum: ["flagged", "blocked", "approved", "removed", "restored"],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
      index: true,
    },
    score: { type: Number, default: 0 },
    reasons: [{ type: String, trim: true }],
    snapshot: {
      title: { type: String, default: "" },
      category: { type: String, default: "" },
      excerpt: { type: String, default: "" },
    },
    note: { type: String, default: "" },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true },
);

moderationEventSchema.index({ createdAt: -1 });
moderationEventSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export default mongoose.model("ModerationEvent", moderationEventSchema);
