import { HttpError } from "../utils/httpError.js";

const EVENT_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const MAX_METADATA_BYTES = 10 * 1024;
const MAX_TOP_LEVEL_KEYS = 50;
const MAX_METADATA_DEPTH = 3;
const MAX_ID_LENGTH = 80;

function inspectMetadataDepth(value: unknown, depth: number): void {
  if (depth > MAX_METADATA_DEPTH) {
    throw new HttpError(400, "metadata depth must be <= 3");
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      inspectMetadataDepth(item, depth + 1);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      inspectMetadataDepth(nested, depth + 1);
    }
  }
}

export function validateEventName(value: unknown): string {
  const eventName = typeof value === "string" ? value.trim() : "";
  if (eventName.length < 2 || eventName.length > 60) {
    throw new HttpError(400, "eventName must be between 2 and 60 characters");
  }
  if (!EVENT_NAME_REGEX.test(eventName)) {
    throw new HttpError(400, "eventName contains invalid characters");
  }
  return eventName;
}

export function validateOptionalId(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new HttpError(400, `${fieldName} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new HttpError(400, `${fieldName} cannot be empty`);
  }
  if (trimmed.length > MAX_ID_LENGTH) {
    throw new HttpError(400, `${fieldName} must be at most ${MAX_ID_LENGTH} characters`);
  }
  return trimmed;
}

export function validateMetadata(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "metadata must be an object");
  }

  const metadata = value as Record<string, unknown>;
  const topLevelKeyCount = Object.keys(metadata).length;
  if (topLevelKeyCount > MAX_TOP_LEVEL_KEYS) {
    throw new HttpError(400, "metadata exceeds maximum top-level keys (50)");
  }

  inspectMetadataDepth(metadata, 1);

  let serialized = "";
  try {
    serialized = JSON.stringify(metadata);
  } catch {
    throw new HttpError(400, "metadata must be JSON serializable");
  }
  if (Buffer.byteLength(serialized, "utf8") > MAX_METADATA_BYTES) {
    throw new HttpError(400, "metadata exceeds 10KB");
  }

  return metadata;
}

