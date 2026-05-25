import { storage } from "@/lib/utils";

export type RecentlyViewedType = "product" | "service" | "job";

export type RecentlyViewedItem = {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  price?: number;
  imageUrl?: string;
  viewedAt: string;
};

const KEY_PREFIX = "hupfumi-recently-viewed";

function keyFor(type: RecentlyViewedType): string {
  return `${KEY_PREFIX}:${type}:v1`;
}

export function getRecentlyViewed(
  type: RecentlyViewedType,
  excludeId?: string,
  limit = 4,
): RecentlyViewedItem[] {
  const list = storage.get<RecentlyViewedItem[]>(keyFor(type), []);

  return list
    .filter((item) => item && item.slug && item.id)
    .filter((item) => (excludeId ? item.id !== excludeId : true))
    .slice(0, limit);
}

export function trackRecentlyViewed(
  type: RecentlyViewedType,
  item: Omit<RecentlyViewedItem, "viewedAt">,
  maxItems = 12,
): void {
  const existing = storage.get<RecentlyViewedItem[]>(keyFor(type), []);

  const next: RecentlyViewedItem[] = [
    {
      ...item,
      id: String(item.id),
      slug: String(item.slug),
      title: String(item.title),
      viewedAt: new Date().toISOString(),
    },
    ...existing.filter((entry) => String(entry.id) !== String(item.id)),
  ].slice(0, maxItems);

  storage.set(keyFor(type), next);
}
