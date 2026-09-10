# eslint-plugin-next-edge-boundary

Your Edge middleware doesn’t fail the build. It just gets slower every PR. This rule fails the PR instead.

Next.js Edge entrypoints (`middleware.ts`, Next.js 16 `proxy.ts`) silently grow when a convenient import pulls Node APIs or a large dependency graph. Builds often still succeed. Production gets slower — or fails later at the Edge size limit.

This ESLint plugin walks the **static value-import graph** from Edge entries and reports:

1. Transitive Node builtins / Edge-hostile packages  
2. Oversized local import graphs (byte budget)  
3. Barrel / namespace imports at the entry  

Diagnostics attach to the **entry file import** that introduced the bad subgraph, with a printable import chain.

## Install

```bash
pnpm add -D eslint-plugin-next-edge-boundary
```

Peer: `eslint` `>=9`. Optional: `typescript` (for projects that already use it).

## Flat config

```js
import nextEdgeBoundary from "eslint-plugin-next-edge-boundary";

export default [
  {
    files: [
      "middleware.ts",
      "src/middleware.ts",
      "proxy.ts",
      "src/proxy.ts",
    ],
    ...nextEdgeBoundary.configs.recommended,
  },
];
```

Use `nextEdgeBoundary.configs.strict` for tighter budgets and barrels as errors.

Legacy eslintrc: `configs["recommended-legacy"]` / `configs["strict-legacy"]`.

## Rules

| Rule | What it does |
| ---- | ------------ |
| `next-edge-boundary/no-node-apis` | Fail if the value-import graph reaches Node builtins (`fs` / `node:fs`, …) or a denylist package (`sharp`, `pg`, …) |
| `next-edge-boundary/max-graph-bytes` | Fail if estimated local source bytes exceed a budget (64 KiB recommended, 32 KiB strict) |
| `next-edge-boundary/no-barrels` | Fail on entry imports of barrels (`@/lib`, `@/utils`, …) and `import * as` namespaces |

### Before / after

```ts
// proxy.ts — fails: transitive node:fs
import { notify } from "./lib/notify";
```

```text
Edge boundary violated: Node / forbidden module "node:fs" is reachable.

  src/proxy.ts
    → src/lib/notify.ts
      → src/lib/write-log.ts
        → node:fs

Split an Edge-safe module that only exports what middleware needs.
```

```ts
// proxy.ts — ok: thin Edge-safe slice
import { notifyEdge } from "./lib/notify-edge";
```

Type-only imports are ignored (`import type` / `export type`).

## recommended vs strict

| | recommended | strict |
| - | ----------- | ------ |
| `no-node-apis` | error | error |
| `max-graph-bytes` | error, `max: 65536` | error, `max: 32768` |
| `no-barrels` | warn | error |

## vs `no-restricted-imports`

`no-restricted-imports` only sees the entry file’s direct specifiers. This plugin:

- follows **transitive** local imports and re-exports  
- estimates **graph size**  
- prints the **chain** back to the entry import  

## Options (shared)

```ts
{
  allowModules?: string[];
  denyModules?: string[];
  ignorePatterns?: string[];
  tsconfigPath?: string;
  allowImportChains?: string[][]; // last-resort escape hatch
}
```

`max-graph-bytes` also accepts `max`, `includeNodeModules`, `packageWeights`.  
`no-barrels` also accepts `barrelPatterns`, `forbidNamespaceImports`.

## Limitations

- Dynamic `import()` is **ignored** in v1  
- Not a bundler: sizes are a conservative static estimate of local sources  
- Does not simulate Turbopack / webpack Edge output byte-for-byte  
- App Router `export const runtime = 'edge'` detection is deferred to a later release  

## Entrypoints

Treated as Edge entries by basename:

- `middleware.ts` / `middleware.js`  
- `proxy.ts` / `proxy.js` (Next.js 16)

Scope lint with ESLint `files` as shown above.

## License

MIT
