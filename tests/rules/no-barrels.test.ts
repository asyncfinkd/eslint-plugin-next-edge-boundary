import "../rule-tester.js";
import { RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";
import { distUrl } from "../dist-url.js";
import { readFixture, fixturePath } from "../helpers.js";

const { noBarrelsRule } = await import(distUrl("rules", "no-barrels.js"));

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
});

ruleTester.run("no-barrels", noBarrelsRule as never, {
  valid: [
    {
      code: readFixture("basic", "middleware.ts"),
      filename: fixturePath("basic", "middleware.ts"),
    },
    {
      code: `import { helper } from "@/lib/helper";\nexport function middleware() { return helper(); }\n`,
      filename: fixturePath("barrels", "middleware.ts"),
    },
    {
      code: `import type * as Types from "@/lib";\nexport function middleware() { return null; }\n`,
      filename: fixturePath("barrels", "middleware.ts"),
    },
  ],
  invalid: [
    {
      code: readFixture("barrels", "middleware.ts"),
      filename: fixturePath("barrels", "middleware.ts"),
      errors: [{ messageId: "barrel" }],
    },
    {
      code: `import * as _ from "lodash";\nexport function middleware() { return _; }\n`,
      filename: fixturePath("basic", "middleware.ts"),
      errors: [{ messageId: "namespace" }],
    },
  ],
});
