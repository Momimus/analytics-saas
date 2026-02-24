import { apiFetch } from "./api";

type TrackOptions = {
  productId?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
};

let didLogTrackError = false;
let lastPageViewKey = "";
let lastPageViewAt = 0;

export async function track(eventName: string, opts?: TrackOptions) {
  try {
    await apiFetch("/track", {
      method: "POST",
      body: JSON.stringify({
        eventName,
        ...(opts?.productId ? { productId: opts.productId } : {}),
        ...(opts?.orderId ? { orderId: opts.orderId } : {}),
        ...(opts?.metadata ? { metadata: opts.metadata } : {}),
      }),
    });
  } catch (error) {
    if (!didLogTrackError) {
      didLogTrackError = true;
      console.debug("track failed", error);
    }
  }
}

export function trackPageView(pathname: string) {
  const now = Date.now();
  if (lastPageViewKey === pathname && now - lastPageViewAt < 1200) {
    return;
  }
  lastPageViewKey = pathname;
  lastPageViewAt = now;
  void track("page_view", { metadata: { path: pathname } });
}
