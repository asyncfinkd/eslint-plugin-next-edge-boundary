import type { TSESLint, TSESTree } from "@typescript-eslint/utils";

export type RuleListener = TSESLint.RuleListener & {
  ImportDeclaration?(node: TSESTree.ImportDeclaration): void;
  ExportNamedDeclaration?(node: TSESTree.ExportNamedDeclaration): void;
  ExportAllDeclaration?(node: TSESTree.ExportAllDeclaration): void;
  Program?(node: TSESTree.Program): void;
  "Program:exit"?(): void;
};

export type RuleContext = {
  filename?: string;
  getFilename(): string;
  options: readonly unknown[];
  report(descriptor: {
    node: TSESTree.Node;
    messageId: string;
    data?: Record<string, string>;
  }): void;
};

export type RuleModule = {
  meta: {
    type: "problem" | "suggestion" | "layout";
    docs: { description: string };
    schema: unknown[];
    messages: Record<string, string>;
  };
  create(context: RuleContext): RuleListener;
};
