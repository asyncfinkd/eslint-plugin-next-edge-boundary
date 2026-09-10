import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vitest/config";

function jsToTs(): Plugin {
  return {
    name: "js-to-ts-resolve",
    enforce: "pre",
    resolveId(source, importer) {
      if (!importer || !source.endsWith(".js")) {
        return null;
      }
      if (!source.startsWith(".") && !path.isAbsolute(source)) {
        return null;
      }
      const absolute = path.isAbsolute(source)
        ? source
        : path.resolve(path.dirname(importer), source);
      const asTs = absolute.replace(/\.js$/, ".ts");
      if (fs.existsSync(asTs)) {
        return asTs;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [jsToTs()],
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
