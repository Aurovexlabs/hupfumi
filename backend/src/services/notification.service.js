import Notification from "../models/Notification.js";
import { buildPagination } from "../utils/response.js";

export const listNotifications = async (userId, query) => {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Notification.find({ user: userId })
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ user: userId }),
  ]);

  return {
    data,
    pagination: buildPagination(page, limit, total),
  };
};

export const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({
    user: userId,
    isRead: false,
  });
  return { count };
};

export const markRead = async (userId, ids) => {
  if (ids === "all") {
    await Notification.updateMany({ user: userId }, { $set: { isRead: true } });
  } else if (Array.isArray(ids)) {
    await Notification.updateMany(
      { _id: { $in: ids }, user: userId },
      { $set: { isRead: true } },
    );
  }

  return null;
};

export const removeNotification = async (userId, id) => {
  await Notification.findOneAndDelete({ _id: id, user: userId });
  return null;
};
