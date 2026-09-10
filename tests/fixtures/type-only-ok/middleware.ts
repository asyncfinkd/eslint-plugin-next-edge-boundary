import type { Huge } from "./huge";
import { ok } from "./ok";

export function middleware(_hint?: Huge) {
  return ok();
}
