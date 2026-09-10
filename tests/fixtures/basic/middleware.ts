import { greet } from "./lib/greet";

export function middleware() {
  return new Response(greet());
}
