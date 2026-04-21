'use client';

import { useState } from 'react';
import { useSaberProfileStore } from '@/stores/saberProfileStore';

// ─── Props ────────────────────────────────────────────────────────────────────
//
// Added 2026-04-21 in Lane C (OV4 Delivery Rail). The Delivery rail wants
// only the "active profile pill + dropdown" logic of this component; it
// does NOT want the empty-state "+ Saber" button (which takes over when
// no profiles exist — the rail keeps its layout rigid and delegates
// profile creation to the dropdown's "+ New Saber Profile" affordance).
//
//   variant='default'  — unchanged pre-existing behavior. Header usage.
//   variant='compact'  — Delivery rail. Always renders the pill+dropdown,
//                        even when profiles is empty. Uses a preceding
//                        glyph the Delivery rail styles consistently
//                        with its other segments.

export interface SaberProfileSwitcherProps {
  variant?: 'default' | 'compact';
  /** Optional glyph placed before the active profile name in compact mode. */
  glyph?: string;
}

export function SaberProfileSwitcher({
  variant = 'default',
  glyph,
}: SaberProfileSwitcherProps = {}) {
  const profiles = useSaberProfileStore((s) => s.profiles);
  const activeProfileId = useSaberProfileStore((s) => s.activeProfileId);
  const switchProfile = useSaberProfileStore((s) => s.switchProfile);
  const createProfile = useSaberProfileStore((s) => s.createProfile);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newChassis, setNewChassis] = useState('');

  const active = profiles.find((p) => p.id === activeProfileId);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const profile = createProfile(newName.trim(), newChassis.trim());
    switchProfile(profile.id);
    setNewName('');
    setNewChassis('');
    setShowCreate(false);
    setShowDropdown(false);
  };

  // Default variant empty-state: "+ Saber" button. Compact variant skips
  // this and always shows the pill so the Delivery rail grid stays stable.
  if (variant === 'default' && profiles.length === 0 && !showCreate) {
    return (
      <button
        onClick={() => setShowCreate(true)}
        className="text-ui-xs text-text-muted hover:text-accent transition-colors px-1.5 py-0.5 rounded border border-border-subtle hover:border-accent-border"
        aria-label="Create saber profile"
      >
        + Saber
      </button>
    );
  }

  // Compact variant uses a tighter button so it slots into the 50px
  // Delivery rail without breaking the segment rhythm. The dropdown
  // body is identical — same profile list, same "+ New Saber Profile"
  // row, same create form — the only difference is the trigger shape.
  const triggerClasses =
    variant === 'compact'
      ? 'flex items-center gap-1.5 px-2 py-1 rounded-chrome border border-border-subtle text-ui-xs text-text-secondary hover:text-text-primary hover:border-border-light transition-colors font-mono uppercase tracking-[0.08em]'
      : 'flex items-center gap-1.5 px-2 py-1 rounded border border-border-subtle text-ui-xs text-text-secondary hover:text-text-primary hover:border-border-light transition-colors';

  const activeDisplay = active?.name ?? 'No Profile';

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={triggerClasses}
        aria-label="Switch saber profile"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
      >
        {glyph ? (
          <span aria-hidden="true" className="text-accent">
            {glyph}
          </span>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
        )}
        <span
          className={
            variant === 'compact'
              ? 'truncate max-w-[140px]'
              : 'truncate max-w-[120px]'
          }
        >
          {activeDisplay}
        </span>
        <span className="text-text-muted">{showDropdown ? '\u25B2' : '\u25BC'}</span>
      </button>

      {showDropdown && (
        <div
          // Compact (Delivery rail) opens upward (bottom-full + mb-1) so the
          // dropdown body doesn't collide with the rail's own 50px height.
          // Default variant keeps the existing downward-opening header
          // behavior (top-full + mt-1).
          className={
            variant === 'compact'
              ? 'absolute bottom-full left-0 mb-1 w-56 bg-bg-secondary border border-border-light rounded-lg shadow-xl z-50 overflow-hidden'
              : 'absolute top-full left-0 mt-1 w-56 bg-bg-secondary border border-border-light rounded-lg shadow-xl z-50 overflow-hidden'
          }
        >
          <div className="max-h-48 overflow-y-auto">
            {profiles.length === 0 && (
              <div className="px-3 py-2 text-ui-xs text-text-muted italic">
                No profiles yet.
              </div>
            )}
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => { switchProfile(p.id); setShowDropdown(false); }}
                className={`w-full text-left px-3 py-2 text-ui-xs transition-colors flex items-center gap-2 ${
                  p.id === activeProfileId
                    ? 'bg-accent-dim text-accent'
                    : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
                }`}
                role="option"
                aria-selected={p.id === activeProfileId}
              >
                <span className="flex-1 truncate">
                  <span className="font-medium">{p.name}</span>
                  {p.chassisType && (
                    <span className="text-text-muted ml-1">({p.chassisType})</span>
                  )}
                </span>
                <span className="text-text-muted tabular-nums">{p.presetEntries.length}p</span>
              </button>
            ))}
          </div>

          <div className="border-t border-border-subtle">
            {!showCreate ? (
              <button
                onClick={() => setShowCreate(true)}
                className="w-full text-left px-3 py-2 text-ui-xs text-accent hover:bg-bg-surface transition-colors"
              >
                + New Saber Profile
              </button>
            ) : (
              <div className="p-3 space-y-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Saber name..."
                  className="w-full bg-bg-deep border border-border-subtle rounded px-2 py-1.5 text-ui-xs text-text-secondary placeholder:text-text-muted"
                  aria-label="New saber name"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                />
                <input
                  type="text"
                  value={newChassis}
                  onChange={(e) => setNewChassis(e.target.value)}
                  placeholder="Chassis (e.g., 89sabers Vader)"
                  className="w-full bg-bg-deep border border-border-subtle rounded px-2 py-1.5 text-ui-xs text-text-secondary placeholder:text-text-muted"
                  aria-label="Chassis type"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={handleCreate}
                    className="flex-1 px-2 py-1.5 rounded text-ui-xs font-medium bg-accent-dim border border-accent-border text-accent hover:bg-accent/20 transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => { setShowCreate(false); setNewName(''); setNewChassis(''); }}
                    className="px-2 py-1.5 rounded text-ui-xs text-text-muted border border-border-subtle hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
