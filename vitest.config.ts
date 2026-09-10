import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, "dist");

export default defineConfig({
  resolve: {
    alias: {
      "@plugin": pathToFileURL(dist).href,
    },
  },
  server: {
    fs: {
      allow: [root, dist],
      strict: false,
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    server: {
      deps: {
        external: [dist, new RegExp(`^${dist.replace(/[\\^$*+?.()|[\]{}]/g, "\\$&")}`)],
      },
    },
  },
});
