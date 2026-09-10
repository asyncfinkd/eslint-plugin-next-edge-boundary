import type { TSESLint, TSESTree } from "@typescript-eslint/utils";

export type RuleContext = TSESLint.RuleContext<string, readonly unknown[]> & {
  filename?: string;
  getFilename(): string;
};

export type RuleModule = {
  meta: TSESLint.RuleMetaData<string, unknown>;
  create(context: RuleContext): TSESLint.RuleListener & {
    ImportDeclaration?(node: TSESTree.ImportDeclaration): void;
    ExportNamedDeclaration?(node: TSESTree.ExportNamedDeclaration): void;
    ExportAllDeclaration?(node: TSESTree.ExportAllDeclaration): void;
    "Program:exit"?(): void;
  };
};
