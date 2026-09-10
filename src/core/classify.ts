import {
  DEFAULT_DENY_PACKAGES,
  NODE_BUILTINS,
} from "./constants.js";
import { matchesAllowOrDeny } from "./options.js";
import type { ResolveResult } from "./resolve-module.js";

export type Classification =
  | { kind: "allow"; reason: "allowlist" | "local" | "unknown-package" }
  | { kind: "deny"; reason: "builtin" | "denylist"; moduleId: string };

function normalizeBuiltin(id: string): string {
  return id.startsWith("node:") ? id.slice("node:".length) : id;
}

function isDeniedBuiltin(id: string): boolean {
  const name = normalizeBuiltin(id);
  return NODE_BUILTINS.has(name);
}

export function classifyModule(
  resolved: ResolveResult,
  options: {
    allowModules?: string[];
    denyModules?: string[];
  } = {},
): Classification {
  const rawId =
    resolved.kind === "package"
      ? resolved.packageName
      : resolved.id;

  const displayId =
    resolved.kind === "builtin"
      ? resolved.id.startsWith("node:")
        ? resolved.id
        : `node:${resolved.id}`
      : resolved.kind === "package"
        ? resolved.packageName
        : resolved.id;

  if (matchesAllowOrDeny(displayId, options.allowModules)) {
    return { kind: "allow", reason: "allowlist" };
  }
  if (resolved.kind === "package" && matchesAllowOrDeny(rawId, options.allowModules)) {
    return { kind: "allow", reason: "allowlist" };
  }

  if (matchesAllowOrDeny(displayId, options.denyModules)) {
    return { kind: "deny", reason: "denylist", moduleId: displayId };
  }
  if (resolved.kind === "package" && matchesAllowOrDeny(rawId, options.denyModules)) {
    return { kind: "deny", reason: "denylist", moduleId: rawId };
  }

  if (resolved.kind === "builtin" && isDeniedBuiltin(resolved.id)) {
    return {
      kind: "deny",
      reason: "builtin",
      moduleId: displayId,
    };
  }

  if (resolved.kind === "package") {
    const denySet = new Set<string>([
      ...DEFAULT_DENY_PACKAGES,
      ...(options.denyModules ?? []),
    ]);
    if (denySet.has(resolved.packageName)) {
      return {
        kind: "deny",
        reason: "denylist",
        moduleId: resolved.packageName,
      };
    }
    return { kind: "allow", reason: "unknown-package" };
  }

  if (resolved.kind === "file") {
    return { kind: "allow", reason: "local" };
  }

  return { kind: "allow", reason: "unknown-package" };
}
