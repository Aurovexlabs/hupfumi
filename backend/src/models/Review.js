import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    refType: { type: String, enum: ["service", "product", "job"] },
    refId: mongoose.Schema.Types.ObjectId,
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, minlength: 10 },
    isVisible: { type: Boolean, default: true },
    editedAt: Date,
    helpfulCount: { type: Number, default: 0 },
    helpfulBy: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", select: false },
    ],
    response: {
      text: String,
      respondedAt: Date,
      responder: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  },
  { timestamps: true },
);

reviewSchema.index({ reviewee: 1, isVisible: 1 });
reviewSchema.index({ refId: 1, refType: 1 });
reviewSchema.index({ helpfulCount: -1, createdAt: -1 });
reviewSchema.index({ order: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);
