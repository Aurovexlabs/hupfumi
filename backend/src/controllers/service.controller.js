import { z } from "zod";
import {
  createService,
  deleteService,
  getMyServices,
  getServiceBySlug,
  listServices,
  updateService,
} from "../services/service.service.js";
import { handleControllerError } from "../utils/controller.js";
import { fail, ok, paginated } from "../utils/response.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const listServicesQuerySchema = z.object({
  q: z.string().trim().max(160).optional(),
  category: z.string().trim().max(80).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  sort: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const createServiceSchema = z.object({
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(20).max(5000),
  category: z.string().trim().min(2).max(80),
  pricing: z.any().optional(),
  tags: z.any().optional(),
  faqs: z.any().optional(),
});

const updateServiceSchema = z
  .object({
    title: z.string().trim().min(5).max(140).optional(),
    description: z.string().trim().min(20).max(5000).optional(),
    category: z.string().trim().min(2).max(80).optional(),
    pricing: z.any().optional(),
    tags: z.any().optional(),
    faqs: z.any().optional(),
    gallery: z.any().optional(),
    status: z.any().optional(),
  })
  .strict();

export const getServices = async (req, res) => {
  try {
    const parsed = listServicesQuerySchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid service search query", 400);

    const result = await listServices(parsed.data);
    return paginated(res, result.data, result.pagination);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getMyServiceList = async (req, res) => {
  try {
    const data = await getMyServices(req.user._id);
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getService = async (req, res) => {
  try {
    const service = await getServiceBySlug(req.params.slug);
    return ok(res, service);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postService = async (req, res) => {
  try {
    const parsed = createServiceSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid service payload", 400);

    const service = await createService(req.user._id, parsed.data);
    return ok(res, service, "Service created", 201);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const patchService = async (req, res) => {
  try {
    const idParsed = objectIdSchema.safeParse(req.params.id);
    if (!idParsed.success) return fail(res, "Invalid service id", 400);

    const bodyParsed = updateServiceSchema.safeParse(req.body);
    if (!bodyParsed.success)
      return fail(res, "Invalid service update payload", 400);

    if (Object.keys(bodyParsed.data).length === 0) {
      return fail(res, "No valid fields to update", 400);
    }

    const service = await updateService(
      req.user._id,
      idParsed.data,
      bodyParsed.data,
    );
    return ok(res, service, "Service updated");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const removeService = async (req, res) => {
  try {
    const parsed = objectIdSchema.safeParse(req.params.id);
    if (!parsed.success) return fail(res, "Invalid service id", 400);

    await deleteService(req.user._id, parsed.data);
    return ok(res, null, "Service deleted");
  } catch (error) {
    return handleControllerError(res, error);
  }
};
