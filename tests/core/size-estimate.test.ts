import { describe, expect, it, beforeEach } from "vitest";
import { distUrl } from "../dist-url.js";

const { estimateFileBytes, estimateGraphBytes } = await import(
  distUrl("core", "size-estimate.js")
);
const { walkImportGraph, clearGraphCaches } = await import(
  distUrl("core", "import-graph.js")
);
const { clearResolveCaches } = await import(distUrl("core", "resolve-module.js"));
const { fixturePath } = await import("../helpers.js");

describe("size-estimate", () => {
  beforeEach(() => {
    clearGraphCaches();
    clearResolveCaches();
  });

  it("measures file bytes", () => {
    const file = fixturePath("heavy-graph", "data", "products.ts");
    expect(estimateFileBytes(file)).toBeGreaterThan(50_000);
  });

  it("sums local graph bytes", () => {
    const entry = fixturePath("heavy-graph", "middleware.ts");
    const walk = walkImportGraph(entry);
    const estimate = estimateGraphBytes(walk.nodes);
    expect(estimate.totalBytes).toBeGreaterThan(50_000);
    expect(estimate.contributors[0]?.bytes).toBeGreaterThan(50_000);
  });
});
