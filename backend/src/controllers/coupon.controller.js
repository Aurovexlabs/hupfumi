import { z } from "zod";
import { validateCoupon } from "../services/coupon.service.js";
import { handleControllerError } from "../utils/controller.js";
import { fail, ok } from "../utils/response.js";

const validateSchema = z.object({
  code: z.string().trim().min(1),
  orderAmount: z.coerce.number().min(0).default(0),
});

export const postValidateCoupon = async (req, res) => {
  try {
    const parsed = validateSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Code required", 400);

    const data = validateCoupon(parsed.data);
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};
