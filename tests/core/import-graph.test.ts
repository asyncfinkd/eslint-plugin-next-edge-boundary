import { describe, expect, it, beforeEach } from "vitest";
import {
  clearGraphCaches,
  collectValueImportSpecifiers,
  findDeniedPaths,
  walkImportGraph,
} from "../dist/core/import-graph.js";
import { clearResolveCaches } from "../dist/core/resolve-module.js";
import { fixturePath } from "../helpers";

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
