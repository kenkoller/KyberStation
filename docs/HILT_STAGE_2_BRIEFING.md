# Hilt Library Stage 2 — Parallel Artist-Agent Briefing

**Branch origin:** `feat/hilt-library`
**Prerequisite:** Stage 1 merged (adds types, composer, renderer,
catalog, Graflex reference assembly).
**Goal:** Draw 7 additional canon-inspired assemblies by filling out
the parts library. Each agent owns a disjoint parts directory and
contributes to a shared catalog file.

Every agent must read and internalize:
1. `docs/HILT_PART_SPEC.md` — the authoring contract (coord system,
   line weights, palette, connector rules, file structure).
2. `apps/web/lib/hilts/parts/emitters/graflex.ts`
   `apps/web/lib/hilts/parts/switches/graflex.ts`
   `apps/web/lib/hilts/parts/grips/t-tracks.ts`
   `apps/web/lib/hilts/parts/pommels/classic.ts`
   — the **style reference**. Any new part must read as being from
   the same drafting hand when placed alongside these.

---

## Fan-out plan

Three agents run in parallel on feature branches off
`feat/hilt-library`:

### Agent A — Top parts (`feat/hilt-parts-top`)
**Directory ownership:** `apps/web/lib/hilts/parts/emitters/*.ts`

**Parts to draw (7):**
| Part id | displayName | Used in | Notes |
|---|---|---|---|
| `mpp-emitter` | MPP Emitter | mpp | MPP microphone bell + windscreen grill at top |
| `ornate-emitter` | Ornate Emitter | negotiator | Collared/stepped silhouette; clean pro-Jedi aesthetic |
| `curved-emitter` | Curved Emitter | count | Straight emitter but with curved-entry angle at bottom connector |
| `compact-emitter` | Compact Emitter | shoto-sage, fulcrum-pair | Short; used in shotos |
| `vented-emitter` | Vented Emitter | ren-vent | Jagged/unstable vent pattern, crystal-exposed gap |
| `dual-emitter-top` | Dual Emitter (Top) | zabrak-staff | Symmetric — used at top of staff |
| `dual-emitter-bottom` | Dual Emitter (Bottom) | zabrak-staff | Mirror of top, used at bottom of staff |

All default to `standard` interface diameter except `compact-emitter`
(`narrow`) and `vented-emitter` (`wide` at bottom connector to
accommodate the crossguard quillon).

### Agent B — Body parts (`feat/hilt-parts-body`)
**Directory ownership:** `apps/web/lib/hilts/parts/switches/*.ts` and
`apps/web/lib/hilts/parts/grips/*.ts`

**Switch parts (7):**
| Part id | displayName | Used in |
|---|---|---|
| `dark-switch` | Dark Switch | mpp |
| `negotiator-switch` | Negotiator Switch | negotiator |
| `curved-switch` | Curved Switch | count |
| `sage-switch` | Sage Switch | shoto-sage |
| `vented-switch` | Vented Switch | ren-vent |
| `fulcrum-switch` | Fulcrum Switch | fulcrum-pair |
| (`graflex-switch` exists as reference) |

**Grip parts (7 + 1 specialty):**
| Part id | displayName | Used in |
|---|---|---|
| `mpp-grip` | MPP Grip | mpp | Black-rubber wrap pattern |
| `ribbed-grip` | Ribbed Grip | negotiator | Reused also in curved if aesthetic matches |
| `curved-grip` | Curved Grip | count | The ACTUALLY curved silhouette — path must bend |
| `short-grip` | Short Grip | shoto-sage | Compact length variant |
| `taped-grip` | Taped Grip | ren-vent | Cross-wrap bandage texture |
| `fulcrum-grip` | Fulcrum Grip | fulcrum-pair |
| `staff-body` | Staff Body | zabrak-staff | **Specialty** — tall single piece, both connectors standard |

Curved grip warning: the body silhouette path must express the bend.
Either (a) SVG `<path>` with bezier curves describing the left and
right outlines, or (b) two symmetric arcs. Top and bottom connector
`cx` must still be 24 — the bend happens between them but the mounts
stay centered.

### Agent C — Bottom + specialty (`feat/hilt-parts-bottom`)
**Directory ownership:** `apps/web/lib/hilts/parts/pommels/*.ts` and
`apps/web/lib/hilts/parts/accents/*.ts`

**Pommel parts (6):**
| Part id | displayName | Used in |
|---|---|---|
| `dark-pommel` | Dark Pommel | mpp |
| `ornate-pommel` | Ornate Pommel | negotiator |
| `curved-pommel` | Curved Pommel | count |
| `sage-pommel` | Sage Pommel | shoto-sage |
| `raw-pommel` | Raw Pommel | ren-vent | Rough/unfinished look |
| `pointed-pommel` | Pointed Pommel | fulcrum-pair |

**Accent parts (2):**
| Part id | displayName | Use |
|---|---|---|
| `brass-band` | Brass Band | Decorative ring between parts |
| `silver-band` | Silver Band | Decorative ring between parts |

**Specialty part (1):**
| Part id | displayName | Used in | Notes |
|---|---|---|---|
| `crossguard-quillon` | Crossguard Quillon | ren-vent | Horizontal perpendicular piece. Top connector `wide`, bottom `standard`. Body silhouette extends left/right beyond x=9/x=39 — canvas may need width > 48. Talk to branch owner before deviating from the 48 canvas standard. |

---

## Workflow

1. **Sync:** `git fetch origin && git checkout feat/hilt-library &&
   git pull`.
2. **Branch:** `git checkout -b feat/hilt-parts-{top|body|bottom}`.
3. **Draw:** one part per file, in the appropriate `parts/<type>/`
   subdirectory. Follow the spec header comment template from
   `graflex.ts`.
4. **Register:** add import + map entry to
   `apps/web/lib/hilts/catalog.ts`. Maintain alphabetical order within
   each type group.
5. **Verify per part:**
   - Run `pnpm --filter=@kyberstation/web exec vitest run hilt*` — the
     catalog test (`hiltCatalog.test.ts`) asserts every part obeys the
     spec (width 48, cx 24, connector y endpoints). It will fail
     immediately if you violate the spec.
   - Manually render each part in isolation in Storybook or a scratch
     route by composing `{ parts: [{ partId: 'your-part' }] }` in an
     assembly. Visually confirm it reads as metal (not transparent)
     and is stylistically aligned with the Graflex reference.
6. **PR:** one PR per agent, targets `feat/hilt-library`. Title:
   `feat(hilt-parts): <top|body|bottom> — N parts`.
7. **Merge order:** any order; catalog merges are trivial since each
   agent adds disjoint imports.

---

## Coordination rules

1. **Catalog file is the only shared surface.** If two agents land
   simultaneously, resolve by taking both import lines and both map
   entries — no true conflict possible.
2. **No edits to `composer.ts`, `types.ts`, or `HiltRenderer.tsx`.**
   If you think you need to, pause and surface to the branch owner —
   it's likely a spec ambiguity worth discussing rather than a code
   change.
3. **No deps added.** pnpm-lock changes are out of scope; the parts
   library is pure TypeScript + inline SVG strings.
4. **No deletions or renames of Graflex reference parts.** They are
   the style anchor for the whole Stage 2 output.
5. **One part = one file = one PR commit.** Makes review trivial and
   cherry-pick safe.

---

## Quality gate (pre-PR)

- [ ] Every part obeys spec §2 (canvas width 48, connectors at `cx: 24`)
- [ ] Body gradient references `url(#metal-body)` (not a custom id)
- [ ] Detail strokes match spec colour + widths
- [ ] No forbidden SVG features (scripts, external refs, event attrs)
- [ ] `pnpm typecheck && pnpm --filter=@kyberstation/web exec vitest run hilt*` green
- [ ] Manually checked part renders alongside Graflex reference parts
- [ ] Part file has the MIT header comment

---

## Dev server / worktree gotcha

`preview_start` reads `.claude/launch.json` from a fixed location
(usually the main repo root, not the worktree). If you call it with
the default config, you'll be serving the **main repo's code, not
your worktree's**, and your edits will appear invisible — this is
how Stage 1 initially got confused. Worktree-local changes compile
fine; the bundler was just pointed at the wrong tree.

To verify in-browser from this worktree specifically, either:

1. Add a config entry to the main `.claude/launch.json` with an
   explicit `-C <absolute-worktree-path>` arg (see the
   `hilt-library-worktree` entry added during Stage 1), then
   `preview_start` by that name.
2. Run `pnpm --filter=@kyberstation/web exec next dev` directly
   from the worktree via the Bash tool (remember: the shell cwd
   can reset between Bash calls — use absolute paths or explicit
   `cd` every time).

Tests and typecheck run fine from any cwd because pnpm resolves
the workspace via `pnpm-workspace.yaml` from the invoking
directory.
