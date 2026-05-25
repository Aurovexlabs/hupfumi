import axios from "axios";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import fs from "node:fs";
import Job from "../src/models/Job.js";
import { Conversation } from "../src/models/Message.js";
import Service from "../src/models/Service.js";
import User from "../src/models/User.js";

const envText = fs.readFileSync(new URL("../.env", import.meta.url), "utf8");
const envMap = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const baseURL = "http://127.0.0.1:5057/api/v1";
const mongo = envMap.MONGODB_URI || process.env.MONGODB_URI;
const accessSecret =
  envMap.JWT_ACCESS_SECRET ||
  process.env.JWT_ACCESS_SECRET ||
  "hupfumi_access_secret_dev";

if (!mongo) {
  throw new Error("MONGODB_URI not found for smoke test");
}

const stamp = Date.now();
const stampTag = `smoke-${stamp}`;

const mkToken = (id) =>
  jwt.sign({ id: String(id) }, accessSecret, { expiresIn: "1h" });

const auth = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
    "User-Agent": "Mozilla/5.0 smoke-test",
  },
});

const makeUser = async ({ role = "user", emailPrefix, usernamePrefix }) => {
  return User.create({
    fullName: `${emailPrefix} ${stamp}`,
    username: `${usernamePrefix}${stamp}`,
    email: `${emailPrefix}.${stamp}@example.com`,
    password: "Password123",
    role,
    profileType: "individual",
    accountStatus: "active",
    isEmailVerified: true,
  });
};

await mongoose.connect(mongo);

let admin;
let seller;
let applicant;

const results = {};

try {
  admin = await makeUser({
    role: "admin",
    emailPrefix: "admin",
    usernamePrefix: "adm",
  });
  seller = await makeUser({
    role: "user",
    emailPrefix: "seller",
    usernamePrefix: "sel",
  });
  applicant = await makeUser({
    role: "user",
    emailPrefix: "applicant",
    usernamePrefix: "app",
  });

  const adminToken = mkToken(admin._id);
  const sellerToken = mkToken(seller._id);
  const applicantToken = mkToken(applicant._id);

  await User.findByIdAndUpdate(seller._id, {
    $set: {
      kycStatus: "pending",
      isKYCVerified: false,
      kycSubmittedAt: new Date(),
      kycDocumentType: "passport",
      kycDocumentNumber: "A123456789",
      kycDocuments: ["https://example.com/docs/passport.png"],
    },
  });

  const kycQueue = await axios.get(
    `${baseURL}/admin/kyc-submissions`,
    auth(adminToken),
  );
  results.kycQueue200 = kycQueue.status === 200;
  const queuedSeller = (kycQueue.data?.data?.data || []).find(
    (row) => row._id === String(seller._id),
  );
  results.kycSubmissionVisible = Boolean(queuedSeller);

  const kycApprove = await axios.patch(
    `${baseURL}/admin/kyc-submissions/${seller._id}/review`,
    { decision: "approved", reason: "Validated identity documents" },
    auth(adminToken),
  );
  results.kycApprove200 = kycApprove.status === 200;

  const sellerAfterReview = await User.findById(seller._id).lean();
  results.kycApprovedPersisted =
    sellerAfterReview?.kycStatus === "approved" &&
    sellerAfterReview?.isKYCVerified === true;

  let blockedJobStatus = 0;
  try {
    await axios.post(
      `${baseURL}/jobs`,
      {
        title: "Sell weapon inventory quickly",
        description: "Direct weapon sale with instant delivery.",
        category: "illegal",
        jobType: "fixed",
        budget: { min: 100, max: 200, currency: "USD" },
        skills: ["sales"],
      },
      auth(sellerToken),
    );
  } catch (error) {
    blockedJobStatus = error?.response?.status || 0;
  }
  results.blockedJobRejected = blockedJobStatus === 400;

  const flaggedService = await axios.post(
    `${baseURL}/services`,
    {
      title: "Guaranteed fast profits service",
      description:
        "Guaranteed profit with off-platform payment on whatsapp transfer.",
      category: "marketing",
      pricing: [
        {
          name: "basic",
          title: "Starter",
          description: "Quick setup",
          price: 50,
          deliveryDays: 2,
        },
      ],
      tags: ["growth"],
      faqs: [{ question: "How", answer: "Fast onboarding" }],
    },
    auth(sellerToken),
  );
  const flaggedServiceId = flaggedService.data?.data?._id;
  results.flaggedServiceCreated = flaggedService.status === 201;
  results.flaggedServicePendingReview =
    flaggedService.data?.data?.moderation?.status === "pending_review";

  const publicServices = await axios.get(`${baseURL}/services`);
  const publicServiceIds = (publicServices.data?.data || []).map((entry) =>
    String(entry._id),
  );
  results.flaggedServiceHiddenFromPublic = !publicServiceIds.includes(
    String(flaggedServiceId),
  );

  const contentQueue = await axios.get(`${baseURL}/admin/content`, {
    ...auth(adminToken),
    params: {
      type: "service",
      moderationStatus: "pending_review",
    },
  });
  const queuedService = (contentQueue.data?.data?.data || []).find(
    (entry) => entry._id === String(flaggedServiceId),
  );
  results.adminCanSeeFlaggedContent = Boolean(queuedService);

  const approveContent = await axios.patch(
    `${baseURL}/admin/content/service/${flaggedServiceId}/moderate`,
    { action: "approve" },
    auth(adminToken),
  );
  results.adminApproveContent200 = approveContent.status === 200;

  const serviceAfterModeration =
    await Service.findById(flaggedServiceId).lean();
  results.contentApprovedPersisted =
    serviceAfterModeration?.moderation?.status === "approved";

  const goodJob = await axios.post(
    `${baseURL}/jobs`,
    {
      title: "Build secure admin analytics dashboard",
      description:
        "Need a skilled engineer to build a secure admin analytics dashboard with API integrations and reliability checks.",
      category: "development",
      jobType: "fixed",
      budget: { min: 300, max: 700, currency: "USD" },
      skills: ["react", "node", "security"],
    },
    auth(sellerToken),
  );

  const jobId = goodJob.data?.data?._id;
  results.goodJobCreated = goodJob.status === 201;

  const apply = await axios.post(
    `${baseURL}/jobs/${jobId}/apply`,
    {
      coverLetter:
        "I have shipped secure admin dashboards with full API and RBAC support and can deliver this project quickly.",
      proposedBudget: 540,
      proposedTimeline: "8 days",
    },
    auth(applicantToken),
  );
  results.jobApplicationSubmitted = apply.status === 201;

  let duplicateStatus = 0;
  try {
    await axios.post(
      `${baseURL}/jobs/${jobId}/apply`,
      {
        coverLetter:
          "Submitting again to validate duplicate protection and conflict handling.",
        proposedBudget: 530,
        proposedTimeline: "7 days",
      },
      auth(applicantToken),
    );
  } catch (error) {
    duplicateStatus = error?.response?.status || 0;
  }
  results.duplicateApplicationRejected = duplicateStatus === 400;

  const startConversation = await axios.post(
    `${baseURL}/messages/start`,
    { userId: String(applicant._id) },
    auth(sellerToken),
  );
  const conversationId = startConversation.data?.data?._id;
  results.conversationStarted = startConversation.status === 200;

  const sendMessage = await axios.post(
    `${baseURL}/messages/${conversationId}/send`,
    { text: `Hello from ${stampTag}` },
    auth(sellerToken),
  );
  results.messageSent = sendMessage.status === 200;

  const convoAfterMessage = await Conversation.findById(conversationId).lean();
  const unreadCounts = convoAfterMessage?.unreadCounts || {};
  const applicantUnread = Number(unreadCounts[String(applicant._id)] || 0);
  results.messageUnreadIncremented = applicantUnread >= 1;
  results.messagePreviewUpdated = String(
    convoAfterMessage?.lastMessagePreview || "",
  ).includes("Hello from");

  const failures = Object.entries(results).filter(([, ok]) => !ok);
  console.log(JSON.stringify({ results, failures }, null, 2));

  if (failures.length > 0) {
    process.exitCode = 1;
  }
} finally {
  const emailRegex = new RegExp(`\\.${stamp}@example\\.com$`, "i");
  await Promise.all([
    Job.deleteMany({ title: /dashboard|weapon/i, employer: seller?._id }),
    Service.deleteMany({ seller: seller?._id }),
    Conversation.deleteMany({
      participants: {
        $in: [seller?._id, applicant?._id].filter(Boolean),
      },
    }),
    User.deleteMany({ email: emailRegex }),
  ]);
  await mongoose.disconnect();
}
