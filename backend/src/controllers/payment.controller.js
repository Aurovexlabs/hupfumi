import { z } from "zod";
import {
  parsePaynowReturnQuery,
  processPaynowResultNotification,
  processWalletPayment,
} from "../services/payment.service.js";
import { handleControllerError } from "../utils/controller.js";
import { fail, ok } from "../utils/response.js";

const walletPaymentSchema = z.object({
  orderId: z.string().regex(/^[0-9a-fA-F]{24}$/),
});

export const postWalletPayment = async (req, res) => {
  try {
    const parsed = walletPaymentSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid payment payload", 400);

    const data = await processWalletPayment(req.user._id, parsed.data.orderId);
    return ok(res, data, "Payment successful");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postPaynowResult = async (req, res) => {
  try {
    const data = await processPaynowResultNotification({
      rawBody: req.rawBody,
      payload: req.body,
    });

    return ok(res, data, "Paynow status received");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getPaynowReturn = async (req, res) => {
  try {
    const data = parsePaynowReturnQuery(req.query);
    return ok(res, data, "Paynow return acknowledged");
  } catch (error) {
    return handleControllerError(res, error);
  }
};
