'use client';

import { useCallback } from 'react';
import { usePerformanceTier } from '../../hooks/usePerformanceTier';
import { useAurebesh } from '../../hooks/useAurebesh';
import { useUISound } from '../../hooks/useUISound';
import { resetOnboarding } from '../layout/OnboardingFlow';
import type { PerformanceTier } from '../../lib/performanceTier';
import type { AurebeshMode } from '../../lib/aurebesh';
import type { UISoundPreset } from '../../lib/uiSounds';

interface VisualSettingsPanelProps {
  className?: string;
}

/**
 * Unified settings panel for visual and audio preferences.
 *
 * Groups: Performance Tier, Sound, Typography (Aurebesh), and a
 * reset-onboarding button. Designed for a sidebar or modal.
 */
export function VisualSettingsPanel({ className = '' }: VisualSettingsPanelProps) {
  const { tier, isAutoDetected, setTier } = usePerformanceTier();
  const { mode: aurebeshMode, setMode: setAurebeshMode } = useAurebesh();
  const { play, setPreset, getSettings } = useUISound();

  const soundSettings = getSettings();

  const handleTierChange = useCallback(
    (newTier: PerformanceTier) => {
      setTier(newTier);
      play('toggle-on');
    },
    [setTier, play],
  );

  const handleSoundChange = useCallback(
    (preset: UISoundPreset) => {
      setPreset(preset);
      if (preset !== 'silent') {
        // Play a preview after a tiny delay so the new preset is active
        setTimeout(() => play('button-click'), 50);
      }
    },
    [setPreset, play],
  );

  const handleAurebeshChange = useCallback(
    (mode: AurebeshMode) => {
      setAurebeshMode(mode);
      play('toggle-on');
    },
    [setAurebeshMode, play],
  );

  const handleResetOnboarding = useCallback(() => {
    resetOnboarding();
    play('success');
  }, [play]);

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {/* Panel title */}
      <div className="dot-matrix" style={{ fontSize: 'calc(9px * var(--font-scale))' }}>
        VISUAL SETTINGS
      </div>

      {/* ─── Performance Tier ─── */}
      <SettingsSection title="VISUAL QUALITY">
        <div className="flex flex-col gap-1.5">
          <OptionRow
            label="Full"
            hint="All effects"
            isActive={tier === 'full'}
            onClick={() => handleTierChange('full')}
          />
          <OptionRow
            label="Medium"
            hint="Reduced effects"
            isActive={tier === 'medium'}
            onClick={() => handleTierChange('medium')}
          />
          <OptionRow
            label="Lite"
            hint="No animations"
            isActive={tier === 'lite'}
            onClick={() => handleTierChange('lite')}
          />
        </div>
        {isAutoDetected && (
          <div
            className="text-ui-xs mt-1.5"
            style={{ color: 'rgb(var(--text-muted))' }}
          >
            Auto-detected for your device
          </div>
        )}
        <button
          onClick={() => setTier(null)}
          className="text-ui-xs mt-1 no-aurebesh"
          style={{
            color: 'rgb(var(--accent) / 0.6)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
            textUnderlineOffset: 2,
          }}
        >
          Reset to auto-detect
        </button>
      </SettingsSection>

      {/* ─── Sound ─── */}
      <SettingsSection title="COCKPIT SOUNDS">
        <div className="flex flex-col gap-1.5">
          <OptionRow
            label="Silent"
            hint="No UI sounds"
            isActive={soundSettings.preset === 'silent'}
            onClick={() => handleSoundChange('silent')}
          />
          <OptionRow
            label="Subtle"
            hint="Beeps only"
            isActive={soundSettings.preset === 'subtle'}
            onClick={() => handleSoundChange('subtle')}
          />
          <OptionRow
            label="Full"
            hint="All sounds"
            isActive={soundSettings.preset === 'full'}
            onClick={() => handleSoundChange('full')}
          />
        </div>
      </SettingsSection>

      {/* ─── Aurebesh ─── */}
      <SettingsSection title="TYPOGRAPHY">
        <div className="flex flex-col gap-1.5">
          <OptionRow
            label="Standard"
            hint="Regular fonts"
            isActive={aurebeshMode === 'off'}
            onClick={() => handleAurebeshChange('off')}
          />
          <OptionRow
            label="Aurebesh Labels"
            hint="Headers only"
            isActive={aurebeshMode === 'labels'}
            onClick={() => handleAurebeshChange('labels')}
          />
          <OptionRow
            label="Full Aurebesh"
            hint="Everything"
            isActive={aurebeshMode === 'full'}
            onClick={() => handleAurebeshChange('full')}
          />
        </div>
      </SettingsSection>

      {/* ─── Reset ─── */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: 12,
        }}
      >
        <button
          onClick={handleResetOnboarding}
          className="text-ui-xs btn-hum corner-rounded no-aurebesh"
          style={{
            color: 'rgb(var(--text-muted))',
            background: 'rgb(var(--bg-surface))',
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
            padding: '6px 12px',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          Re-run setup wizard
        </button>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span
        className="dot-matrix"
        style={{
          fontSize: 'calc(8px * var(--font-scale))',
          opacity: 0.7,
        }}
      >
        {title}
      </span>
      {children}
    </div>
  );
}

function OptionRow({
  label,
  hint,
  isActive,
  onClick,
}: {
  label: string;
  hint: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between corner-rounded btn-hum no-aurebesh"
      style={{
        padding: '6px 10px',
        cursor: 'pointer',
        border: isActive
          ? '1px solid rgb(var(--accent) / 0.35)'
          : '1px solid var(--border-subtle)',
        background: isActive ? 'var(--accent-dim)' : 'transparent',
        transition: 'all 150ms ease',
      }}
    >
      <span
        className="text-ui-sm"
        style={{
          color: isActive
            ? 'rgb(var(--accent))'
            : 'rgb(var(--text-primary))',
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: isActive ? 600 : 400,
        }}
      >
        {label}
      </span>
      <span
        className="text-ui-xs"
        style={{ color: 'rgb(var(--text-muted))' }}
      >
        {hint}
      </span>
    </button>
  );
}
