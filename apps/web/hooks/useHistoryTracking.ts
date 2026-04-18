/**
 * useHistoryTracking — subscribes to bladeStore config changes and
 * pushes debounced snapshots into historyStore.
 *
 * Debouncing (300 ms) prevents flooding the history stack with every
 * intermediate value while a slider is being dragged.
 *
 * Mount this once inside WorkbenchLayout (or any top-level component that
 * lives for the entire editor session).
 */

import { useEffect, useRef } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useHistoryStore } from '@/stores/historyStore';
import { isRestoringFromHistory } from '@/stores/historyRestoreFlag';
import type { BladeConfig } from '@kyberstation/engine';

const DEBOUNCE_MS = 300;

/** Derive a human-readable label by diffing two configs. */
function deriveLabel(prev: BladeConfig, next: BladeConfig): string {
  // Style change
  if (prev.style !== next.style) {
    const name = next.style.charAt(0).toUpperCase() + next.style.slice(1);
    return `Applied ${name} style`;
  }
  // Ignition change
  if (prev.ignition !== next.ignition) {
    const name = next.ignition.charAt(0).toUpperCase() + next.ignition.slice(1);
    return `Changed ignition to ${name}`;
  }
  // Retraction change
  if (prev.retraction !== next.retraction) {
    const name = next.retraction.charAt(0).toUpperCase() + next.retraction.slice(1);
    return `Changed retraction to ${name}`;
  }
  // Color key changes — check known color keys
  const colorKeys = ['baseColor', 'clashColor', 'lockupColor', 'blastColor'] as const;
  for (const key of colorKeys) {
    const p = prev[key] as { r: number; g: number; b: number } | undefined;
    const n = next[key] as { r: number; g: number; b: number } | undefined;
    if (p && n && (p.r !== n.r || p.g !== n.g || p.b !== n.b)) {
      const label = key
        .replace('Color', ' color')
        .replace(/([A-Z])/g, ' $1')
        .toLowerCase()
        .trim();
      return `Changed ${label}`;
    }
  }
  // Numeric/named fields
  const namedFields: Partial<Record<keyof BladeConfig, string>> = {
    shimmer: 'shimmer',
    ignitionMs: 'ignition speed',
    retractionMs: 'retraction speed',
    ledCount: 'LED count',
    name: 'blade name',
  };
  for (const [field, label] of Object.entries(namedFields) as [keyof BladeConfig, string][]) {
    if (prev[field] !== next[field]) {
      return `Changed ${label}`;
    }
  }
  return 'Updated blade config';
}

export function useHistoryTracking() {
  const pushState = useHistoryStore((s) => s.pushState);

  // Track whether we've seeded the initial snapshot
  const seededRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevConfigRef = useRef<BladeConfig | null>(null);

  useEffect(() => {
    // Seed the very first entry so undo has a "clean slate" to return to.
    if (!seededRef.current) {
      const initial = useBladeStore.getState().config;
      pushState('Initial state', initial);
      prevConfigRef.current = initial;
      seededRef.current = true;
    }

    // Subscribe to config changes on the store directly (avoids re-running
    // this effect on every render while still catching all mutations).
    const unsubscribe = useBladeStore.subscribe((state, prevState) => {
      const next = state.config;
      const prev = prevState.config;

      // Skip if config reference hasn't changed (e.g. topology-only update)
      if (next === prev) return;

      // Skip snapshots applied by undo/redo — otherwise the restored
      // snapshot is re-pushed onto the history stack, which wipes the
      // future stack (breaking redo) and creates a "zombie" past entry
      // that matches the current config (so a second undo appears to
      // do nothing). See P17-001.
      if (isRestoringFromHistory()) {
        prevConfigRef.current = next;
        return;
      }

      const label = prevConfigRef.current
        ? deriveLabel(prevConfigRef.current, next)
        : 'Updated blade config';

      prevConfigRef.current = next;

      // Debounce: cancel pending push and restart the timer.
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        pushState(label, next);
        debounceRef.current = null;
      }, DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [pushState]);
}
