import path from "node:path";

const ENTRY_BASENAMES = new Set([
  "middleware.ts",
  "middleware.js",
  "middleware.mts",
  "middleware.mjs",
  "middleware.cts",
  "middleware.cjs",
  "proxy.ts",
  "proxy.js",
  "proxy.mts",
  "proxy.mjs",
  "proxy.cts",
  "proxy.cjs",
]);

export function isEdgeEntrypoint(filename: string): boolean {
  const base = path.basename(filename);
  return ENTRY_BASENAMES.has(base);
}
