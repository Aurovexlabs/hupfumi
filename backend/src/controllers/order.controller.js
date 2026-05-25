import { z } from "zod";
import {
  completeOrder,
  createOrder,
  getOrderByIdForParticipant,
  listBuyingOrders,
  listSellingOrders,
  updateOrderStatus,
} from "../services/order.service.js";
import { handleControllerError } from "../utils/controller.js";
import { fail, ok, paginated } from "../utils/response.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createOrderSchema = z.object({
  serviceId: objectIdSchema.optional(),
  pricingTier: z.string().trim().max(64).optional(),
  requirements: z.string().trim().max(4000).optional(),
  paymentMethod: z.string().trim().max(32).optional(),
  items: z.array(z.any()).optional(),
  sellerId: objectIdSchema.optional(),
  orderType: z.enum(["service", "product"]).default("service"),
});

const updateStatusSchema = z.object({
  status: z.enum([
    "in_progress",
    "delivered",
    "cancelled",
    "completed",
    "revision_requested",
    "disputed",
  ]),
  note: z.string().trim().max(500).optional(),
});

export const getBuyingOrders = async (req, res) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid pagination query", 400);

    const result = await listBuyingOrders(req.user._id, parsed.data);
    return paginated(res, result.data, result.pagination);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getSellingOrders = async (req, res) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid pagination query", 400);

    const result = await listSellingOrders(req.user._id, parsed.data);
    return paginated(res, result.data, result.pagination);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getOrder = async (req, res) => {
  try {
    const parsed = objectIdSchema.safeParse(req.params.id);
    if (!parsed.success) return fail(res, "Invalid order id", 400);

    const order = await getOrderByIdForParticipant(req.user._id, parsed.data);
    return ok(res, order);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postOrder = async (req, res) => {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid order payload", 400);

    const order = await createOrder(req.user, parsed.data);
    return ok(res, order, "Order placed", 201);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const patchOrderStatus = async (req, res) => {
  try {
    const idParsed = objectIdSchema.safeParse(req.params.id);
    if (!idParsed.success) return fail(res, "Invalid order id", 400);

    const bodyParsed = updateStatusSchema.safeParse(req.body);
    if (!bodyParsed.success)
      return fail(res, "Invalid order status payload", 400);

    const order = await updateOrderStatus(
      req.user,
      idParsed.data,
      bodyParsed.data,
    );
    return ok(res, order, "Status updated");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postCompleteOrder = async (req, res) => {
  try {
    const parsed = objectIdSchema.safeParse(req.params.id);
    if (!parsed.success) return fail(res, "Invalid order id", 400);

    const order = await completeOrder(req.user._id, parsed.data);
    return ok(res, order, "Order completed and payment released");
  } catch (error) {
    return handleControllerError(res, error);
  }
};
