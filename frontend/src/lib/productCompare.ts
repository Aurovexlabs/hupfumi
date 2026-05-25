import api from "@/lib/api";
import { storage } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

export type ProductCompareItem = {
  id: string;
  slug: string;
  title: string;
  price: number;
  originalPrice?: number;
  condition?: string;
  category?: string;
  rating?: number;
  stock?: number;
  imageUrl?: string;
  sellerName?: string;
};

const PRODUCT_COMPARE_STORAGE_KEY = "hupfumi-product-compare:v1";
const MAX_COMPARE_ITEMS = 3;
const PRODUCT_COMPARE_SYNC_DEBOUNCE_MS = 700;

let compareHydrationPromise: Promise<void> | null = null;
let compareSyncTimer: ReturnType<typeof setTimeout> | null = null;

function getAuthContext(): { isAuthenticated: boolean; userId: string | null } {
  const auth = useAuthStore.getState();
  return {
    isAuthenticated: Boolean(auth.isAuthenticated),
    userId: auth.user?._id ? String(auth.user._id) : null,
  };
}

function queueProductCompareCloudSync(items: ProductCompareItem[]): void {
  if (typeof window === "undefined") return;

  const { isAuthenticated, userId } = getAuthContext();
  if (!isAuthenticated || !userId) return;

  if (compareSyncTimer) {
    window.clearTimeout(compareSyncTimer);
  }

  const payloadItems = sanitizeCompareItems(items);

  compareSyncTimer = window.setTimeout(async () => {
    try {
      await api.put("/users/me/workspace/product-compare", {
        items: payloadItems,
      });
    } catch {
      // Keep local compare workspace when cloud sync fails.
    } finally {
      compareSyncTimer = null;
    }
  }, PRODUCT_COMPARE_SYNC_DEBOUNCE_MS);
}

function sanitizeCompareItems(input: unknown): ProductCompareItem[] {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const items: ProductCompareItem[] = [];

  input.forEach((rawItem) => {
    const item = rawItem as Partial<ProductCompareItem>;
    const id = String(item?.id ?? "").trim();
    const slug = String(item?.slug ?? "").trim();
    const title = String(item?.title ?? "").trim();

    if (!id || !slug || !title || seen.has(id)) return;

    seen.add(id);
    items.push({
      id,
      slug,
      title,
      price: Number(item?.price ?? 0),
      originalPrice: Number.isFinite(Number(item?.originalPrice))
        ? Number(item?.originalPrice)
        : undefined,
      condition: item?.condition ? String(item.condition) : undefined,
      category: item?.category ? String(item.category) : undefined,
      rating: Number.isFinite(Number(item?.rating))
        ? Number(item?.rating)
        : undefined,
      stock: Number.isFinite(Number(item?.stock)) ? Number(item?.stock) : 0,
      imageUrl: item?.imageUrl ? String(item.imageUrl) : undefined,
      sellerName: item?.sellerName ? String(item.sellerName) : undefined,
    });
  });

  return items.slice(0, MAX_COMPARE_ITEMS);
}

export function getProductCompareItems(): ProductCompareItem[] {
  return sanitizeCompareItems(storage.get(PRODUCT_COMPARE_STORAGE_KEY, []));
}

export async function hydrateProductCompareFromCloud(): Promise<void> {
  if (typeof window === "undefined") return;

  const { isAuthenticated, userId } = getAuthContext();
  if (!isAuthenticated || !userId) return;

  if (compareHydrationPromise) return compareHydrationPromise;

  compareHydrationPromise = (async () => {
    try {
      const response = await api.get("/users/me/workspace");
      const cloudItems = sanitizeCompareItems(
        response?.data?.data?.productCompare ?? [],
      );

      if (cloudItems.length > 0) {
        storage.set(PRODUCT_COMPARE_STORAGE_KEY, cloudItems);
      } else {
        storage.remove(PRODUCT_COMPARE_STORAGE_KEY);
      }
    } catch {
      // Fail silently and continue using local compare workspace.
    } finally {
      compareHydrationPromise = null;
    }
  })();

  return compareHydrationPromise;
}

export function isProductCompared(productId: string): boolean {
  if (!productId) return false;
  return getProductCompareItems().some((item) => item.id === String(productId));
}

export function clearProductCompareItems(): void {
  storage.remove(PRODUCT_COMPARE_STORAGE_KEY);
  queueProductCompareCloudSync([]);
}

export function toggleProductCompareItem(item: ProductCompareItem): {
  items: ProductCompareItem[];
  added: boolean;
  atLimit: boolean;
} {
  const current = getProductCompareItems();
  const index = current.findIndex(
    (existing) => existing.id === String(item.id),
  );

  if (index >= 0) {
    const items = current.filter((existing) => existing.id !== String(item.id));
    storage.set(PRODUCT_COMPARE_STORAGE_KEY, items);
    queueProductCompareCloudSync(items);
    return { items, added: false, atLimit: false };
  }

  if (current.length >= MAX_COMPARE_ITEMS) {
    return { items: current, added: false, atLimit: true };
  }

  const nextItem: ProductCompareItem = {
    ...item,
    id: String(item.id),
    slug: String(item.slug),
    title: String(item.title),
    price: Number(item.price ?? 0),
  };

  const items = [nextItem, ...current].slice(0, MAX_COMPARE_ITEMS);
  storage.set(PRODUCT_COMPARE_STORAGE_KEY, items);
  queueProductCompareCloudSync(items);
  return { items, added: true, atLimit: false };
}
