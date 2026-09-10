import { describe, expect, it, beforeEach } from "vitest";
import { distUrl } from "../dist-url.js";

const {
  clearGraphCaches,
  collectValueImportSpecifiers,
  findDeniedPaths,
  walkImportGraph,
} = await import(distUrl("core", "import-graph.js"));
const { clearResolveCaches } = await import(distUrl("core", "resolve-module.js"));
const { fixturePath } = await import("../helpers.js");

describe("import-graph", () => {
  beforeEach(() => {
    clearGraphCaches();
    clearResolveCaches();
  });

  it("skips type-only imports", () => {
    const source = `
      import type { Huge } from "./huge";
      import { ok } from "./ok";
      export type { Other } from "./other";
    `;
    expect(collectValueImportSpecifiers(source)).toEqual(["./ok"]);
  });

  it("includes re-exports as edges", () => {
    const source = `
      export { helper } from "./helper";
      export * from "./barrel";
    `;
    expect(collectValueImportSpecifiers(source).sort()).toEqual([
      "./barrel",
      "./helper",
    ]);
  });

  it("ignores dynamic import()", () => {
    const source = `
      const mod = await import("./heavy");
      import { ok } from "./ok";
    `;
    expect(collectValueImportSpecifiers(source)).toEqual(["./ok"]);
  });

  it("walks transitive node:fs from middleware", () => {
    const entry = fixturePath("node-transitive", "middleware.ts");
    const walk = walkImportGraph(entry);
    const denied = findDeniedPaths(walk);
    expect(denied.length).toBeGreaterThan(0);
    expect(denied[0]?.moduleId).toMatch(/fs/);
    expect(denied[0]?.chain.length).toBeGreaterThanOrEqual(3);
  });
});
