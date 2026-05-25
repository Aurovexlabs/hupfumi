import mongoose from "mongoose";

const opportunityRadarEventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    source: {
      type: String,
      default: "dashboard_radar",
      maxlength: 40,
    },
    action: {
      type: String,
      enum: ["view", "click", "conversion"],
      required: true,
      index: true,
    },
    itemType: {
      type: String,
      enum: ["job", "service", "product"],
      required: true,
      index: true,
    },
    itemId: {
      type: String,
      required: true,
      maxlength: 120,
    },
    category: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 80,
    },
    position: {
      type: Number,
      min: 0,
      max: 500,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

opportunityRadarEventSchema.index({ createdAt: -1 });
opportunityRadarEventSchema.index({ itemType: 1, category: 1, action: 1 });

export default mongoose.model(
  "OpportunityRadarEvent",
  opportunityRadarEventSchema,
);
