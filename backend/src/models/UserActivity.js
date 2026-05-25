import mongoose from "mongoose";

const userActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        "login_success",
        "login_challenge",
        "login_failed",
        "security_action",
      ],
      required: true,
      default: "login_success",
    },
    authMethod: {
      type: String,
      enum: ["password", "two_factor", "google", "refresh", "unknown"],
      default: "unknown",
    },
    ipAddress: { type: String, default: "unknown" },
    ipMasked: { type: String, default: "unknown" },
    ipHash: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    deviceFingerprint: { type: String, default: "" },
    device: {
      browser: { type: String, default: "Unknown" },
      os: { type: String, default: "Unknown" },
      deviceType: {
        type: String,
        enum: ["mobile", "tablet", "desktop", "bot", "unknown"],
        default: "unknown",
      },
    },
    location: {
      country: { type: String, default: "Unknown" },
      region: { type: String, default: "Unknown" },
      city: { type: String, default: "Unknown" },
      source: { type: String, default: "headers" },
    },
    isNewDevice: { type: Boolean, default: false },
    trusted: { type: Boolean, default: false },
    suspicious: { type: Boolean, default: false },
    reviewedAt: Date,
    reviewedAction: {
      type: String,
      enum: ["mark_safe", "report_suspicious", "lock_account"],
      default: null,
    },
    reviewedNote: { type: String, default: "" },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

userActivitySchema.index({ user: 1, createdAt: -1 });
userActivitySchema.index({ user: 1, deviceFingerprint: 1, createdAt: -1 });
userActivitySchema.index({ user: 1, suspicious: 1, createdAt: -1 });

export default mongoose.model("UserActivity", userActivitySchema);
