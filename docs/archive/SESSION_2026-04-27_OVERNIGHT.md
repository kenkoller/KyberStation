# Session Archive — 2026-04-27 Overnight (UI/UX Sweep + Hardware Validation)

Single-session marathon, ~8+ hours. Hardware validation closed the v0.15.0 launch-blocker, plus 14 PRs of UI/UX work shipped on top.

---

## What shipped (14 PRs, all merged)

| # | Title | Highlights |
|---|---|---|
| #84 | `fix(a11y): clear 4 axe-core P29 violations across editor + landing` | WCAG 2 AA: 0 violations across `/`, `/editor` desktop+mobile, `/gallery` |
| #85 | `docs(v0.15): flip hardware-validated status from claim to confirmed` | Reproducible build script `scripts/hardware-test/build-modulation-test-config.mjs` |
| #86 | `chore(v0.15): drop hiltId cast + add isGreenHue/isBlueHue siblings` | `BladeConfig.hiltId` typed; faction-hue predicates symmetric |
| #87 | `docs(p31): document two Safari rendering follow-ups` | Cross-browser sweep findings filed in POST_LAUNCH_BACKLOG |
| #88 | `fix(card): theme-gate blade bloom composite for LIGHT_THEME` | `lightBackdrop` opt swaps `lighter` → `screen` so paper bg doesn't saturate |
| #89 | `feat(sidebar): IA reorganization — SETUP / DESIGN / REACTIVITY / OUTPUT` | New 4-group taxonomy; `MySaberPanel` promoted to first sidebar item; EffectPanel + StylePanel dedup |
| #90 | `refactor(settings): consolidate per IA audit — drop 3 duplicate sections` | UI Sounds + Keyboard Shortcuts + Performance Tier deleted from SettingsModal |
| #91 | `feat(sidebar-ab): Phase 2 — blade-style A/B prototype` | 29-style Column A list + deep editor in Column B; `useABLayout` flag flipped on |
| #92 | `fix(minisaber): clear Safari halo-banding via box-shadow swap` | drop-shadow → box-shadow swap; visually verified Safari halo now matches Brave |
| #93 | `feat(aurebesh): variant picker — Canon / CanonTech / Legends / LegendsTech` | 4 bundled variants now selectable in Settings → Appearance |
| #94 | `feat(sidebar-ab): Phase 3 — color + ignition-retraction A/B prototypes` | Two more sidebar sections migrated to A/B layout |
| #95 | `fix(randomizer): preserve user's ledCount across Surprise Me + variants` | Hardware properties no longer randomized |
| #96 | `fix(hardware): align blade-length tables (36"=132 LEDs) + mark Strip Config + Topology as WIP` | Eliminates the bug where 36" and 40" rendered identically |

Plus the **hardware-validation closeout itself** — see CLAUDE.md "Current State" entry for full details.

## Architectural notes worth carrying forward

### Multi-agent worktree-isolated dispatch is validated for parallel-safe work
- 3 agents fanned out for Block 1 (sidebar regroup + EffectPanel dedup + StylePanel dedup), 1 for Block 3 (blade-style A/B), 1 for Block 5 (color + ignition-retraction A/B) — all on file-disjoint lanes. Each landed in its own worktree branch; the parent session merged all 5 into integration branches.
- **Caveat**: prompt agents must check the worktree-base branch carefully. The Block 5 prompt said "branched from feat/sidebar-ab-phase-2" but the worktree was actually based off main HEAD pre-Block-1. The agent's commit went to `feat/sidebar-ab-phase-3` regardless. Integration was clean because the file footprints were disjoint, but writing prompts that reference the actual worktree state directly (not assumed parent branches) would be more robust.
- **Caveat**: agents over-cut occasionally. Block 1 Agent B (EffectPanel dedup) interpreted the audit-doc spec aggressively and proposed dropping Preon / Easing Curves / Dual-Mode Ignition / Custom Curve Controls — all unique-to-this-panel concerns with no equivalent in IgnitionRetractionPanel. The integrator pulled back to the narrow cut. Worth flagging in the agent's prompt: "if a kept-elsewhere check fails, stay narrow."

### Safari rendering work is risky without direct inspection
- **MiniSaber halo banding (PR #92)** — fixed cleanly by swapping chained `drop-shadow` for chained `box-shadow`. Canvas is rectangular so the visual is equivalent.
- **BladeCanvas bloom in Safari** — attempted padding the bloom-mip canvases so `filter: blur()` could spread. Verified Chrome no-regression but Ken's Safari report showed the fix didn't fully resolve the issue (still appears under-bloomed; capsule appears to "overlap" the hilt and bloom because the soft halo isn't filling its expected space). **Reverted; deferred to a focused future session** with proper Safari debugging.

### Source-of-truth drift (`BLADE_LENGTHS`)
- `BLADE_LENGTHS` is duplicated across `lib/bladeRenderMetrics.ts`, `components/editor/HardwarePanel.tsx`, `components/editor/BladeHardwarePanel.tsx`, `packages/engine/src/types.ts`, and likely more. Tonight's "36" maps to 144 vs 132" mismatch was the second time this drift bit. **Lifting it to a single shared source (e.g. `lib/bladeLengths.ts` re-exported from `@kyberstation/engine`) is a follow-up** that would eliminate the class of bug.

---

## Incomplete features audit (from grep + walkthrough)

Things in the app that are placeholders / WIP / partially functional. Documented for honest pre-launch comms + next-session triage.

### Marked WIP today (PR #96)
- **Topology** (Hardware section) — only `Single` / `Staff` / `Crossguard` render correctly. `Triple` and `Inquisitor` are visual placeholders pending the multi-segment renderer.
- **Strip Configuration** — feeds power-draw math + ledCount but doesn't yet change the rendered blade thickness.

### Placeholders / TODOs in the codebase
| Area | File | What's missing |
|---|---|---|
| **WebUSB CONN state** | `StatusBar.tsx:170-238`, `DeliveryRail.tsx:191-210` | Both show hardcoded "IDLE" — not wired to a global WebUSB connection store yet. FlashPanel holds connection state locally; needs a Zustand store. |
| **Community Gallery** | `CommunityGallery.tsx:36-108` | Renders hardcoded placeholder styles. Production fetch from GitHub Pages not implemented. |
| **CardWriter SD-card fonts** | `CardWriter.tsx:211` | Generated SD card has placeholder font files; user manually copies real ones. Real font-folder packing is a future feature. |
| **3 consumer-migration stubs** | `BladeHardwarePanel.tsx`, `PowerDrawPanel.tsx`, `GradientBuilder.tsx` | Full component files marked "consumer migration in progress" — actual content lives in `HardwarePanel.tsx` / `ColorPanel.tsx` now. Active imports remain in `DesignPanel.tsx`, `ColorPanel.tsx` (line 825 inlined region), `StylePanel.tsx`, `TabColumnContent.tsx`, `lib/powerDraw.ts`, `BladeStyleColumnB.tsx`. Each stub deletion is its own PR. |
| **Modulation sampler v1.1 progress fields** | `packages/engine/src/modulation/sampler.ts` | `preon`/`ignition`/`retraction` modulators exist as plates but their `progress` value isn't computed each tick; placeholder zeros. |
| **`BladeConfig.clashDecay`** | `packages/engine/src/modulation/sampler.ts` (TODO) | Field referenced as a binding target but no decay model wired. |
| **Theme-row cap in WorkbenchLayout** | `WorkbenchLayout.tsx:669` | TODO to remove the cap once theme rows land their own section. |
| **Mobile shell still on 4-tab swipe UI** | `MergedDesignPanel.tsx`, `DynamicsPanel.tsx`, `uiStore.activeTab` | Desktop migrated to Sidebar + MainContent; mobile still uses the legacy shape pending a UX call on drawer vs. bottom-sheet at 375px. |
| **Safari BladeCanvas bloom** | `BladeCanvas.tsx` | Bloom renders much narrower in Safari than Chromium. Documented in `POST_LAUNCH_BACKLOG.md` "Safari rendering follow-ups". Recommended browser is Brave/Chrome/Edge. |
| **A/B Phase 4+ sections** | `combat-effects` / `routing` / `audio` / `gallery` (in editor) / `my-saber` / `output` preset list | Per `SIDEBAR_AB_LAYOUT_v2_DESIGN.md` these would benefit from the A/B pattern but haven't been migrated yet. |

### Genuinely deferred or paid (not new findings)
- Crystal Vault panel + Re-attunement UI (designed in `KYBER_CRYSTAL_3D.md`, not built)
- Favicon replacement with crystal-themed image
- 1200×630 OG hero image
- Phone-camera QR scan validation on real hardware
- `<HiltMesh>` extraction from BladeCanvas3D.tsx (now dead)
- Aurebesh font UX surfacing — partially solved by PR #93, but DataTicker variant pickup needs visual verification

## Final state

- **Last tag**: `v0.15.0` (Modulation Routing v1.1 Core), now hardware-validated.
- **Untagged work since v0.15.0**: 14 PRs (#84-#96, except #87 which is docs-only).
- **Recommended browser**: Brave / Chrome / Edge for full fidelity. Safari has 1 known cosmetic gap (BladeCanvas bloom narrower than Chromium) — document in launch communication; users get all functional features, just slightly different bloom character.
- **Test count**: 1,114 web tests / 4,058 total across 6 packages. All green.
- **Hardware validation**: ✅ on 89sabers V3.9 + macOS + Brave. Live `Mix<Scale<SwingSpeed<400>, ...>, ...>` driver confirmed firing on hardware.

## Ready for next session

Handoff at [`docs/NEXT_SESSION_HANDOFF.md`](NEXT_SESSION_HANDOFF.md).
