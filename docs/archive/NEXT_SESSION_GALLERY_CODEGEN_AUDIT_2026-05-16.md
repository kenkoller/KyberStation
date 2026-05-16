# Next Session — Gallery Preset Audit + Multi-Board Codegen Audit + Editor Learnings Integration

**Hand off as of:** 2026-05-16 evening, post-PR #331 (bench-validation tooling).

**Goal:** Three coordinated audits that bring KyberStation's user-facing surface up to the level of fidelity the smoking-gun saga showed us is achievable. Each can run as a parallel agent dispatch; main session integrates.

**Paste this prompt verbatim into a fresh Claude Code session at `/Users/KK/Development/KyberStation/`** and the agent has everything needed to execute.

---

## Context — what's behind us

Recent shipped sprints (this week):
- **PR #325 (v0.22.0 runtime presets path)** — SD-card preset workflow, sidesteps the V3.9-BT compile-flash gap. Smoking-gun fix at commit `45737f2`: 16-bit RGB scaling for the ProffieOS `RgbArg<>` parser.
- **PR #326-#330** — audit Wave 2 cleanup: v0.22.0 changelog, saber-profile migration fixtures, Fett263 round-trip fixtures, codegen registry argType fixes, parser bare-integer preservation.
- **PR #315** — renderer golden-hash coverage +20 baselines.
- **PR #331 (in flight)** — bench validation: curated 15-preset generator, TTS callout generator, SD deploy script. Empirically validated 15 Phase C presets running at full brightness on 89sabers V3.9-BT in hilt-mounted form 2026-05-16.

Key learnings from the smoking-gun saga (read [`docs/research/EMIT_PARSER_AUDIT.md`](../research/EMIT_PARSER_AUDIT.md) §"The investigative lesson" first):
1. **Verify byte-exact emit↔parser encoding BEFORE theorizing** about consumer behavior. Reading parser source is cheaper than bench time.
2. **Wire-format fixtures pin schema contracts** ([`apps/web/tests/fixtures/kyberGlyphs/v1/fixtures.json`](../../apps/web/tests/fixtures/kyberGlyphs/v1/fixtures.json) is the canonical pattern). Round-trip alone is insufficient — pin the actual emitted string.
3. **Audit docs go stale fast** — verify state on disk before trusting an "Unverified" mark.

---

## The three workstreams

### A — Gallery preset accuracy audit (455 presets)

**Why:** KyberStation's gallery is the "show, don't tell" surface — users pick a preset and expect it to match canon. Some legacy entries may have drifted from on-screen reference; some have placeholder descriptions; some pre-date features (modulation, ignition variants) and don't exercise them.

**Scope:** All 455 entries in `ALL_PRESETS` ([`packages/presets/src/index.ts`](../../packages/presets/src/index.ts)).

**Sub-passes** (can run as parallel agents — files are partitioned by era):

#### A1. Accuracy audit (per-era)
For each preset:
- **Color**: `baseColor`, `clashColor`, `lockupColor`, `blastColor` vs on-screen reference. Document obvious mismatches.
- **Style + effects**: does `style` (stable / unstable / rotoscope / etc.) match the canonical depiction? Is `ignitionMs` / `retractionMs` reasonable (not stuck at default `300`/`800` for everything)?
- **Metadata**: `era`, `affiliation`, `screenAccurate`, `continuity` correctly set?
- **Hilt notes**: are `hiltNotes` populated? (Many legacy entries don't have them.)

Output per preset: PASS / FLAG (with one-line note). Aggregate into `docs/research/GALLERY_AUDIT_2026-05-XX.md`. Top of doc: summary of systemic issues (e.g. "23 prequel presets share the exact same `shimmer: 0.1` default — most should be tuned per character").

Partition for parallel dispatch:
- Agent A1a: `prequel-era.ts` (~50 presets)
- Agent A1b: `original-trilogy.ts` (~30 presets)
- Agent A1c: `sequel-era.ts` (~30 presets)
- Agent A1d: `animated-series.ts` + `extended-universe.ts` (~80 presets)
- Agent A1e: `legends.ts` + `creative-community.ts` + `showcase.ts` (~70 presets)
- Agent A1f: `pop-culture/*` (~195 presets across 13 sub-files)

Each agent gets the file list, the audit criteria, and outputs a section of `GALLERY_AUDIT_2026-05-XX.md` with PASS/FLAG per preset.

#### A2. Description enrichment (parallel sub-pass)
Many presets have minimal `description` (one line or stub). Flesh out to 2-3 sentences with: era context + character moment + visual hook. Match the existing `Obi-Wan Kenobi (ANH)` style:
> "A New Hope — an aged Jedi's blade reignited after years in exile. Slightly warmer blue than Luke's, with a gentle flicker suggesting the kyber crystal's long dormancy."

Run as a SINGLE dispatch (one agent does all 455) so voice/style stays consistent. Agent should:
1. Sample 5-10 existing well-written descriptions to anchor voice.
2. For each preset with `description.length < 80` chars OR description starts with the character name (placeholder pattern), generate a richer version.
3. Output diffs as a single PR — do not modify `description` for presets that already have detailed copy.

#### A3. Fix-PR sprint (after A1+A2 land)
Once flags are catalogued, dispatch fix agents in parallel:
- Color corrections per era (one agent per `*-era.ts` file)
- Metadata corrections (one agent for the metadata pass)
- Description enrichment (one agent for the whole library)

Each agent: open its own PR off `main`, file-disjoint scope, test gates green before push.

---

### B — Multi-board codegen "don't lose anything" audit

**Why:** When a user designs a preset in KyberStation and exports to Proffie / Xenopixel / CFX / Golden Harvest, some BladeConfig fields silently don't transfer. We need a catalog of every field × every board target = preserved / lossy / N/A.

**Files:**
- BladeConfig source of truth: [`packages/engine/src/types.ts`](../../packages/engine/src/types.ts) (~60 fields)
- Board emitters:
  - Proffie compile+flash: [`packages/codegen/src/`](../../packages/codegen/src) (ASTBuilder, ConfigBuilder, CodeEmitter)
  - Proffie runtime presets: [`packages/codegen/src/emitters/ProffieRuntimeEmitter.ts`](../../packages/codegen/src/emitters/ProffieRuntimeEmitter.ts)
  - Xenopixel V3: [`apps/web/lib/zipExporter.ts`](../../apps/web/lib/zipExporter.ts) (`xenopixel` case, ~line 817)
  - CFX: same file, `cfx` case
  - Golden Harvest: same file, `golden_harvest` case
- Existing audit doc: [`docs/research/EMIT_PARSER_AUDIT.md`](../research/EMIT_PARSER_AUDIT.md)

**Approach** — one agent, sequential pass:

1. **Read BladeConfig type definition** end-to-end. List every field with its semantic.
2. **For each board emitter**, trace each BladeConfig field through the export path:
   - PRESERVED — field reaches the output file in a parseable form
   - LOSSY — field is dropped, truncated, or quantized below useful resolution
   - N/A — field doesn't apply to this board's hardware (e.g., Xenopixel doesn't have a `lockupColor` in its INI format)
   - UNVERIFIED — emitter doesn't reference the field; needs source trace
3. **Build the matrix** in `docs/research/MULTI_BOARD_FIELD_COVERAGE_2026-05-XX.md`:

   | BladeConfig field | Proffie (flash) | Proffie (runtime) | Xenopixel V3 | CFX | GH |
   |---|---|---|---|---|---|
   | `baseColor` | ✅ Rgb<R,G,B> | ✅ advanced csv (16-bit) | ✅ font_N=(R,G,B) | ⚠ design-ref only | ⚠ design-ref only |
   | `clashColor` | ✅ | ✅ slot 8 | ✅ clash | ⚠ | ⚠ |
   | ... | | | | | |

4. **Update EMIT_PARSER_AUDIT.md** with new findings; flip stale `⚠ Unverified` marks based on actual code state.
5. **Open follow-up PRs** for any LOSSY-but-fixable gap. E.g., if Xenopixel emitter doesn't pass through `shimmer` but the firmware supports it, that's a fix.

**Test fixture pattern:** for each new emitter↔parser contract, add a wire-format fixture mirroring `apps/web/tests/fixtures/kyberGlyphs/v1/fixtures.json` (`expect(encoded).toBe(fixture.wire)` assertions). Sister tests for round-trip + determinism.

**Conservative fallback:** if scope blows up (>3 days of trace work), partition by board:
- Wave 1: Proffie compile+flash + Proffie runtime
- Wave 2: Xenopixel V3
- Wave 3: CFX + GH (lower priority since design-reference only)

---

### C — Editor "incorporate new learnings" pass

**Why:** This session's smoking-gun saga taught us things that aren't yet reflected in the KyberStation user-facing app. The audit doc captures the learnings; the editor surface (UI, tooltips, deliverability tables) doesn't fully.

**Specific items to integrate:**

1. **Phase C deliverability table** — verify [`apps/web/components/editor/CardWriter.tsx`](../../apps/web/components/editor/CardWriter.tsx) shows `baseColor`/`clashColor`/`lockupColor`/`blastColor`/`ignitionMs`/`retractionMs` as `deliverable` (not `partial`) for the `proffie_runtime` board now that bench validation confirms they work. Anywhere this table is rendered, audit the labels.

2. **Audit-doc cross-references in the app** — wherever the UI says "this may not transfer correctly" or surfaces deliverability warnings, link to the relevant section of `EMIT_PARSER_AUDIT.md` so users (and future maintainers) can verify against the source-of-truth doc.

3. **`docs/HARDWARE_FIDELITY_PRINCIPLE.md` updates** — append the new section: "Encoding contracts at the emit↔parser boundary." Reference the smoking-gun saga as a case study.

4. **POST_LAUNCH_BACKLOG.md re-prioritization** — runtime-presets path is now PR-#325-merged + bench-validated. Demote that item from "open" to "shipped/validated." Re-rank the remaining items based on new evidence.

5. **Sound font silent-failure pre-check** (audit follow-up #2, deferred during this session since PR #325 was open) — implement the "your factory SD has these fonts, your preset references these, mismatches: …" pre-export validation in `CardWriter.tsx`. Reuse the existing `dirHandle` from the direct-write path. UI pattern: the styled modal from PR #320.

---

## Verification gates (per CLAUDE.md)

Before every push:
- `pnpm typecheck` — clean across all workspace packages
- `pnpm test` — full suite passing
- Each PR: descriptive title (≤70 chars), body with summary + test plan + Co-Authored-By trailer
- Never `--no-verify`, never force-push

---

## Parallel-agent dispatch pattern (validated in prior sessions)

Cap: ≤4 concurrent agents. Each agent:
- File-disjoint scope (audit boundaries can collide if 2 agents touch the same era file)
- Self-contained prompt (~500-800 words) — restate goal, scope, conservative-fallback rules, branch naming, test gates
- Independent PR off `main` (target main, no inter-agent dependencies)
- Same conventional commits + Co-Authored-By trailer as solo work

For workstreams A and C, the gallery audit + editor pass can run as 4-agent parallel batches. Workstream B is sequential (one agent does the full matrix).

---

## Sequencing recommendation

**Session 1** (this future session) — discovery + first PRs:
1. Read CLAUDE.md + POST_LAUNCH_BACKLOG.md + EMIT_PARSER_AUDIT.md + this handoff
2. Dispatch parallel: A1a (prequel audit), A1b (OT audit), B (codegen matrix) — each agent gets ~400-800 lines of prompt
3. Main session: C1 (deliverability table refresh) inline while agents run

**Session 2** — fix-PR sprint:
- Land the audit-flagged corrections in parallel agents

**Session 3** — description enrichment:
- A2 (single agent, 455 descriptions, voice/style consistency)

---

## Files / paths the next session needs to know about

- [`CLAUDE.md`](../../CLAUDE.md) — project context
- [`docs/POST_LAUNCH_BACKLOG.md`](../POST_LAUNCH_BACKLOG.md) — current priorities
- [`docs/research/EMIT_PARSER_AUDIT.md`](../research/EMIT_PARSER_AUDIT.md) — emit↔parser interface inventory
- [`docs/HARDWARE_FIDELITY_PRINCIPLE.md`](../HARDWARE_FIDELITY_PRINCIPLE.md) — engine + codegen architectural north star
- [`packages/presets/src/`](../../packages/presets/src) — 455 presets, partitioned by era
- [`packages/engine/src/types.ts`](../../packages/engine/src/types.ts) — BladeConfig source of truth
- [`packages/codegen/src/`](../../packages/codegen/src) — Proffie codegen
- [`apps/web/lib/zipExporter.ts`](../../apps/web/lib/zipExporter.ts) — multi-board export adapter
- [`apps/web/tests/fixtures/kyberGlyphs/v1/fixtures.json`](../../apps/web/tests/fixtures/kyberGlyphs/v1/fixtures.json) — canonical wire-format fixture pattern
- [`scripts/hardware-test/`](../../scripts/hardware-test) — bench validation tooling (PR #331)

---

## Cross-session collision guardrails (per CLAUDE.md)

`git fetch origin --prune` + `git worktree list` at the start of every dispatch. If a sibling session has touched any file the new work needs, surface to user before proceeding.

---

## What "done" looks like

After all three workstreams land:
- `docs/research/GALLERY_AUDIT_2026-05-XX.md` enumerates every preset's PASS/FLAG state
- `docs/research/MULTI_BOARD_FIELD_COVERAGE_2026-05-XX.md` is the matrix
- Every FLAG in the gallery audit has a corresponding fix PR merged
- `EMIT_PARSER_AUDIT.md` has zero `⚠ Unverified` marks
- `POST_LAUNCH_BACKLOG.md` re-prioritized to reflect the new evidence base
- CardWriter.tsx deliverability table accurately reflects bench-verified state
- 455 preset descriptions match the voice/quality of the `Obi-Wan Kenobi (ANH)` exemplar

This is multi-week work but each piece is shippable independently. Don't try to do it all in one session.

---

## Process notes

- Follow CLAUDE.md collaboration defaults (commit, push, PR; never force-push)
- Hardware bench is empirically clean as of 2026-05-16 — the 16 presets on the V3.9-BT match the byte-for-byte expected state per [`scripts/hardware-test/build-bench-validation-presets.mjs`](../../scripts/hardware-test/build-bench-validation-presets.mjs)
- If gallery audit flags a preset whose color depends on which film/scene, default to the "iconic" reference (most-shared promotional image) unless the preset name disambiguates (e.g. `Anakin Ep. II` vs `Anakin Ep. III`)
- Description enrichment should match the existing tone — concise, evocative, with a specific visual detail. Avoid generic ("a powerful red blade") in favor of specific ("the unstable crackle of a kyber crystal bled to anger")
