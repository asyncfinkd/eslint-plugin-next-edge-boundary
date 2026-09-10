import type { ESLint, Linter } from "eslint";
import { PACKAGE_NAME } from "./core/constants.js";
import { recommendedConfig } from "./configs/recommended.js";
import { strictConfig } from "./configs/strict.js";
import { maxGraphBytesRule } from "./rules/max-graph-bytes.js";
import { noBarrelsRule } from "./rules/no-barrels.js";
import { noNodeApisRule } from "./rules/no-node-apis.js";

const rules = {
  "no-node-apis": noNodeApisRule,
  "max-graph-bytes": maxGraphBytesRule,
  "no-barrels": noBarrelsRule,
};

const plugin: ESLint.Plugin = {
  meta: {
    name: PACKAGE_NAME,
    version: "0.1.0",
  },
  // RuleModule shapes are intentionally thin adapters for ESLint 9.
  rules: rules as ESLint.Plugin["rules"],
  configs: {},
} as ESLint.Plugin;

function withPlugin(config: Linter.Config): Linter.Config {
  return {
    ...config,
    plugins: {
      "next-edge-boundary": plugin,
    },
  };
}

plugin.configs = {
  recommended: withPlugin(recommendedConfig),
  strict: withPlugin(strictConfig),
  "recommended-legacy": {
    plugins: ["next-edge-boundary"],
    rules: recommendedConfig.rules,
  },
  "strict-legacy": {
    plugins: ["next-edge-boundary"],
    rules: strictConfig.rules,
  },
};

export default plugin;
export { rules };
export type {
  SharedOptions,
  MaxGraphBytesOptions,
  NoBarrelsOptions,
} from "./core/options.js";
