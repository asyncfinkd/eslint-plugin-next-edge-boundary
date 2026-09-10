export const PACKAGE_NAME = "eslint-plugin-next-edge-boundary";

export const DEFAULT_ENTRY_GLOBS = [
  "**/middleware.ts",
  "**/middleware.js",
  "**/proxy.ts",
  "**/proxy.js",
] as const;

export const DEFAULT_MAX_BYTES_RECOMMENDED = 65_536;
export const DEFAULT_MAX_BYTES_STRICT = 32_768;

export const NODE_BUILTINS = new Set([
  "assert",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "sys",
  "timers",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib",
]);

export const DEFAULT_DENY_PACKAGES = [
  "sharp",
  "fs-extra",
  "graceful-fs",
  "better-sqlite3",
  "sqlite3",
  "pg",
  "mysql2",
  "mongodb",
  "webpack",
  "esbuild",
] as const;

export const DEFAULT_BARREL_PATTERNS = [
  "@/lib",
  "@/lib/index",
  "@/utils",
  "@/utils/index",
  "~/lib",
  "~/lib/index",
  "~/utils",
  "~/utils/index",
] as const;

export const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
] as const;

export const DEFAULT_PACKAGE_WEIGHTS: Record<string, number> = {
  lodash: 70_000,
  moment: 60_000,
  "date-fns": 40_000,
  axios: 20_000,
};
