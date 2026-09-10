import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));
const distRoot = path.join(root, "dist");

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    server: {
      deps: {
        external: [new RegExp(`^${distRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)],
      },
    },
  },
});
