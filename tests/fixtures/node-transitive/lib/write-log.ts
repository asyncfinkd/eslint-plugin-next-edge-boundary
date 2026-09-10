import fs from "node:fs";

export function writeLog(message: string): void {
  fs.appendFileSync("/tmp/edge.log", message);
}
