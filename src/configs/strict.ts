import type { Linter } from "eslint";
import { DEFAULT_MAX_BYTES_STRICT } from "../core/constants.js";

export const strictConfig: Linter.Config = {
  name: "next-edge-boundary/strict",
  plugins: {},
  rules: {
    "next-edge-boundary/no-node-apis": "error",
    "next-edge-boundary/max-graph-bytes": [
      "error",
      { max: DEFAULT_MAX_BYTES_STRICT },
    ],
    "next-edge-boundary/no-barrels": "error",
  },
};
