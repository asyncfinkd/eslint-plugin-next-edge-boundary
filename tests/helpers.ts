import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const fixturesRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
);

export function fixturePath(...parts: string[]): string {
  return path.join(fixturesRoot, ...parts);
}

export function readFixture(...parts: string[]): string {
  return readFileSync(fixturePath(...parts), "utf8");
}
