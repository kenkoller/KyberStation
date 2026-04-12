# Contributing to BladeForge

## Getting Started

1. Clone the repo and install dependencies:
   ```bash
   pnpm install
   ```

2. Start the dev server:
   ```bash
   pnpm dev:local
   ```

3. Open http://localhost:3000 and verify the editor loads.

## Making Changes

### Engine changes (`packages/engine/`)

The engine is the core simulation. It has zero DOM dependencies and must stay that way.

1. Make your changes in `packages/engine/src/`
2. Add or update tests in `packages/engine/tests/`
3. Run engine tests: `pnpm test:engine`
4. Rebuild: the dev server watches for changes automatically

### Adding a new blade style

See [STYLE_AUTHORING.md](./STYLE_AUTHORING.md) for the full guide.

### Adding a new effect

1. Create `packages/engine/src/effects/YourEffect.ts` extending `BaseEffect`
2. Implement `apply()`, `isActive()`, `trigger()`, `release()`, `reset()`
3. Register in `packages/engine/src/effects/index.ts`
4. Add codegen mapping in `packages/codegen/src/ASTBuilder.ts`
5. Add UI trigger in `apps/web/components/editor/EffectTriggerBar.tsx`
6. Write tests

### Adding a new board profile

1. Create or update a file in `packages/boards/src/profiles/`
2. Define a `BoardProfile` with full capability matrix
3. Register in `packages/boards/src/profiles/index.ts`
4. Add effect and style mappings
5. Write tests for compatibility scoring

### UI changes (`apps/web/`)

- Components live in `apps/web/components/`
- State is in Zustand stores (`apps/web/stores/`)
- Use Tailwind CSS for styling, Radix UI for primitives
- Keep components focused — one panel, one responsibility

## Code Style

- TypeScript strict mode, no `any`
- Named exports only
- Co-locate tests with the package they test
- Use Conventional Commits for commit messages

## Pull Request Process

1. Create a feature branch: `feat/your-feature`
2. Make changes, add tests
3. Run the full test suite: `pnpm test`
4. Run type checking: `pnpm typecheck`
5. Open a PR with a clear description of what and why
6. PRs must pass CI and have tests for new engine/codegen code

## Reporting Issues

Use GitHub Issues with the appropriate template:
- **Bug report** — Something broken
- **Feature request** — Something new
- **Style request** — New blade style or preset
