import "../rule-tester.js";
import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";
import { beforeEach } from "vitest";
import { distUrl } from "../dist-url.js";
import { readFixture, fixturePath } from "../helpers.js";

const { clearGraphCaches } = await import(distUrl("core", "import-graph.js"));
const { clearResolveCaches } = await import(distUrl("core", "resolve-module.js"));
const { maxGraphBytesRule } = await import(distUrl("rules", "max-graph-bytes.js"));

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
});

beforeEach(() => {
  clearGraphCaches();
  clearResolveCaches();
});

ruleTester.run("max-graph-bytes", maxGraphBytesRule as never, {
  valid: [
    {
      code: readFixture("basic", "middleware.ts"),
      filename: fixturePath("basic", "middleware.ts"),
      options: [{ max: 65_536 }],
    },
    {
      code: readFixture("type-only-ok", "middleware.ts"),
      filename: fixturePath("type-only-ok", "middleware.ts"),
      options: [{ max: 1024 }],
    },
  ],
  invalid: [
    {
      code: readFixture("heavy-graph", "middleware.ts"),
      filename: fixturePath("heavy-graph", "middleware.ts"),
      options: [{ max: 10_000 }],
      errors: [{ messageId: "tooLarge" }],
    },
  ],
});
