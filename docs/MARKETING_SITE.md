# Marketing Site — Architecture Reference

The marketing site is the public-facing half of the KyberStation
Next.js app: a handful of static, SEO-indexable pages that introduce
the project, list its capabilities, display the preset library,
render the changelog, answer common questions, and route visitors
into the editor. It shares a codebase with the editor app
(`apps/web/`) but is structurally and visually distinct — the editor
is a heavy client-side workbench, while every marketing page is
either fully static or a server component with narrow client
islands. The destination is `kyberstation.com`; deployment platform
and DNS are out of scope for this doc.

## 1. Routes

All marketing routes live under `apps/web/app/` and resolve through
the Next.js App Router. Routes marked "static" are pre-rendered at
build time, "ISR" is server-rendered with revalidation, and "client
islands" embed interactive client components.

| Path | Purpose | Rendering | Key components |
|---|---|---|---|
| `/` | Landing — hero + value strip + CTAs + release strip + footer | Static | `components/landing/Landing*` (not `MarketingShell`) |
| `/features` | Capability walkthrough across 8 numbered sections | Static, client islands | `MarketingShell` + `MarketingHero` + `MarketingSection` + `FeatureCard` + `LiveBladePreview` + `InlineCodePeek` + `ScrollReveal` |
| `/showcase` | Full preset browser with era / faction / screen-accurate filters | Static shell, client grid | `MarketingShell` + `MarketingHero` + `ShowcaseGrid` (`'use client'`) + `PresetCard` |
| `/changelog` | Rendered `CHANGELOG.md`, per-version article cards | ISR (`revalidate = 3600`) | `MarketingShell` + `MarketingHero` + `ChangelogMarkdown` |
| `/faq` | Five sections of Q&A on hardware, licensing, privacy, community | Static | `MarketingShell` + `MarketingHero` + `<dl>` blocks |
| `/community` | Ways-in cards, contribution policy, roadmap, attribution | Static | `MarketingShell` + `MarketingHero` + `MarketingSection` + `FeatureCard` |

The landing page at `/` intentionally does **not** use
`MarketingShell`. It owns its own composition in
`apps/web/app/page.tsx` because the hero is a dedicated, blade-
rendering surface with its own layout math — the marketing shell's
nav + footer would compete with the hero's camera. Every other
marketing route routes through `MarketingShell`.

**Not marketing routes.** The following sit in the same Next.js app
but are app surfaces, not indexable pages: `/editor` (the
workbench), `/m` (the mobile companion), `/s/[glyph]` (share-link
resolver), and `/docs` (built-in ProffieOS reference). They are
intentionally omitted from `sitemap.ts` — `robots.ts` does not
block them, but they rank low because they are client-rendered
SPAs.

## 2. Component layers

Three layers compose every marketing page.

**Layer 1 — Shared primitives (`apps/web/components/shared/`).**
Editor-and-marketing neutral building blocks: `StatusSignal`,
`EraBadge`, `FactionBadge` (colorblind-safe color + glyph pairs),
`ErrorState`, skeletons, `Modal`, `Toast`, etc. Marketing reuses
these rather than reinventing them — `PresetCard` imports
`EraBadge` + `FactionBadge` directly.

**Layer 2 — Marketing-specific wrappers (`apps/web/components/marketing/`).**
The twelve components below. Each is listed with rendering mode
(`server` = renders on the server, `'use client'` = client island)
and one-line purpose.

```
apps/web/components/marketing/
├── MarketingShell.tsx       server        Nav + particle-drift bg + <main> + footer reuse
├── MarketingNav.tsx         'use client'  Sticky top nav + mobile disclosure (uses usePathname)
├── MarketingHero.tsx        server        Page-hero pattern: eyebrow + h1 + subtitle + children
├── MarketingSection.tsx     server        Eyebrow + title + children block with density tiers
├── FeatureCard.tsx          server        Index + title + bullets + optional footer card
├── PresetCard.tsx           server        Showcase tile: gradient bar + era/faction badges + deep-link
├── ShowcaseGrid.tsx         'use client'  Filter UI (era/faction/screen-only/search) + card grid
├── ChangelogMarkdown.tsx    server        Project-subset markdown renderer (no external MD lib)
├── ScrollReveal.tsx         'use client'  IntersectionObserver-based reveal, 3 variants
├── LiveBladePreview.tsx     'use client'  Inline horizontal BladeEngine preview, IO-gated
├── InlineCodePeek.tsx       server        Server-side tokenizer + code block; embeds CopyButton
└── CopyButton.tsx           'use client'  Clipboard island for InlineCodePeek and anywhere else
```

The `'use client'` boundary is drawn as narrowly as possible.
`InlineCodePeek` runs its C++ tokenizer on the server and streams a
fully formed figure to the browser — only the copy button is
hydrated. `MarketingShell` is a server component; the nav inside it
is a small client island. `ShowcaseGrid` is client-side because its
filters need state; `PresetCard` stays server-side because the
gradient bar is static CSS, not an engine render.

**Layer 3 — Page compositions (`apps/web/app/<route>/page.tsx`).**
Each route assembles primitives and marketing components into the
specific story that page tells. The pages contain no styling
primitives of their own — if a pattern repeats across pages, it
gets promoted to layer 2.

## 3. Theme + tokens

Every color, border, and radius in the marketing components reads
from CSS custom properties defined in `apps/web/app/globals.css`.
No marketing component ships a raw hex value.

The tokens marketing relies on, by family:

```css
/* apps/web/app/globals.css */
--bg-deep, --bg-primary, --bg-secondary, --bg-surface, --bg-card
--text-primary, --text-secondary, --text-muted
--accent, --accent-warm, --accent-dim, --accent-border
--status-ok, --status-warn, --status-error, --status-info
--faction-jedi, --faction-sith, --faction-grey, --faction-neutral
  (+ *-deep variants)
--era-prequel, --era-ot, --era-sequel, --era-animated, --era-eu
--border-subtle, --border-light
```

Alpha blending is done inline against the token:
`rgb(var(--accent) / 0.75)` — the color channel lives in the token,
the opacity lives at the call site.

Typography is routed through four utility classes, also defined in
`globals.css`:

- `.dot-matrix` — small-caps tracked label typography used for
  eyebrows, timestamps, CTAs
- `.font-cinematic` — display face for page titles and section
  titles
- `.font-sw-body` — body face tuned for longer-form subtitles
- `.font-mono` — IBM Plex Mono stack for code blocks and character
  subtitles

The project-wide "no raw hex" rule applies here. The one exception
documented in the editor side (`OLEDPreview.tsx` hardcodes
black/white to simulate monochrome OLED hardware) does not apply
to the marketing site — no marketing surface simulates hardware,
so there are no exceptions here.

## 4. Reduced-motion + perf-tier discipline

The marketing components recognize three independent signals that
a visitor wants less motion. Any one of them disables animation:

1. **OS preference** —
   `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
2. **App-level reduced-motion class** —
   `<html class="reduced-motion">`, set by the editor's
   `useAccessibilityApplier` hook and persisted across pages
3. **Perf-tier opt-out** — `<html class="perf-lite">`, set by the
   editor's performance-tier selector

Which marketing components respect which:

- `ScrollReveal.tsx` — `shouldSkipMotion()` checks all three.
  SSR-safe: returns `false` on the server so the HTML ships
  visible. On hydration, if any signal is set, the component
  short-circuits to the revealed state and never installs the
  `IntersectionObserver`.
- `LiveBladePreview.tsx` — `shouldUseStaticFallback()` checks all
  three. When any is set, the component renders a static gradient
  bar instead of instantiating a `BladeEngine`, saving the CPU +
  render-loop cost entirely.
- `MarketingShell.tsx` — the `particle-drift` ambient background is
  a single CSS animation driven off `globals.css`. The
  reduced-motion media query disables it there.
- `PresetCard.tsx` — `blade-shimmer` and `card-hover` are CSS-only
  and gated by the same media query.

UX refactors must preserve all three signal paths. In particular:
removing the class-based checks breaks users who set reduced-motion
inside the editor but never configured it at the OS level, and
removing the perf-lite check breaks visitors who opted into the
low-power mode explicitly. The checks are cheap — keep them.

## 5. Accessibility baselines

The marketing site commits to the following minimums:

- **Keyboard-first navigation.** Every link and button is natively
  focusable. `PresetCard` forwards focus to its outer `<Link>`
  with a visible `focus-visible:ring-2 focus-visible:ring-accent`.
  `MarketingNav`'s mobile toggle is a `<button>` with
  `aria-expanded` and an `aria-label`.
- **44×44 touch targets (WCAG 2.5.5).** Mobile nav items are
  `py-3` (48 px height). The mobile nav toggle is `w-11 h-11`
  (44 px square). CTA buttons on `/faq`, `/community`, `/features`
  use `py-2.5` or `py-3` to stay above the threshold.
- **Skip-to-main link.** `apps/web/app/layout.tsx` ships
  `<a href="#main-content">` before `{children}`. `MarketingShell`
  and the landing `<main>` both expose `id="main-content"`.
- **Visible focus rings.** No marketing component uses
  `focus:outline-none` without a paired `focus-visible:ring-*`.
  `PresetCard` is the canonical example.
- **Semantic landmarks.** `<nav>`, `<main>`, `<section>`,
  `<article>` (changelog entries), `<figure>` / `<figcaption>`
  (code blocks), `<dl>` / `<dt>` / `<dd>` (FAQ, community
  attribution).
- **Decorative elements get `aria-hidden`.** The particle-drift
  background, gradient blade cores, preview divider dots, bullet
  dots, and the chevron SVG in the mobile toggle are all
  `aria-hidden="true"`.
- **Colorblind-safe via paired glyphs.** Status information always
  pairs color with a typographic glyph via `<StatusSignal>`
  (●/◉/✓/▲/⚠/✕), `<EraBadge>` (◇/◆/▲/◯/✦), and `<FactionBadge>`
  (☉/✦/◐/·). `PresetCard` uses both badge primitives;
  `ShowcaseGrid` uses status tokens for its "no matches" empty
  state.

## 6. Metadata + SEO + social preview

`apps/web/lib/siteConfig.ts` is the single source of truth for
site identity — `url`, `name`, `tagline`, `description`,
`ogImage`, `author`, `github`. Every other piece of metadata
plumbing reads from it.

`apps/web/lib/pageMetadata.ts` builds a Next.js `Metadata` object
from three required inputs: `title`, `description`, and `path`. It
composes:

- `<title>` wrapped as `"<title> — KyberStation"` (unless
  `full: true`)
- canonical URL built from `siteConfig.url + path`
- OpenGraph tags — `title`, `description`, `url`, `siteName`,
  `type: 'website'`, and a single absolute image URL from
  `siteConfig.ogImage`
- Twitter card — `summary_large_image` with the same image

Every marketing route except `/` uses `pageMetadata(...)`. The
landing page sets its own `metadata` object inline because its
`title` is the verbatim "KyberStation — Universal Saber Style
Engine" form.

**Preview deploy override.** `NEXT_PUBLIC_SITE_URL` overrides
`siteConfig.url` at build time. Vercel preview deploys, staging
environments, and local builds set this so OG tags point at the
preview origin instead of production. The trailing slash is
stripped.

**`metadataBase`.** Set on the root `apps/web/app/layout.tsx` to
the same `NEXT_PUBLIC_SITE_URL`-or-`kyberstation.com` URL so
Next.js can auto-resolve any relative URLs elsewhere in the app
(favicons, manifest, etc.). Per-page marketing metadata uses
absolute URLs by default so this is belt-and-suspenders.

**`sitemap.ts`** (`apps/web/app/sitemap.ts`) emits the seven
public marketing routes (home + features + showcase + changelog +
faq + community + docs) at build time. Priorities: `/` at 1.0,
`/features` + `/showcase` at 0.8, `/changelog` + `/faq` at 0.6,
`/community` + `/docs` at 0.5. Change frequencies are hints, not
guarantees. The editor and share routes are intentionally
excluded.

**`robots.ts`** (`apps/web/app/robots.ts`) emits a permissive
`User-agent: *` with `Allow: /` and points at the sitemap.
KyberStation has no private routes, no accounts, and no
telemetry, so nothing needs to be blocked.

**Changelog refresh.** `apps/web/app/changelog/page.tsx` sets
`export const revalidate = 3600` — the page is re-rendered at
most once an hour in response to a request. `loadChangelog()`
(`apps/web/lib/changelogParser.ts`) reads `CHANGELOG.md` from the
repo root, splits it on `## [X]` headings, and returns typed
entries. The parser is deliberately small (~40 lines) because
the changelog shape is hand-curated and a full markdown library
is unnecessary.

## 7. Extensibility: adding a new route

1. **Create the page file.** `apps/web/app/<route>/page.tsx`.
   Import `MarketingShell`, `MarketingHero`, and whichever section
   primitives fit (`MarketingSection`, `FeatureCard`,
   `InlineCodePeek`, etc.).
2. **Wire metadata.** Call
   `pageMetadata({ title, description, path: '/<route>' })` and
   export it as `metadata`. Add `keywords` if the route has a
   distinct SEO angle.
3. **Compose the page** inside a `<MarketingShell>` wrapper. Start
   with a `<MarketingHero>`, then stack `<MarketingSection>`
   blocks. Animate with `<ScrollReveal>` only where it helps;
   cards in a grid can stagger via `delay={i * 80}`.
4. **Add to the sitemap.** Append a new entry to the array in
   `apps/web/app/sitemap.ts` with an appropriate `priority` +
   `changeFrequency`.
5. **Add the nav link.** Append
   `{ href: '/<route>', label: '...' }` to `LINKS` in
   `apps/web/components/marketing/MarketingNav.tsx`. Active-state
   highlighting is handled automatically by `usePathname()`.
6. **Touch-target + a11y sanity-check.** Any CTA button at
   `py-2.5` or taller passes 2.5.5; focusable elements need a
   `focus-visible:ring-*` if they override `outline`.

If the route has heavy client interactivity, prefer to isolate it
in a single `'use client'` component (like `ShowcaseGrid`) and
keep the rest of the page server-rendered.

## 8. Extensibility: adding a new preset to showcase

The showcase is not a hand-curated surface.
`apps/web/app/showcase/page.tsx` imports `ALL_PRESETS` from
`@kyberstation/presets` and hands the whole array to
`ShowcaseGrid`. Dropping a new file into
`packages/presets/src/characters/` (or `community/` once outside
PRs open) and including it in the package's index automatically
adds the preset to the grid, the filters, and the full-library
count displayed in the `/features` "LIVE NOW" strip. No
marketing-side code changes.

## 9. Out of scope / follow-ups

Deferred items known to the marketing sprints so far:

- **Real 192 / 512 / maskable favicons.** Layout + manifest
  currently point at the existing `public/icon-1024.png` as a
  stopgap. Generate with:
  ```
  mkdir -p apps/web/public/icons
  sips -z 192 192 apps/web/public/icon-1024.png \
    --out apps/web/public/icons/icon-192.png
  sips -z 512 512 apps/web/public/icon-1024.png \
    --out apps/web/public/icons/icon-512.png
  sips -z 512 512 apps/web/public/icon-1024.png \
    --out apps/web/public/icons/icon-512-maskable.png
  ```
  Then restore the `/icons/icon-*.png` paths in
  `layout.tsx` + `manifest.json`.
- **`/m` bundle investigation.** The mobile companion route
  statically imports `BladeCanvas` + `useBladeEngine` +
  `bladeStore`, which transitively pulls the full editor runtime.
  First Load JS is 213 kB vs sub-122 kB on marketing routes.
  Likely fix: `dynamic(() => import('@/components/editor/...'), { ssr: false })`
  on the heavy imports. Out of scope here because `/m` is an
  editor surface; whichever sprint next touches the editor bundle
  should own this.
- **ESLint enforcement sprint.** ESLint is not wired into
  `devDependencies` yet. Activating it will surface preexisting
  issues across both editor and marketing surfaces; plan a scoped
  sprint with explicit triage policy rather than breaking main.
- **React-component test setup.** Tests for client components
  (e.g. `ScrollReveal`, `LiveBladePreview`, `MarketingNav`)
  require `jsdom` + `@testing-library/react` in `devDependencies`.
  Pure-function tests for the tokenizer, `pageMetadata`, and
  `changelogParser` ship today; the React-side tests are a
  follow-up.
- **Dynamic OG images.** `siteConfig.ogImage` currently points at
  the 1024×1024 app icon. A proper 1200×630 hero image (server-
  rendered blade render or designed asset) would improve Discord
  / Twitter / LinkedIn cards. The CSP in `layout.tsx` is already
  permissive enough for a blob-based pipeline.
- **Homepage nav integration.** `/` deliberately does not mount
  `MarketingNav`. Once the landing hero is stable, revisit
  whether a minimal sticky nav (just the wordmark + CTA) would
  help without fighting the hero camera.
- **Discord OG meta tags on share-link landings.** Flagged in
  the broader Share Pack deferred list; share links currently
  inherit the site-level OG image, which is fine-but-generic.

The broader project-level deferred list lives in `CLAUDE.md`
under "Deferred items" and "Additional sprints planned" —
marketing-specific deferrals should converge there as they
harden.

## 10. Related docs

- `CLAUDE.md` — project-wide context, release posture,
  launch-tone guidance. Read first for the "why."
- `CHANGELOG.md` — the rendered source for `/changelog`. Edits
  here show up on the site within an hour of the next request.
- `docs/ARCHITECTURE.md` — engine, codegen, packages, and editor
  app architecture. Complementary to this doc.
- `docs/CONTRIBUTING.md` — contribution conventions (outside PRs
  policy currently echoes what `/community` says).
- `docs/DEVELOPMENT.md` — local dev setup, pnpm workspace
  commands, build + test flow.
- `docs/LAUNCH_PLAN.md` — the pre-launch checklist and promotion
  plan this site supports.
