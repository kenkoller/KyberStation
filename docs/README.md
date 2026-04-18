# KyberStation Documentation Index

A map of what's in this folder. Start here if you're trying to find the right
reference for what you're doing.

## Start here

- [ARCHITECTURE.md](./ARCHITECTURE.md) — How the codebase is organized:
  engine, codegen, UI, and how they fit together.
- [DEVELOPMENT.md](./DEVELOPMENT.md) — Local dev setup, prerequisites,
  everyday commands.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Contribution policy and the
  step-by-step for adding new styles, effects, boards, or presets. **Note:
  outside PRs are not currently accepted** — see the top of that file.

## Reference guides

- [STYLE_AUTHORING.md](./STYLE_AUTHORING.md) — How to author a new blade
  style class and wire it into the engine + UI.
- [PROFFIEOS_FLASHING_GUIDE.md](./PROFFIEOS_FLASHING_GUIDE.md) — Arduino-CLI
  compile/upload workflow, config.h structure, and the full error → cause →
  fix table for every code-gen bug we've seen.
- [WEBUSB_FLASH.md](./WEBUSB_FLASH.md) — Technical reference for the
  in-browser WebUSB firmware-flash path (Proffieboard V3).
- [SOUND_FONT_LIBRARY_AND_CUSTOM_PRESETS.md](./SOUND_FONT_LIBRARY_AND_CUSTOM_PRESETS.md)
  — Spec for the font library, user presets, and card-preset systems.

## Design specs (planned features, not yet implemented)

- [SHARE_PACK.md](./SHARE_PACK.md) — Jedi Holocron Saber Card share pack
  (blade-on-hilt hero + Kyber-crystal QR accent).
- [COMMUNITY_GALLERY.md](./COMMUNITY_GALLERY.md) — GitHub-PR-based community
  gallery contribution model.
- [KYBER_CRYSTAL_VISUAL.md](./KYBER_CRYSTAL_VISUAL.md),
  [KYBER_CRYSTAL_NAMING.md](./KYBER_CRYSTAL_NAMING.md),
  [KYBER_CRYSTAL_VERSIONING.md](./KYBER_CRYSTAL_VERSIONING.md) — Kyber
  Crystal visual design, naming math, and glyph-format versioning.
- [VISUAL_DESIGN_SYSTEM.md](./VISUAL_DESIGN_SYSTEM.md) — Star Wars visual
  layer spec (theming, animations, typography, HUD elements, perf tiers).

## Launch + release planning

- [LAUNCH_PLAN.md](./LAUNCH_PLAN.md) — Release strategy, Reddit/YouTube
  outreach, post-launch monitoring. Frozen pending launch.
- [LAUNCH_ASSETS.md](./LAUNCH_ASSETS.md) — Copy-paste-ready Reddit post
  drafts, outreach templates, screenshot shot list, response templates.
  Frozen pending launch.
- [HARDWARE_VALIDATION_TODO.md](./HARDWARE_VALIDATION_TODO.md) — Pending
  hardware-validation checklist for WebUSB flash (blocks `v0.11.x` tag).
- [BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md) — Branch-protection
  setup notes.

## QA + testing

- [QA_TEST_PLAN.md](./QA_TEST_PLAN.md) — Interactive end-to-end QA test plan.
- [TEST_PRESET_MATRIX.md](./TEST_PRESET_MATRIX.md) — 50-preset on-saber
  verification matrix, one parameter per preset.

## Working notes + historical records

These are session summaries and proposal docs that are useful as reference but
may not reflect current state. Check dates before acting on them.

- [SESSION_2026-04-17.md](./SESSION_2026-04-17.md) — Long session summary
  spanning multiple feature sprints.
- [TESTING_NOTES.md](./TESTING_NOTES.md) — Testing feedback log from
  2026-04-14/15. Most items resolved.
- [NEW_EFFECTS_ROADMAP.md](./NEW_EFFECTS_ROADMAP.md) — Pre-implementation
  design for the Phase 4–6 engine expansion (all items now shipped).
- [UI_REDESIGN_RECOMMENDATIONS.md](./UI_REDESIGN_RECOMMENDATIONS.md) —
  Research-phase proposal for scaling the UI to 82+ animation components
  (Workbench Layout has since shipped).
- [VISUAL_LAYER_INTEGRATION.md](./VISUAL_LAYER_INTEGRATION.md) — Meta-prompt
  for a past session that integrated the visual design layer.

## Assets

- `images/` — Landing-page screenshot and other assets referenced from
  `README.md`.
- `samples/` — Sample configs and reference files.

## Also see

- [CLAUDE.md](../CLAUDE.md) at the repo root — project-wide context, feature
  matrix, and current state.
- [CHANGELOG.md](../CHANGELOG.md) at the repo root — full release history.
