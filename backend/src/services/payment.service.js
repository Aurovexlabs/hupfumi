import Order from "../models/Order.js";
import Wallet from "../models/Wallet.js";
import { ensure } from "../utils/appError.js";
import { parseAndVerifyPaynowMessage } from "./paynow.service.js";
import { applyPaynowDepositNotification } from "./wallet.service.js";

export const processWalletPayment = async (userId, orderId) => {
  const order = await Order.findOne({ _id: orderId, buyer: userId });
  ensure(order, "Order not found", 404);
  ensure(order.paymentStatus !== "paid", "Already paid", 400);

  const wallet = await Wallet.findOne({ user: userId });
  ensure(
    wallet && wallet.balance >= order.total,
    "Insufficient wallet balance",
    400,
  );

  wallet.balance -= order.total;
  wallet.totalSpent += order.total;
  wallet.pendingBalance += order.subtotal;
  wallet.lastTransactionAt = new Date();
  await wallet.save();

  order.paymentStatus = "paid";
  order.status = "confirmed";
  order.statusHistory.push({
    status: "confirmed",
    note: "Payment via wallet",
    timestamp: new Date(),
  });
  await order.save();

  return { order };
};

export const processPaynowResultNotification = async ({ rawBody, payload }) => {
  const parsed = parseAndVerifyPaynowMessage({
    rawBody,
    body: payload,
  });

  const settlement = await applyPaynowDepositNotification(parsed, "callback");

  return {
    ...settlement,
    paynowStatus: parsed.status,
    paynowReference: parsed.paynowReference,
  };
};

export const parsePaynowReturnQuery = (query = {}) => ({
  reference: query.reference || null,
  status: query.status || null,
  pollUrl: query.pollurl || null,
  paynowReference: query.paynowreference || null,
});
