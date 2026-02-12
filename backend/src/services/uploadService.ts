function normalizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function buildUploadPlaceholder(kind: "video" | "pdf", filename?: string) {
  const safeName = filename ? normalizeFilename(filename) : `${kind}-${Date.now()}`;
  return `/uploads/pending/${kind}/${safeName}`;
}