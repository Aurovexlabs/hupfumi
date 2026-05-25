import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    orderType: {
      type: String,
      enum: ["service", "product", "job"],
      required: true,
    },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    pricingTier: String,
    requirements: String,
    items: [
      {
        title: String,
        price: Number,
        quantity: { type: Number, default: 1 },
        subtotal: Number,
        image: String,
      },
    ],
    subtotal: { type: Number, required: true },
    platformFee: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "in_progress",
        "delivered",
        "revision_requested",
        "completed",
        "cancelled",
        "refunded",
        "disputed",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "processing", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["wallet", "paynow", "ecocash", "onemoney", "bank"],
    },
    paymentRef: String,
    dueDate: Date,
    deliveredAt: Date,
    completedAt: Date,
    cancelledAt: Date,
    statusHistory: [
      {
        status: String,
        note: String,
        timestamp: { type: Date, default: Date.now },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    disputeAudit: [
      {
        previousStatus: String,
        resolution: {
          type: String,
          enum: ["in_progress", "completed", "cancelled", "refunded"],
        },
        note: String,
        resolvedAt: { type: Date, default: Date.now },
        resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        resolvedByRole: {
          type: String,
          enum: ["admin", "superadmin", "system"],
          default: "admin",
        },
      },
    ],
    revision: { count: { type: Number, default: 0 }, notes: [String] },
    review: { type: mongoose.Schema.Types.ObjectId, ref: "Review" },
  },
  { timestamps: true },
);

orderSchema.pre("save", async function () {
  if (this.isNew && !this.orderNumber) {
    const prefix =
      this.orderType === "service"
        ? "SVC"
        : this.orderType === "product"
          ? "PRD"
          : "JOB";
    const count = await mongoose.model("Order").countDocuments();
    this.orderNumber = `${prefix}-${String(count + 1).padStart(6, "0")}`;
  }
});

orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ seller: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

export default mongoose.model("Order", orderSchema);
