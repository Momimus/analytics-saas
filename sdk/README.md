# Analytics SDK

Minimal event tracking SDK for this Product Analytics backend.

## Installation

Internal app usage:

```ts
import analytics from "../src/sdk";
```

External usage:

1. Copy `sdk/analytics-sdk.ts` into your app.
2. Build/transpile it with your TypeScript pipeline.
3. Import and initialize.

## Quick Start

```ts
import analytics from "./analytics-sdk";

analytics.init({
  endpoint: "http://localhost:4000",
  autoTrackPage: true,
});

analytics.identify("user_123");
analytics.track("product_viewed", { productId: "123", price: 49.99 });
analytics.page("dashboard");
```

## API

### `init(config)`

```ts
type AnalyticsInitConfig = {
  endpoint: string;
  apiKey?: string;
  userId?: string;
  workspaceId?: string;
  autoTrackPage?: boolean;
};
```

- `endpoint` is required.
- `autoTrackPage` enables page view auto-capture on history/navigation changes.

### `track(eventName, metadata?)`

Sends:

```json
{
  "eventName": "product_viewed",
  "metadata": { "productId": "123" },
  "timestamp": "2026-01-01T00:00:00.000Z",
  "userId": "optional",
  "workspaceId": "optional"
}
```

### `identify(userId)`

- Sets SDK user context.
- Emits `identify` event with metadata.

### `page(pageName?, metadata?)`

- Emits `page_view`.
- Includes `path` and `title` when running in browser.

### `setUser(userId)`

Updates user context for subsequent events.

### `setWorkspace(workspaceId?)`

Updates workspace context for subsequent events.

### `reset()`

Clears user/workspace context and cached CSRF token.

## Error Handling

- SDK never throws uncaught exceptions.
- Network and serialization errors are swallowed.
- Debug logs appear only in non-production runtime.

## Backend Endpoint

SDK sends `POST /track` and supports:

- `eventName` (required)
- `metadata` (optional object)
- `userId` (optional)
- `workspaceId` (optional, stored in metadata for now)

