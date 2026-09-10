export type ImportKind = "value" | "type" | "side-effect";

export function isTypeOnlyImport(
  importKind: string | undefined,
  importAttributes?: { type?: boolean },
): boolean {
  if (importKind === "type") {
    return true;
  }
  if (importAttributes?.type) {
    return true;
  }
  return false;
}

export function classifyImportKind(options: {
  importKind?: string;
  isType?: boolean;
  hasSpecifiers: boolean;
}): ImportKind {
  if (options.isType || options.importKind === "type") {
    return "type";
  }
  if (!options.hasSpecifiers) {
    return "side-effect";
  }
  return "value";
}
