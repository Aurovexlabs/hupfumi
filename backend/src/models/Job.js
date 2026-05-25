import mongoose from "mongoose";
import slugify from "slugify";

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    jobType: { type: String, enum: ["fixed", "hourly"], required: true },
    budget: {
      min: Number,
      max: Number,
      currency: { type: String, default: "USD" },
    },
    skills: [String],
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "completed", "closed", "cancelled"],
      default: "open",
    },
    featured: { type: Boolean, default: false },
    featuredUntil: Date,
    deadline: Date,
    location: {
      type: {
        type: String,
        enum: ["remote", "onsite", "hybrid"],
        default: "remote",
      },
      city: String,
      province: String,
    },
    attachments: [{ name: String, url: String }],
    applicantsCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
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

jobSchema.pre("save", async function () {
  if (this.isNew || this.isModified("title")) {
    const base = slugify(this.title, { lower: true, strict: true });
    let slug = base,
      i = 1;
    while (
      await mongoose.model("Job").exists({ slug, _id: { $ne: this._id } })
    ) {
      slug = `${base}-${i++}`;
    }
    this.slug = slug;
  }
});

jobSchema.index({ title: "text", description: "text" });
jobSchema.index({ employer: 1, status: 1 });
jobSchema.index({ category: 1, status: 1 });
jobSchema.index({ featured: 1, status: 1 });
jobSchema.index({ "moderation.status": 1, createdAt: -1 });

export default mongoose.model("Job", jobSchema);
