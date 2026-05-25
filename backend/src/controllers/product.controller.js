import { z } from "zod";
import {
  createProduct,
  deleteProduct,
  getMyProducts,
  getProductBySlug,
  listProducts,
  updateProduct,
} from "../services/product.service.js";
import { handleControllerError } from "../utils/controller.js";
import { fail, ok, paginated } from "../utils/response.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const listProductsQuerySchema = z.object({
  q: z.string().trim().max(160).optional(),
  category: z.string().trim().max(80).optional(),
  condition: z.enum(["new", "used", "refurbished"]).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  sort: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

const createProductSchema = z.object({
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(20).max(5000),
  category: z.string().trim().min(2).max(80),
  price: z.coerce.number().min(0.01).max(1000000),
  condition: z.enum(["new", "used", "refurbished"]).default("new"),
  inventory: z
    .object({
      quantity: z.coerce.number().int().min(0).max(100000).default(0),
      sku: z.string().trim().max(80).optional(),
    })
    .optional(),
  discount: z
    .object({
      type: z.enum(["percent", "fixed"]),
      value: z.coerce.number().min(0),
      expiresAt: z.any().optional(),
    })
    .optional(),
  location: z
    .object({
      city: z.string().trim().max(120).optional(),
      province: z.string().trim().max(120).optional(),
    })
    .optional(),
});

const updateProductSchema = z
  .object({
    title: z.string().trim().min(5).max(140).optional(),
    description: z.string().trim().min(20).max(5000).optional(),
    category: z.string().trim().min(2).max(80).optional(),
    price: z.coerce.number().min(0.01).max(1000000).optional(),
    condition: z.enum(["new", "used", "refurbished"]).optional(),
    images: z.array(z.any()).max(20).optional(),
    inventory: z
      .object({
        quantity: z.coerce.number().int().min(0).max(100000).optional(),
        sku: z.string().trim().max(80).optional(),
      })
      .optional(),
    discount: z
      .object({
        type: z.enum(["percent", "fixed"]),
        value: z.coerce.number().min(0),
        expiresAt: z.any().optional(),
      })
      .optional(),
    location: z
      .object({
        city: z.string().trim().max(120).optional(),
        province: z.string().trim().max(120).optional(),
      })
      .optional(),
    status: z
      .enum(["draft", "active", "sold", "paused", "suspended"])
      .optional(),
    featured: z.boolean().optional(),
  })
  .strict();

export const getProducts = async (req, res) => {
  try {
    const parsed = listProductsQuerySchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid product search query", 400);

    const result = await listProducts(parsed.data);
    return paginated(res, result.data, result.pagination);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getMyProductList = async (req, res) => {
  try {
    const data = await getMyProducts(req.user._id);
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await getProductBySlug(req.params.slug);
    return ok(res, product);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postProduct = async (req, res) => {
  try {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid product payload", 400);

    const product = await createProduct(req.user._id, parsed.data);
    return ok(res, product, "Product listed", 201);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const patchProduct = async (req, res) => {
  try {
    const idParsed = objectIdSchema.safeParse(req.params.id);
    if (!idParsed.success) return fail(res, "Invalid product id", 400);

    const bodyParsed = updateProductSchema.safeParse(req.body);
    if (!bodyParsed.success)
      return fail(res, "Invalid product update payload", 400);

    if (Object.keys(bodyParsed.data).length === 0) {
      return fail(res, "No valid fields to update", 400);
    }

    const product = await updateProduct(
      req.user._id,
      idParsed.data,
      bodyParsed.data,
    );
    return ok(res, product, "Product updated");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const removeProduct = async (req, res) => {
  try {
    const parsed = objectIdSchema.safeParse(req.params.id);
    if (!parsed.success) return fail(res, "Invalid product id", 400);

    await deleteProduct(req.user._id, parsed.data);
    return ok(res, null, "Product deleted");
  } catch (error) {
    return handleControllerError(res, error);
  }
};
