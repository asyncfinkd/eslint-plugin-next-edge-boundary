import type { TSESTree } from "@typescript-eslint/utils";
import { isEdgeEntrypoint } from "../core/entrypoints.js";
import {
  findDeniedPaths,
  walkImportGraph,
} from "../core/import-graph.js";
import { formatChain } from "../core/format-chain.js";
import {
  matchesAllowOrDeny,
  parseSharedOptions,
  type SharedOptions,
} from "../core/options.js";
import type { RuleContext, RuleModule } from "./types.js";

function chainAllowed(
  chain: string[],
  allowImportChains: string[][] | undefined,
): boolean {
  if (!allowImportChains || allowImportChains.length === 0) {
    return false;
  }
  return allowImportChains.some((allowed) => {
    if (allowed.length !== chain.length) {
      return false;
    }
    return allowed.every((part, index) => {
      const actual = chain[index] ?? "";
      return actual === part || actual.endsWith(part) || actual.includes(part);
    });
  });
}

export const noNodeApisRule: RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Node builtins and Edge-hostile packages reachable from Edge entry imports.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
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
      forbidden:
        "Edge boundary violated: Node / forbidden module \"{{moduleId}}\" is reachable.\n\n{{chain}}\n\nSplit an Edge-safe module that only exports what middleware needs.",
    },
  },
  create(context: RuleContext) {
    const filename = context.filename ?? context.getFilename();
    if (!isEdgeEntrypoint(filename)) {
      return {};
    }

    let options: SharedOptions;
    try {
      options = parseSharedOptions(context.options[0]);
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }

    const entryImports: Array<{
      specifier: string;
      node: TSESTree.Node;
    }> = [];

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        if (node.importKind === "type") {
          return;
        }
        if (typeof node.source.value !== "string") {
          return;
        }
        entryImports.push({ specifier: node.source.value, node });
      },
      ExportNamedDeclaration(node: TSESTree.ExportNamedDeclaration) {
        if (node.exportKind === "type" || !node.source) {
          return;
        }
        if (typeof node.source.value !== "string") {
          return;
        }
        entryImports.push({ specifier: node.source.value, node });
      },
      ExportAllDeclaration(node: TSESTree.ExportAllDeclaration) {
        if (node.exportKind === "type") {
          return;
        }
        if (typeof node.source.value !== "string") {
          return;
        }
        entryImports.push({ specifier: node.source.value, node });
      },
      "Program:exit"() {
        for (const entryImport of entryImports) {
          if (matchesAllowOrDeny(entryImport.specifier, options.allowModules)) {
            continue;
          }

          const walk = walkImportGraph(filename, {
            ...options,
            seedSpecifiers: [entryImport.specifier],
          });
          const denied = findDeniedPaths(walk);
          for (const hit of denied) {
            if (chainAllowed(hit.chain, options.allowImportChains)) {
              continue;
            }
            context.report({
              node: entryImport.node,
              messageId: "forbidden",
              data: {
                moduleId: hit.moduleId,
                chain: formatChain(hit.chain),
              },
            });
            break;
          }
        }
      },
    };
  },
};
