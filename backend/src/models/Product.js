import mongoose from "mongoose";
import slugify from "slugify";

const productSchema = new mongoose.Schema(
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
    price: { type: Number, required: true, min: 0 },
    condition: {
      type: String,
      enum: ["new", "used", "refurbished"],
      default: "new",
    },
    images: [{ url: String, fileId: String }],
    inventory: { quantity: { type: Number, default: 0 }, sku: String },
    discount: {
      type: { type: String, enum: ["percent", "fixed"] },
      value: Number,
      expiresAt: Date,
    },
    location: { city: String, province: String },
    status: {
      type: String,
      enum: ["draft", "active", "sold", "paused", "suspended"],
      default: "active",
    },
    featured: { type: Boolean, default: false },
    stats: {
      views: { type: Number, default: 0 },
      sales: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
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

productSchema.pre("save", async function () {
  if (this.isNew || this.isModified("title")) {
    const base = slugify(this.title, { lower: true, strict: true });
    let slug = base,
      i = 1;
    while (
      await mongoose.model("Product").exists({ slug, _id: { $ne: this._id } })
    ) {
      slug = `${base}-${i++}`;
    }
    this.slug = slug;
  }
});

productSchema.index({ title: "text", description: "text" });
productSchema.index({ seller: 1, status: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ "moderation.status": 1, createdAt: -1 });

export default mongoose.model("Product", productSchema);
