# Security Audit — 2026-04-30 (post-v0.16.0 launch)

**Auditor:** parent session walkthrough
**Repo:** [kenkoller/KyberStation](https://github.com/kenkoller/KyberStation)
**Scope:** repository hygiene, CI/CD workflows, runtime application security, dependency posture, privacy posture

---

## Executive summary

KyberStation's security posture is **strong for a hobby-scale public web app**: no backend, zero analytics, zero external network calls in production, no secrets in git history, proper `.gitignore` coverage, scoped workflow permissions, and a published `SECURITY.md` with an honest disclosure path. **The main gap is the absence of branch protection on `main`** — anyone with push access can force-push or delete it. Dependency audit reports 8 high-severity CVEs, but every one of them is either in a dev/test transitive (node-tar via vitest) or unreachable in our static-export Next.js output (Next.js DoS via Server Components, which we don't use). No critical findings.

---

## Findings by severity

### 🔴 HIGH

#### H1. Branch protection on `main` is OFF

**Severity:** High
**Evidence:** `gh api repos/kenkoller/KyberStation/branches/main/protection` returns 404 ("Branch not protected").
**Impact:** Anyone with push access (currently just Ken) can force-push, delete, or bypass review on `main`. CLAUDE.md collaboration rules forbid this in every session — but it's a process control, not a system control.
**Recommendation:** Enable branch protection via GitHub UI:
- Settings → Branches → Add rule → Branch name pattern `main`
- Require pull request before merging
- Require status checks to pass (select `build-and-test`)
- Require linear history
- Do not allow bypassing the above settings (even for admins, OR allow but require force-push warning)
- Lock branch (prevent force-pushes)

GitHub Pro is NOT required for branch protection on a public repo — it's free.

### 🟡 MEDIUM

#### M1. Next.js 14.2.0 has known DoS CVEs (not exploitable in our config)

**Severity:** Medium (downgraded from pnpm's HIGH)
**Evidence:** `pnpm audit` reports 2 high CVEs in `next`:
- [GHSA-q4gf-8mx6-v5v3](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3) — DoS via Server Component request deserialization (patched in 15.5.15)
- [GHSA-h25m-26qc-wcjf](https://github.com/advisories/GHSA-h25m-26qc-wcjf) — DoS via Server Components (patched in 15.0.8)

**Why downgraded to Medium:** Both vulns require **Server Components** to be reachable. We use `output: 'export'` (static export — see `apps/web/next.config.mjs`) which produces a fully static site with no runtime Server Component handling. The attack surface doesn't exist on `kenkoller.github.io/KyberStation/`.
**Recommendation:** Plan a Next.js 14 → 15 upgrade for v0.17 (breaking changes — Server Actions API, caching defaults, async params). Not launch-blocking.

#### M2. node-tar transitive dep has 6 CVEs (test-only, not shipped)

**Severity:** Low (effectively informational)
**Evidence:** All 6 advisories on `tar` reach via `packages/boards > vitest > jsdom > canvas > @mapbox/node-pre-gyp > tar`. All are path-traversal / symlink attacks during tar extraction.
**Why effectively informational:** This dep is only loaded during test runs in `vitest`. It never reaches the production bundle. The attacker would need to compromise the `canvas` install path itself, which would also compromise much higher-impact things first.
**Recommendation:** Wait for upstream `vitest` / `jsdom` / `canvas` to bump. No action needed.

### 🔵 LOW / Informational

#### L1. CodeQL static analysis not enabled

**Severity:** Informational
**Evidence:** `.github/workflows/codeql.yml` does not exist.
**Recommendation:** Add CodeQL workflow (free for public repos, runs static analysis on every PR + weekly schedule). Catches OWASP-style issues (XSS, prototype pollution, regex DoS) the existing TypeScript + ESLint don't. **This audit adds the workflow** — see `.github/workflows/codeql.yml` in the same PR.

#### L2. Workflow actions pinned by major tag, not SHA

**Severity:** Informational
**Evidence:** All `uses:` directives in `.github/workflows/*.yml` reference `actions/checkout@v4`, `actions/setup-node@v4`, etc. — major version tags rather than commit SHAs.
**Why low:** GitHub Actions pinned by tag is the conventional default. Tag-based pinning is acceptable for non-secret-handling actions; SHA-pinning prevents a hypothetical "v4 tag silently re-points at compromised commit" attack which is rare in practice.
**Recommendation:** No action required for hobby-scale. Consider SHA-pinning for `release.yml` if it ever handles signing keys.

#### L3. `unsafe-inline` in production CSP

**Severity:** Informational
**Evidence:** `apps/web/app/layout.tsx` Content-Security-Policy includes `'unsafe-inline'` in `script-src`.
**Why required:** Next.js static export emits inline `<script>self.__next_f.push(...)</script>` blocks for hydration. With no server to mint per-request nonces, `'unsafe-inline'` is the standard pragmatic CSP for static-export apps. Documented inline as the intentional trade-off.
**Recommendation:** No action. If we later move off static export, switch to nonce-based CSP.

---

## What's already correct

| Area | Status | Evidence |
|---|---|---|
| Secrets in git history | ✅ none | `git log --all -p` regex sweep returns zero hits past false positives (CSS tokens, code tokenizer) |
| `.env` files committed | ✅ none | `git log --all --diff-filter=A` shows no `.env*` adds |
| `.gitignore` coverage | ✅ adequate | covers `.env`, `.env.*`, `node_modules`, `.next`, `out` |
| Workflow permissions | ✅ scoped | `deploy.yml` declares `contents: read / pages: write / id-token: write` (least-privilege); `stale.yml` only `issues / pull-requests`; `release.yml` only `contents: write` |
| `pull_request_target` events | ✅ none | grep finds zero matches — no fork-write exposure |
| CODEOWNERS | ✅ exists | `.github/CODEOWNERS` is present |
| `SECURITY.md` | ✅ exists | `SECURITY.md` at repo root with disclosure path (`koller.ken@gmail.com`) and 48hr/7day SLAs |
| External network calls in app code | ✅ zero | `grep "fetch\|axios\|XMLHttpRequest"` in `apps/web/lib` + `hooks` returns zero non-test, non-localhost results |
| Privacy posture | ✅ clean | No analytics scripts, no third-party fonts CDN (Inter / JetBrains Mono / Orbitron self-hosted), no telemetry |
| Workbench-private data | ✅ contained | `notes` + `description` on `SaberProfile` are explicitly excluded from `kyberGlyph.ts` (Kyber Code share URL) and `configUrl.ts` (legacy fallback) — privacy sentinels assert this in tests |
| Kyber Code decode | ✅ safe | No `eval` / `new Function` paths; version-mismatch fails closed (rejects payload) per `kyberGlyph.ts` |
| WebUSB FlashPanel safety | ✅ gated | 3-checkbox EXPERIMENTAL disclaimer (responsibility/backup/recovery) per PR #145; vendor-customized board warning (89sabers BFB2=1) |

---

## Recommended remediation order

1. **🔴 H1 — Enable branch protection on `main`** (Ken, 5 min via GitHub UI)
2. **🔵 L1 — Add CodeQL workflow** (this PR — `.github/workflows/codeql.yml`)
3. **🟡 M1 — Plan Next.js 15 upgrade** (v0.17 sprint, not launch-blocking)
4. **🟡 M2 — Wait** for upstream vitest/jsdom/canvas to bump tar dep (no action)

Items L2 + L3 are no-action.

---

## What was NOT in scope

- Hardware security (Proffieboard firmware itself) — out of scope; tracked by ProffieOS project upstream
- DoS resistance of `kenkoller.github.io` — GitHub Pages handles this; KyberStation has no rate-limiting layer of its own (none needed for a static site)
- User account / password security — there are no accounts; this is intentional
- TLS/certificate pinning — GitHub Pages serves over HTTPS by default; nothing to pin

---

## Appendix: pnpm audit raw output

```
13 vulnerabilities found
Severity: 5 moderate | 8 high
```

| Severity | Title | Module | Path |
|---|---|---|---|
| HIGH | Next.js DoS via Server Components (q4gf-8mx6-v5v3) | next | apps__web>next |
| HIGH | Next.js DoS via Server Components (h25m-26qc-wcjf) | next | apps__web>next |
| HIGH | tar — hardlink path traversal | tar | packages__boards>vitest>jsdom>canvas>@mapbox/node-pre-gyp>tar |
| HIGH | tar — symlink poisoning | tar | (same path) |
| HIGH | tar — hardlink target escape via symlink chain | tar | (same path) |
| HIGH | tar — drive-relative linkpath | tar | (same path) |
| HIGH | tar — symlink path traversal via drive-relative | tar | (same path) |
| HIGH | tar — race condition macOS APFS | tar | (same path) |

5 moderates: detail in `pnpm audit --audit-level moderate` if needed.
