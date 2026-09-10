import { NextResponse } from "next/server";
import { greet } from "./lib/greet";

export function middleware() {
  return NextResponse.json({ message: greet() });
}
