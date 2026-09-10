import type { TSESTree } from "@typescript-eslint/utils";
import { DEFAULT_BARREL_PATTERNS } from "../core/constants.js";
import { isEdgeEntrypoint } from "../core/entrypoints.js";
import {
  matchesAllowOrDeny,
  parseNoBarrelsOptions,
  type NoBarrelsOptions,
} from "../core/options.js";
import type { RuleContext, RuleModule } from "./types.js";

function matchesBarrelPattern(specifier: string, patterns: string[]): boolean {
  const normalized = specifier.replace(/\/index$/, "");
  return patterns.some((pattern) => {
    const p = pattern.replace(/\/index$/, "");
    return (
      specifier === pattern ||
      normalized === p ||
      specifier === `${p}/index` ||
      specifier.endsWith(`/${pattern}`) ||
      specifier.endsWith(`/${p}`)
    );
  });
}

export const noBarrelsRule: RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow barrel and heavy namespace imports directly from Edge entries.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          barrelPatterns: { type: "array", items: { type: "string" } },
          forbidNamespaceImports: { type: "boolean" },
          allowModules: { type: "array", items: { type: "string" } },
          denyModules: { type: "array", items: { type: "string" } },
          ignorePatterns: { type: "array", items: { type: "string" } },
          tsconfigPath: { type: "string" },
          allowImportChains: {
            type: "array",
            items: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
    ],
    messages: {
      barrel:
        "Edge entry imports barrel module \"{{specifier}}\". Import a specific Edge-safe module instead.",
      namespace:
        "Edge entry uses namespace import from \"{{specifier}}\". Prefer named imports of a thin Edge slice.",
    },
  },
  create(context: RuleContext) {
    const filename = context.filename ?? context.getFilename();
    if (!isEdgeEntrypoint(filename)) {
      return {};
    }

    let options: NoBarrelsOptions;
    try {
      options = parseNoBarrelsOptions(context.options[0]);
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }

    const patterns = options.barrelPatterns ?? [...DEFAULT_BARREL_PATTERNS];
    const forbidNamespace = options.forbidNamespaceImports ?? true;

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.importKind === "type") {
          return;
        }
        if (typeof node.source.value !== "string") {
          return;
        }
        const specifier = node.source.value;
        if (matchesAllowOrDeny(specifier, options.allowModules)) {
          return;
        }

        if (matchesBarrelPattern(specifier, patterns)) {
          context.report({
            node,
            messageId: "barrel",
            data: { specifier },
          });
          return;
        }

        if (
          forbidNamespace &&
          node.specifiers.some(
            (spec) => spec.type === "ImportNamespaceSpecifier",
          )
        ) {
          context.report({
            node,
            messageId: "namespace",
            data: { specifier },
          });
        }
      },
    };
  },
};
