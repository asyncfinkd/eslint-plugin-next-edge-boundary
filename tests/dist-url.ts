import { pathToFileURL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

export function distUrl(...parts: string[]): string {
  return pathToFileURL(path.join(dist, ...parts)).href;
}
