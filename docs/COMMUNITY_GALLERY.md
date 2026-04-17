# Community Gallery — GitHub-PR Contribution Model

**Status:** Planned. This doc is the spec — implementation ships in its
own session, probably after v0.11.0 (WebUSB) and Share Pack (v0.12.0).

**One-line goal:** Let the community contribute curated lightsaber
presets to KyberStation with zero infrastructure — no backend, no
database, no moderation dashboard, no accounts. Contributors open a PR;
merges are the publication.

---

## Why this over a hosted gallery

The initial plan was a hosted community gallery with voting, comments,
and user profiles. We deferred that indefinitely because:

- **Backend cost.** Hosting, moderation, abuse handling, spam mitigation,
  GDPR compliance, user accounts — each one is a quarter-of-engineering.
- **Moderation burden.** Someone has to review submissions. Without
  that, the gallery becomes a link farm / troll target within weeks.
- **Feature risk.** Community features are easy to bolt on; hard to
  retract. Once users have profiles + votes they expect the system to
  stay up forever.

The GitHub-PR model solves every one of those:

- **Zero infra.** GitHub hosts the code, the diff review UI, the merge
  button, the attribution history, the discussion thread, and the
  versioning.
- **Moderation for free.** Maintainers review the PR; PR approval is
  publication; PR rejection is moderation. Git blame is the audit trail.
- **Attribution baked in.** `git log --follow` on a preset file shows
  who contributed it and when. Contributors appear in the repo's
  contributor list automatically.
- **Versioning baked in.** A preset is a TypeScript file; it evolves via
  diff history; bad merges can be reverted atomically.
- **Offline-compatible.** Community presets ship in the app bundle
  alongside the built-in ones. No network call at runtime.

Trade-offs we accept:

- Contributors need a GitHub account and basic PR workflow knowledge. We
  mitigate this with a web-based "Submit via GitHub" button that
  pre-fills a PR with the current editor state (see Phase 3).
- Merges take minutes-to-days, not seconds. That's fine — a curated
  gallery of 50 great blades beats a spam-fest of 5,000.
- No voting / comments / profiles. People who want that can talk about
  their blades on reddit / Discord and link back to the preset file.

## Directory structure

Community presets live alongside the curated ones:

```
packages/presets/src/
├── characters/
│   ├── prequel-era.ts
│   ├── original-trilogy.ts
│   ├── sequel-era.ts
│   ├── animated-series.ts
│   ├── extended-universe.ts
│   ├── legends.ts
│   ├── creative-community.ts        # existing — curated by maintainers
│   └── community/                   # NEW — one file per contributor
│       ├── _index.ts                # auto-generated: imports + exports
│       ├── CONTRIBUTING.md          # how to submit
│       ├── obi-wan-mustafar.ts      # contributor: @alice
│       ├── ahsoka-rebels.ts         # contributor: @bob
│       └── …
├── templates/
└── types.ts
```

**Each community preset is a single TypeScript file** exporting one
`BladePreset` object:

```ts
// packages/presets/src/characters/community/obi-wan-mustafar.ts

import type { BladePreset } from '../../types';

/**
 * Obi-Wan (Mustafar) — rougher, more red-tinged base with heavier
 * unstable flicker to match the high-ground duel.
 *
 * Contributor: @alice (github.com/alice)
 * Submitted: 2026-05-02 · PR #47
 * Source inspiration: Revenge of the Sith, lava-planet set-piece
 */
export const obiWanMustafar: BladePreset = {
  id: 'community.obi-wan-mustafar',
  name: 'Obi-Wan (Mustafar)',
  contributor: '@alice',
  affiliation: 'jedi',
  era: 'prequel',
  tags: ['prequel', 'heat-tinted', 'legends'],
  config: {
    baseColor: { r: 120, g: 180, b: 255 },
    clashColor: { r: 255, g: 255, b: 255 },
    // … etc
  },
};
```

## Submission flow

### Contributor side

1. Contributor designs a blade in KyberStation
2. Clicks "Share" → "Submit to Gallery" (new menu item in the Share
   dropdown, see Phase 3 below)
3. Browser opens a GitHub PR with the preset file pre-populated,
   contributor fills in name / notes / tags
4. PR template guides them through the checklist (see below)
5. They submit; maintainers review; merge = publication

### Maintainer side

1. CI runs: `pnpm -w typecheck && pnpm -w test && pnpm -w lint`
2. Automated checks (see "PR validation" below) post status comments
3. Maintainer spot-checks: does the blade look reasonable? Does the
   name avoid IP issues? Any obvious low-effort duplicate?
4. Approve + merge. CI redeploys the web app with the new preset
   available in the next reload.

## PR template

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE/community_preset.md -->

## Community preset submission

**Preset name:** (human-readable)
**Contributor handle:** (@yourhandle — appears in the preset card)
**Based on:** (character, scene, or original design)

## Checklist

- [ ] File is in `packages/presets/src/characters/community/`
- [ ] File name matches preset slug (`obi-wan-mustafar.ts`)
- [ ] Preset `id` starts with `community.`
- [ ] `contributor` field matches my GitHub handle
- [ ] `pnpm -w typecheck` passes
- [ ] I've added the export to `_index.ts`
- [ ] Preset renders correctly in `/editor` when I load it locally
- [ ] Not a near-duplicate of an existing preset
- [ ] Name doesn't infringe on trademarks (avoid exact film names —
      "Anakin (Prequel)" is fine; "Lucasfilm-licensed Anakin v2" is not)

## Screenshots (optional but recommended)

Drop a PNG of the blade rendering, or better, a Saber Card from the
Share Pack feature.

## Notes to reviewers

(Anything specific you want feedback on)
```

## PR validation (CI)

Add a workflow `.github/workflows/community-preset.yml` that runs on
PRs touching `packages/presets/src/characters/community/**`:

1. **Typecheck** — standard `pnpm -w typecheck` (the preset's config
   must satisfy `BladeConfig`)
2. **Lint** — standard ESLint
3. **Preset-specific checks** (new script `scripts/validate-community-preset.mjs`):
   - `id` starts with `community.`
   - `contributor` is set and matches `@<handle>` format
   - `config.ledCount` is sensible (1–512)
   - All colour fields are RGB tuples with 0–255 values
   - Preset compiles via `generateStyleCode` without errors
   - Round-trips through `parseStyleCode` → `reconstructConfig` without
     data loss (use the helper in
     `packages/codegen/tests/helpers/roundTrip.ts`)
4. **Duplicate detection** — hashes the config and compares to existing
   community presets; warns (doesn't block) if near-identical

Failing any check posts a PR comment with the specific failure;
contributor iterates.

## Implementation phases

**Phase 1 — Directory + plumbing (small).**
- Create `packages/presets/src/characters/community/` with a stub
  `_index.ts` and `CONTRIBUTING.md`
- Update `packages/presets/src/index.ts` to expose community presets
  alongside the built-in ones
- Add a "Community" section to `PresetGallery.tsx` — separate category,
  visually distinct from curated
- Merge 1–2 seed presets from maintainers so the section isn't empty on
  launch

**Phase 2 — Validation CI.**
- `.github/workflows/community-preset.yml`
- `scripts/validate-community-preset.mjs`
- PR template

**Phase 3 — One-click submit.**
- "Submit to Gallery" menu item in Share dropdown
- Generates the preset file client-side (copy to clipboard + instruction
  dialog)
- Deep-links to `github.com/kenkoller/KyberStation/new/main?filename=…&value=…`
  via the GitHub "create new file" URL format — this *pre-fills* the PR
  with the contributor's file ready for them to click Commit
- Works without the contributor needing a local checkout

**Phase 4 — Polish.**
- Contributor profile modal ("presets by @alice") that's just a filtered
  view, no backend
- "Recently added" section in PresetGallery
- Tag filtering (era, affiliation, style, LED count)

## Acceptance criteria

- [ ] Community presets appear in the preset gallery, visually
      distinguished from curated ones
- [ ] `pnpm -w test` passes on every PR touching the community
      directory
- [ ] PR template surfaces the right checklist
- [ ] CI posts status comments for each validation step
- [ ] One-click "Submit to Gallery" pre-fills a PR with zero local
      setup required
- [ ] Contributor attribution (handle + date) is visible on every
      community preset card
- [ ] Maintainers can reject a PR with a one-line comment; the
      contribution workflow is never blocked on anyone

## Out of scope

- Voting, comments, user profiles, or anything requiring a database
- Upvote-based discovery ("hot list")
- Server-side moderation tooling
- Rate limiting (GitHub does this for us)
- Search beyond tag filtering
- Preset versioning beyond git history

## Moderation policy (draft)

Reject PRs that:
- Contain copyrighted names / likenesses in an infringing way (contributors
  can reference characters — "Vader-inspired" is fine — but cannot claim
  official licensing)
- Are near-duplicates of existing presets without meaningful
  differentiation
- Have a contributor handle that looks like impersonation of a known
  community member
- Include NSFW, hateful, or off-topic content in notes / names
- Fail CI

Accept PRs liberally otherwise. The goal is breadth and discovery, not
gatekeeping. If in doubt, merge with a note.

## Handoff notes

When this gets picked up:

1. **Start with Phase 1 only.** A working gallery that accepts
   contributions via manual-PR is enough for an MVP. Phases 2–4 can
   land on their own timelines as contribution volume warrants.
2. **Seed with 3–5 maintainer presets** in the community directory
   before announcing. An empty gallery is a dead gallery.
3. **Don't optimise for scale that doesn't exist.** If KyberStation ever
   hits 500+ community presets, we can revisit; until then, a
   static-array-of-imports is fine.
4. **Write the CONTRIBUTING.md as if it's the only doc anyone reads** —
   because it is. The PR template is the actual UI for the submission
   flow.
5. **Phase 3's URL-based pre-fill is the big UX win.** Research GitHub's
   undocumented-but-stable `new/<branch>?filename=…&value=…` endpoint
   first — if that ever breaks, fall back to a copy-to-clipboard +
   "paste this into a new file" dialog.

## Relationship to Share Pack

The Share Pack (`docs/SHARE_PACK.md`) and this gallery are
complementary but independent:

- Share Pack = instant, ephemeral, one-to-one sharing (PNG / GIF /
  seed). No curation, no permanence.
- Gallery = permanent, curated, one-to-many sharing. Reviewed,
  attributed, discoverable.

A user designing a blade might share it to friends via a Saber Card
today, then submit it to the gallery next week if they think it's worth
publishing. Both routes use the same underlying `BladeConfig` — the
Share Pack's seed code could theoretically resolve to a gallery preset
once the gallery is live, giving a nice cross-link between the two
features.
