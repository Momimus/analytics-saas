import { HttpError } from "./httpError.js";

const DIRECT_IMAGE_PATH_REGEX = /\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i;

export function assertDirectImageUrl(value: string, message = "Image URL must be a direct link to jpg, png, webp, or gif") {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new HttpError(400, message);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new HttpError(400, message);
  }

  if (!DIRECT_IMAGE_PATH_REGEX.test(parsed.pathname + parsed.search + parsed.hash)) {
    throw new HttpError(400, message);
  }
}

export function assertHttpOrUploadUrl(
  value: string,
  message = "URL must be an absolute http(s) URL or a valid upload placeholder path"
) {
  if (value.startsWith("/uploads/pending/")) {
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new HttpError(400, message);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new HttpError(400, message);
  }
}
