import fs from "node:fs";
import { classifyModule, type Classification } from "./classify.js";
import { matchesIgnorePattern, type SharedOptions } from "./options.js";
import { resolveModule, type ResolveResult } from "./resolve-module.js";

export type GraphNode = {
  id: string;
  kind: "file" | "builtin" | "package" | "unresolved";
  packageName?: string;
  classification: Classification;
};

export type ImportEdge = {
  from: string;
  specifier: string;
  resolved: ResolveResult;
};

export type GraphWalkResult = {
  nodes: GraphNode[];
  edges: ImportEdge[];
  chains: Map<string, string[]>;
};

export type EntryImport = {
  specifier: string;
  node: unknown;
  isType: boolean;
  isNamespace: boolean;
};

const IMPORT_RE =
  /(?:^|\n)\s*(?:export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s*|import\s+(?:type\s+)?(?:[^'"\n]+?\s+from\s*)?)['"]([^'"]+)['"]/g;
const SIDE_EFFECT_RE =
  /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g;
const TYPE_IMPORT_RE =
  /(?:^|\n)\s*(?:import\s+type\s+|export\s+type\s+(?:\*|\{[^}]*\})\s+from\s+)/;

const fileImportCache = new Map<string, string[]>();
const graphCache = new Map<string, GraphWalkResult>();

export function clearGraphCaches(): void {
  fileImportCache.clear();
  graphCache.clear();
}

function stripCommentsAndStringsCarefully(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

export function collectValueImportSpecifiers(source: string): string[] {
  const cleaned = stripCommentsAndStringsCarefully(source);
  const specifiers = new Set<string>();

  for (const match of cleaned.matchAll(IMPORT_RE)) {
    const full = match[0] ?? "";
    const specifier = match[1];
    if (!specifier) {
      continue;
    }
    if (TYPE_IMPORT_RE.test(full)) {
      continue;
    }
    if (/import\s*\(/.test(full)) {
      continue;
    }
    specifiers.add(specifier);
  }

  for (const match of cleaned.matchAll(SIDE_EFFECT_RE)) {
    const full = match[0] ?? "";
    const specifier = match[1];
    if (!specifier) {
      continue;
    }
    if (TYPE_IMPORT_RE.test(full)) {
      continue;
    }
    specifiers.add(specifier);
  }

  return [...specifiers];
}

function readValueImports(filePath: string): string[] {
  const cached = fileImportCache.get(filePath);
  if (cached) {
    return cached;
  }
  let source = "";
  try {
    source = fs.readFileSync(filePath, "utf8");
  } catch {
    fileImportCache.set(filePath, []);
    return [];
  }
  const imports = collectValueImportSpecifiers(source);
  fileImportCache.set(filePath, imports);
  return imports;
}

function toGraphNode(
  resolved: ResolveResult,
  options: SharedOptions,
): GraphNode {
  const classification = classifyModule(resolved, options);
  if (resolved.kind === "file") {
    return { id: resolved.id, kind: "file", classification };
  }
  if (resolved.kind === "builtin") {
    return { id: resolved.id, kind: "builtin", classification };
  }
  if (resolved.kind === "package") {
    return {
      id: resolved.id,
      kind: "package",
      packageName: resolved.packageName,
      classification,
    };
  }
  return { id: resolved.id, kind: "unresolved", classification };
}

export function walkImportGraph(
  entryFile: string,
  options: SharedOptions & {
    seedSpecifiers?: string[];
  } = {},
): GraphWalkResult {
  const cacheKey = [
    entryFile,
    options.tsconfigPath ?? "",
    (options.allowModules ?? []).join(","),
    (options.denyModules ?? []).join(","),
    (options.ignorePatterns ?? []).join(","),
    (options.seedSpecifiers ?? []).join(","),
  ].join("|");

  const cached = graphCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const nodes: GraphNode[] = [];
  const edges: ImportEdge[] = [];
  const chains = new Map<string, string[]>();
  const visited = new Set<string>();
  const queue: Array<{ file: string; chain: string[] }> = [];

  chains.set(entryFile, [entryFile]);
  queue.push({ file: entryFile, chain: [entryFile] });
  visited.add(entryFile);
  nodes.push(
    toGraphNode({ kind: "file", id: entryFile }, options),
  );

  const seed = options.seedSpecifiers;
  let isFirst = true;

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }
    if (matchesIgnorePattern(current.file, options.ignorePatterns)) {
      continue;
    }

    const specifiers =
      isFirst && seed
        ? seed
        : readValueImports(current.file);
    isFirst = false;

    for (const specifier of specifiers) {
      const resolved = resolveModule(specifier, current.file, {
        tsconfigPath: options.tsconfigPath,
      });
      edges.push({ from: current.file, specifier, resolved });

      const node = toGraphNode(resolved, options);
      const nodeKey =
        resolved.kind === "package"
          ? `package:${resolved.packageName}`
          : resolved.id;

      if (!visited.has(nodeKey)) {
        visited.add(nodeKey);
        nodes.push(node);
        const nextChain = [...current.chain, displayForResolved(resolved)];
        chains.set(nodeKey, nextChain);
        chains.set(resolved.id, nextChain);

        if (resolved.kind === "file") {
          queue.push({ file: resolved.id, chain: nextChain });
        }
      }
    }
  }

  const result = { nodes, edges, chains };
  graphCache.set(cacheKey, result);
  return result;
}

function displayForResolved(resolved: ResolveResult): string {
  if (resolved.kind === "builtin") {
    return resolved.id.startsWith("node:") ? resolved.id : `node:${resolved.id}`;
  }
  if (resolved.kind === "package") {
    return resolved.packageName;
  }
  return resolved.id;
}

export function findDeniedPaths(
  walk: GraphWalkResult,
): Array<{ moduleId: string; chain: string[] }> {
  const denied: Array<{ moduleId: string; chain: string[] }> = [];
  for (const node of walk.nodes) {
    if (node.classification.kind !== "deny") {
      continue;
    }
    const key =
      node.kind === "package" ? `package:${node.packageName}` : node.id;
    const chain =
      walk.chains.get(key) ??
      walk.chains.get(node.id) ??
      walk.chains.get(node.classification.moduleId) ??
      [node.classification.moduleId];
    denied.push({ moduleId: node.classification.moduleId, chain });
  }
  return denied;
}
