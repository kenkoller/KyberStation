# UX Overhaul — Output / Export / Hardware Panels

**Session:** 2026-04-18 (branch `test/launch-readiness-2026-04-18`)
**Scope:** `CodeOutput`, `CardWriter`, `FlashPanel`, `OLEDEditor`,
`OLEDPreview`, `StorageBudgetPanel`, `SaberProfileManager`,
`PowerDrawPanel`, `CompatibilityPanel`, `OutputWorkflowGuide`.
**Reference spec:** `docs/UX_NORTH_STAR.md` §4 (per-component map) +
§7 (motion primitives).

---

## Audit — panels probed at 1440×900

| Panel | Pre-state (headline issues) |
|-------|-----------------------------|
| CodeOutput | Header was a small uppercase `text-ui-sm` line — no BR2049 hero typography for filename/identifier. No line/byte count surfaced. |
| CardWriter | Validation notices + status messages used raw `bg-red-900/20 text-red-400` rather than `--status-*` tokens. Multi-stage commit flow (detect → backup → write → verify) had no visible Scarif-style progression UI; only a flat progress bar + message list. Edit-mode flag used `text-green-400`. |
| FlashPanel | Already tokenized (uses `--status-ok/warn/error/info` via inline style). No changes needed. |
| OLEDEditor | `Del` frame button used raw `text-red-400`. Otherwise clean. |
| OLEDPreview | Uses hardcoded SSD1306 colours (`#e0e8ff` pixel-on, near-black pixel-off) — intentional hardware simulation, not a theme concern. Per-spec correct. No changes. |
| StorageBudgetPanel | Usage % + warnings used raw `text-red-400 / text-yellow-400 / text-green-400`. No `criticalStateChange` pulse on threshold crossings. |
| SaberProfileManager | Delete button, delete-confirmation box, `Del` card-config button, and `×` remove-entry all used raw red. Empty state was a one-line italic `<p>` — not a shipped design artifact. |
| PowerDrawPanel | Gauge color + gauge text + warning strips all raw `text-red-400 / text-yellow-400 / text-green-400`. R/G/B channel indicators kept as R/G/B identity colors (correct per theming rule). |
| CompatibilityPanel | Support badges + tier badges + legend all raw Tailwind `text-green-400 / yellow / red`. |
| OutputWorkflowGuide | Completed-step styling + warning tray used raw `bg-green-950/20 border-green-800/30`. |

---

## FIX-INLINE (shipped this pass)

### CodeOutput — BR2049 hero header
- Added a display-weight `clamp(20px, 3.2vw, 34px)` JetBrains Mono Bold
  identifier row at the top of the panel showing the derived filename
  (`<preset>.h` single / `config.h / N PRESETS` multi) with a
  right-aligned metadata stack (ProffieOS 7.x / board · line count /
  KB).
- Location: `apps/web/components/editor/CodeOutput.tsx` new lead block
  plus new `styleIdentifier`/`codeLineCount`/`codeByteCount` derivations.

### StorageBudgetPanel — `criticalStateChange` pulse + tokenization
- New `usageTier()` helper (ok / warn ≥75% / critical ≥90%).
- Escalation detection via a `useEffect`+`useRef`+pulseKey counter;
  fires a 780ms scale + glow pulse (180ms pulse, 600ms decay — matches
  `criticalStateChange` spec §7) only on escalation, not decrescendo.
- Animation injected as a scoped `<style>` inside the component (global
  CSS is in the DO-NOT-TOUCH list).
- Usage % + warning tray + breakdown bar now driven by `--status-ok /
  --status-warn / --status-error` with accompanying glyphs (`⚠` / `✕`).

### CardWriter — aviation state colors + Scarif commit strip
- Validation notices + status-message rows + Edit-mode flag moved off
  `bg-red-900/20 text-red-400` onto `rgb(var(--status-*) / 0.1)`
  style-object driven classes.
- `statusColorClasses(type)` renamed to `statusColorStyle(type)`
  returning a `React.CSSProperties` for inline use.
- **New `<CommitCeremonyStrip>` subcomponent** — five-stage progression
  (Select → Detect → Backup → Write → Verify) renders above the status
  message list while a card-write is in flight or just finished. Each
  stage is green (complete), amber+pulse (active), red (error), or grey
  (pending), paired with a glyph (`✓ / ◉ / ✕ / ○`) for colorblind
  accessibility. This is the lightweight version of the full Scarif
  "physical-slot" ceremony — the full motion-design treatment is
  deferred.

### SaberProfileManager — tokenized danger + empty-state artifact
- Delete button, delete-confirmation tray, `Del` card-config button, `×`
  remove-entry button all moved to `--status-error` via inline style +
  `onMouseEnter/Leave` hover handlers (no global CSS edits available).
- **New empty-state artifact:** replaced the single italic line with a
  dashed-border panel showing a `∅ · NO PROFILES` mono-uppercase
  strapline, a primary-weight headline, a descriptive paragraph, and a
  `+ Create First Saber` CTA button. Meets the "empty states are
  shipped design artifacts" bar from §5.

### OLEDEditor, PowerDrawPanel, CompatibilityPanel, OutputWorkflowGuide
- All raw Tailwind `text-red-400 / text-yellow-400 / text-green-400`,
  `bg-(red|green|yellow)-900/…`, and `border-(red|green|yellow)-800/…`
  usages converted to `rgb(var(--status-ok|warn|error|info) / <alpha>)`
  inline style. All warning/error strips paired with a glyph (`⚠` /
  `✕`) for colorblind-safe pairing.
- PowerDrawPanel R/G/B per-channel indicators kept as literal RGB
  identity colors (documented in-file) — matches the existing
  BladeCanvas/RGBGraphPanel precedent from v0.11.1.

---

## DEFER (intentionally out of scope this pass)

- **Full Rogue One "Scarif physical-slot" ceremony for CardWriter** —
  ambient amber chrome lighting cast during commit (`commitCeremony`
  primitive), stage-by-stage door/slot metaphor, 800–1500ms forge-amber
  glow. The lightweight five-stage strip shipped this pass delivers the
  aviation-state-color discipline from the spec; full motion design is
  a dedicated future sprint.
- **Returnal radial integrity gauge** for StorageBudgetPanel — current
  linear bar is tokenized and pulses on threshold escalation. Swapping
  to a radial gauge is a full redesign, not inline polish.
- **Full SWTOR-character-sheet layout** for SaberProfileManager — hero
  render at top, categorized attribute groups, blade-spec/button-map/
  equipped-style/equipped-font/SmoothSwing groupings. This pass keeps
  the compact list UI and only tokenises colours + upgrades the empty
  state. Character-sheet treatment stays on the deferred list.
- **Proffie-mirror bitmap font for OLEDPreview** — the 5×7/3×5 font
  tables in `OLEDPreview.tsx` already simulate the exact pixel density
  the SSD1306 hardware ships; the hero text on the 128×32 grid is
  rendered as pixels directly, not CSS-font-family text, so a font
  swap doesn't apply. Marking this as already-compliant.
- **`filenameReveal()` animation** for the CodeOutput hero header —
  stagger-in of the identifier. Current implementation is static; the
  animation primitive is deferred alongside the rest of the named
  motion primitives.
- **PowerDrawPanel Returnal-style gauge rework** — current gauge is a
  linear bar; the spec doesn't explicitly require radial for this
  panel (only for StorageBudgetPanel), so no redesign needed. Kept as
  tokenisation only.

---

## Verification

```
$ pnpm -w typecheck
Tasks:    11 successful, 11 total
Cached:    10 cached, 11 total
  Time:    2.227s  (clean)

$ pnpm -w test
@kyberstation/codegen:test:  Test Files  9 passed (9)  Tests 1323 passed
@kyberstation/engine:test:   Test Files  7 passed (7)  Tests  457 passed
@kyberstation/web:test:      Test Files 25 passed (25) Tests  428 passed
Tasks:    11 successful, 11 total  (all green)
```

No existing tests exercised the raw-Tailwind color strings that were
tokenised; the web test suite is stable across the pass.

---

## Follow-ups worth capturing (not blocking)

1. Landing a `criticalStateChange` reusable hook in a shared library
   so StorageBudgetPanel, CardWriter `CommitCeremonyStrip`, CodeOutput
   (for parse errors), and any future threshold indicator can share
   the same 180/600 timing and the colorblind glyph-pair contract.
2. Moving the FlashPanel phase indicator into the same visual grammar
   as the new `CommitCeremonyStrip` — both are multi-stage commit
   ceremonies and should read as the same vocabulary.
3. A shared `<StateStrip />` primitive that replaces both the
   `CommitCeremonyStrip` (CardWriter) and the FlashPanel phase chain,
   taking a `stages: Array<{ key, label }>` + `current: string` +
   `variant: 'ok' | 'error'`.
