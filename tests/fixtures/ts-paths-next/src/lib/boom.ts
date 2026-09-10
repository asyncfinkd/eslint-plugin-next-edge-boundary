import { appendFileSync } from "node:fs";

export function boom() {
  appendFileSync("/tmp/edge-boundary-test.log", "x\n");
}
