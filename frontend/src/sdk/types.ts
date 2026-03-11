export type AnalyticsMetadata = Record<string, unknown>;

export type AnalyticsInitConfig = {
  endpoint: string;
  apiKey?: string;
  userId?: string;
  workspaceId?: string;
  autoTrackPage?: boolean;
};

export type AnalyticsEventPayload = {
  eventName: string;
  metadata?: AnalyticsMetadata;
  timestamp: string;
  userId?: string;
  workspaceId?: string;
};

export type AnalyticsClient = {
  init: (config: AnalyticsInitConfig) => void;
  track: (eventName: string, metadata?: AnalyticsMetadata) => Promise<void>;
  identify: (userId: string) => Promise<void>;
  page: (pageName?: string, metadata?: AnalyticsMetadata) => Promise<void>;
  setUser: (userId: string) => void;
  setWorkspace: (workspaceId?: string) => void;
  reset: () => void;
};

declare global {
  interface Window {
    analytics?: AnalyticsClient;
  }
}

