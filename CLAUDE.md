# KYBERSTATION — Project Context

## Overview

KyberStation is a standalone desktop + web application for designing, previewing, and exporting custom lightsaber blade styles. Primary support is Proffieboard V2/V3 running ProffieOS 7.x with full Xenopixel V3 configuration mode as of v0.21.0. It is a visual style editor, real-time blade simulator, sound font manager, and multi-board config generator — think "DAW for lightsabers."

The app targets the Neopixel lightsaber hobbyist community (cosplay, reenactment, collecting, dueling) and aims to surpass every existing tool (Fett263 Style Library web UI, Fredrik's Style Editor, manual config editing) by combining them into a single cohesive experience with features nobody has built yet.

## Release Posture

- **Launched 2026-05-01.** v1.0 shipped as a static GitHub Pages deployment. Launch summary in `docs/LAUNCH_PLAN.md`.
- **Tone is humble.** First public programming project, first GitHub project. Acknowledge hobby status, invite feedback, don't overclaim.
- **Contribution policy:** Issues/feedback open, outside PRs not yet accepted. Revisit at 30 days post-launch.
- **Post-launch backlog:** `docs/POST_LAUNCH_BACKLOG.md` is the single source of truth for remaining work.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **UI**: React 18+, Tailwind CSS, Radix UI primitives
- **State**: Zustand (global store) + React state for local UI
- **Canvas/Rendering**: HTML5 Canvas 2D for blade visualizer, Three.js for optional 3D hilt preview
- **Code Generation**: Custom AST-based ProffieOS style code emitter + Xenopixel INI config emitter
- **Sound**: Web Audio API for font preview playback
- **Storage**: IndexedDB (via Dexie.js) for local project persistence
- **Desktop**: Electron wrapper (future phase) for USB serial communication with Proffieboard
- **Package Manager**: pnpm
- **Testing**: Vitest + React Testing Library
- **CI**: GitHub Actions

## Repository Structure

Condensed and generated from the real tree on 2026-09-24. Use `ls` / Glob for file-level detail — per-file listings in this doc went stale fast.

```
kyberstation/
├── .github/workflows/        # ci, deploy (GitHub Pages), release, firmware-build, codeql, stale
├── apps/web/                 # Next.js 14 app (App Router, static export) — the only app today
│   ├── app/                  # Routes: / (landing), editor, gallery (→ editor tab), docs, features,
│   │                         #   faq, changelog, community, showcase, s/ + m/ (share links)
│   ├── components/
│   │   ├── editor/           # ~70 panels (BladeCanvas, CardWriter, CodeOutput, …) + subdirs:
│   │   │                     #   audio, blade-style, blade3d, color, combat-effects,
│   │   │                     #   ignition-retraction, layerstack, my-saber, output, quick,
│   │   │                     #   routing, template-tree, xenopixel
│   │   ├── layout/           # AppShell, WorkbenchLayout, Toolbar, StatusBar, …
│   │   └── gallery/ hilt/ hud/ landing/ marketing/ onboarding/ shared/
│   ├── hooks/                # useBladeEngine, useHardwarePreview, useAnimationFrame, … (~36)
│   ├── stores/               # ~27 Zustand stores (bladeStore, uiStore, layoutStore, historyStore, …)
│   ├── lib/                  # zipExporter, deliverability, bladeConfigIO, configUrl, fontDB,
│   │                         #   webusb/, sharePack/, crystal/, import/, …
│   └── tests/                # Vitest + React Testing Library suites
├── packages/
│   ├── engine/               # Headless simulation: BladeEngine, LEDArray, styles/ (33),
│   │                         #   effects/ (22), ignition/ (19 ignition + 13 retraction),
│   │                         #   modulation/, motion/, templateEval/ (bridge), oled/, storage/
│   ├── template-eval/        # ProffieOS C++ template parser + per-LED interpreter (Hardware Preview)
│   ├── codegen/              # ASTBuilder → CodeEmitter → ConfigBuilder (config.h), Validator,
│   │                         #   emitters/ (runtime presets.ini, Xenopixel, CFX, GH),
│   │                         #   proffieOSEmitter/ (modulation + button bindings),
│   │                         #   parser/ (import existing ProffieOS code)
│   ├── presets/              # 455 gallery presets (characters/, recipes/, templates/)
│   ├── sound/                # FontParser, FontPlayer, SmoothSwingEngine, filters/
│   ├── boards/               # 16 board profiles + compatibility scoring
│   └── hardware-profiles/    # Vendor chassis profiles (89sabers, Sabertrio, …) + codegen adapter
├── scripts/                  # Local build/serve runners; hardware-test/ bench + recovery scripts
├── docs/                     # FLASH_GUIDE, HARDWARE_COMPATIBILITY, POST_LAUNCH_BACKLOG,
│                             #   DEVELOPMENT_PLAN_2026-09, user-guide/, research/, archive/
├── turbo.json · pnpm-workspace.yaml · tsconfig.base.json · package.json
├── README.md · CHANGELOG.md · LICENSE (MIT)
└── CLAUDE.md                 # This file
```

There is no Electron app yet; `apps/electron` was a scaffold plan (see memory: Electron companion deferred).

## Architecture Principles

1. **Monorepo via Turborepo + pnpm workspaces** — Engine, codegen, presets, and sound packages are decoupled from the UI. The engine runs identically in browser, tests, and (future) Electron.

2. **Engine-first** — `packages/engine` is the source of truth for all blade behavior. The React UI is a thin rendering layer over the engine's LED array output. The engine has zero DOM dependencies and can run headless.

3. **AST-based code generation** — We don't string-concatenate ProffieOS code. `packages/codegen` builds an AST of ProffieOS style templates, validates it, and emits formatted C++ code. This ensures correct nesting, matching angle brackets, and valid template arguments.

4. **Plugin-style extensibility** — New styles, effects, and ignition types are classes implementing well-defined interfaces (BaseStyle, BaseEffect, BaseIgnition). Adding a new style is: create class, register in index, add UI entry.

5. **Offline-first** — All project data persists in IndexedDB. No server required for core functionality. Future community gallery is additive.

## Key Interfaces

```typescript
// packages/engine/src/types.ts

interface BladeStyle {
  id: string;
  name: string;
  description: string;
  getColor(position: number, time: number, context: StyleContext): RGB;
}

interface BladeEffect {
  id: string;
  type: EffectType;
  apply(color: RGB, position: number, context: EffectContext): RGB;
  isActive(): boolean;
  trigger(params: EffectParams): void;
}

interface IgnitionAnimation {
  id: string;
  getMask(position: number, progress: number): number; // 0-1
}

interface StyleContext {
  time: number;
  swingSpeed: number;    // 0-1 normalized
  bladeAngle: number;    // -1 to 1
  twistAngle: number;    // -1 to 1
  soundLevel: number;    // 0-1 normalized
  batteryLevel: number;  // 0-1
  config: BladeConfig;
}

interface RGB {
  r: number; // 0-255
  g: number;
  b: number;
}

interface BladeConfig {
  baseColor: RGB;
  clashColor: RGB;
  lockupColor: RGB;
  blastColor: RGB;
  style: string;
  ignition: string;
  retraction: string;
  ignitionMs: number;
  retractionMs: number;
  shimmer: number;       // 0-1
  ledCount: number;      // typically 144
  [key: string]: unknown; // style-specific params (was `any`; narrowed)
}
```

## ProffieOS Compatibility Target

- ProffieOS 7.x (7.12 verified against source; upstream is at 8.x, not yet evaluated)
- Proffieboard V2.2 and V3.9
- Fett263 prop file (saber_fett263_buttons.h)
- Generated code must compile without modification in Arduino IDE with Proffieboard board manager installed
- Support for: Layers<>, BlastL<>, SimpleClashL<>, LockupTrL<>, InOutTrL<>, all standard transitions, AudioFlicker, StyleFire, Pulsing, Stripes, Mix<>, Gradient<>, Rainbow, RotateColorsX<>, responsive functions

## Development Environment

### Source of Truth

- **Local machine** is the development environment (Mac or PC)
- **GitHub** (`kenkoller/KyberStation`) is the canonical remote — all work is pushed here
- **NAS** (`/Volumes/ZDC/` aka Z: drive on Windows) is an optional mirror clone for backup only — never develop directly on the NAS
- There should only be ONE active working copy per machine, cloned from GitHub

### Multi-Machine Workflow (Mac + PC)

Both machines clone from GitHub independently. Standard push/pull to stay in sync:

```bash
# On any machine — always pull before starting work
git pull

# After finishing work — commit and push
git add <files>
git commit -m "feat: description"
git push
```

### PC Setup (Windows)

Prerequisites:
- Git for Windows
- Node.js 20+ (24.x recommended)
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- Windows Terminal + PowerShell or Git Bash

```bash
git clone https://github.com/kenkoller/KyberStation.git
cd KyberStation
pnpm install
pnpm dev
```

Windows launch scripts (`KyberStation.bat`, `KyberStation.ps1`) are provided in the project root.

### Mac Setup

Prerequisites:
- Node.js 20+ (24.x recommended)
- pnpm 9+ (10.x recommended)

```bash
git clone https://github.com/kenkoller/KyberStation.git
cd KyberStation
pnpm install
pnpm dev
```

### Cross-Platform Notes

- `.gitattributes` enforces LF line endings on all source files across Mac and Windows
- `.bat` and `.ps1` files are kept as CRLF for Windows compatibility
- Do NOT develop on the NAS directly — SMB causes issues with file watching, symlinks, and pnpm performance
- If a NAS backup is desired, clone the repo there and `git pull` periodically:
  ```bash
  git clone https://github.com/kenkoller/KyberStation.git /Volumes/ZDC/Development/KyberStation
  ```

## Development Commands

```bash
pnpm install                    # Install all dependencies
pnpm dev                        # Start Next.js dev server
pnpm build                      # Build all packages + app
pnpm test                       # Run all tests
pnpm test:engine                # Engine tests only
pnpm test:codegen               # Codegen tests only
pnpm lint                       # placeholder — ESLint not configured yet (plan Phase 2)
pnpm typecheck                  # TypeScript strict check
```

## Conventions

- All files TypeScript, strict mode, no `any` except in types.ts escape hatches
- Components: PascalCase files, named exports, co-located tests
- Engine code: No DOM, no React, pure TypeScript classes
- Commits: Conventional Commits (feat:, fix:, refactor:, docs:, test:)
- PRs: Must pass CI, must have tests for new engine/codegen code
- Branch naming: `feat/description`, `fix/description`, `refactor/description`

---

## Collaboration defaults (2026-04-23)

Standing authorizations for Claude Code sessions working in this repo.
These override the default "confirm before acting" posture for the
scope listed. If a memory note or explicit user instruction in the
current conversation conflicts with these, the more restrictive rule
wins.

### Pre-authorized actions (no confirmation needed)

- **Local commits on feature branches.** Any commit onto the current
  feature branch with a descriptive conventional-commits message +
  `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
  trailer. Stage specific files, not `git add -A` / `git add .`.
- **Push feature branches.** Any branch that is NOT `main`. The
  client-side `.githooks/pre-push` hook + server-side branch
  protection both guard `main` independently.
- **Open PRs via `gh pr create`.** With a descriptive title (short,
  ≤70 chars) and a body that summarizes scope + includes test/typecheck
  results + a test plan. Follow `.github/PULL_REQUEST_TEMPLATE.md` if present.
- **Merge PRs via `gh pr merge --merge --delete-branch`.** Merge-commit
  strategy preserves history (preferred for multi-commit feature
  branches). Use `--squash` only when the PR body explicitly says to.
- **Enable auto-merge via `gh pr merge --auto --merge`** if the repo
  supports it (currently disabled on kenkoller/KyberStation — fall
  back to polling `gh pr checks` until green, then merge).
- **Prune verified-merged branches.** Local + origin. Verify safety
  with `git branch --merged main` (for fully-merged) or
  `git cherry origin/main <branch>` (no `+` lines = content on main).
  Branches with worktrees are never deletable even if they show as
  merged.

### Never, under any circumstances

- **Never force-push** to any branch. No `--force`, no `--force-with-lease`
  without a direct user request spelling out why.
- **Never disable branch protection rules**, even temporarily.
- **Never skip git hooks** — no `--no-verify` on commit or push,
  no `-c commit.gpgsign=false`.
- **Never modify git config** or global settings.
- **Never delete a branch that has a worktree**, even if it shows as
  merged. `git worktree list` is the authoritative check.
- **Never delete a branch with an open PR** on origin.
- **Never commit files that likely contain secrets** (`.env`,
  credential files, etc.) — warn the user explicitly if they appear
  in the candidate stage set.

### Always confirm first

- Opening a PR whose diff **removes a feature, bumps a major dep, or
  touches `package.json` / `pnpm-lock.yaml`** in a way that could break
  installs.
- Deleting any **stash** — they often hold WIP the user hasn't moved
  elsewhere. Check `git stash list` before any branch op that could
  affect stashed state.
- Deleting a branch with **unique-hash commits** that appear to be
  cherry-picked into main (`git cherry origin/main <branch>` shows
  `-` lines only). Content is on main; hashes are not.
- Any PR merge that **targets `main` outside CI hours** or that
  involves a release tag.

### Test gates before any `git push`

- `pnpm typecheck` — must be clean across all workspace packages.
- `pnpm test` — must pass across all workspace packages.
- If either fails: report the failure with file:line references and
  do NOT push. Never push a red tree to unblock a workflow.

### Branch-naming expectations

- Features: `feat/<short-description>`
- Fixes: `fix/<short-description>`
- Refactors: `refactor/<short-description>`
- Docs-only: `docs/<short-description>`
- Merge-transport (landing a long-running branch on main when direct
  push is blocked): `feat/merge-<source-branch-name>`

### Cross-session coordination

When multiple Claude sessions are running in parallel against this
repo (modulation + UI + preset work in separate worktrees, etc.):

1. **Before any git operation**, run `git fetch origin --prune` and
   `git worktree list` to see current state.
2. **If another worktree is on the branch you'd edit**, pause and
   surface the collision to the user rather than racing.
3. **When merging into main**, announce in the PR body which sibling
   branches/worktrees are active so they can rebase cleanly after.
4. **When parking WIP** for another session, push the branch to
   origin so work is recoverable even if the local worktree is
   clobbered.

---

## Current State (2026-09-28 — re-entry sprint merged)

**Start with [`docs/DEVELOPMENT_PLAN_2026-09.md`](docs/DEVELOPMENT_PLAN_2026-09.md)** — plan, lane status, and the decisions waiting on Ken. The audit behind it: [`docs/research/AUDIT_2026-09-24_FABLE.md`](docs/research/AUDIT_2026-09-24_FABLE.md). Treat this section as a snapshot and re-verify against the code before relying on it — a shipped feature (Wave 8) once stayed listed as "open" here for four months.

**Releases** (detail in CHANGELOG.md). Latest tag is **v0.23.1** (2026-05-17). `main` carries an untagged re-entry sprint (2026-09-24 → 09-28, PRs [#363](https://github.com/kenkoller/KyberStation/pull/363), [#366](https://github.com/kenkoller/KyberStation/pull/366)–[#371](https://github.com/kenkoller/KyberStation/pull/371)) — see CHANGELOG `[Unreleased]`. Earlier: v0.22.x Runtime Presets + Polyglot Audit; v0.23.0 Visualizer Upgrade; v0.23.1 white-out fix; Wave 8 button-routing sub-tab ([#354](https://github.com/kenkoller/KyberStation/pull/354)–[#356](https://github.com/kenkoller/KyberStation/pull/356), `apps/web/components/editor/routing/ButtonRoutingSubTab.tsx`).

**How the pieces fit now:**
- **Render mode** is decided in one place (`apps/web/lib/engineRenderMode.ts`, used by `useBladeEngine`). Hardware Preview — the template-eval interpreter running the generated ProffieOS code — is on by default on every layout and draws the configured ignition/retraction and lockups (#371). Desktop runs one `BladeEngine` (owned by `WorkbenchLayout`; `CompactShell` owns it on tablet/mobile). A CI gate renders all 455 presets through the interpreter.
- **Chassis → delivery path.** Each hardware profile records `recommendedDelivery` and `customFirmware` (`packages/hardware-profiles`, `getDeliveryGuidance()`). Onboarding's YOUR SABER step, the chassis picker, the Flash panel gate, and the Card Writer's defaults act on it (#368, #370).
- **Runtime presets** (SD card) write `presets.ini` + an identical `presets.tmp`, read `install_time` past the firmware's 512-byte header, and map blade styles onto ProffieOS 7.12's runtime verbs — 246 faithful / 114 approximate / 95 colors-only of 455 (#369, `packages/codegen/src/emitters/runtimeVerbs.ts`).
- **Codegen gates:** `validateAST` can fail and runs over every preset in tests; golden `.cpp` fixtures are compared byte for byte — regenerate with `KYBERSTATION_WRITE_FIXTURES=1` when generated code or presets change on purpose (#367).

**Hardware delivery status:**
- **Proffieboard V3.9-BT** ("gray board", 89sabers, current bench saber): custom firmware failed **11/11** (2026-05-14 → 05-19) — including 89sabers' own factory source, and custom images on Bank 1, Bank 2 only, and Bank 1 with a 256K link. Only a byte-perfect dual-bank factory restore boots it. **Runtime presets (SD card: `presets.ini` + an identical `presets.tmp`) is the only supported path** — validated with a 22-preset deck on 2026-05-19 (only the `advanced` and `builtin` verbs are validated on the SD path so far). R&D record: [`PROFFIE_V39BT_FLASH_FEASIBILITY.md`](docs/research/PROFFIE_V39BT_FLASH_FEASIBILITY.md) and [`SESSION_2026-05-19_DEEP_DIVE_V39BT_FLASH.md`](docs/research/SESSION_2026-05-19_DEEP_DIVE_V39BT_FLASH.md). Recovery: `scripts/hardware-test/restore-factory.sh` or `backups/w2prime-bis-prep-2026-05-18/recover-grayboard.sh`.
- **Proffieboard V3.9 non-BT** ("blackboard", retired): DFU works, but no firmware boots in application mode (likely clock-circuit damage). Flash-pipeline test bench only.
- **Stock Hubbe boards:** untested. No unmodified KyberStation `config.h` export has been bench-confirmed to boot on any board.

**Verified counts (2026-09-28):** 9,706 tests, all green on CI (web 3,926 · codegen 3,601 · engine 1,331 · boards 278 · template-eval 249 · presets 138 · hardware-profiles 121 · sound 62). A full local `pnpm test` under heavy machine load can time out a few tests — re-run with `npx vitest run --maxWorkers=4` inside the package before treating a failure as real. 455 presets (`ALL_PRESETS.length`). 33 blade styles, 22 effects, 30 themes. Seven packages under `packages/` plus `apps/web`.

**Open, in priority order** (full list: plan Phase 2/3 and the "Open now" table in [`docs/POST_LAUNCH_BACKLOG.md`](docs/POST_LAUNCH_BACKLOG.md)): config.h ignition runs tip → hilt for the default `standard` ignition (plan Lane F, in progress); bench-validate each runtime verb + the `.tmp` fix; stock Proffieboard reference run; shimmer never reaches generated code; Aurora/Prism emit plain `Rainbow`; config.h ignores gradient stops; web stack upgrade (Next 14 is past end of life); ESLint (the `lint` scripts are placeholders).

---

## Session History

Detailed per-session state entries (2026-04-17 through 2026-05-10) were
removed from this file on 2026-05-12 during a structural cleanup pass.
The full history is preserved in git (see `git log --follow CLAUDE.md`).
Session archive docs live in `docs/archive/`.
