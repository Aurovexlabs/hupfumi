import Notification from "../models/Notification.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Wallet from "../models/Wallet.js";
import { ensure } from "../utils/appError.js";
import { buildPagination } from "../utils/response.js";
import {
  isEmailConfigured,
  sendDisputeStatusUpdateEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
  sendPayoutNotificationEmail,
} from "./email.service.js";

const FEE_RATE = 0.07;

const sendTransactionalEmailSafe = async (label, callback) => {
  if (!isEmailConfigured()) return;

  try {
    await callback();
  } catch (error) {
    console.error(`Failed to send ${label} email:`, error.message);
  }
};

export const listBuyingOrders = async (userId, query) => {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Order.find({ buyer: userId })
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .populate("seller", "fullName username avatar")
      .populate("service", "title")
      .populate("product", "title")
      .lean(),
    Order.countDocuments({ buyer: userId }),
  ]);

  return {
    data,
    pagination: buildPagination(page, limit, total),
  };
};

export const listSellingOrders = async (userId, query) => {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Order.find({ seller: userId })
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .populate("buyer", "fullName username avatar")
      .populate("service", "title")
      .populate("product", "title")
      .lean(),
    Order.countDocuments({ seller: userId }),
  ]);

  return {
    data,
    pagination: buildPagination(page, limit, total),
  };
};

export const getOrderByIdForParticipant = async (userId, orderId) => {
  const order = await Order.findOne({
    _id: orderId,
    $or: [{ buyer: userId }, { seller: userId }],
  })
    .populate("buyer", "fullName username avatar")
    .populate("seller", "fullName username avatar")
    .populate("service", "title slug")
    .populate("product", "title slug images")
    .lean();

  ensure(order, "Order not found", 404);
  return order;
};

export const createOrder = async (user, payload) => {
  const {
    serviceId,
    pricingTier,
    requirements,
    paymentMethod,
    sellerId,
    orderType,
  } = payload;

  let subtotal = 0;
  let seller = sellerId;
  let listingTitle = "Marketplace order";

  if (orderType === "service" && serviceId) {
    const { default: Service } = await import("../models/Service.js");
    const svc = await Service.findById(serviceId);
    ensure(svc, "Service not found", 404);

    const tier =
      svc.pricing.find((p) => p.name === pricingTier) || svc.pricing[0];
    ensure(tier, "Pricing tier not found", 404);

    subtotal = tier.price;
    seller = svc.seller;
    listingTitle = svc.title;
  }

  ensure(subtotal, "Could not determine order amount", 400);
  ensure(seller, "Seller is required for this order", 400);
  ensure(
    String(seller) !== String(user._id),
    "You cannot create an order against your own account",
    400,
  );

  const platformFee = Math.round(subtotal * FEE_RATE * 100) / 100;
  const total = subtotal + platformFee;

  const order = await Order.create({
    buyer: user._id,
    seller,
    orderType,
    service: serviceId,
    pricingTier,
    requirements,
    subtotal,
    platformFee,
    total,
    paymentMethod: paymentMethod || "wallet",
    statusHistory: [
      { status: "pending", note: "Order placed", timestamp: new Date() },
    ],
  });

  await Notification.create({
    user: seller,
    type: "order_new",
    title: "New Order!",
    body: `You have a new order from ${user.fullName}`,
    link: `/orders/${order._id}`,
  });

  const sellerProfile = await User.findById(seller)
    .select("fullName email")
    .lean();

  await Promise.all([
    sendTransactionalEmailSafe("buyer order confirmation", async () => {
      if (!user?.email) return;

      await sendOrderConfirmationEmail({
        to: user.email,
        fullName: user.fullName,
        role: "buyer",
        orderNumber: order.orderNumber,
        listingTitle,
        total: order.total,
        paymentMethod: order.paymentMethod,
        orderId: order._id,
      });
    }),
    sendTransactionalEmailSafe("seller order confirmation", async () => {
      if (!sellerProfile?.email) return;

      await sendOrderConfirmationEmail({
        to: sellerProfile.email,
        fullName: sellerProfile.fullName,
        role: "seller",
        orderNumber: order.orderNumber,
        listingTitle,
        total: order.total,
        paymentMethod: order.paymentMethod,
        orderId: order._id,
      });
    }),
  ]);

  return order;
};

export const updateOrderStatus = async (user, orderId, payload) => {
  const { status, note } = payload;

  const order = await Order.findOne({
    _id: orderId,
    $or: [{ buyer: user._id }, { seller: user._id }],
  });
  ensure(order, "Order not found", 404);

  const allowed = {
    seller: ["in_progress", "delivered", "cancelled"],
    buyer: ["completed", "revision_requested", "cancelled", "disputed"],
  };

  const isSeller = String(order.seller) === String(user._id);
  const role = isSeller ? "seller" : "buyer";
  ensure(
    allowed[role].includes(status),
    `${role} cannot set status to ${status}`,
    400,
  );

  order.status = status;
  order.statusHistory.push({
    status,
    note: note || "",
    timestamp: new Date(),
    by: user._id,
  });

  if (status === "delivered") order.deliveredAt = new Date();
  if (status === "completed") order.completedAt = new Date();
  if (status === "cancelled") order.cancelledAt = new Date();

  await order.save();

  const notifyUser = isSeller ? order.buyer : order.seller;
  await Notification.create({
    user: notifyUser,
    type: "order_update",
    title: "Order Update",
    body: `Your order is now: ${status.replace(/_/g, " ")}`,
    link: `/orders/${order._id}`,
  });

  const recipient = await User.findById(notifyUser)
    .select("fullName email")
    .lean();

  await sendTransactionalEmailSafe("order status update", async () => {
    if (!recipient?.email) return;

    if (status === "disputed") {
      await sendDisputeStatusUpdateEmail({
        to: recipient.email,
        fullName: recipient.fullName,
        orderNumber: order.orderNumber,
        note,
        updatedBy: user?.fullName,
        orderId: order._id,
      });
      return;
    }

    await sendOrderStatusUpdateEmail({
      to: recipient.email,
      fullName: recipient.fullName,
      orderNumber: order.orderNumber,
      status,
      note,
      updatedBy: user?.fullName,
      orderId: order._id,
    });
  });

  return order;
};

export const completeOrder = async (userId, orderId) => {
  const order = await Order.findOne({ _id: orderId, buyer: userId });
  ensure(order, "Order not found", 404);
  ensure(
    ["delivered", "in_progress"].includes(order.status),
    "Order cannot be completed in this state",
    400,
  );

  order.status = "completed";
  order.completedAt = new Date();
  order.paymentStatus = "paid";
  order.statusHistory.push({
    status: "completed",
    note: "Completed by buyer",
    timestamp: new Date(),
    by: userId,
  });
  await order.save();

  const sellerNet = order.subtotal;
  await Wallet.findOneAndUpdate(
    { user: order.seller },
    {
      $inc: {
        balance: sellerNet,
        withdrawableBalance: sellerNet,
        totalEarned: sellerNet,
      },
      $set: { lastTransactionAt: new Date() },
    },
    { upsert: true },
  );

  await Notification.create({
    user: order.seller,
    type: "payment",
    title: "Payment Released",
    body: `$${sellerNet.toFixed(2)} has been added to your wallet.`,
    link: "/wallet",
  });

  const sellerProfile = await User.findById(order.seller)
    .select("fullName email")
    .lean();

  await sendTransactionalEmailSafe("payout notification", async () => {
    if (!sellerProfile?.email) return;

    await sendPayoutNotificationEmail({
      to: sellerProfile.email,
      fullName: sellerProfile.fullName,
      amount: sellerNet,
      orderNumber: order.orderNumber,
    });
  });

  return order;
};
