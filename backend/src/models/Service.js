import mongoose from "mongoose";
import slugify from "slugify";

const pricingTierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      enum: ["basic", "standard", "premium"],
      required: true,
    },
    title: String,
    description: String,
    price: { type: Number, required: true, min: 1 },
    deliveryDays: { type: Number, required: true, min: 1 },
    revisions: { type: Number, default: 1 },
    features: [String],
  },
  { _id: false },
);

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pricing: [pricingTierSchema],
    gallery: [{ url: String, fileId: String, caption: String }],
    tags: [String],
    faqs: [{ question: String, answer: String }],
    status: {
      type: String,
      enum: ["draft", "active", "paused", "suspended"],
      default: "active",
    },
    featured: { type: Boolean, default: false },
    featuredUntil: Date,
    stats: {
      views: { type: Number, default: 0 },
      orders: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
    },
    moderation: {
      status: {
        type: String,
        enum: ["approved", "pending_review", "blocked"],
        default: "approved",
      },
      score: { type: Number, default: 0 },
      reasons: [String],
      lastScannedAt: Date,
      flaggedAt: Date,
      reviewedAt: Date,
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
  },
  { timestamps: true },
);

serviceSchema.pre("save", async function () {
  if (this.isNew || this.isModified("title")) {
    const base = slugify(this.title, { lower: true, strict: true });
    let slug = base,
      i = 1;
    while (
      await mongoose.model("Service").exists({ slug, _id: { $ne: this._id } })
    ) {
      slug = `${base}-${i++}`;
    }
    this.slug = slug;
  }
});

serviceSchema.index({ title: "text", description: "text", tags: "text" });
serviceSchema.index({ seller: 1, status: 1 });
serviceSchema.index({ category: 1, status: 1 });
serviceSchema.index({ "stats.averageRating": -1 });
serviceSchema.index({ "moderation.status": 1, createdAt: -1 });

export default mongoose.model("Service", serviceSchema);
