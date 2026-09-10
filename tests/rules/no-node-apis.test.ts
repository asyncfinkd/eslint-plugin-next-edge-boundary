import "../rule-tester.js";
import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";
import { beforeEach } from "vitest";
import { distUrl } from "../dist-url.js";
import { readFixture, fixturePath } from "../helpers.js";

const { clearGraphCaches } = await import(distUrl("core", "import-graph.js"));
const { clearResolveCaches } = await import(distUrl("core", "resolve-module.js"));
const { noNodeApisRule } = await import(distUrl("rules", "no-node-apis.js"));

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

ruleTester.run("no-node-apis", noNodeApisRule as never, {
  valid: [
    {
      code: readFixture("basic", "middleware.ts"),
      filename: fixturePath("basic", "middleware.ts"),
    },
    {
      code: readFixture("type-only-ok", "middleware.ts"),
      filename: fixturePath("type-only-ok", "middleware.ts"),
    },
    {
      code: `import fs from "node:fs";\nexport function middleware() { return fs; }\n`,
      filename: fixturePath("basic", "middleware.ts"),
      options: [{ allowModules: ["node:fs", "fs"] }],
    },
  ],
  invalid: [
    {
      code: readFixture("node-transitive", "middleware.ts"),
      filename: fixturePath("node-transitive", "middleware.ts"),
      errors: [{ messageId: "forbidden" }],
    },
    {
      code: readFixture("proxy-entry", "proxy.ts"),
      filename: fixturePath("proxy-entry", "proxy.ts"),
      errors: [{ messageId: "forbidden" }],
    },
    {
      code: readFixture("ts-paths", "middleware.ts"),
      filename: fixturePath("ts-paths", "middleware.ts"),
      options: [
        {
          tsconfigPath: fixturePath("ts-paths", "tsconfig.json"),
        },
      ],
      errors: [{ messageId: "forbidden" }],
    },
    {
      code: readFixture("ts-paths-next", "middleware.ts"),
      filename: fixturePath("ts-paths-next", "middleware.ts"),
      errors: [{ messageId: "forbidden" }],
    },
  ],
});
