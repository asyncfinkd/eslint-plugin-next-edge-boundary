import { ping } from "@/lib/ping";
import { boom } from "@/lib/boom";

export function middleware() {
  ping();
  boom();
}
