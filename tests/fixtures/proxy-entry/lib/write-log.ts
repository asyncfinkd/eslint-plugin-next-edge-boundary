import fs from "node:fs";

export function writeLog(message: string): void {
  fs.writeFileSync("/tmp/proxy.log", message);
}
