# Marketing Site — Architecture Reference

The marketing site is the public-facing half of the KyberStation
Next.js app: a handful of static, SEO-indexable pages that introduce
the project, list its capabilities, display the preset library,
render the changelog, answer common questions, and route visitors
into the editor. It shares a codebase with the editor app
(`apps/web/`) but is structurally and visually distinct — the editor
is a heavy client-side workbench, while every marketing page is
either fully static or a server component with narrow client
islands. Currently deployed via GitHub Pages at
[kenkoller.github.io/KyberStation](https://kenkoller.github.io/KyberStation/);
custom domain (`kyberstation.com`) is out of scope for this doc.

> **Note on scope.** This doc describes what's actually shipped on
> `main` as of v0.16.0 (2026-04-30 launch). An earlier draft proposed
> a richer set of marketing primitives (`MarketingShell`,
> `MarketingHero`, `MarketingSection`, `FeatureCard`, `PresetCard`,
> `LiveBladePreview`, `ChangelogMarkdown`) under a single shell
> wrapper. The shipped implementation took a flatter approach:
> `MarketingHeader` + `MarketingFooter` as bookends, page bodies
> inline the section structure directly. Both shapes work; the
> shipped version trades some primitive reuse for less indirection.

## 1. Routes

All marketing routes live under `apps/web/app/` and resolve through
the Next.js App Router. Routes marked "static" are pre-rendered at
build time; "client islands" embed interactive client components for
specific interactions only.

| Path | Purpose | Rendering | Page composition |
|---|---|---|---|
| `/` | Landing — hero + value strip + CTAs + release strip + footer | Static | Inline composition in `apps/web/app/page.tsx` (does NOT use `MarketingHeader`) |
| `/features` | Capability walkthrough across 10 numbered pillars | Static, client islands | `MarketingHeader active="features"` + inline `<section>` + `ScrollReveal` + `InlineCodePeek` + `MarketingFooter` |
| `/showcase` | Full preset browser with era / faction / screen-accurate filters | Static shell, client grid | `MarketingHeader active="showcase"` + inline hero + `ShowcaseGrid` (client) + `MarketingFooter` |
| `/changelog` | Rendered `CHANGELOG.md`, per-version article cards | Static | `MarketingHeader active="changelog"` + inline parsed-markdown sections + `MarketingFooter` |
| `/community` | Ways-in cards, contribution policy, roadmap, attribution | Static | `MarketingHeader active="community"` + inline `<section>` + `ScrollReveal` + `MarketingFooter` |
| `/faq` | Five sections of Q&A on hardware, licensing, privacy, community | Static | `MarketingHeader active="faq"` + inline `<dl>` blocks + `MarketingFooter` |

The landing page at `/` intentionally does **not** use
`MarketingHeader`. It owns its own composition in
`apps/web/app/page.tsx` because the hero is a dedicated, blade-
rendering surface with its own layout math — the marketing header's
nav row would compete with the hero's camera. Every other marketing
route uses `MarketingHeader` as its top chrome.

**Not marketing routes.** The following sit in the same Next.js app
but are app surfaces, not indexable pages: `/editor` (the
workbench), `/m` (the mobile companion), `/s/[glyph]` (share-link
resolver), and `/docs` (built-in ProffieOS reference). They are
intentionally omitted from `app/sitemap.ts` — `app/robots.ts` does
not block them, but they rank low because they are client-rendered
SPAs.

## 2. Component layers

Three layers compose every marketing page.

**Layer 1 — Shared primitives (`apps/web/components/shared/`).**
Editor-and-marketing neutral building blocks: `StatusSignal`,
`EraBadge`, `FactionBadge` (colorblind-safe color + glyph pairs),
`ErrorState`, skeletons, `Modal`, `Toast`, etc. Marketing reuses
these rather than reinventing them.

**Layer 2 — Marketing-specific components (`apps/web/components/marketing/`).**
Five components, listed with rendering mode (server = renders on the
server, `'use client'` = client island) and one-line purpose:

```
apps/web/components/marketing/
├── MarketingHeader.tsx     server         Wordmark + 5-link nav (Features / Showcase / Changelog / Community / FAQ) + Open Editor CTA
├── MarketingFooter.tsx     server         License, repo link, ProffieOS attribution, sub-route quicklinks
├── ScrollReveal.tsx        'use client'   IntersectionObserver-based reveal, with reduced-motion respect
├── InlineCodePeek.tsx      server         Server-side tokenized code block with caption + language label
└── ShowcaseGrid.tsx        'use client'   Filter UI (era / faction / screen-only / search) + preset card grid
```

The `'use client'` boundary is drawn as narrowly as possible.
`InlineCodePeek` runs its C++ tokenizer on the server and streams a
fully formed figure to the browser — no client hydration cost.
`ShowcaseGrid` is client-side because its filters need state.

**Layer 3 — Page compositions (`apps/web/app/<route>/page.tsx`).**
Each route assembles primitives and marketing components into the
specific story that page tells. Section structure (eyebrow + h2 +
body) is inlined per page rather than abstracted into a shared
`<MarketingSection>` primitive — the section pattern is consistent
enough across pages that the indirection wasn't worth it.

If a pattern starts repeating across 3+ pages with meaningful
divergence, that's the signal to promote it to layer 2.

## 3. Theme + tokens

Every color, border, and radius in the marketing components reads
from CSS custom properties defined in `apps/web/app/globals.css`.
No marketing component ships a raw hex value.

Marketing relies on the same tokens the editor uses:

```css
/* apps/web/app/globals.css */
--accent              /* primary accent */
--text-primary
--text-secondary
--text-muted
--bg-primary
--bg-deep
--bg-surface
--border-subtle
--border-light
--r-chrome            /* small UI radius (2px) */
--r-interactive       /* button radius (4px) */
```

All five component fonts (Cinematic / Sans / Mono / Cinematic-mono /
Orbitron) are loaded once in the root layout via `next/font` and
exposed as CSS variables (`--font-cinematic`, etc.). Marketing
inherits them — no local font configuration.

## 4. SEO + metadata

The `pageMetadata` helper at `apps/web/lib/marketing/pageMetadata.ts`
generates `Metadata` objects for the App Router. Every marketing
page calls it with `{ title, description, path, keywords? }`; the
helper builds the full Open Graph / Twitter / canonical URL set
against `apps/web/lib/siteConfig.ts`.

```typescript
import { pageMetadata } from '@/lib/marketing/pageMetadata';

export const metadata = pageMetadata({
  title: 'Features',
  description: '...',
  path: '/features',
});
```

The 1200×630 OG hero image is a backlog item — current OG image is
the square 512×512 app icon, which platforms letterbox. See
`docs/POST_LAUNCH_BACKLOG.md` parking lot.

## 5. Sitemap + robots

`apps/web/app/sitemap.ts` enumerates the indexable marketing routes
(`/`, `/features`, `/showcase`, `/changelog`, `/community`, `/faq`)
plus the editor entry point (`/editor`). `apps/web/app/robots.ts`
exposes the canonical `Sitemap:` line and disallows nothing — the
editor surfaces are not indexed because they're SPA shells with
empty initial HTML, not because they're blocked.

## 6. Changelog rendering

`/changelog` reads the project's root `CHANGELOG.md` at build time
via `apps/web/lib/marketing/changelogParser.ts` (a project-subset
markdown renderer — no external markdown library). Each top-level
`## [version] — date` heading becomes its own card with the version
in the eyebrow position. Sub-sections (Added / Changed / Fixed)
become `<section>` blocks within the card.

Build-time-only — no client hydration. Adding a new release means
editing `CHANGELOG.md`; the page rebuilds on next deploy. ISR isn't
used because the changelog only changes on releases.

## 7. Showcase

`/showcase` reads the preset library from `@kyberstation/presets`
and renders one card per preset. Filters are client-side:

- **Era** — Prequel / Original Trilogy / Sequel / Animated / Legends
  / Extended Universe / Pop Culture / Mythology
- **Faction** — Jedi / Sith / Grey / N/A
- **Continuity** — Canon / Legends / Pop Culture / Mythology (added
  per the 2026-04-23 preset accuracy audit)
- **Screen-accurate only** — toggle to hide creative-community
  reinterpretations
- **Free-text search** — name + description + style ID

Each card deep-links into `/editor?s=<glyph>` so a click drops the
visitor straight into the preset, fully loaded, with no server
round-trip.

## 8. Hardware Fidelity Principle

Marketing copy follows the same architectural rule as the engine:
nothing on the marketing site claims a capability that the engine
can't actually emit through ProffieOS. If the editor visualizes
something that doesn't have a verified codegen path, marketing must
either avoid the claim or scope it as "preview" / "v1.x". See
[docs/HARDWARE_FIDELITY_PRINCIPLE.md](HARDWARE_FIDELITY_PRINCIPLE.md)
for the full audit-and-tighten standard.

This rule is what kept the marketing site honest through the
Modulation Routing v1.1 Core launch (the editor surfaces 11
modulators; only 5 had plates wired at launch, and the marketing
page reflected that).

## 9. Tests

Marketing-side tests live under `apps/web/tests/`:

- `marketingPageMetadata.test.ts` — `pageMetadata` helper
- `inlineCodePeekTokenizer.test.ts` — server-side tokenizer
- `scrollReveal.test.tsx` — IntersectionObserver behavior
- `changelogParser.test.ts` — markdown subset renderer
- `robots.test.ts` + `sitemap.test.ts` — Next.js metadata routes

Page-level tests are intentionally light — the structure is mostly
static markup, so the per-page coverage focuses on `metadata`
exports plus a smoke test that the page renders without error.

## 10. Accessibility

- Every page sets `<main id="main-content">` so the global skip-link
  in the root layout works.
- Every section has a heading and `aria-labelledby` linking to it.
- `MarketingHeader` uses `aria-current="page"` for the active route.
- Color contrast follows the editor's WCAG AA tokens (`--text-muted`
  raised in 2026-04-19 to meet 4.5:1 against `--bg-primary`).
- `ScrollReveal` respects `prefers-reduced-motion` — no-op when set.
- `aria-hidden="true"` on decorative glyphs (◆ bullets, eyebrow
  ornaments) so they don't read in the screen-reader linear flow.

## 11. Deployment

Currently deploys via GitHub Pages on push to `main`. The
`apps/web/next.config.mjs` configures `output: 'export'` and
`basePath: '/KyberStation'` for the GitHub Pages subpath. The static
export ships as `apps/web/out/`. CI workflow at
`.github/workflows/deploy-pages.yml` (or whatever the current path
is — check the repo) handles the publish.

Custom domain migration to `kyberstation.com` is out of scope for
v1.0. Notes for that lift would land in
`docs/POST_LAUNCH_BACKLOG.md`.

## 12. Drift sentinels

Things that have bitten us and have explicit guards:

- **Stale stat counts** — README + `LAUNCH_ASSETS.md` had 700+ when
  the actual preset count was 305. Audit-fixed in PR #74. No
  automated sentinel; manually verify before each launch beat.
- **Out-of-date CHANGELOG** — the marketing `/changelog` route
  builds from the root `CHANGELOG.md`. Releases must update the file
  before tagging or the marketing site shows a stale picture.
- **`pageMetadata` path drift** — the `path` prop must match the
  actual route slug. `marketingPageMetadata.test.ts` doesn't enforce
  this currently; visual QA after route additions catches it.

## 13. Future expansion

Listed for visibility, not commitment. Bigger candidates that have
come up:

- **Real-saber demo GIFs** — ~`LAUNCH_ASSETS.md` calls these the
  single most impactful asset~. Would slot into `/showcase` and the
  landing hero. Hardware shoot needed.
- **Community gallery** — already designed in
  `docs/COMMUNITY_GALLERY.md` as a GitHub-PR-moderated curated list
  rendered into `/showcase`. Scope is clean; awaiting a ship signal.
- **Per-preset deep-link cards** — `/showcase/<presetId>` standalone
  pages with fuller metadata + linked Kyber Glyph + screenshots.
- **Embeddable share cards** — `<iframe>`-able preset cards for
  blog posts and YouTube descriptions. Same renderer as
  `/showcase` cards but framed for offsite use.

None of these are scheduled. They're listed here so the next person
adding marketing surfaces knows the conversation that's already
happened.
