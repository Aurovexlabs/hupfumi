import Message, { Conversation } from "../models/Message.js";
import { AppError, ensure } from "../utils/appError.js";
import {
  deleteImageKitFile,
  uploadBufferToImageKit,
} from "./imagekit.service.js";

import mongoose from "mongoose";
import Application from "../models/Application.js";
import Job from "../models/Job.js";
import Notification from "../models/Notification.js";
import OpportunityRadarEvent from "../models/OpportunityRadarEvent.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import SavedItem from "../models/SavedItem.js";
import Service from "../models/Service.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";

const safeFileName = (name = "file") =>
  String(name)
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "_");

const KNOWN_KYC_DOCUMENT_TYPES = new Set([
  "national_id",
  "passport",
  "drivers_license",
  "driver_license",
  "residence_permit",
  "voter_id",
  "other",
]);

const WORKSPACE_NOTE_TYPES = new Set(["job", "product", "service"]);
const MAX_WORKSPACE_NOTES = 120;
const MAX_WORKSPACE_NOTE_LENGTH = 2000;
const MAX_WORKSPACE_COMPARE_ITEMS = 3;

const normalizeDateValue = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const sanitizeWorkspaceNote = (rawNote) => {
  const type = String(rawNote?.type ?? "")
    .trim()
    .toLowerCase();
  const listingId = String(rawNote?.listingId ?? "")
    .trim()
    .slice(0, 120);

  if (!WORKSPACE_NOTE_TYPES.has(type) || !listingId) return null;

  const note =
    typeof rawNote?.note === "string"
      ? rawNote.note.slice(0, MAX_WORKSPACE_NOTE_LENGTH)
      : String(rawNote?.note ?? "").slice(0, MAX_WORKSPACE_NOTE_LENGTH);

  return {
    type,
    listingId,
    note,
    updatedAt: normalizeDateValue(rawNote?.updatedAt),
  };
};

const sanitizeWorkspaceCompareItem = (rawItem) => {
  const id = String(rawItem?.id ?? "").trim();
  const slug = String(rawItem?.slug ?? "").trim();
  const title = String(rawItem?.title ?? "")
    .trim()
    .slice(0, 220);

  if (!id || !slug || !title) return null;

  const toSafeNumber = (value, fallback = undefined) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return {
    id,
    slug,
    title,
    price: toSafeNumber(rawItem?.price, 0),
    originalPrice: toSafeNumber(rawItem?.originalPrice),
    condition: rawItem?.condition
      ? String(rawItem.condition).slice(0, 80)
      : undefined,
    category: rawItem?.category
      ? String(rawItem.category).slice(0, 80)
      : undefined,
    rating: toSafeNumber(rawItem?.rating),
    stock: toSafeNumber(rawItem?.stock),
    imageUrl: rawItem?.imageUrl
      ? String(rawItem.imageUrl).slice(0, 1200)
      : undefined,
    sellerName: rawItem?.sellerName
      ? String(rawItem.sellerName).slice(0, 120)
      : undefined,
  };
};

const normalizeWorkspace = (workspace) => {
  const listingNotes = Array.isArray(workspace?.listingNotes)
    ? workspace.listingNotes
        .map(sanitizeWorkspaceNote)
        .filter(Boolean)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, MAX_WORKSPACE_NOTES)
    : [];

  const productCompare = Array.isArray(workspace?.productCompare)
    ? workspace.productCompare
        .map(sanitizeWorkspaceCompareItem)
        .filter(Boolean)
        .slice(0, MAX_WORKSPACE_COMPARE_ITEMS)
    : [];

  return {
    listingNotes,
    productCompare,
    updatedAt: normalizeDateValue(workspace?.updatedAt),
  };
};

const evaluateKycAutomation = ({ documentType, documentNumber, documents }) => {
  const normalizedType = String(documentType || "")
    .trim()
    .toLowerCase();
  const normalizedNumber = String(documentNumber || "")
    .trim()
    .toLowerCase();

  let riskScore = 0;
  const reasons = [];

  if (!KNOWN_KYC_DOCUMENT_TYPES.has(normalizedType)) {
    riskScore += 25;
    reasons.push("Unrecognized document type requires manual review");
  }

  if (normalizedNumber.length < 6) {
    riskScore += 25;
    reasons.push("Document number format looks incomplete");
  }

  if (/(.)\1{5,}/.test(normalizedNumber)) {
    riskScore += 35;
    reasons.push("Document number contains suspicious repeated characters");
  }

  if (
    /\b(test|dummy|fake|null|sample|123456|000000|xxxxxx)\b/i.test(
      normalizedNumber,
    )
  ) {
    riskScore += 85;
    reasons.push("Document number matches high-risk placeholder patterns");
  }

  if (Array.isArray(documents) && documents.length >= 2) {
    riskScore = Math.max(0, riskScore - 10);
  }

  let decision = "manual_review";
  if (riskScore >= 70) {
    decision = "flagged";
  } else if (riskScore <= 15) {
    decision = "auto_approved";
  }

  return {
    decision,
    riskScore,
    reasons,
    evaluatedAt: new Date(),
  };
};

export const getKycStatus = (user) => ({
  isVerified: user.isKYCVerified,
  emailVerified: user.isEmailVerified,
  badge: user.isVerifiedBadge,
  status: user.kycStatus || "not_submitted",
  submittedAt: user.kycSubmittedAt,
  reviewedAt: user.kycReviewedAt,
  automation: user.kycAutomation || null,
  rejectionReason: user.kycRejectionReason,
});

export const getPublicProfile = async (username) => {
  const user = await User.findOne({ username: username.toLowerCase() })
    .select(
      "fullName username avatar bio skills profileType isVerifiedBadge averageRating reviewCount availabilityStatus address.city createdAt",
    )
    .lean();

  ensure(user, "User not found", 404);
  return user;
};

export const submitKyc = async (
  userId,
  { documentType, documentNumber, documents = [] },
) => {
  ensure(
    Array.isArray(documents) && documents.length > 0,
    "Upload at least one document",
    400,
  );

  const uploadedDocuments = [];

  for (let index = 0; index < documents.length; index += 1) {
    const file = documents[index];
    ensure(file?.buffer, "Invalid KYC document", 400);

    const uploaded = await uploadBufferToImageKit({
      buffer: file.buffer,
      mimeType: file.mimetype,
      fileName: `${Date.now()}-${index}-${safeFileName(file.originalname || "kyc-document")}`,
      folder: `/hupfumi/users/${String(userId)}/kyc`,
      tags: ["kyc", String(documentType || "document")],
    });

    uploadedDocuments.push(uploaded.url);
  }

  const automation = evaluateKycAutomation({
    documentType,
    documentNumber,
    documents,
  });

  const now = new Date();
  const isAutoApproved = automation.decision === "auto_approved";
  const historyEntries = [];

  if (isAutoApproved) {
    historyEntries.push({
      status: "approved",
      reason: "Automatically approved by low-risk KYC checks",
      actor: null,
      actorRole: "system",
      source: "automation",
      createdAt: now,
    });
  } else {
    historyEntries.push({
      status: "pending",
      reason:
        automation.decision === "flagged"
          ? "Flagged by automated checks for manual review"
          : "Submitted for manual review",
      actor: null,
      actorRole: "system",
      source: automation.decision === "flagged" ? "automation" : "submission",
      createdAt: now,
    });
  }

  await User.findByIdAndUpdate(userId, {
    $set: {
      kycStatus: isAutoApproved ? "approved" : "pending",
      isKYCVerified: isAutoApproved,
      kycSubmittedAt: now,
      kycDocumentType: documentType,
      kycDocumentNumber: documentNumber,
      kycDocuments: uploadedDocuments,
      kycRejectionReason: "",
      kycReviewedAt: isAutoApproved ? now : null,
      kycReviewedBy: null,
      kycAutomation: {
        riskScore: automation.riskScore,
        decision: automation.decision,
        reasons: automation.reasons,
        evaluatedAt: automation.evaluatedAt,
      },
    },
    $push: {
      kycReviewHistory: {
        $each: historyEntries,
        $slice: -20,
      },
    },
  });

  if (isAutoApproved) {
    Notification.create({
      user: userId,
      type: "kyc",
      title: "KYC Approved",
      body: "Your KYC was auto-approved after passing security checks.",
      link: "/settings/profile",
      metadata: {
        source: "automation",
        riskScore: automation.riskScore,
      },
    }).catch(() => {});
  }

  return {
    status: isAutoApproved ? "approved" : "pending",
    documentsUploaded: uploadedDocuments.length,
    automation: {
      decision: automation.decision,
      riskScore: automation.riskScore,
      reasons: automation.reasons,
    },
    message: isAutoApproved
      ? "KYC approved automatically."
      : automation.decision === "flagged"
        ? "KYC submitted and flagged for enhanced manual review."
        : "KYC submitted. Review within 24-48 hours.",
  };
};

export const updateAvatar = async (userId, file) => {
  ensure(file?.buffer, "Avatar file is required", 400);

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const uploaded = await uploadBufferToImageKit({
    buffer: file.buffer,
    mimeType: file.mimetype,
    fileName: `${Date.now()}-${safeFileName(file.originalname || "avatar")}`,
    folder: `/hupfumi/users/${String(userId)}/avatar`,
    tags: ["avatar", String(userId)],
  });

  const oldAvatarFileId = user.avatarFileId;

  user.avatar = uploaded.url;
  user.avatarFileId = uploaded.fileId;
  await user.save();

  if (oldAvatarFileId && oldAvatarFileId !== uploaded.fileId) {
    deleteImageKitFile(oldAvatarFileId).catch(() => {});
  }

  return { avatar: user.avatar, avatarFileId: user.avatarFileId };
};

export const updateProfile = async (userId, update) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: update },
    { new: true },
  );

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

export const purgeUserAccountData = async (userId) => {
  const user = await User.findById(userId).select(
    "+password avatarFileId kycDocuments",
  );
  ensure(user, "User not found", 404);

  const uid = new mongoose.Types.ObjectId(userId);

  const [products, services, jobs, conversations] = await Promise.all([
    Product.find({ seller: uid }).select("images.fileId").lean(),
    Service.find({ seller: uid }).select("gallery.fileId").lean(),
    Job.find({ employer: uid }).select("_id").lean(),
    Conversation.find({ participants: uid }).select("_id").lean(),
  ]);

  const jobIds = jobs.map((job) => job._id);
  const conversationIds = conversations.map((conversation) => conversation._id);

  const fileIds = new Set();

  if (user.avatarFileId) fileIds.add(user.avatarFileId);

  for (const product of products) {
    for (const image of product.images || []) {
      if (image?.fileId) fileIds.add(image.fileId);
    }
  }

  for (const service of services) {
    for (const image of service.gallery || []) {
      if (image?.fileId) fileIds.add(image.fileId);
    }
  }

  const applicationFilter = jobIds.length
    ? { $or: [{ applicant: uid }, { job: { $in: jobIds } }] }
    : { applicant: uid };

  const messageFilter = conversationIds.length
    ? { $or: [{ sender: uid }, { conversation: { $in: conversationIds } }] }
    : { sender: uid };

  const [
    deletedApplications,
    deletedReviews,
    deletedOrders,
    deletedSaved,
    deletedNotifications,
    deletedRadarEvents,
    deletedTransactions,
    deletedWallets,
    deletedMessages,
    deletedConversations,
    deletedJobs,
    deletedServices,
    deletedProducts,
    deletedUsers,
  ] = await Promise.all([
    Application.deleteMany(applicationFilter),
    Review.deleteMany({ $or: [{ reviewer: uid }, { reviewee: uid }] }),
    Order.deleteMany({ $or: [{ buyer: uid }, { seller: uid }] }),
    SavedItem.deleteMany({ user: uid }),
    Notification.deleteMany({ user: uid }),
    OpportunityRadarEvent.deleteMany({ user: uid }),
    Transaction.deleteMany({ user: uid }),
    Wallet.deleteMany({ user: uid }),
    Message.deleteMany(messageFilter),
    Conversation.deleteMany({ participants: uid }),
    Job.deleteMany({ employer: uid }),
    Service.deleteMany({ seller: uid }),
    Product.deleteMany({ seller: uid }),
    User.deleteOne({ _id: uid }),
  ]);

  ensure(deletedUsers.deletedCount === 1, "Account deletion failed", 500);

  if (fileIds.size > 0) {
    Promise.allSettled(
      [...fileIds].map((fileId) => deleteImageKitFile(fileId)),
    ).catch(() => {});
  }

  return {
    user: {
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    deleted: true,
    assetsRemoved: fileIds.size,
    cleanup: {
      applications: deletedApplications.deletedCount || 0,
      reviews: deletedReviews.deletedCount || 0,
      orders: deletedOrders.deletedCount || 0,
      savedItems: deletedSaved.deletedCount || 0,
      notifications: deletedNotifications.deletedCount || 0,
      recommendationEvents: deletedRadarEvents.deletedCount || 0,
      transactions: deletedTransactions.deletedCount || 0,
      wallets: deletedWallets.deletedCount || 0,
      messages: deletedMessages.deletedCount || 0,
      conversations: deletedConversations.deletedCount || 0,
      jobs: deletedJobs.deletedCount || 0,
      services: deletedServices.deletedCount || 0,
      products: deletedProducts.deletedCount || 0,
    },
  };
};

export const deleteOwnAccount = async (userId, { confirmation, password }) => {
  ensure(
    confirmation === "DELETE",
    "Type DELETE to confirm account deletion",
    400,
  );

  const user = await User.findById(userId).select("+password");
  ensure(user, "User not found", 404);

  if (user.password) {
    ensure(password, "Current password is required", 400);
    const valid = await user.comparePassword(password);
    ensure(valid, "Invalid password", 401);
  }

  return purgeUserAccountData(userId);
};

export const getUserWorkspace = async (userId) => {
  const user = await User.findById(userId).select("+workspace");
  ensure(user, "User not found", 404);

  return normalizeWorkspace(user.workspace);
};

export const saveUserWorkspaceListingNote = async (
  userId,
  { type, listingId, note },
) => {
  const normalizedType = String(type ?? "")
    .trim()
    .toLowerCase();
  ensure(
    WORKSPACE_NOTE_TYPES.has(normalizedType),
    "Invalid listing note type",
    400,
  );

  const normalizedListingId = String(listingId ?? "")
    .trim()
    .slice(0, 120);
  ensure(normalizedListingId, "listingId is required", 400);

  const normalizedNote =
    typeof note === "string"
      ? note.slice(0, MAX_WORKSPACE_NOTE_LENGTH)
      : String(note ?? "").slice(0, MAX_WORKSPACE_NOTE_LENGTH);

  const user = await User.findById(userId).select("+workspace");
  ensure(user, "User not found", 404);

  const currentWorkspace = normalizeWorkspace(user.workspace);
  const filteredNotes = currentWorkspace.listingNotes.filter(
    (entry) =>
      !(
        entry.type === normalizedType && entry.listingId === normalizedListingId
      ),
  );

  const nextListingNotes = normalizedNote.trim()
    ? [
        {
          type: normalizedType,
          listingId: normalizedListingId,
          note: normalizedNote,
          updatedAt: new Date(),
        },
        ...filteredNotes,
      ].slice(0, MAX_WORKSPACE_NOTES)
    : filteredNotes;

  user.workspace = {
    listingNotes: nextListingNotes,
    productCompare: currentWorkspace.productCompare,
    updatedAt: new Date(),
  };

  await user.save();

  return normalizeWorkspace(user.workspace);
};

export const saveUserWorkspaceProductCompare = async (userId, items) => {
  const sanitizedItems = Array.isArray(items)
    ? items
        .map(sanitizeWorkspaceCompareItem)
        .filter(Boolean)
        .slice(0, MAX_WORKSPACE_COMPARE_ITEMS)
    : [];

  const user = await User.findById(userId).select("+workspace");
  ensure(user, "User not found", 404);

  const currentWorkspace = normalizeWorkspace(user.workspace);

  user.workspace = {
    listingNotes: currentWorkspace.listingNotes,
    productCompare: sanitizedItems,
    updatedAt: new Date(),
  };

  await user.save();

  return normalizeWorkspace(user.workspace);
};
