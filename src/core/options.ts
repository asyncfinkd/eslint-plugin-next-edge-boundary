export type SharedOptions = {
  allowModules?: string[];
  denyModules?: string[];
  ignorePatterns?: string[];
  tsconfigPath?: string;
  allowImportChains?: string[][];
};

export type MaxGraphBytesOptions = SharedOptions & {
  max?: number;
  includeNodeModules?: boolean;
  packageWeights?: Record<string, number>;
};

export type NoBarrelsOptions = SharedOptions & {
  barrelPatterns?: string[];
  forbidNamespaceImports?: boolean;
};

export function assertStringArray(
  value: unknown,
  field: string,
): asserts value is string[] | undefined {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Invalid option "${field}": expected string[].`);
  }
}

export function assertNumber(
  value: unknown,
  field: string,
): asserts value is number | undefined {
  if (value === undefined) {
    return;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid option "${field}": expected a non-negative number.`);
  }
}

export function assertBoolean(
  value: unknown,
  field: string,
): asserts value is boolean | undefined {
  if (value === undefined) {
    return;
  }
  if (typeof value !== "boolean") {
    throw new Error(`Invalid option "${field}": expected boolean.`);
  }
}

export function assertRecordOfNumbers(
  value: unknown,
  field: string,
): asserts value is Record<string, number> | undefined {
  if (value === undefined) {
    return;
  }
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.values(value).some((item) => typeof item !== "number")
  ) {
    throw new Error(`Invalid option "${field}": expected Record<string, number>.`);
  }
}

export function parseSharedOptions(raw: unknown): SharedOptions {
  if (raw === undefined || raw === null) {
    return {};
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Rule options must be an object.");
  }
  const options = raw as Record<string, unknown>;
  assertStringArray(options.allowModules, "allowModules");
  assertStringArray(options.denyModules, "denyModules");
  assertStringArray(options.ignorePatterns, "ignorePatterns");
  if (
    options.tsconfigPath !== undefined &&
    typeof options.tsconfigPath !== "string"
  ) {
    throw new Error('Invalid option "tsconfigPath": expected string.');
  }
  if (options.allowImportChains !== undefined) {
    if (
      !Array.isArray(options.allowImportChains) ||
      options.allowImportChains.some(
        (chain) =>
          !Array.isArray(chain) || chain.some((item) => typeof item !== "string"),
      )
    ) {
      throw new Error(
        'Invalid option "allowImportChains": expected string[][].',
      );
    }
  }
  return {
    allowModules: options.allowModules,
    denyModules: options.denyModules,
    ignorePatterns: options.ignorePatterns,
    tsconfigPath:
      typeof options.tsconfigPath === "string"
        ? options.tsconfigPath
        : undefined,
    allowImportChains: options.allowImportChains as string[][] | undefined,
  };
}

export function parseMaxGraphBytesOptions(raw: unknown): MaxGraphBytesOptions {
  const shared = parseSharedOptions(raw);
  const options = (raw ?? {}) as Record<string, unknown>;
  assertNumber(options.max, "max");
  assertBoolean(options.includeNodeModules, "includeNodeModules");
  assertRecordOfNumbers(options.packageWeights, "packageWeights");
  return {
    ...shared,
    max: options.max,
    includeNodeModules: options.includeNodeModules,
    packageWeights: options.packageWeights,
  };
}

export function parseNoBarrelsOptions(raw: unknown): NoBarrelsOptions {
  const shared = parseSharedOptions(raw);
  const options = (raw ?? {}) as Record<string, unknown>;
  assertStringArray(options.barrelPatterns, "barrelPatterns");
  assertBoolean(options.forbidNamespaceImports, "forbidNamespaceImports");
  return {
    ...shared,
    barrelPatterns: options.barrelPatterns,
    forbidNamespaceImports: options.forbidNamespaceImports,
  };
}

export function matchesAllowOrDeny(
  specifier: string,
  patterns: string[] | undefined,
): boolean {
  if (!patterns || patterns.length === 0) {
    return false;
  }
  return patterns.some(
    (pattern) =>
      specifier === pattern ||
      specifier.startsWith(`${pattern}/`) ||
      specifier.startsWith(`${pattern}:`),
  );
}

export function matchesIgnorePattern(
  filePath: string,
  patterns: string[] | undefined,
): boolean {
  if (!patterns || patterns.length === 0) {
    return false;
  }
  const normalized = filePath.replaceAll("\\", "/");
  return patterns.some((pattern) => {
    const needle = pattern.replaceAll("\\", "/");
    if (needle.includes("*")) {
      const regex = new RegExp(
        `^${needle
          .replaceAll(".", "\\.")
          .replaceAll("**/", "(.*/)?")
          .replaceAll("*", "[^/]*")}$`,
      );
      return regex.test(normalized) || regex.test(normalized.split("/").pop() ?? "");
    }
    return normalized.includes(needle) || normalized.endsWith(needle);
  });
}
