import { ping } from "@/lib/ping";
import fs from "node:fs";

export function middleware() {
  fs.existsSync(".");
  return ping();
}
