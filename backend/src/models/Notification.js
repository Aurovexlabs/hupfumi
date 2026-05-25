import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "order_new",
        "order_update",
        "payment",
        "message",
        "review",
        "kyc",
        "system",
        "promotion",
        "security",
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    link: String,
    isRead: { type: Boolean, default: false },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
