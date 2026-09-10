import fs from "node:fs";
import path from "node:path";
import { isBuiltin } from "node:module";
import { SOURCE_EXTENSIONS } from "./constants.js";

export type TsPathsConfig = {
  baseUrl?: string;
  paths?: Record<string, string[]>;
  configDir: string;
};

export type ResolveResult =
  | { kind: "builtin"; id: string }
  | { kind: "package"; id: string; packageName: string }
  | { kind: "file"; id: string }
  | { kind: "unresolved"; id: string };

const tsconfigCache = new Map<string, TsPathsConfig | null>();
const resolveCache = new Map<string, ResolveResult>();

function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function tryExtensions(basePath: string): string | null {
  if (fileExists(basePath)) {
    return basePath;
  }
  for (const ext of SOURCE_EXTENSIONS) {
    const withExt = `${basePath}${ext}`;
    if (fileExists(withExt)) {
      return withExt;
    }
  }
  for (const ext of SOURCE_EXTENSIONS) {
    const indexPath = path.join(basePath, `index${ext}`);
    if (fileExists(indexPath)) {
      return indexPath;
    }
  }
  return null;
}

function readJson(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function stripJsonComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function loadTsConfig(startDir: string, overridePath?: string): TsPathsConfig | null {
  if (overridePath) {
    const absolute = path.isAbsolute(overridePath)
      ? overridePath
      : path.resolve(startDir, overridePath);
    const cached = tsconfigCache.get(absolute);
    if (cached !== undefined) {
      return cached;
    }
    const parsed = parseTsConfigFile(absolute);
    tsconfigCache.set(absolute, parsed);
    return parsed;
  }

  let dir = startDir;
  for (;;) {
    const cached = tsconfigCache.get(dir);
    if (cached !== undefined) {
      return cached;
    }
    for (const name of ["tsconfig.json", "jsconfig.json"]) {
      const candidate = path.join(dir, name);
      if (fileExists(candidate)) {
        const parsed = parseTsConfigFile(candidate);
        tsconfigCache.set(dir, parsed);
        return parsed;
      }
    }
    tsconfigCache.set(dir, null);
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

function parseTsConfigFile(configPath: string): TsPathsConfig | null {
  const rawText = fs.readFileSync(configPath, "utf8");
  let data: unknown;
  try {
    data = JSON.parse(stripJsonComments(rawText)) as unknown;
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") {
    return null;
  }
  const compilerOptions = (data as { compilerOptions?: unknown }).compilerOptions;
  if (!compilerOptions || typeof compilerOptions !== "object") {
    return {
      configDir: path.dirname(configPath),
    };
  }
  const opts = compilerOptions as {
    baseUrl?: unknown;
    paths?: unknown;
  };
  const paths =
    opts.paths && typeof opts.paths === "object" && !Array.isArray(opts.paths)
      ? (opts.paths as Record<string, string[]>)
      : undefined;
  return {
    configDir: path.dirname(configPath),
    baseUrl: typeof opts.baseUrl === "string" ? opts.baseUrl : undefined,
    paths,
  };
}

function matchTsPath(
  specifier: string,
  config: TsPathsConfig,
): string | null {
  if (!config.paths) {
    if (config.baseUrl) {
      const base = path.resolve(config.configDir, config.baseUrl);
      return tryExtensions(path.join(base, specifier));
    }
    return null;
  }

  for (const [pattern, targets] of Object.entries(config.paths)) {
    if (pattern.includes("*")) {
      const [prefix, suffix] = pattern.split("*");
      if (
        specifier.startsWith(prefix) &&
        (suffix === undefined || specifier.endsWith(suffix))
      ) {
        const star = specifier.slice(
          prefix.length,
          suffix ? specifier.length - suffix.length : undefined,
        );
        for (const target of targets) {
          const mapped = target.replace("*", star);
          const absolute = path.resolve(
            config.configDir,
            config.baseUrl ?? ".",
            mapped,
          );
          const resolved = tryExtensions(absolute);
          if (resolved) {
            return resolved;
          }
        }
      }
    } else if (specifier === pattern) {
      for (const target of targets) {
        const absolute = path.resolve(
          config.configDir,
          config.baseUrl ?? ".",
          target,
        );
        const resolved = tryExtensions(absolute);
        if (resolved) {
          return resolved;
        }
      }
    }
  }

  if (config.baseUrl) {
    const absolute = path.resolve(
      config.configDir,
      config.baseUrl,
      specifier,
    );
    return tryExtensions(absolute);
  }
  return null;
}

function packageNameFromSpecifier(specifier: string): string {
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    return parts.slice(0, 2).join("/");
  }
  return specifier.split("/")[0] ?? specifier;
}

function resolvePackageEntry(
  fromFile: string,
  packageName: string,
): string | null {
  let dir = path.dirname(fromFile);
  for (;;) {
    const pkgRoot = path.join(dir, "node_modules", packageName);
    const pkgJsonPath = path.join(pkgRoot, "package.json");
    if (fileExists(pkgJsonPath)) {
      const pkg = readJson(pkgJsonPath) as {
        main?: string;
        module?: string;
        exports?: unknown;
      } | null;
      if (!pkg) {
        return pkgRoot;
      }
      if (typeof pkg.exports === "string") {
        const resolved = tryExtensions(path.join(pkgRoot, pkg.exports));
        if (resolved) {
          return resolved;
        }
      }
      for (const field of [pkg.module, pkg.main]) {
        if (typeof field === "string") {
          const resolved = tryExtensions(path.join(pkgRoot, field));
          if (resolved) {
            return resolved;
          }
        }
      }
      return tryExtensions(pkgRoot) ?? pkgRoot;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

export function clearResolveCaches(): void {
  tsconfigCache.clear();
  resolveCache.clear();
}

export function resolveModule(
  specifier: string,
  fromFile: string,
  options: { tsconfigPath?: string } = {},
): ResolveResult {
  const cacheKey = `${fromFile}::${specifier}::${options.tsconfigPath ?? ""}`;
  const cached = resolveCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let result: ResolveResult;

  if (specifier.startsWith("node:") || isBuiltin(specifier)) {
    const id = specifier.startsWith("node:")
      ? specifier
      : `node:${specifier}`;
    result = { kind: "builtin", id };
  } else if (specifier.startsWith(".") || specifier.startsWith("/")) {
    const base = path.resolve(path.dirname(fromFile), specifier);
    const file = tryExtensions(base);
    result = file
      ? { kind: "file", id: file }
      : { kind: "unresolved", id: specifier };
  } else {
    const tsconfig = loadTsConfig(path.dirname(fromFile), options.tsconfigPath);
    const aliased = tsconfig ? matchTsPath(specifier, tsconfig) : null;
    if (aliased) {
      result = { kind: "file", id: aliased };
    } else {
      const packageName = packageNameFromSpecifier(specifier);
      const entry = resolvePackageEntry(fromFile, packageName);
      result = {
        kind: "package",
        id: entry ?? specifier,
        packageName,
      };
    }
  }

  resolveCache.set(cacheKey, result);
  return result;
}
