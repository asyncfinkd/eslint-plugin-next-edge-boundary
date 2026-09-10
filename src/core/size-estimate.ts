import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_PACKAGE_WEIGHTS,
} from "./constants.js";
import { matchesIgnorePattern } from "./options.js";
import type { GraphNode } from "./import-graph.js";

export type SizeContributor = {
  id: string;
  bytes: number;
};

export type SizeEstimate = {
  totalBytes: number;
  contributors: SizeContributor[];
};

export function estimateFileBytes(filePath: string): number {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

export function estimateGraphBytes(
  nodes: GraphNode[],
  options: {
    includeNodeModules?: boolean;
    packageWeights?: Record<string, number>;
    ignorePatterns?: string[];
    cwd?: string;
  } = {},
): SizeEstimate {
  const weights = {
    ...DEFAULT_PACKAGE_WEIGHTS,
    ...options.packageWeights,
  };
  const contributors: SizeContributor[] = [];
  let totalBytes = 0;
  const seen = new Set<string>();

  for (const node of nodes) {
    if (seen.has(node.id)) {
      continue;
    }
    seen.add(node.id);

    if (node.kind === "file") {
      if (matchesIgnorePattern(node.id, options.ignorePatterns)) {
        continue;
      }
      if (!options.includeNodeModules && node.id.includes(`${path.sep}node_modules${path.sep}`)) {
        continue;
      }
      const bytes = estimateFileBytes(node.id);
      totalBytes += bytes;
      contributors.push({ id: node.id, bytes });
      continue;
    }

    if (node.kind === "package" && options.includeNodeModules) {
      const packageName = node.packageName ?? node.id;
      const bytes = weights[packageName] ?? 5_000;
      totalBytes += bytes;
      contributors.push({ id: packageName, bytes });
    }
  }

  contributors.sort((a, b) => b.bytes - a.bytes);
  return { totalBytes, contributors };
}
