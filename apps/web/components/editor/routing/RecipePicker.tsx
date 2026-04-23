'use client';

// ─── RecipePicker — v1.0 Modulation Preview ──────────────────────────
//
// One-click loader for the 5 starter modulation recipes that ship with
// v1.0. Pulls from `packages/presets/src/recipes/modulation/`. On click,
// every binding in the recipe is appended via `bladeStore.addBinding`.
//
// Design intent: make discovery fast. New users see 5 options, pick
// "Reactive Shimmer", click, and their blade starts responding to
// motion — no form-filling required. Then they use AddBindingForm +
// the plate bar to iterate.
//
// Hidden on non-Proffie boards (gated by ModulatorPlateBar upstream).

import { useState } from 'react';
import { MODULATION_RECIPES } from '@kyberstation/presets';
import { useBladeStore } from '@/stores/bladeStore';

export function RecipePicker() {
  const addBinding = useBladeStore((s) => s.addBinding);
  const [lastLoaded, setLastLoaded] = useState<string | null>(null);

  const loadRecipe = (recipeId: string) => {
    const recipe = MODULATION_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;
    // Append each binding. IDs in recipes are stable per-recipe, so
    // loading the same recipe twice duplicates the bindings — users
    // can clear via "Clear all" if they want a fresh start.
    recipe.bindings.forEach((binding) => {
      // Give each instance a fresh id so duplicates don't clash
      const freshId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${binding.id}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1_000_000).toString(36)}`;
      addBinding({ ...binding, id: freshId });
    });
    setLastLoaded(recipe.name);
    // Auto-clear the confirmation after a few seconds
    setTimeout(() => setLastLoaded(null), 2500);
  };

  return (
    <div className="flex flex-col gap-1.5 p-2 rounded border border-border-subtle bg-bg-deep/40">
      <div className="flex items-center justify-between">
        <span className="text-ui-xs font-mono uppercase tracking-wider text-text-muted">
          Starter Recipes
        </span>
        {lastLoaded && (
          <span
            className="text-ui-xs"
            style={{ color: 'rgb(var(--status-ok))' }}
            aria-live="polite"
          >
            ✓ Loaded {lastLoaded}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {MODULATION_RECIPES.map((recipe) => (
          <button
            key={recipe.id}
            type="button"
            onClick={() => loadRecipe(recipe.id)}
            className="text-left px-2 py-1.5 rounded border border-border-subtle bg-bg-surface hover:border-accent hover:bg-accent/5 transition-colors"
            title={recipe.description}
          >
            <div className="text-ui-xs font-medium text-text-primary truncate">
              {recipe.name}
            </div>
            <div className="text-[9px] font-mono uppercase tracking-wider text-text-muted truncate">
              {recipe.bindings.length} binding{recipe.bindings.length !== 1 ? 's' : ''}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
