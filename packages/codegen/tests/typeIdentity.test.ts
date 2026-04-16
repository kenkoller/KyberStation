// ─── BladeConfig Type Identity ───
// Compile-time guarantee that the `BladeConfig` *mirror* in
// `packages/codegen/src/ASTBuilder.ts` stays assignment-compatible with the
// canonical definition in `packages/engine/src/types.ts`.
//
// Why a mirror instead of a direct import? The workspace uses
// `node-linker=hoisted` with `symlink=false` (see root .npmrc), so workspace
// packages aren't linked into each other's `node_modules`. Combined with
// codegen's `rootDir: ./src` — which prevents its emitted .d.ts files from
// referencing sibling-package sources — importing engine types at compile time
// in codegen's production code would require either project references,
// a shared types package, or publishing a stable engine .d.ts. None of those
// are worth the churn today.
//
// Instead, codegen holds a subset mirror of engine's types, and this test
// enforces the invariant: if a field is added to engine's BladeConfig and
// used in codegen, this test fails at compile time.
//
// If this file fails to typecheck: update the mirror in
// packages/codegen/src/ASTBuilder.ts so it stays assignment-compatible.

import { describe, it, expect } from 'vitest';
import type { BladeConfig as CodegenBladeConfig } from '../src/index.js';
import type { BladeConfig as EngineBladeConfig } from '@kyberstation/engine';

// DRIFT SENTINEL — this fails typecheck if codegen's mirror of BladeConfig
// is missing or mistyping any field from the engine's canonical BladeConfig.
// A CodegenBladeConfig value must be assignable to an EngineBladeConfig slot
// so the rest of the codebase (which uses the engine type) can accept values
// produced by the codegen API.
type MirrorStaysAssignableToEngine = CodegenBladeConfig extends EngineBladeConfig
  ? true
  : never;
const _mirrorIsWideEnough: MirrorStaysAssignableToEngine = true;

// The reverse is intentionally NOT asserted: codegen's mirror uses
// `[key: string]: unknown` (an escape hatch for style-specific params whose
// types are fluid) and can receive engine values with extra properties, but
// the engine type cannot necessarily accept any codegen object — that's okay.

describe('BladeConfig type identity', () => {
  it('codegen.BladeConfig is assignable to engine.BladeConfig', () => {
    // Runtime assertion is nominal — the real check runs at compile time.
    expect(_mirrorIsWideEnough).toBe(true);
  });
});
