export type RuntimeMode = "src" | "dist";

export function detectRuntimeMode(filePath: string): RuntimeMode {
  return /[\\/]dist[\\/]/.test(filePath) ? "dist" : "src";
}
