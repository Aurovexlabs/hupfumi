import { AppError } from "../utils/appError.js";

const COUPONS = {
  WELCOME10: { type: "percent", value: 10 },
  SAVE5: { type: "fixed", value: 5 },
};

export const validateCoupon = ({ code, orderAmount = 0 }) => {
  const normalizedCode = code.toUpperCase();
  const coupon = COUPONS[normalizedCode];

  if (!coupon) {
    throw new AppError("Invalid coupon", 404);
  }

  const discount =
    coupon.type === "percent"
      ? (orderAmount * coupon.value) / 100
      : Math.min(coupon.value, orderAmount);

  return {
    code: normalizedCode,
    type: coupon.type,
    value: coupon.value,
    discount,
    finalAmount: Math.max(0, orderAmount - discount),
  };
};
