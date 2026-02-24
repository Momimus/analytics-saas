type ActivityLike = {
  eventName: string;
  metadata?: unknown;
  productId?: string | null;
  orderId?: string | null;
  userId?: string | null;
  actorLabel?: string;
};

function toTitleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function shortId(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(-6);
}

function metadataObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function formatEventType(eventName: string): string {
  const normalized = eventName.trim().toLowerCase();
  if (normalized === "page_view") return "Page viewed";
  if (normalized === "login") return "Signed in";
  if (normalized === "logout") return "Signed out";
  if (normalized === "product_created") return "Product created";
  if (normalized === "order_created") return "Order created";
  if (normalized === "settings_updated") return "Settings updated";
  return toTitleCase(normalized || "event");
}

export function formatEventDetail(event: ActivityLike): string {
  const normalized = event.eventName.trim().toLowerCase();
  const meta = metadataObject(event.metadata);
  const productShort = shortId(event.productId);
  const orderShort = shortId(event.orderId);

  if (normalized === "page_view") {
    const path = typeof meta?.path === "string" ? meta.path.trim() : "";
    return path ? `Path ${path}` : "Viewed a page";
  }

  if (normalized === "product_created") {
    return productShort ? `Product #${productShort}` : "Created a product";
  }

  if (normalized === "order_created") {
    if (orderShort && productShort) return `Order #${orderShort} for product #${productShort}`;
    if (orderShort) return `Order #${orderShort}`;
    if (productShort) return `Product #${productShort}`;
    return "Created an order";
  }

  if (normalized === "settings_updated") {
    const section = typeof meta?.section === "string" ? meta.section.trim() : "";
    return section ? `Updated ${section} settings` : "Updated settings";
  }

  if (normalized === "login" || normalized === "logout") {
    const source = typeof meta?.source === "string" ? meta.source.trim() : "";
    return source ? `${toTitleCase(source)} session` : "Admin session";
  }

  if (productShort) return `Product #${productShort}`;
  if (orderShort) return `Order #${orderShort}`;
  return "General event";
}

export function formatActorLabel(event: ActivityLike): string {
  const actorLabel = typeof event.actorLabel === "string" ? event.actorLabel.trim() : "";
  if (actorLabel) return actorLabel;
  const actorId = event.userId?.trim();
  if (!actorId) return "System";
  return `User #${actorId.slice(-6)}`;
}
