import { describe, expect, it, beforeEach } from "vitest";
import { distUrl } from "../dist-url.js";

const { clearResolveCaches, resolveModule } = await import(
  distUrl("core", "resolve-module.js")
);
const { fixturePath } = await import("../helpers.js");

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

  it("resolves @/* aliases in Next-like tsconfig with **/*.ts includes", () => {
    const from = fixturePath("ts-paths-next", "middleware.ts");
    const result = resolveModule("@/lib/ping", from, {
      tsconfigPath: fixturePath("ts-paths-next", "tsconfig.json"),
    });
    expect(result.kind).toBe("file");
    if (result.kind === "file") {
      expect(result.id).toBe(fixturePath("ts-paths-next", "src", "lib", "ping.ts"));
    }
  });

  it("auto-discovers Next-like tsconfig from a nested entry without tsconfigPath", () => {
    const from = fixturePath("ts-paths-next", "middleware.ts");
    const result = resolveModule("@/lib/ping", from);
    expect(result.kind).toBe("file");
    if (result.kind === "file") {
      expect(result.id).toBe(fixturePath("ts-paths-next", "src", "lib", "ping.ts"));
    }
  });

  it("reuses parent tsconfig when resolving repeatedly from nested dirs", () => {
    const from = fixturePath("ts-paths-next", "src", "lib", "boom.ts");
    const first = resolveModule("@/lib/ping", from);
    const second = resolveModule("@/lib/ping", from);
    expect(first.kind).toBe("file");
    expect(second.kind).toBe("file");
  });

});
