import analytics from "../sdk";

type TrackOptions = {
  productId?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
};

let lastPageViewKey = "";
let lastPageViewAt = 0;
let initialized = false;

function ensureInit() {
  if (initialized) return;
  analytics.init({
    endpoint: (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:4000",
    autoTrackPage: false,
  });
  initialized = true;
}

export function setTrackingWorkspace(workspaceId: string | null) {
  ensureInit();
  analytics.setWorkspace(workspaceId ?? undefined);
}

export async function track(eventName: string, opts?: TrackOptions) {
  ensureInit();
  const metadata = {
    ...(opts?.metadata ?? {}),
    ...(opts?.productId ? { productId: opts.productId } : {}),
    ...(opts?.orderId ? { orderId: opts.orderId } : {}),
  };
  await analytics.track(eventName, metadata);
}

export function trackPageView(pathname: string) {
  ensureInit();
  const now = Date.now();
  if (lastPageViewKey === pathname && now - lastPageViewAt < 1200) {
    return;
  }
  lastPageViewKey = pathname;
  lastPageViewAt = now;
  void analytics.page(undefined, { path: pathname });
}
