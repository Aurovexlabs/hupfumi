import { v4 as uuid } from "uuid";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import { AppError, ensure } from "../utils/appError.js";
import {
  createPaynowPayment,
  isPaynowConfigured,
  normalizePaynowStatus,
  pollPaynowTransaction,
} from "./paynow.service.js";

const PAYNOW_METHODS = new Set(["paynow", "ecocash", "onemoney"]);
const PAYNOW_SUCCESS_STATUSES = new Set([
  "paid",
  "awaiting delivery",
  "delivered",
]);
const PAYNOW_FAILED_STATUSES = new Set(["cancelled", "error", "failed"]);

const toSafeAmount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const mergePaynowMetadata = (txn, update, source) => {
  const existing = txn.metadata || {};
  const existingPaynow = existing.paynow || {};

  txn.metadata = {
    ...existing,
    paynow: {
      ...existingPaynow,
      source,
      lastUpdateAt: new Date().toISOString(),
      status: update.status,
      ...(update.raw ? { lastPayload: update.raw } : {}),
    },
  };
};

const creditDepositIfNeeded = async (txn) => {
  const wallet = await ensureWallet(txn.user);

  if (txn.status === "completed") {
    return {
      credited: false,
      balance: wallet.balance,
    };
  }

  wallet.balance += txn.amount;
  wallet.totalDeposited += txn.amount;
  wallet.lastTransactionAt = new Date();
  await wallet.save();

  txn.status = "completed";
  txn.completedAt = new Date();
  await txn.save();

  return {
    credited: true,
    balance: wallet.balance,
  };
};

const applyPaynowDepositUpdate = async (txn, update, source = "callback") => {
  const normalizedStatus = normalizePaynowStatus(update.status);
  const reportedAmount = toSafeAmount(update.amount);

  if (reportedAmount !== null && Math.abs(reportedAmount - txn.amount) > 0.01) {
    throw new AppError("Paynow amount mismatch for transaction", 400);
  }

  txn.provider = "paynow";
  txn.externalStatus = normalizedStatus;
  txn.lastCheckedAt = new Date();

  if (update.pollUrl) txn.pollUrl = update.pollUrl;
  if (update.paynowReference) txn.providerReference = update.paynowReference;

  mergePaynowMetadata(txn, { ...update, status: normalizedStatus }, source);

  if (PAYNOW_SUCCESS_STATUSES.has(normalizedStatus)) {
    const settlement = await creditDepositIfNeeded(txn);
    return {
      reference: txn.reference,
      status: txn.status,
      externalStatus: normalizedStatus,
      credited: settlement.credited,
      balance: settlement.balance,
    };
  }

  if (PAYNOW_FAILED_STATUSES.has(normalizedStatus)) {
    if (txn.status !== "completed") {
      txn.status = "failed";
      await txn.save();
    }

    return {
      reference: txn.reference,
      status: txn.status,
      externalStatus: normalizedStatus,
      credited: false,
      balance: null,
    };
  }

  if (txn.status !== "completed") {
    txn.status = "pending";
    await txn.save();
  } else {
    await txn.save();
  }

  const wallet = await ensureWallet(txn.user);

  return {
    reference: txn.reference,
    status: txn.status,
    externalStatus: normalizedStatus,
    credited: false,
    balance: wallet.balance,
  };
};

export const ensureWallet = async (userId) => {
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await Wallet.create({ user: userId });
  }
  return wallet;
};

export const getWalletByUser = async (userId) => {
  return ensureWallet(userId);
};

export const getWalletTransactions = async (userId) => {
  const transactions = await Transaction.find({ user: userId })
    .sort("-createdAt")
    .limit(50)
    .lean();

  return { transactions };
};

export const initiateDeposit = async (userId, payload) => {
  const { amount, method, phone } = payload;

  const reference = `DEP-${uuid().slice(0, 10).toUpperCase()}`;
  const txn = await Transaction.create({
    reference,
    user: userId,
    type: "deposit",
    amount,
    fee: 0,
    netAmount: amount,
    status: "pending",
    description: `Wallet deposit via ${method}`,
    paymentMethod: method,
    provider: "manual",
  });

  if (PAYNOW_METHODS.has(method)) {
    ensure(isPaynowConfigured(), "Paynow payments are not configured", 503);

    const user = await User.findById(userId).select("email fullName");
    ensure(
      user?.email,
      "A verified email is required for Paynow deposits",
      400,
    );

    const initiated = await createPaynowPayment({
      reference,
      amount,
      email: user.email,
      method,
      phone,
      additionalInfo: `Wallet deposit for ${user.fullName}`,
    });

    txn.provider = "paynow";
    txn.pollUrl = initiated.pollUrl;
    txn.externalStatus = initiated.status;
    txn.lastCheckedAt = new Date();
    mergePaynowMetadata(
      txn,
      {
        ...initiated,
        status: initiated.status,
      },
      "init",
    );
    await txn.save();

    return {
      reference,
      transactionId: txn._id,
      amount,
      method,
      phone,
      status: txn.status,
      pollUrl: txn.pollUrl,
      redirectUrl: initiated.redirectUrl,
      instructions: initiated.instructions,
      message: initiated.redirectUrl
        ? "Deposit initiated. Redirect to Paynow to complete payment."
        : "Deposit initiated. Complete the mobile payment prompt to continue.",
    };
  }

  return {
    reference,
    transactionId: txn._id,
    amount,
    method,
    phone,
    message: "Complete payment to credit your wallet.",
  };
};

export const confirmDeposit = async (userId, reference) => {
  const txn = await Transaction.findOne({
    reference,
    user: userId,
    type: "deposit",
  });

  ensure(txn, "Transaction not found", 404);

  if (txn.status === "completed") {
    const wallet = await ensureWallet(userId);
    return { balance: wallet.balance, status: txn.status };
  }

  if (txn.provider === "paynow") {
    ensure(txn.pollUrl, "Paynow transaction is still initializing", 409);
    const polled = await pollPaynowTransaction(txn.pollUrl);
    return applyPaynowDepositUpdate(txn, polled, "poll");
  }

  const wallet = await ensureWallet(userId);
  wallet.balance += txn.amount;
  wallet.totalDeposited += txn.amount;
  wallet.lastTransactionAt = new Date();
  await wallet.save();

  txn.status = "completed";
  txn.completedAt = new Date();
  await txn.save();

  return { balance: wallet.balance, status: txn.status };
};

export const getDepositStatus = async (userId, reference) => {
  const txn = await Transaction.findOne({
    reference,
    user: userId,
    type: "deposit",
  });

  ensure(txn, "Transaction not found", 404);

  if (txn.provider === "paynow" && txn.pollUrl && txn.status !== "completed") {
    const polled = await pollPaynowTransaction(txn.pollUrl);
    return applyPaynowDepositUpdate(txn, polled, "poll");
  }

  const wallet = await ensureWallet(userId);

  return {
    reference: txn.reference,
    status: txn.status,
    externalStatus: txn.externalStatus || null,
    provider: txn.provider,
    pollUrl: txn.pollUrl || null,
    balance: wallet.balance,
  };
};

export const applyPaynowDepositNotification = async (
  update,
  source = "callback",
) => {
  ensure(update?.reference, "Missing deposit reference", 400);

  const txn = await Transaction.findOne({
    reference: update.reference,
    type: "deposit",
  });

  if (!txn) {
    return {
      ignored: true,
      reference: update.reference,
      message: "No matching deposit transaction found",
    };
  }

  return applyPaynowDepositUpdate(txn, update, source);
};

export const requestWithdrawal = async (userId, payload) => {
  const { amount, methodIndex } = payload;

  const wallet = await ensureWallet(userId);
  ensure(
    wallet.withdrawableBalance >= amount,
    "Insufficient withdrawable balance",
    400,
  );

  const fee = Math.round(amount * 0.02 * 100) / 100;
  const net = amount - fee;

  wallet.withdrawableBalance -= amount;
  wallet.balance -= amount;
  wallet.totalWithdrawn += amount;
  wallet.lastTransactionAt = new Date();
  await wallet.save();

  await Transaction.create({
    reference: `WD-${uuid().slice(0, 10).toUpperCase()}`,
    user: userId,
    type: "withdrawal",
    amount,
    fee,
    netAmount: net,
    status: "processing",
    description: `Withdrawal request (method index: ${methodIndex})`,
    provider: "manual",
  });

  return { amount, fee, net };
};
