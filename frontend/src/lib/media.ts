const DIRECT_IMAGE_PATH_REGEX = /\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i;

export function isDirectImageUrl(value: string): boolean {
  const raw = value.trim();
  if (!raw) return false;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    return DIRECT_IMAGE_PATH_REGEX.test(url.pathname + url.search + url.hash);
  } catch {
    return false;
  }
}

export function resolveSafeImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  return isDirectImageUrl(value) ? value.trim() : null;
}
