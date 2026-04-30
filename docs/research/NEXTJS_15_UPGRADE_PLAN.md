# Next.js 14 → 15 Upgrade Research Plan

**Status**: Research / planning doc — no code changes proposed in this PR.
**Companion to**: `docs/SECURITY_AUDIT_2026-04-30.md` finding M1 (DoS CVEs in `next@14.2.0`).
**Audience**: KyberStation maintainers planning a v0.17 upgrade slot.

## 1. Executive summary

KyberStation runs Next.js 14.2.0 in **App Router + static export** mode (`output: 'export'`). The two open Next.js 14 DoS CVEs flagged in the 2026-04-30 security audit are **not exploitable** in our deployment because we ship pre-rendered HTML/JS to a static host — there is no Next.js server in production to attack. The upgrade is therefore a **dependency-hygiene and forward-compatibility** task, not an urgent vulnerability fix.

The breaking-change surface area for KyberStation is **unusually small** because static export does not exercise the runtime APIs that changed most. Our entire codebase has zero usages of `cookies()`, `headers()`, page-prop `params` / `searchParams`, server `fetch()`, GET route handlers, middleware, `NextRequest`, `geo` / `ip`, `next/image`, `experimental-edge`, or `useFormState`. The two surfaces that DO touch changed APIs are (a) `next/font/google` (4 fonts in `app/layout.tsx`) — already on the post-rename import path, no migration required; and (b) `useSearchParams` client-hook usage in 2 client pages — unchanged in 15. The only meaningful version coupling is **React 18 → 19**, which we recommend deferring (Next 15 supports React 18 at the App Router layer per the v15.0 GA notes for Pages Router only — App Router pins React 19, so the React jump is forced).

**Recommendation**: Schedule for **v0.17** (post-launch stabilization slot, ~2 weeks after v1.0 ships). The upgrade is mechanical and low-risk for KyberStation specifically. Estimated **3–5 hours** for a senior engineer including verification. Do NOT block v1.0 launch on this.

## 2. Current state

| Dimension | Value | Source |
|---|---|---|
| `next` | `^14.2.0` | `apps/web/package.json:27` |
| `react` | `^18.3.0` | `apps/web/package.json:30` |
| `react-dom` | `^18.3.0` | `apps/web/package.json:31` |
| `@types/react` | `^18.3.0` | `apps/web/package.json:43` |
| `@types/react-dom` | `^18.3.0` | `apps/web/package.json:44` |
| Output mode | `'export'` (static HTML/JS) | `apps/web/next.config.mjs:3` |
| `basePath` / `assetPrefix` | env-driven via `NEXT_PUBLIC_BASE_PATH` | `apps/web/next.config.mjs:4–5` |
| `images.unoptimized` | `true` | `apps/web/next.config.mjs:15–17` |
| `transpilePackages` | 4 workspace packages | `apps/web/next.config.mjs:9–14` |
| Custom webpack | `extensionAlias { '.js': ['.ts', '.tsx', '.js'] }` | `apps/web/next.config.mjs:18–24` |
| ESLint | not in devDeps; lint is placeholder | `apps/web/package.json:12` |
| Node version target | 20+ (24.x recommended) | `CLAUDE.md` Mac/PC Setup |
| Server runtime APIs in use | none | grep evidence below |
| App Router pages | `app/page.tsx`, `app/editor/page.tsx`, `app/m/page.tsx`, `app/changelog`, `app/faq`, `app/features`, `app/showcase`, `app/gallery`, `app/docs` | filesystem |
| Middleware | none | grep `middleware.ts` returned no matches |
| API routes | none (`app/api/` does not exist) | filesystem |
| `next/image` usage | none | grep evidence below |
| `next/font/google` usage | `Inter`, `JetBrains_Mono`, `Orbitron`, `Exo_2` in `app/layout.tsx:1–2` | grep evidence |

### 2.1 Evidence: zero exposure to async-API breaking changes

```
$ grep -rn "cookies()\|headers()\|draftMode()" apps/web --include="*.tsx" --include="*.ts"
(no matches)

$ grep -rn "{ params }\|{ searchParams }\|props.params\|props.searchParams" apps/web/app
(no matches — only client-side useSearchParams hook usage in m/page.tsx + editor/page.tsx)

$ grep -rn "next/image\|middleware\|app/api/" apps/web --include="*.tsx" --include="*.ts"
(no matches)

$ grep -rn "experimental-edge\|export const runtime" apps/web
(no matches)
```

The `useSearchParams` calls in `apps/web/app/m/page.tsx:57` and `apps/web/app/editor/page.tsx:54` are **client hooks** (`'use client'` files) — these are NOT affected by the page-prop `searchParams` Promise change. The client hook signature in `next/navigation` is unchanged in Next 15.

## 3. Breaking change matrix

Each row evaluates one Next.js 15 breaking change for KyberStation impact. Sourced from the official upgrade guide (https://nextjs.org/docs/app/guides/upgrading/version-15) and the v15 GA blog post (https://nextjs.org/blog/next-15).

| # | Breaking change | KyberStation impact | Affected files | Migration step |
|---|---|---|---|---|
| 1 | **React 19 minimum** for App Router | **High** (forced jump) | `apps/web/package.json` deps; potentially every component if hidden React 18-specific patterns exist | Bump `react` + `react-dom` to `^19`, bump `@types/react` + `@types/react-dom` to `^19`. Run `pnpm typecheck` to surface any incompatible patterns. Re-run all 4,899+ workspace tests. |
| 2 | **`cookies()` is now async** | **None** | none | n/a — we don't call `cookies()` |
| 3 | **`headers()` is now async** | **None** | none | n/a |
| 4 | **`draftMode()` is now async** | **None** | none | n/a |
| 5 | **`params` in `page.js` / `layout.js` / `route.js` is now `Promise`** | **None** | none — none of our pages destructure a `params` prop (no dynamic route segments use it) | n/a; if we ever add a dynamic route, follow the new `await props.params` pattern |
| 6 | **`searchParams` in `page.js` is now `Promise`** | **None** | none — both `useSearchParams` consumers use the client hook from `next/navigation`, which is unchanged | n/a |
| 7 | **`fetch()` no longer cached by default** | **None** | none — static export means no runtime server `fetch()` | n/a; client-side `fetch` in components uses browser semantics, not Next caching |
| 8 | **`GET` route handlers no longer cached by default** | **None** | none — `app/api/` doesn't exist | n/a |
| 9 | **Client Router Cache `staleTime: 0` for Page segments** | **Low** | every internal `<Link>` click in the App | No code change required. Behavior change: page data refetches on every navigation. With static export we serve pre-built HTML — observable difference is minimal but verify via manual nav between `/`, `/editor`, `/m`, `/gallery`. If perceptible UX regression, opt back in via `experimental.staleTimes.dynamic: 30` in `next.config.mjs`. |
| 10 | **`next/image` `domains` removed → `remotePatterns`** | **None** | `next.config.mjs` has `images.unoptimized: true` and no `domains` field; no `next/image` imports in code | n/a |
| 11 | **`next/font` (rename only — `@next/font` removed)** | **None** | `app/layout.tsx:2` already imports from `next/font/google` | already migrated; no action |
| 12 | **`next/font` `font-family` hashing removed** | **Low** | 4 fonts loaded via `next/font/google`: Inter, JetBrains Mono, Orbitron, Exo 2; we reference them via CSS variable names (`--font-inter`, etc.) in `apps/web/app/globals.css` and Tailwind config | The CSS-variable contract is unchanged. Hashing change affects internal `font-family` names; no external code depends on the hashed names. **Verify visually** by running `pnpm build && open out/index.html` and confirming all 4 fonts still render correctly. |
| 13 | **`experimental-edge` runtime → `edge`** | **None** | grep returned no `runtime` exports | n/a |
| 14 | **`NextRequest.geo` and `.ip` removed** | **None** | no `NextRequest` usage; no middleware | n/a |
| 15 | **Speed Insights auto-instrumentation removed** | **None** | not using Vercel; not using `@vercel/speed-insights` | n/a |
| 16 | **`experimental.bundlePagesExternals` → `bundlePagesRouterDependencies`** | **None** | not in our `next.config.mjs` | n/a |
| 17 | **`experimental.serverComponentsExternalPackages` → `serverExternalPackages`** | **None** | not in our config | n/a |
| 18 | **`useFormState` deprecated → `useActionState`** | **None** | grep `useFormState` returned no matches | n/a |
| 19 | **Caching: `force-dynamic` now sets `no-store` on fetch cache** | **None** | no `force-dynamic` exports; no server fetch | n/a |
| 20 | **Minimum Node.js 18.18.0** | **None** | we target Node 20+, run on 24.x | n/a — already exceeds requirement |
| 21 | **`next/dynamic`: `suspense` prop removed** | **Low/None** | `CrystalPanel.tsx` uses `next/dynamic` for the Three.js chunk; verify no `suspense` prop is passed | grep verification step in §4.2 |
| 22 | **`next/dynamic`: `ssr: false` disallowed in Server Components** | **Low/None** | dynamic imports are inside client components (`'use client'` files) | grep verification step |
| 23 | **`revalidateTag` / `revalidatePath` during render now throws** | **None** | not in use | n/a |
| 24 | **Sitemap `.xml` extension removed** | **Low/None** | we ship `apps/web/app/sitemap.xml` (static file under `public/` per CLAUDE.md SEO infra). Verify whether it's a Next-generated `sitemap.ts` route or a static file in `public/` | If `sitemap.ts` exists in `app/`, expect URL change from `/sitemap.xml` to `/sitemap`. With `output: 'export'` the file is materialized at build, so check `out/sitemap*` after build. Static file in `public/sitemap.xml` is unaffected. |
| 25 | **Middleware: `react-server` condition** | **None** | no middleware | n/a |
| 26 | **`instrumentation.js` stable** | **None** | not in use | n/a |
| 27 | **ESLint 9 support** | **None** | ESLint not currently configured (`lint` is a placeholder). Adopting ESLint 9 is its own sprint per CLAUDE.md | n/a; orthogonal |

**Summary tally for KyberStation**:
- **High impact**: 1 (React 19 jump, item 1)
- **Medium impact**: 0
- **Low impact**: 4 (items 9, 12, 21, 24 — verification only, no code change expected)
- **None**: 22

## 4. Pre-upgrade checklist

Run these BEFORE creating the upgrade branch.

### 4.1 Baseline gates

- [ ] `pnpm install` clean (no peer-dep warnings on current lockfile)
- [ ] `pnpm typecheck` green across all 10 workspace packages
- [ ] `pnpm test` green across all 10 packages (4,899 tests as of 2026-04-30)
- [ ] `pnpm build` produces a clean static export at `apps/web/out/`
- [ ] Manual smoke: open `out/index.html` and `out/editor/index.html` in a browser; both load and ignite a saber

### 4.2 Snapshot the surface area

Run these from the repo root and pin the output to the upgrade PR description:

```bash
# Confirm no hidden async-API usage has crept in
grep -rn "cookies()\|headers()\|draftMode()" apps/web --include="*.tsx" --include="*.ts"

# Confirm no page-prop params/searchParams destructuring
grep -rn "{ params }\|{ searchParams }\|props.params\|props.searchParams" apps/web/app

# Confirm next/image still unused
grep -rn "from 'next/image'\|from \"next/image\"" apps/web --include="*.tsx" --include="*.ts"

# Inspect every next/dynamic call site for `suspense` prop or `ssr: false` in Server Components
grep -rn "next/dynamic" apps/web --include="*.tsx" --include="*.ts"

# Sitemap shape
ls apps/web/app/sitemap* apps/web/public/sitemap* 2>/dev/null

# next/font import paths (must be next/font, not @next/font)
grep -rn "@next/font\|next/font" apps/web --include="*.tsx" --include="*.ts"
```

### 4.3 Pin a rollback point

- [ ] Tag the pre-upgrade commit as `v0.16.x-pre-next15` so we can `git revert` to a known-good snapshot if needed

## 5. Step-by-step upgrade plan

Total estimated time: **3–5 hours**.

### Phase A — dependency bump (~30 min)

1. `git checkout -b chore/nextjs-15-upgrade`
2. Edit `apps/web/package.json`:
   ```json
   "next": "^15.0.0",
   "react": "^19.0.0",
   "react-dom": "^19.0.0",
   "@types/react": "^19.0.0",
   "@types/react-dom": "^19.0.0",
   ```
3. `pnpm install --filter @kyberstation/web` — expect peer-dep warnings; if blocking, use `--force` for this single install (do NOT commit a `.npmrc` change)
4. `pnpm install` (top level) to reconcile workspace
5. Commit: `chore(deps): bump next 14.2.0 → 15.x and React 18 → 19`

### Phase B — type + test sweep (~1–2 hr)

6. `pnpm typecheck` from repo root. Expected breakage areas (low confidence — depends on React 19 type changes that landed late in their RC):
   - `useRef<T>(null)` may now require explicit non-null types in some places
   - Element refs on `forwardRef` may shift
   - Implicit `children: ReactNode` props on FCs may need explicit typing
   Triage by file, fix in narrow commits per package.
7. `pnpm test` from repo root. Watch specifically for:
   - `apps/web/tests/rendererGoldenHash/` — visual regression sentinel; should still pass
   - Any test that asserts on React internals (`act` warnings, Suspense hydration) — React 19 changes warning messages
8. Commit fixes per logical chunk; do NOT bundle into one giant commit.

### Phase C — config audit (~30 min)

9. Open `apps/web/next.config.mjs`. No required edits for our shape (static export doesn't exercise the changed config keys), but consider:
   - **Optional**: opt back into router cache via `experimental.staleTimes.dynamic: 30` if §6 nav verification reveals a regression
   - **Optional**: rename file to `.ts` (Next 15 supports `next.config.ts` natively); skip unless we want the `NextConfig` type
10. No `next.config` changes are required for static export.

### Phase D — build + manual verification (~30–60 min)

11. `pnpm build` from `apps/web/` — expect a clean static export at `apps/web/out/`
12. Smoke matrix in 2 browsers (Brave + Safari) at desktop 1600×1000 + mobile 375×812:
    - Landing page (`/`) loads, hero sabers ignite, marquee scrolls
    - `/editor` opens, default Obi-Wan blue blade renders, click IGNITE/CLASH/BLAST
    - `/m` mobile companion route loads, swipe presets
    - `/gallery` loads cards
    - `/changelog`, `/faq`, `/features`, `/showcase` load
    - All 4 fonts render visually correct (Inter chrome, JetBrains Mono numerics, Orbitron titles, Exo 2 body)
    - Internal nav between routes via `<Link>` works without console errors
13. Commit: `chore(verify): manual smoke matrix post-Next15 upgrade`

### Phase E — PR + ship (~30 min)

14. Push branch, open PR titled `chore(deps): upgrade Next.js 14.2.0 → 15.x`
15. PR body includes:
    - Link to this research doc
    - The §4.2 grep output snapshot before/after upgrade
    - Test count delta
    - Screenshots of the 4 most user-visible routes pre/post
    - Note that the M1 CVEs are no longer applicable post-upgrade
16. Standard CI green → merge → tag `v0.17.0`

## 6. Test plan

Beyond the workspace test suite, post-upgrade verification must confirm static export still works correctly:

| Surface | Verification |
|---|---|
| Static export build | `pnpm build` produces `apps/web/out/` with all expected routes; total size within ±10% of pre-upgrade |
| `basePath` wiring | Build with `NEXT_PUBLIC_BASE_PATH=/test` and confirm asset paths in `out/index.html` honor the prefix |
| Font self-hosting | Open `out/index.html` from disk; all 4 `next/font/google` faces render without network calls |
| Dynamic Three.js chunk | `/editor` → My Crystal panel loads the Three.js renderer without `ChunkLoadError` (this regressed in our 2026-04-19 → 2026-04-20 P1 batch when we wrapped CrystalPanel in `next/dynamic`; reverted same session — make sure 15 doesn't reintroduce a similar Turbopack HMR issue if we were to use `next dev --turbo`) |
| Client navigation | Multiple `<Link>` clicks without console errors; back/forward restores scroll position |
| Service worker / PWA | Manifest + icons still served correctly from `out/` |
| Workspace test suite | All 4,899+ tests still pass |
| Typecheck | All 10 workspace packages clean |
| Production hosting smoke | Deploy `out/` to GitHub Pages preview branch; verify it loads from the actual deployment URL with the configured basePath |

## 7. Rollback plan

If the upgrade introduces a regression that can't be triaged in-PR:

1. `git revert -m 1 <merge-commit-sha>` on `main` — restores Next 14.2.0 + React 18.3.0
2. The CVEs return to "open but not exploitable" status; document in `docs/SECURITY_AUDIT_2026-04-30.md` follow-up note
3. Branch the failing upgrade as `chore/nextjs-15-attempt-1` for forensic later
4. No data loss possible — all state is in IndexedDB / localStorage on user devices, untouched by this dep change

Because the change is dependency-only with no breaking schema changes, rollback is a single revert with no migration step.

## 8. Estimated time budget

**Senior engineer familiar with KyberStation**: 3–5 hours total.

| Phase | Estimate |
|---|---|
| A. Dep bump | 30 min |
| B. Type + test sweep | 1–2 hr (depends on React 19 type fallout — could be 0 if we got lucky, could be 2 hr if many files need touching) |
| C. Config audit | 30 min |
| D. Build + manual verification | 30–60 min |
| E. PR + merge + tag | 30 min |

**Pessimistic budget**: 6 hr if React 19 type-change fallout is significant.
**Optimistic budget**: 2 hr if typecheck stays clean on the first run.

## 9. Decision: should v0.17 do this?

**Recommendation**: **Yes, schedule for v0.17** (post-launch stabilization slot).

### Rationale (yes)

- The 2 open CVEs from the security audit, while unexploitable in our shape, will make any future security review noisy until cleared. Closing them simplifies the audit story.
- React 19 brings real DX wins (`useActionState`, hydration-error improvements, automatic memo via React Compiler if we opt in later) even though we don't use them today.
- The breaking-change surface for our specific shape is exceptionally small. Our static-export, no-server, no-middleware deployment dodges roughly 80% of what makes the 14→15 upgrade painful for typical apps.
- `next/font/google` is already on the modern import path; no @next/font legacy debt.
- Delaying past v0.17 risks the 14→15 lift compounding into a 14→16 lift later. Next.js 16 is already in early canary as of late 2026 (per the doc footer "version: 16.2.4" in the upgrade guide we fetched).

### Rationale (don't rush)

- The CVEs are not exploitable; there is no real security pressure to act before v1.0 ships.
- React 19 is GA, but ecosystem packages may still have subtle compatibility cracks. We use `@react-three/fiber@^8.18.0` and `@react-three/drei@^9.122.0` — both have known tension with React 19 types in some versions. Verify their current Next-15-compatible versions before the bump.
- Any Three.js tooling regression would directly hit our most user-visible feature (the Kyber Crystal panel + blade canvas). Testing budget should account for this.

### Suggested timing

- **v1.0** ships on Next 14.2.0 (no change). The CVEs are documented as non-applicable in the security audit follow-up note.
- **v0.17** (~2 weeks post-launch, when v1.0 stabilization patches have settled) is the right slot for this upgrade. By then the React 19 + R3F compat picture will be even clearer than it is now.
- If a Next.js 14.2.x patch release lands that addresses the DoS CVEs, we should pick it up immediately and push the v0.17 timing back to v0.18 — security patches in-line are always lower-risk than major-version moves.

## 10. Open questions for the v0.17 author

1. Do `@react-three/fiber@^8` and `@react-three/drei@^9` still install cleanly against React 19? Check their changelog before the bump. If R3F has a v9 line targeting React 19, that's a separate concurrent dep migration to consider.
2. Should we also enable Turbopack stable (`next dev --turbo`) in this same upgrade? Risk: our 2026-04-19 ChunkLoadError post-mortem implicates Turbopack HMR specifically. Recommendation: leave it off for v0.17; revisit in v0.18+.
3. Should we adopt `next.config.ts` for the type-safety win? Trivial rename, but introduces a TypeScript dep on the build config. Recommendation: yes, do it as a follow-up cleanup commit on the same PR.
4. Should we adopt React Compiler (experimental Babel plugin) opportunistically? It currently slows builds significantly per the v15 GA blog. Recommendation: defer to v0.18+ once it's stable and faster.

---

**Doc owner**: KyberStation maintainers
**Last updated**: 2026-04-30
**Source references**:
- https://nextjs.org/docs/app/guides/upgrading/version-15 (official upgrade guide)
- https://nextjs.org/blog/next-15 (v15 GA announcement)
- `docs/SECURITY_AUDIT_2026-04-30.md` finding M1
- `apps/web/package.json` and `apps/web/next.config.mjs` as of 2026-04-30
