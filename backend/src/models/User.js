import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const listingWorkspaceNoteSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["job", "product", "service"],
      required: true,
    },
    listingId: { type: String, required: true, trim: true },
    note: { type: String, default: "" },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const workspaceCompareItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    price: { type: Number, default: 0 },
    originalPrice: Number,
    condition: String,
    category: String,
    rating: Number,
    stock: Number,
    imageUrl: String,
    sellerName: String,
  },
  { _id: false },
);

const workspaceSchema = new mongoose.Schema(
  {
    listingNotes: { type: [listingWorkspaceNoteSchema], default: [] },
    productCompare: { type: [workspaceCompareItemSchema], default: [] },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, select: false },
    avatar: String,
    avatarFileId: String,
    bio: String,
    skills: [String],
    workspace: {
      type: workspaceSchema,
      default: () => ({
        listingNotes: [],
        productCompare: [],
        updatedAt: new Date(),
      }),
      select: false,
    },
    profileType: {
      type: String,
      enum: ["individual", "freelancer", "business"],
      default: "individual",
    },
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    accountStatus: {
      type: String,
      enum: ["pending", "active", "suspended", "banned"],
      default: "pending",
    },
    isEmailVerified: { type: Boolean, default: false },
    isKYCVerified: { type: Boolean, default: false },
    isVerifiedBadge: { type: Boolean, default: false },
    kycStatus: {
      type: String,
      enum: ["not_submitted", "pending", "approved", "rejected"],
      default: "not_submitted",
    },
    kycDocumentType: String,
    kycDocumentNumber: String,
    kycDocuments: [String],
    kycSubmittedAt: Date,
    kycRejectionReason: String,
    kycReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    kycReviewedAt: Date,
    kycAutomation: {
      riskScore: { type: Number, default: 0 },
      decision: {
        type: String,
        enum: ["manual_review", "auto_approved", "flagged"],
        default: "manual_review",
      },
      reasons: [String],
      evaluatedAt: Date,
    },
    kycReviewHistory: [
      {
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          required: true,
        },
        reason: String,
        actor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        actorRole: {
          type: String,
          enum: ["system", "admin", "superadmin"],
          default: "system",
        },
        source: {
          type: String,
          enum: ["submission", "automation", "manual_review"],
          default: "manual_review",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    availabilityStatus: {
      type: String,
      enum: ["available", "busy", "offline"],
      default: "available",
    },
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    googleId: String,
    otp: { code: String, expiresAt: Date },
    verificationOtpSentAt: Date,
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorMethod: {
      type: String,
      enum: ["email"],
      default: null,
    },
    twoFactorOtp: {
      codeHash: String,
      expiresAt: Date,
      purpose: {
        type: String,
        enum: ["setup", "login", "disable"],
      },
      attempts: { type: Number, default: 0 },
    },
    twoFactorLastVerifiedAt: Date,
    address: {
      city: String,
      province: String,
      country: { type: String, default: "Zimbabwe" },
    },
    withdrawalMethods: [{ type: String, details: String }],
    totalEarned: { type: Number, default: 0 },
  },
  { timestamps: true },
);

userSchema.index({ "$**": "text" });

userSchema.pre("save", async function () {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

userSchema.methods.comparePassword = function (p) {
  return bcrypt.compare(p, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  const isVerified = Boolean(
    obj.isEmailVerified && (obj.isKYCVerified || obj.isVerifiedBadge),
  );

  obj.isVerified = isVerified;
  obj.verification = {
    email: Boolean(obj.isEmailVerified),
    kyc: Boolean(obj.isKYCVerified),
    badge: Boolean(obj.isVerifiedBadge),
    accountStatus: obj.accountStatus,
    isVerified,
  };

  delete obj.password;
  delete obj.otp;
  delete obj.twoFactorOtp;
  delete obj.kycDocuments;
  return obj;
};

export default mongoose.model("User", userSchema);
