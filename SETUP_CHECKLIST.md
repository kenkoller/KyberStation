# BLADEFORGE — GitHub Setup Checklist

## Repo Initialization

```bash
# 1. Create the repo
gh repo create bladeforge --public --description "ProffieOS blade style editor & real-time Neopixel visualizer" --clone
cd bladeforge

# 2. Copy in CLAUDE.md
cp /path/to/CLAUDE.md ./CLAUDE.md

# 3. Launch Agent 0 (scaffold)
claude-code --session "bladeforge-scaffold" --prompt "$(cat AGENT_PROMPTS.md | sed -n '/## AGENT 0/,/## AGENT 1/p')"

# 4. After Agent 0 completes and pushes, launch parallel agents:
# Terminal 1 — Engine
claude-code --session "bladeforge-engine" --prompt "$(cat AGENT_PROMPTS.md | sed -n '/## AGENT 1/,/## AGENT 2/p')"

# Terminal 2 — Codegen
claude-code --session "bladeforge-codegen" --prompt "$(cat AGENT_PROMPTS.md | sed -n '/## AGENT 2/,/## AGENT 3/p')"

# Terminal 3 — Web UI
claude-code --session "bladeforge-web" --prompt "$(cat AGENT_PROMPTS.md | sed -n '/## AGENT 3/,/## AGENT 4/p')"

# Terminal 4 — Presets/Sound/Docs
claude-code --session "bladeforge-content" --prompt "$(cat AGENT_PROMPTS.md | sed -n '/## AGENT 4/,/## Merge Order/p')"
```

## GitHub Settings

- **Branch protection on `main`**: Require PR, require CI pass, require 1 review
- **Labels**: `engine`, `codegen`, `web`, `presets`, `sound`, `docs`, `bug`, `feature`, `enhancement`
- **Projects board**: Kanban with columns: Backlog, In Progress, Review, Done
- **Topics**: `lightsaber`, `proffieboard`, `proffieos`, `neopixel`, `blade-style`, `cosplay`, `react`, `typescript`, `nextjs`
- **Description**: "Visual blade style editor & real-time simulator for Proffieboard lightsabers. Design, preview, and export ProffieOS blade styles."
- **Website**: (deploy via Vercel once web app is functional)

## Branch Strategy

```
main (protected)
├── feat/scaffold          ← Agent 0
├── feat/engine            ← Agent 1
├── feat/codegen           ← Agent 2
├── feat/web-ui            ← Agent 3
└── feat/presets-sound-docs ← Agent 4
```

## Completed Phases

- [x] Phase 0 — Monorepo scaffold (Turbo, pnpm, TS strict, Tailwind, PWA manifest)
- [x] Phase 1 — Engine: 42 files, 12 styles, 8 effects, 7+5 ignition/retraction, segment/layer/direction
- [x] Phase 2 — Codegen: AST-based ProffieOS C++ code generation
- [x] Phase 3 — Web UI: Next.js 14, Tailwind, Zustand, BladeCanvas, all editor panels
- [x] Phase 4 — Integration: engine-to-canvas, codegen-to-CodeOutput, wired end-to-end
- [x] Phase 5 — Topologies: 8 presets (single, staff, crossguard, triple, quad-star, inquisitor, split-blade, accent)
- [x] Phase 6 — Boards: 14 board profiles with compatibility scoring
- [x] Phase 7 — Sound filters: 13 filter types, dynamic parameter resolver, 6 filter chain presets
- [x] Multi-blade support (crossguard, staff, dual wield preview)

## Remaining Work

- [ ] Kyber Code visual sharing system (Star Wars-themed QR codes with Aurebesh)
- [ ] Topology picker UI panel
- [ ] Board selector UI panel
- [ ] Audio filter panel UI
- [ ] Preset library expansion (40+ characters)
- [ ] Responsive mobile layout
- [ ] PWA service worker (offline caching)
- [ ] Visual polish (photorealistic blade glow, GUI overhaul)

## Future Phases (Post v1.0)

- [ ] Electron desktop app with USB serial to Proffieboard
- [ ] Direct flash from app (compile + upload via Arduino CLI)
- [ ] Community style gallery with sharing/voting
- [ ] Three.js 3D hilt viewer with accurate hilt models
- [ ] OLED display frame preview and animation editor
- [ ] Sound font marketplace integration
- [ ] Mobile companion app (React Native) for on-saber Edit Mode reference
- [ ] Choreography mode: sequence effects on a timeline, export to Fett263 choreography format
- [ ] WebSerial API for browser-direct Proffieboard communication (Chrome only)
- [ ] AI-assisted style generation ("make me a blade that looks like a dying star")
- [ ] Import existing ProffieOS config.h and parse into BladeForge config
