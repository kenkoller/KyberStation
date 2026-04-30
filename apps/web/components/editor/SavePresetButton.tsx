'use client';

// ─── SavePresetButton — v1 user-preset save ──────────────────────────────
//
// Renders a compact "Save" button for the action bar. On click, prompts
// the user for a name via window.prompt (intentionally minimal for v1),
// snapshots the current bladeStore config, and persists it to
// userPresetStore (IndexedDB-backed). Shows a toast on success.
//
// Post-launch: replace window.prompt with an inline input or modal.

import { useCallback, useState } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { useUserPresetStore } from '@/stores/userPresetStore';
import { toast } from '@/lib/toastManager';

export function SavePresetButton(): JSX.Element {
  const [saving, setSaving] = useState(false);
  const config = useBladeStore((s) => s.config);
  const savePreset = useUserPresetStore((s) => s.savePreset);

  const handleSave = useCallback(() => {
    // Default name from the config's name field (if set), or a timestamp
    const defaultName =
      (config as Record<string, unknown>).name
        ? String((config as Record<string, unknown>).name)
        : `My Preset ${new Date().toLocaleTimeString()}`;

    const name = window.prompt('Name your preset:', defaultName);
    if (!name || name.trim().length === 0) return;

    setSaving(true);
    try {
      savePreset(name.trim(), { ...config });
      toast.success(`Saved "${name.trim()}"`);
    } finally {
      setSaving(false);
    }
  }, [config, savePreset]);

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={saving}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-ui-xs font-mono uppercase tracking-wider transition-all border border-accent-border/50 text-accent bg-accent-dim/20 hover:border-accent hover:bg-accent-dim/40 disabled:opacity-50"
      title="Save current design as a preset"
      aria-label="Save current design as a preset"
      data-testid="save-preset-button"
    >
      <span aria-hidden="true">★</span>
      <span>Save</span>
    </button>
  );
}
