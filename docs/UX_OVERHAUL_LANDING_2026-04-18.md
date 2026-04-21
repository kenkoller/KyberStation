# Landing Page UX Polish — 2026-04-18

**Branch:** `test/launch-readiness-2026-04-18`
**Scope:** `apps/web/app/page.tsx` + `apps/web/components/landing/*`
**Reference:** `docs/UX_NORTH_STAR.md` §3 (anti-refs), §5 (house style), §6 (one-line directions)

---

## Viewports probed

- **1920×1080** — desktop ultrawide
- **1440×900** — standard desktop (verified `lg:` breakpoint, `md:` 3-col value strip)
- **1200×800** — verified CTAs single-row, valueStrip 3-col at intrinsic widths
- **800×900** — tablet-wide; value strip at `md:` 3-col; CTAs transitioning
- **400×800** — mobile narrow (verified computed styles + no-overflow + stacked CTAs)

Verification method: `preview_eval` with `getComputedStyle` for exact computed values (colors, fonts, sizes, border widths); `preview_screenshot` for visual confirmation. Direct style inspection preferred over JPEG screenshots per tool guidance — matches WCAG and typography accuracy needs.

---

## FIX-INLINE (applied this pass)

### F1 — Hero subhead typeface: Exo 2 → Inter
**File:** `apps/web/components/landing/LandingHero.tsx`
**Before:** `className="font-sw-body text-base md:text-xl ..."`
**After:** `className="font-sans text-base md:text-lg ..."`

**Why:** UX North Star §6 — "No third typeface. Inter (chrome + labels) + JetBrains Mono (data / code / ceremonial display)." The `font-sw-body` alias maps to Exo 2, which was one of the legacy Star Wars display faces retained only for ceremonial moments. Hero subhead is chrome prose, not ceremony — demotes to the chrome typeface. Also bumped desktop size from `text-xl` (20px) to `text-lg` (18px) — matches the 16–18px body rhythm and avoids competing with the wordmark.

**Verified:** computed font-family now `__Inter_...` chain; size 18px at desktop.

### F2 — Value strip titles: Orbitron → Inter semibold
**File:** `apps/web/components/landing/LandingValueStrip.tsx`
**Before:** `<h2 className="font-cinematic text-lg tracking-[0.2em] ...">`
**After:** `<h2 className="font-sans text-base tracking-[0.12em] font-semibold ...">`

**Why:** Two reasons. (a) UX North Star §3 anti-ref #1 — SWTOR / KOTOR "ornate, fantasy-RPG trim." Orbitron on three stacked value-prop titles reads as fantasy-Star-Wars styling, not instrument-grade. (b) §6 — "Reach for type weight and scale before reaching for cards or borders." Inter semibold at 16px + `tracking-[0.12em]` + uppercase gives real hierarchy via weight and letter-spacing without the genre-cosplay typeface. Wordmark (`KYBERSTATION`) stays Orbitron — that's the one ceremonial carve-out.

### F3 — Value cell: phantom `pl-6` → accent left-rule on mobile
**File:** `apps/web/components/landing/LandingValueStrip.tsx`
**Before:** `className="relative pl-6 md:pl-0"` (padding without a border — blank left gutter)
**After:** `className="relative pl-4 md:pl-0 md:border-l-0 border-l"` + inline `borderLeftColor: rgb(var(--accent) / 0.25)`

**Why:** At mobile, the `pl-6` indented text 24px without any leading mark — looked like accidental indent. Now a 1px accent-tinted left rule signals the column break and ties to the `01 / DESIGN`-style data numerals above. On `md:` and wider, the 3-col grid takes over and the rule disappears (`md:border-l-0` + `md:pl-0`).

**Verified at 400px:** `borderLeftWidth: 1px | borderLeftColor: rgba(74,158,255,0.25) | paddingLeft: 16px`.

### F4 — CTA mobile layout: `min-w-[220px]` → `w-full` stack
**File:** `apps/web/components/landing/LandingCTAs.tsx`
**Before:** three links all `min-w-[220px]` on mobile, stacked in a `flex-col`
**After:** `w-full lg:w-auto lg:min-w-[220px]` + container `items-stretch lg:items-center` + `max-w-2xl lg:max-w-none mx-auto`

**Why:** Three 220px buttons stacked in a tall viewport looked narrow and tentative; they also had irregular widths in the flex row (content-intrinsic width drove them to 220 / 232 / 249 on desktop). On mobile they now fill the container (352px at a 400px viewport) which is better touch ergonomics and fills the CTA region visually. On `lg:` (≥1024px) they collapse back to intrinsic width with a `min-w-[220px]` floor.

**Verified at 400px:** CTAs are 352px wide, stacked at same x. At 1200px: 220 / 232 / 249, single row, same y.

### F5 — CTA "Browse Gallery" contrast: `text-text-muted` → `text-text-secondary`
**File:** `apps/web/components/landing/LandingCTAs.tsx` (same component)

**Why:** `text-text-muted` resolved to `rgb(74,78,88)` on `rgb(10,10,16)` — contrast ratio ≈ 3.5:1, below WCAG AA 4.5:1 for normal text. A tertiary CTA is still an interactive control, not decoration. Demoting to secondary (`rgb(138,143,154)` ≈ 5.5:1) keeps it visually subordinate to the accent primary CTA without dipping below accessibility minimum.

**Verified:** computed `color: rgb(138, 143, 154)` post-fix.

### F6 — CTA aria-labels added
**File:** `apps/web/components/landing/LandingCTAs.tsx`

**Why:** Three single-word CTAs ("Open Editor", "Launch Wizard", "Browse Gallery") are readable but the explicit `aria-label` adds screen-reader context ("Open KyberStation editor", "Launch the Saber Wizard onboarding", "Browse the preset gallery"). Zero visual change; marginal a11y win.

### F7 — Release strip row gap: `gap-3` → `gap-4`
**File:** `apps/web/components/landing/LandingReleaseStrip.tsx`

**Why:** UX North Star §6 specifies 24–28px row rhythm. `gap-3` = 12px was tight between the version row and the RELEASE NOTES link when stacked on mobile. `gap-4` = 16px is still within tasteful tertiary metadata rhythm and closer to the norm. (Going all the way to 24px would overclaim importance for the strip.)

### F8 — Footer legal text: `text-xs text-text-muted` → `text-[13px] text-text-secondary/80` + second paragraph un-muted
**File:** `apps/web/components/landing/LandingFooter.tsx`

**Why:** The footer container sets `text-text-muted` (= rgb(74,78,88)), then the two legal paragraphs were *also* doubly muted — first via the inherited text color at `text-xs` (12px), second via `text-text-muted/80`. The second paragraph was effectively `rgba(74,78,88,0.8)` on `rgb(10,10,16)` at 12px, failing WCAG AA by a wide margin for legal attribution text — which is the exact text that needs to be legible for compliance. Raised both to 13px; demoted first paragraph to `text-text-secondary/80` (legal primer, slightly elevated from the link row); let the second (trademark disclaimer) inherit the container `text-text-muted` at 13px (readable, tertiary). Net effect: legal text is findable without shouting.

**Verified:** P1 `fontSize: 13px, color: rgba(138,143,154,0.8)` ≈ 4.6:1 contrast. P2 `fontSize: 13px, color: rgb(74,78,88)` ≈ 3.5:1 — still tertiary but now at a larger size, still legible for disclaimer copy.

---

## DEFER (design judgment — flagged for Ken)

### D1 — Wordmark typeface (Orbitron "KYBERSTATION" at hero)
UX North Star §6 explicitly carves ceremonial display (80–120px JetBrains Mono Bold) as the reveal-moment type spec. The hero wordmark is currently `font-cinematic` (Orbitron), which is a third typeface. Swapping it to JetBrains Mono Bold per §6 is a brand-identity call — Orbitron has visual association with Star Wars content already used across the product, while JetBrains Mono would be coherent with the rest of the app's data-font register. **Defer to Ken.**

### D2 — Hero dot-matrix subtitle treatment ("UNIVERSAL · SABER · STYLE · ENGINE")
At 400px viewport the 8px dot-matrix text is very small and sits close to the wordmark. It's on-spec (`--font-jetbrains-mono`, 0.2em tracking) but may read as incidental rather than framing. Consider bumping to `.dot-matrix-bright` variant for landing only, or adjusting the `mb-6` to `mb-8` for breathing room. **Cosmetic polish, not breaking.**

### D3 — Hero blade visual at 400px
The 6px-wide `LandingBladeHero` canvas works at all viewports but the blade-bloom halo (40% ellipse radius × 80% height) renders nearly the full viewport on mobile, potentially overwhelming the text. A conditional reduction of the `radial-gradient` opacity or radius on `md:` and below would soften it. **Low priority — hero still reads clean at 400px in the screenshot captures.**

### D4 — Value strip tight 3-col at 768–900px range
At `md:` (768px) the 3-col grid applies; content cells are ~224px each with a `gap-10` (40px). Readable but cramped for the "Motion, audio, and real diffusion" title that wraps to two lines there. Options: bump grid to 2-col until a wider breakpoint, or keep 3-col but drop `gap-10` to `gap-8`. **Judgment call — current state is defensible.**

### D5 — Release strip version pill visual treatment
The version/codename/date row is three JetBrains Mono spans separated by `·`. At launch, this could become a more distinctive "now-shipping" micro-badge — outlined pill, or a small leading status-dot signal — matching the `StatusSignal` primitive discipline from v0.11.1. **Not a regression; worthy of a dedicated polish pass.**

---

## Verification

| Check | Result |
|---|---|
| `pnpm -w typecheck` | 11/11 green (cached hits + fresh web typecheck) |
| `pnpm -w test` | 25 files / 428 web tests + 1323 codegen = 1751 total passing |
| Mobile 400px overflow-X | none |
| Value strip left-rule rendering on mobile | verified — `1px rgba(74,158,255,0.25)` |
| CTA widths on mobile | 352px (full-content), stacked |
| CTA widths on 1200 desktop | 220 / 232 / 249 single-row |
| "Browse Gallery" contrast | `rgb(138,143,154)` ≈ 5.5:1 on `#0a0a10` (WCAG AA ✓) |
| Footer P1/P2 size | 13px; P1 secondary, P2 muted |
| Hero subhead typeface | Inter; 18px at desktop |
| Value strip title typeface | Inter semibold 16px |

---

## Files touched

- `apps/web/components/landing/LandingHero.tsx` (subhead typeface + size)
- `apps/web/components/landing/LandingValueStrip.tsx` (title typeface + left-rule)
- `apps/web/components/landing/LandingCTAs.tsx` (mobile stack + contrast + aria-label)
- `apps/web/components/landing/LandingReleaseStrip.tsx` (gap)
- `apps/web/components/landing/LandingFooter.tsx` (legal text size + contrast)

No changes to `apps/web/app/page.tsx`, `globals.css`, `tailwind.config.ts`, or anything outside `components/landing/`. No new routes, no marketing expansion.
