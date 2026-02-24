import { apiFetch } from "../lib/api";

export type AnalyticsRange = "7d" | "30d";
export type AnalyticsMetric = "revenue" | "orders" | "users";

export type AnalyticsOverview = {
  revenue: number;
  orders: number;
  activeUsers: number;
  conversionRate: number;
  prior: {
    revenue: number;
    orders: number;
    activeUsers: number;
    conversionRate: number;
  };
  deltas: {
    revenueDeltaPct: number;
    ordersDeltaPct: number;
    activeUsersDeltaPct: number;
    conversionDeltaPts: number;
  };
};

export type AnalyticsTrend = {
  labels: string[];
  data: number[];
};

export type AnalyticsActivityEvent = {
  id: string;
  eventName: string;
  userId: string | null;
  actorLabel?: string;
  createdAt: string;
  productId: string | null;
  orderId: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AnalyticsActivityResponse = {
  events: AnalyticsActivityEvent[];
  nextCursor: string | null;
};

export type AdminProductListItem = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt?: string;
  _count?: {
    orders?: number;
    events?: number;
  };
};

export type AdminProductsResponse = {
  products: AdminProductListItem[];
  nextCursor: string | null;
};

export type CreateAdminProductInput = {
  name: string;
  price: number;
};

export type AdminOrderListItem = {
  id: string;
  createdAt: string;
  productId: string;
  amount: number;
  status: string;
  product?: {
    id: string;
    name: string;
  };
  _count?: {
    events?: number;
  };
};

export type AdminOrdersResponse = {
  orders: AdminOrderListItem[];
  nextCursor: string | null;
};

function normalizeRange(range: string): AnalyticsRange {
  return range === "30d" ? "30d" : "7d";
}

export function getOverview(range: string) {
  const safeRange = normalizeRange(range);
  return apiFetch<AnalyticsOverview>(`/admin/analytics/overview?range=${safeRange}`);
}

export function getTrends(metric: AnalyticsMetric, range: string) {
  const safeRange = normalizeRange(range);
  return apiFetch<AnalyticsTrend>(`/admin/analytics/trends?metric=${metric}&range=${safeRange}`);
}

export function getActivity(range: string, limit = 50, q?: string, cursor?: string) {
  const safeRange = normalizeRange(range);
  const params = new URLSearchParams();
  params.set("range", safeRange);
  params.set("limit", String(limit));
  if (q?.trim()) {
    params.set("q", q.trim());
  }
  if (cursor?.trim()) {
    params.set("cursor", cursor.trim());
  }
  return apiFetch<AnalyticsActivityResponse>(`/admin/analytics/activity?${params.toString()}`);
}

export function listAdminProducts(params?: { cursor?: string; q?: string; limit?: number }) {
  const query = new URLSearchParams();
  query.set("limit", String(Math.min(100, Math.max(1, params?.limit ?? 25))));
  if (params?.q?.trim()) {
    query.set("q", params.q.trim());
  }
  if (params?.cursor?.trim()) {
    query.set("cursor", params.cursor.trim());
  }
  return apiFetch<AdminProductsResponse>(`/admin/products?${query.toString()}`);
}

export function createAdminProduct(input: CreateAdminProductInput) {
  return apiFetch<{ product: AdminProductListItem }>(`/admin/products`, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      price: input.price,
      isActive: true,
    }),
  });
}

export function listAdminOrders(params?: { cursor?: string; q?: string; limit?: number }) {
  const query = new URLSearchParams();
  query.set("limit", String(Math.min(100, Math.max(1, params?.limit ?? 25))));
  if (params?.q?.trim()) {
    query.set("q", params.q.trim());
  }
  if (params?.cursor?.trim()) {
    query.set("cursor", params.cursor.trim());
  }
  return apiFetch<AdminOrdersResponse>(`/admin/orders?${query.toString()}`);
}

export function archiveAdminProduct(id: string) {
  return apiFetch<{ ok: true }>(`/admin/products/${id}`, {
    method: "DELETE",
  });
}

export function updateAdminOrderStatus(id: string, status: "completed" | "pending" | "refunded" | "canceled") {
  return apiFetch<{ order: AdminOrderListItem }>(`/admin/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
