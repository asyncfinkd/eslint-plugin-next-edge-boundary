import { describe, expect, it } from "vitest";
import { estimateFileBytes, estimateGraphBytes } from "../dist/core/size-estimate.js";
import { walkImportGraph } from "../dist/core/import-graph.js";
import { clearGraphCaches } from "../dist/core/import-graph.js";
import { clearResolveCaches } from "../dist/core/resolve-module.js";
import { fixturePath } from "../helpers";
import { beforeEach } from "vitest";

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
    expect(estimate.contributors[0]?.bytes).toBeGreaterThan(40_000);
  });
});
