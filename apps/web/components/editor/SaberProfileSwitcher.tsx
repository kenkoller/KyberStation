'use client';

import { useState } from 'react';
import { useSaberProfileStore } from '@/stores/saberProfileStore';

export function SaberProfileSwitcher() {
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

  if (profiles.length === 0 && !showCreate) {
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

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1.5 px-2 py-1 rounded border border-border-subtle text-ui-xs text-text-secondary hover:text-text-primary hover:border-border-light transition-colors"
        aria-label="Switch saber profile"
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
        <span className="truncate max-w-[120px]">{active?.name ?? 'No Profile'}</span>
        <span className="text-text-muted">{showDropdown ? '\u25B2' : '\u25BC'}</span>
      </button>

      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-bg-secondary border border-border-light rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
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
