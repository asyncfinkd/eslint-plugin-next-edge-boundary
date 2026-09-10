import type { TSESTree } from "@typescript-eslint/utils";
import { DEFAULT_MAX_BYTES_RECOMMENDED } from "../core/constants.js";
import { isEdgeEntrypoint } from "../core/entrypoints.js";
import { formatBytes, formatChain } from "../core/format-chain.js";
import { walkImportGraph } from "../core/import-graph.js";
import {
  parseMaxGraphBytesOptions,
  type MaxGraphBytesOptions,
} from "../core/options.js";
import { estimateGraphBytes } from "../core/size-estimate.js";
import type { RuleContext, RuleModule } from "./types.js";

export const maxGraphBytesRule: RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Limit the estimated local import-graph size reachable from Edge entries.",
    },
    schema: [
      {
        type: "object",
        additionalProperties: false,
        properties: {
          max: { type: "number" },
          includeNodeModules: { type: "boolean" },
          packageWeights: {
            type: "object",
            additionalProperties: { type: "number" },
          },
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
      tooLarge:
        "Edge import graph is ~{{total}} (budget {{budget}}).\n\nHeaviest contributors:\n{{contributors}}\n\nImport a thinner Edge slice from the entry file.",
    },
  },
  create(context: RuleContext) {
    const filename = context.filename ?? context.getFilename();
    if (!isEdgeEntrypoint(filename)) {
      return {};
    }

    let options: MaxGraphBytesOptions;
    try {
      options = parseMaxGraphBytesOptions(context.options[0]);
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }

    const max = options.max ?? DEFAULT_MAX_BYTES_RECOMMENDED;
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
        if (entryImports.length === 0) {
          const walk = walkImportGraph(filename, options);
          const estimate = estimateGraphBytes(walk.nodes, options);
          if (estimate.totalBytes <= max) {
            return;
          }
          return;
        }

        for (const entryImport of entryImports) {
          const walk = walkImportGraph(filename, {
            ...options,
            seedSpecifiers: [entryImport.specifier],
          });
          const estimate = estimateGraphBytes(walk.nodes, {
            includeNodeModules: options.includeNodeModules,
            packageWeights: options.packageWeights,
            ignorePatterns: options.ignorePatterns,
          });

          if (estimate.totalBytes <= max) {
            continue;
          }

          const top = estimate.contributors.slice(0, 5);
          const contributors = top
            .map((item) => {
              const label = formatChain([item.id]).trim();
              const size = formatBytes(item.bytes).padStart(5, " ");
              return `  +${size}  ${label}`;
            })
            .join("\n");

          context.report({
            node: entryImport.node,
            messageId: "tooLarge",
            data: {
              total: formatBytes(estimate.totalBytes),
              budget: formatBytes(max),
              contributors,
            },
          });
          break;
        }
      },
    };
  },
};
