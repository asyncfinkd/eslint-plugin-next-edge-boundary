import type { Linter } from "eslint";
import { DEFAULT_MAX_BYTES_RECOMMENDED } from "../core/constants.js";

export const recommendedConfig: Linter.Config = {
  name: "next-edge-boundary/recommended",
  rules: {
    "next-edge-boundary/no-node-apis": "error",
    "next-edge-boundary/max-graph-bytes": [
      "error",
      { max: DEFAULT_MAX_BYTES_RECOMMENDED },
    ],
    "next-edge-boundary/no-barrels": "warn",
  },
};
