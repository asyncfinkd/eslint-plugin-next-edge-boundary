# AGENTS.md — eslint-plugin-next-edge-boundary

You are writing an **open-source library**, not an application, not a site feature, and not a reptiles.ge module.

This repository is a standalone npm package. Every decision must optimize for:

1. **Correct Edge boundary enforcement** in Next.js projects
2. **Tiny public API** that stays stable
3. **Fast lint** (seconds, not builds)
4. **Actionable diagnostics** (one clear error with an import chain)
5. **Zero domain coupling** — no species, catalogs, Georgian URLs, or site-specific names in code or docs examples beyond generic “product / article” demos

If a change helps one app but hurts the library story, reject it.

---

## Mission

Next.js Edge entrypoints (`middleware.ts`, Next 16 `proxy.ts`, and Edge `route.ts` / `layout.ts`) silently grow when someone imports a “convenient” module that pulls Node APIs or a huge dependency graph.

Builds often still succeed. Production just gets slower — or fails later at the Edge size limit.

**This package fails the PR in the editor / CI instead.**

Tagline for README:

> Your Edge middleware doesn’t fail the build. It just gets slower every PR. This rule fails the PR instead.

---

## Non-goals (do not build)

- Full webpack / Turbopack middleware bundle simulation
- Auto-splitting or codegen of “edge-safe” modules (`next-atlas` is a different product)
- Replacing `@next/eslint-plugin-next`
- Runtime middleware helpers
- Framework support beyond Next.js in v1 (keep hooks internal so Vite/CF Workers can come later)
- Perfect byte-equality with `.next/server/middleware.js` — use a **conservative static estimate**

---

## Package identity

| Field | Value |
| ----- | ----- |
| npm name | `eslint-plugin-next-edge-boundary` |
| repo | personal GitHub (not an app org) |
| license | MIT |
| type | ESLint 9 flat-config first; legacy `.eslintrc` via exported configs |
| peerDeps | `eslint` `>=9`, optional peer `typescript` |
| Node | `>=20` |
| language | TypeScript, ESM |
| tests | Vitest + ESLint RuleTester |
| publish | public npm, semver |

Do **not** scope the package under a product org name. Keep the npm name generic.

---

## Architecture (mandatory layout)

Scaffold exactly this shape unless a later ADR changes it. Prefer fewer files over speculative folders.

```text
eslint-plugin-next-edge-boundary/
├── AGENTS.md                 # this file — agent + human SSOT
├── README.md                 # users: install, configs, rules, examples
├── LICENSE
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.ts
├── eslint.config.js          # lint the package itself
├── src/
│   ├── index.ts              # plugin export: meta, rules, configs
│   ├── configs/
│   │   ├── recommended.ts    # sensible defaults
│   │   └── strict.ts         # tighter budgets + barrels error
│   ├── rules/
│   │   ├── no-node-apis.ts
│   │   ├── max-graph-bytes.ts
│   │   └── no-barrels.ts
│   └── core/
│       ├── constants.ts      # default entry globs, budgets, denylists
│       ├── entrypoints.ts    # is this file an Edge entry?
│       ├── resolve-module.ts # resolve specifier → absolute file
│       ├── import-graph.ts   # BFS/DFS graph + cache
│       ├── classify.ts       # node builtin / denylist package / allow
│       ├── size-estimate.ts  # sum source bytes (skip type-only)
│       ├── import-kind.ts    # type-only / value / side-effect
│       ├── format-chain.ts   # pretty import chain for messages
│       └── options.ts        # shared option parsing + Zod-or-manual validate
└── tests/
    ├── rules/
    │   ├── no-node-apis.test.ts
    │   ├── max-graph-bytes.test.ts
    │   └── no-barrels.test.ts
    ├── core/
    │   ├── import-graph.test.ts
    │   ├── resolve-module.test.ts
    │   └── size-estimate.test.ts
    └── fixtures/
        ├── basic/
        ├── barrels/
        ├── node-transitive/
        ├── heavy-graph/
        ├── type-only-ok/
        ├── proxy-entry/          # Next 16 proxy.ts
        └── ts-paths/             # @/ alias resolution
```

### Layer rules

| Layer | May import | Must not |
| ----- | ---------- | -------- |
| `rules/*` | `core/*`, ESLint utils | each other (no rule→rule) |
| `configs/*` | rule names only / `index` meta | graph engine |
| `core/*` | other `core/*`, Node builtins used at lint-time | ESLint `RuleContext` types except via thin adapters if needed |
| `index.ts` | rules + configs | fixture paths |

Lint-time code runs in **Node** (ESLint host). That is fine. The **analyzed project** Edge boundary is what we protect.

### Core pipeline (every rule shares this)

```text
Entry file (middleware.ts | proxy.ts | edge route)
        │
        ▼
  collect static import specifiers (skip `import type` / `export type`)
        │
        ▼
  resolve (node resolution + tsconfig paths + extension variants)
        │
        ▼
  BFS import graph with per-lint-run cache
        │
        ├── classify nodes (builtin / denylist / allowlist / local)
        ├── estimate bytes (local sources; optional package weight table)
        └── on violation: report on the TOP-LEVEL import in the entry file
            with a formatted chain (not 40 errors deep in the tree)
```

**Reporting principle:** always attach the diagnostic to the **entry file’s import statement** that introduced the bad subgraph. Developers fix the entry, not a random leaf.

---

## Rules (v1)

### 1. `next-edge-boundary/no-node-apis`

Fail if the value-import graph from an Edge entry reaches:

- Node builtins: `fs`, `path`, `child_process`, `net`, `tls`, `dns`, `worker_threads`, `module`, `vm`, `http`, `https`, `os`, `crypto` (Node), `stream`, `cluster`, …
- Prefer matching both `fs` and `node:fs`
- Known Edge-hostile packages (configurable denylist), defaults including: `sharp`, `fs-extra`, `graceful-fs`, `better-sqlite3`, `sqlite3`, `pg`, `mysql2`, `mongodb`, `child_process`, `webpack`, `esbuild` as a library import in app code, etc.

Allow:

- `import type` / type-only imports (they erase)
- explicit `allowModules: string[]` option
- optional `allowImportChains` for rare escape hatches (document as last resort)

Message shape:

```text
Edge boundary violated: Node / forbidden module "node:fs" is reachable.

  src/proxy.ts
    → src/lib/notify.ts
      → src/lib/write-log.ts
        → node:fs

Split an Edge-safe module that only exports what middleware needs.
```

### 2. `next-edge-boundary/max-graph-bytes`

Estimate the size of the **local source subgraph** reachable via value imports (and optionally add fixed weights for known heavy npm packages).

Defaults:

- `max`: `65536` (64 KiB) for recommended
- `max`: `32768` for strict
- `includeNodeModules`: `false` by default (local graph only); when `true`, use a small weight table + package root heuristics, not full node_modules walks

Skip:

- type-only edges
- files matched by `ignorePatterns`
- optional allowlisted modules that are known Edge-safe and large (e.g. nothing by default — users opt in)

Message shape:

```text
Edge import graph is ~420KB (budget 64KB).

Heaviest contributors:
  +384KB  src/data/catalog.generated.ts
  + 22KB  src/lib/catalog-routes.ts
  +  8KB  node_modules/next-intl/dist/middleware.js (allowlisted runtime)

Import a thinner Edge slice from the entry file.
```

### 3. `next-edge-boundary/no-barrels`

Fail on Edge entries that import:

- package/app barrels that re-export widely: exact `@/lib`, `@/lib/index`, `@/utils`, `@/utils/index`, configurable `barrelPatterns`
- namespace imports from heavy libs: `import * as _ from 'lodash'`
- deep wildcard smells where configured

Do not ban every `index.ts` in the repo — only imports **from the Edge entry** that match barrel patterns.

---

## Entrypoint detection

Treat as Edge entries when the file path matches (configurable `files` / shared with ESLint `files` overrides):

| Pattern | Why |
| ------- | --- |
| `**/middleware.ts` | classic Next middleware |
| `**/middleware.js` | JS projects |
| `**/src/proxy.ts`, `**/proxy.ts` | Next.js 16 proxy convention |
| `**/src/proxy.js`, `**/proxy.js` | same |
| Optional later: files under `app/` / `src/app/` that declare `export const runtime = 'edge'` | v1.1 — parse only if cheap; skip in v1 if costly |

v1 must document **proxy.ts** as first-class. Many posts still only mention middleware.

Recommended ESLint usage (README):

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

Also export `configs.strict`.

---

## Public API

```ts
import plugin from "eslint-plugin-next-edge-boundary";

plugin.meta.name; // "eslint-plugin-next-edge-boundary"
plugin.rules; // record of rules
plugin.configs.recommended;
plugin.configs.strict;
```

Flat config only in docs examples. If supporting eslintrc, export `.configs["recommended-legacy"]` with the same rules.

**No** default export of a Next plugin / `withX(nextConfig)`. This is ESLint-only for v1.

---

## Resolution requirements

`resolve-module.ts` must handle:

1. Relative imports `./foo`, `../bar`
2. `node:` / bare builtins
3. `package.json` `exports` lightly (enough for denylist hits)
4. TypeScript path aliases from the **closest** `tsconfig.json` / `jsconfig.json` (`paths`, `baseUrl`)
5. Extension resolution: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `/index.*`
6. `import type` and `typeof import` — excluded from value graph
7. Re-exports: `export { x } from './y'` and `export * from './y'` count as edges
8. Dynamic `import()` — **ignore in v1** (document limitation); do not pretend to analyze

Cache resolutions and graph walks per ESLint run (WeakMap on context / module cache keyed by absolute path).

---

## Options schema (shared patterns)

Each rule accepts:

```ts
type SharedOptions = {
  /** Extra modules always allowed (exact or prefix). */
  allowModules?: string[];
  /** Extra modules always forbidden. */
  denyModules?: string[];
  /** Glob-ish path ignores inside the analyzed project. */
  ignorePatterns?: string[];
  /** tsconfig path override; default: walk up from entry. */
  tsconfigPath?: string;
};
```

`max-graph-bytes` adds `{ max: number; includeNodeModules?: boolean; packageWeights?: Record<string, number> }`.

`no-barrels` adds `{ barrelPatterns?: string[] }`.

Validate options in `create()` and throw / report a clear config error if invalid.

---

## Implementation order (agent checklist)

Work in this order. Do not skip tests.

1. **Scaffold** package.json, tsconfigs, vitest, MIT, README stub, this AGENTS.md kept in sync
2. **`core/import-kind` + `resolve-module`** with fixture tests (relative + `@/` paths)
3. **`core/import-graph`** BFS + cache + re-exports
4. **`core/classify`** builtins + default denylist
5. **`core/size-estimate`** + `format-chain`
6. **Rule `no-node-apis`** + fixtures (`node-transitive`, `type-only-ok`, `proxy-entry`)
7. **Rule `max-graph-bytes`** + `heavy-graph` fixture
8. **Rule `no-barrels`** + `barrels` fixture
9. **`configs/recommended` + `strict`** + `src/index.ts`
10. **README** with install, why, GIF-worthy example, Next 16 proxy note, limitations
11. **`pnpm test` / `pnpm typecheck` / `pnpm build`** green
12. **Publish prep**: `files` field, `exports`, no src-only publish mistakes

---

## Code standards (library)

- No comments in source unless ESLint requires a disable explanation — prefer clear names
- No `any` without a one-line justification at the site
- Prefer small pure functions in `core/`
- Do not add dependencies unless necessary. Allowed v1 deps if needed: lightweight TS program helpers only if hand-rolled resolve becomes wrong; prefer hand-rolled + `get-tsconfig` **or** Node resolution first
- Avoid pulling `typescript` as a hard dependency; optional peer for path parsing
- Ship both ESM build; CJS only if ESLint ecosystem forces it — prefer dual `exports` cleanly
- Keep default denylist short and documented; make it extensible

---

## Testing standards

Every rule gets:

- valid cases: Edge entry with thin imports, type-only heavy imports, allowlist escapes
- invalid cases: transitive Node, oversized graph, barrel from entry
- at least one **proxy.ts** fixture (not only middleware)
- at least one **tsconfig paths** fixture (`@/…`)

Use ESLint `RuleTester` with `@typescript-eslint/parser` for TS fixtures.

Fixtures stay tiny and synthetic. Do not copy real app catalogs.

---

## README outline (write for humans)

1. One-paragraph problem (silent Edge bloat)
2. Install + flat config snippet (middleware **and** proxy)
3. Rules table
4. `recommended` vs `strict`
5. “How it differs from `no-restricted-imports`” (transitive + size + chain)
6. Limitations (dynamic import, not a bundler)
7. Contributing / license

Tone: sharp, technical, no hype adjectives. Show a before/after import fix.

---

## Versioning

- `0.1.0` — first public: three rules, recommended + strict, proxy + middleware
- Semver: option defaults that catch more issues = **minor** if documented; renames = major
- Changelog: Keep a ChangeLog or GitHub releases; every release notes Edge-entry coverage

---

## Agent behavior while implementing

- You are **authoring a library**. Optimize for strangers installing from npm.
- Do not invent reptiles, species, or site-specific module names in fixtures.
- When unsure, choose the **smaller API**.
- If you add a fourth rule, justify it in README — default bias is **no**.
- After implementation, run tests and typecheck before declaring done.
- Never commit secrets, never publish from a dirty tree without version bump.

---

## Success criteria for v0.1.0

- [ ] `pnpm test` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` emits publishable `dist/` with correct `exports`
- [ ] README alone is enough to install in a Next 15/16 app
- [ ] Transitive `node:fs` through 3 local files is reported on the entry import with a chain
- [ ] `import type { Huge } from './huge'` does **not** fail
- [ ] `src/proxy.ts` is documented and tested as an entry
- [ ] Package has no dependency on any application repo

---

## Optional v1.1 (do not implement unless asked)

- Detect `export const runtime = 'edge'` in App Router files
- `includeNodeModules: true` smarter package weights
- ESLint processor for Vue/Svelte — out of scope
- Companion CI action that also checks built middleware size — separate package

---

## One-line north star

**Lint-time import-graph guardrails for Next.js Edge entries — transitive Node denial, byte budgets, and barrel bans — with diagnostics that point at the entry import and print the chain.**
