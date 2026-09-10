import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      name: "js-to-ts-resolve",
      enforce: "pre",
      async resolveId(source, importer, options) {
        if (!importer || !source.endsWith(".js") || source.includes("node_modules")) {
          return null;
        }
        if (!source.startsWith(".") && !path.isAbsolute(source)) {
          return null;
        }
        const candidate = source.replace(/\.js$/, ".ts");
        const resolved = await this.resolve(candidate, importer, {
          ...options,
          skipSelf: true,
        });
        return resolved ?? null;
      },
    },
  ],
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
