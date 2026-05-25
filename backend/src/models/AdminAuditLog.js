import mongoose from "mongoose";

const adminAuditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorRole: { type: String, default: "admin" },
    action: { type: String, required: true, index: true },
    targetType: { type: String, default: "user" },
    targetId: { type: String, default: "" },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reason: { type: String, default: "" },
    requestId: { type: String, default: "" },
    ipAddress: { type: String, default: "unknown" },
    ipMasked: { type: String, default: "unknown" },
    userAgent: { type: String, default: "" },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model("AdminAuditLog", adminAuditLogSchema);
