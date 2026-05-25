import mongoose from "mongoose";

const txSchema = new mongoose.Schema(
  {
    reference: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "deposit",
        "withdrawal",
        "payment",
        "payout",
        "refund",
        "fee",
        "bonus",
        "escrow_hold",
        "escrow_release",
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    fee: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "cancelled"],
      default: "pending",
    },
    description: String,
    paymentMethod: String,
    provider: {
      type: String,
      enum: ["manual", "paynow", "wallet", "system"],
      default: "manual",
    },
    providerReference: String,
    pollUrl: String,
    externalStatus: String,
    metadata: mongoose.Schema.Types.Mixed,
    lastCheckedAt: Date,
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    completedAt: Date,
  },
  { timestamps: true },
);

txSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Transaction", txSchema);
