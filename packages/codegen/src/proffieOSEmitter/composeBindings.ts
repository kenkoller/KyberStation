// ─── ProffieOS Binding Composer — v1.1 Core ─────────────────────────────
//
// Replaces v1.0's snapshot-only export with AST-level template injection
// for MAPPABLE bindings. Takes a freshly built style AST + the
// `mappable` list from `mapBindings()` and grafts each binding's
// `astPatch` into the AST at the slot identified by its `targetPath`.
//
// What's grafted? `mapBindings` already produced sub-ASTs of the shape
//   Scale<source, Int<lo>, Int<hi>>
// where `source` is `SwingSpeed<>`, `BladeAngle<>`, etc. and `lo`/`hi`
// scale to ProffieOS's 0..32768 convention. Those sub-ASTs are valid
// `FUNCTION<int>` nodes and can substitute literal `Int<N>` template
// arguments inside `Mix<Int<N>, ColorA, ColorB>`-style wrappers.
//
// ─── v1.1 Core slot set (initial scope) ─────────────────────────────────
//
// The composer recognises ONE slot pattern in v1.1 Core, which covers
// the most common modulation recipe (swing → shimmer):
//
//   * "Shimmer-Mix slot" — a Mix<Int<N>, X, Y> node anywhere in the
//     style AST whose first child is an `Int<N>` template node. This is
//     the canonical ProffieOS pattern for blending a base color with a
//     bright (often White) accent: AudioFlicker<>, Pulsing<>,
//     Stripes<>, etc. all emit it. We swap the `Int<N>` for the
//     binding's pre-wrapped `Scale<>` driver.
//
//     Targets: `shimmer` (the canonical mapping in DEFAULT_CONFIG).
//
// Other targets (RGB channels, scalar timing knobs that don't have an
// AST slot today) fall through to the `deferred` list in the result.
// The caller (`generateStyleCode`) snapshots those into the config
// before `buildAST` so the static values are baked in. Future waves
// will grow the slot set:
//
//   * Per-channel Rgb<r, g, b> → restructure to
//     Mix<driver, ColorLow, ColorHigh> (MUCH bigger; v1.2)
//   * RotateColorsX<Int<N>, ...> swap (forward-looking; ASTBuilder
//     doesn't emit this today)
//
// ─── Purity contract ────────────────────────────────────────────────────
//
// `composeBindings(ast, mappable)` is pure. The input AST is never
// mutated. When a binding finds a slot, the path of nodes from root to
// slot is shallow-cloned with the new substitution; everything else
// shares structure with the input AST. Multiple bindings on different
// targets compose by re-running the substitution against the
// progressively rewritten root.

import type { StyleNode } from '../types.js';
import type { MappedBinding } from './mapBindings.js';

// ─── Public types ───────────────────────────────────────────────────────

export interface ComposeBindingsResult {
  /** New AST with mappable bindings grafted as live drivers. */
  readonly ast: StyleNode;
  /** Bindings the composer successfully grafted into the AST. */
  readonly composed: readonly MappedBinding[];
  /**
   * Bindings the composer recognised as mappable but couldn't graft
   * (no recognised slot in the current AST). Caller falls these through
   * to the snapshot path.
   */
  readonly deferred: readonly MappedBinding[];
}

// ─── Slot resolver registry ─────────────────────────────────────────────
//
// Each entry knows how to recognise a slot for a given `targetPath` and
// returns a substituted AST when a slot is found. A null return means
// "no slot found in this AST" — the binding falls through to `deferred`.
//
// Slot resolvers are pure: input AST + driver → new AST or null. They
// MUST shallow-clone the root-to-slot path; never mutate the input.

type SlotResolver = (root: StyleNode, driver: StyleNode) => StyleNode | null;

const SLOT_RESOLVERS: Record<string, SlotResolver> = {
  shimmer: shimmerMixSlotResolver,
};

/**
 * Find a `Mix<Int<N>, X, Y>` node and replace its first child (`Int<N>`)
 * with the binding's driver sub-AST. Returns a new root with the path
 * to the substituted node shallow-cloned, or null if no matching slot
 * exists in the tree.
 *
 * Slot recognition criteria:
 *   - Node `type === 'mix'` (preferred) OR `name === 'Mix'` (fallback).
 *   - Has at least 3 children.
 *   - First child is an Int template (`type === 'function'`,
 *     `name === 'Int'`, exactly one bare-integer child).
 *
 * Picks the FIRST matching slot found via depth-first pre-order
 * traversal. The traversal is deterministic so multiple bindings to
 * the same target on the same AST always pick the same slot (idempotent).
 */
function shimmerMixSlotResolver(
  root: StyleNode,
  driver: StyleNode,
): StyleNode | null {
  return substituteFirstShimmerSlot(root, driver);
}

function isIntTemplate(node: StyleNode): boolean {
  return (
    node.type === 'function' &&
    node.name === 'Int' &&
    node.args.length === 1 &&
    node.args[0]!.type === 'integer'
  );
}

function isShimmerMixSlot(node: StyleNode): boolean {
  if (node.type !== 'mix' && node.name !== 'Mix') return false;
  if (node.args.length < 3) return false;
  return isIntTemplate(node.args[0]!);
}

/**
 * Walk `root` depth-first, find the first node satisfying
 * `isShimmerMixSlot`, return a structurally cloned tree where the slot
 * node's first child is `driver`. Returns null when no slot is found.
 */
function substituteFirstShimmerSlot(
  root: StyleNode,
  driver: StyleNode,
): StyleNode | null {
  // If the current node is itself a shimmer slot, substitute here.
  if (isShimmerMixSlot(root)) {
    return {
      ...root,
      args: [driver, ...root.args.slice(1)],
    };
  }

  // Otherwise recurse — first child to find a slot wins.
  for (let i = 0; i < root.args.length; i++) {
    const child = root.args[i]!;
    const replaced = substituteFirstShimmerSlot(child, driver);
    if (replaced !== null) {
      const newArgs = root.args.slice();
      newArgs[i] = replaced;
      return { ...root, args: newArgs };
    }
  }

  return null;
}

// ─── Main entry ─────────────────────────────────────────────────────────

/**
 * Graft `mappable` bindings' `astPatch` sub-trees into the style AST at
 * each binding's `targetPath`. Bindings whose target has no recognised
 * slot in the current slot registry fall through to `deferred` so the
 * caller can snapshot them into the config instead.
 *
 * Pure — does not mutate `ast` or any of its children. Multiple bindings
 * on different targets compose left-to-right against the progressively
 * rewritten root. Multiple bindings on the SAME target each see the
 * progressively rewritten tree, so the second binding finds the first
 * binding's already-grafted Scale<> in the slot. The first binding wins
 * the slot; the second is `deferred` (since the slot is gone — the
 * shimmer-mix slot now contains a `function`/`Scale`, not an Int<N>).
 *
 * This matches the "first binding wins, later bindings on the same
 * target snapshot" semantic from the v1.1 design doc; a future wave can
 * add multi-binding combinators (sum drivers, etc.) when ProffieOS
 * grows the templates to express it.
 */
export function composeBindings(
  ast: StyleNode,
  mappable: readonly MappedBinding[],
): ComposeBindingsResult {
  let currentAst = ast;
  const composed: MappedBinding[] = [];
  const deferred: MappedBinding[] = [];

  for (const m of mappable) {
    const resolver = SLOT_RESOLVERS[m.targetPath];
    if (!resolver) {
      // No slot resolver for this target path → snapshot fallback.
      deferred.push(m);
      continue;
    }

    const next = resolver(currentAst, m.astPatch);
    if (next === null) {
      // Resolver exists but the AST didn't match the slot pattern (e.g.,
      // a style that doesn't emit Mix<Int, base, white>). Snapshot.
      deferred.push(m);
      continue;
    }

    currentAst = next;
    composed.push(m);
  }

  return { ast: currentAst, composed, deferred };
}

// ─── Re-exports for testability ─────────────────────────────────────────
// The slot resolver internals are exported so unit tests can verify
// substitution behaviour directly without going through `composeBindings`.

export const _internal = {
  isIntTemplate,
  isShimmerMixSlot,
  substituteFirstShimmerSlot,
};
