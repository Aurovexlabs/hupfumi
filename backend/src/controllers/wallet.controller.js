import { z } from "zod";
import {
  confirmDeposit,
  getDepositStatus,
  getWalletByUser,
  getWalletTransactions,
  initiateDeposit,
  requestWithdrawal,
} from "../services/wallet.service.js";
import { handleControllerError } from "../utils/controller.js";
import { fail, ok } from "../utils/response.js";

const depositSchema = z.object({
  amount: z.coerce.number().min(1).max(10000),
  method: z.enum(["paynow", "ecocash", "onemoney", "bank"]).default("paynow"),
  phone: z.string().trim().min(7).max(20).optional(),
});

const confirmSchema = z.object({
  reference: z.string().regex(/^DEP-[A-Z0-9]{10}$/),
});

const withdrawSchema = z.object({
  amount: z.coerce.number().min(1).max(10000),
  methodIndex: z.coerce.number().int().min(0).max(10).default(0),
});

export const getWallet = async (req, res) => {
  try {
    const wallet = await getWalletByUser(req.user._id);
    return ok(res, wallet);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getTransactions = async (req, res) => {
  try {
    const data = await getWalletTransactions(req.user._id);
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postDeposit = async (req, res) => {
  try {
    const parsed = depositSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid deposit payload", 400);

    const data = await initiateDeposit(req.user._id, parsed.data);
    return ok(res, data, "Deposit initiated");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postConfirmDeposit = async (req, res) => {
  try {
    const parsed = confirmSchema.safeParse(req.params);
    if (!parsed.success) return fail(res, "Invalid reference", 400);

    const data = await confirmDeposit(req.user._id, parsed.data.reference);
    return ok(res, data, "Deposit status updated");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getDepositByReference = async (req, res) => {
  try {
    const parsed = confirmSchema.safeParse(req.params);
    if (!parsed.success) return fail(res, "Invalid reference", 400);

    const data = await getDepositStatus(req.user._id, parsed.data.reference);
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postWithdraw = async (req, res) => {
  try {
    const parsed = withdrawSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid withdrawal payload", 400);

    const data = await requestWithdrawal(req.user._id, parsed.data);
    return ok(res, data, "Withdrawal submitted. Processing within 24h.");
  } catch (error) {
    return handleControllerError(res, error);
  }
};
