import { describe, expect, it, beforeEach } from "vitest";
import {
  clearResolveCaches,
  resolveModule,
} from "../dist/core/resolve-module.js";
import { fixturePath } from "./helpers.ts";

describe("resolve-module", () => {
  beforeEach(() => {
    clearResolveCaches();
  });

  it("resolves relative imports with extensions", () => {
    const from = fixturePath("basic", "middleware.ts");
    const result = resolveModule("./lib/greet", from);
    expect(result.kind).toBe("file");
    if (result.kind === "file") {
      expect(result.id).toBe(fixturePath("basic", "lib", "greet.ts"));
    }
  });

  it("resolves tsconfig path aliases", () => {
    const from = fixturePath("ts-paths", "middleware.ts");
    const result = resolveModule("@/lib/ping", from, {
      tsconfigPath: fixturePath("ts-paths", "tsconfig.json"),
    });
    expect(result.kind).toBe("file");
    if (result.kind === "file") {
      expect(result.id).toBe(fixturePath("ts-paths", "src", "lib", "ping.ts"));
    }
  });

  it("classifies node builtins", () => {
    const from = fixturePath("basic", "middleware.ts");
    const result = resolveModule("node:fs", from);
    expect(result).toEqual({ kind: "builtin", id: "node:fs" });
  });

  it("classifies bare builtins", () => {
    const from = fixturePath("basic", "middleware.ts");
    const result = resolveModule("fs", from);
    expect(result).toEqual({ kind: "builtin", id: "node:fs" });
  });
});
