'use client';

// ─── Mobile Companion Route ───
//
// A dedicated touch-first preset browser meant for phones at
// meetups/cons — pull the app up, swipe through a curated set of
// canon sabers, tap the blade to ignite. Read-only; no editor
// chrome, no panels. Deep-link friendly: `/m?preset=<id>` jumps
// straight to a named preset.
//
// Uses the full blade simulator (same BladeEngine + BladeCanvas as
// /editor) so what you see here is what you'd flash onto hardware.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ALL_PRESETS } from '@kyberstation/presets';
import type { Preset } from '@kyberstation/presets';
import { BladeCanvas } from '@/components/editor/BladeCanvas';
import { useBladeEngine } from '@/hooks/useBladeEngine';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useAudioSync } from '@/hooks/useAudioSync';
import { useThemeApplier } from '@/hooks/useThemeApplier';
import { useCrystalAccent } from '@/hooks/useCrystalAccent';
import { useBladeStore } from '@/stores/bladeStore';
import { playUISound } from '@/lib/uiSounds';
import type { BladeConfig } from '@kyberstation/engine';

// Curated subset — the hit parade. Users can still deep-link to any
// preset via ?preset=<id>; this just controls the swipe order.
const CURATED_IDS = [
  'prequel-obi-wan-ep1',
  'prequel-anakin',
  'prequel-qui-gon',
  'prequel-mace-windu',
  'prequel-yoda',
  'ot-luke-anh',
  'ot-vader',
  'ot-obiwan-anh',
  'st-kylo-ren',
  'st-rey-yellow',
  'animated-ahsoka-rebels-white',
  'animated-din-djarin-darksaber',
];

function getCuratedPresets(): Preset[] {
  const byId = new Map(ALL_PRESETS.map((p) => [p.id, p]));
  const curated = CURATED_IDS.map((id) => byId.get(id)).filter(
    (p): p is Preset => !!p,
  );
  // Fall back to first 12 if curated list doesn't match (preset IDs drifted).
  return curated.length >= 6 ? curated : ALL_PRESETS.slice(0, 12);
}

const SWIPE_THRESHOLD = 60;

function MobileCompanionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { engineRef, toggle } = useBladeEngine();
  const audio = useAudioEngine();
  useAudioSync(audio);
  useThemeApplier();
  useCrystalAccent();

  const loadPreset = useBladeStore((s) => s.loadPreset);
  const isOn = useBladeStore((s) => s.isOn);

  const presets = useMemo(() => getCuratedPresets(), []);
  const [index, setIndex] = useState(() => {
    const requested = searchParams.get('preset');
    if (!requested) return 0;
    const i = presets.findIndex((p) => p.id === requested);
    return i >= 0 ? i : 0;
  });

  const preset = presets[index];

  // Load the current preset whenever the index changes.
  useEffect(() => {
    loadPreset(preset.config as BladeConfig);
  }, [preset, loadPreset]);

  // Keep the URL in sync so links are shareable.
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('preset', preset.id);
    router.replace(`/m?${params.toString()}`, { scroll: false });
  }, [preset.id, router]);

  // Touch swipe handlers
  const touchX = useRef<number | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  }, []);
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchX.current === null) return;
      const dx = e.changedTouches[0].clientX - touchX.current;
      touchX.current = null;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      setIndex((i) => {
        if (dx < 0) return Math.min(presets.length - 1, i + 1);
        return Math.max(0, i - 1);
      });
      playUISound('tab-switch');
    },
    [presets.length],
  );

  const toggleWithAudio = useCallback(() => {
    const wasOn = useBladeStore.getState().isOn;
    toggle();
    if (wasOn) audio.playRetraction();
    else audio.playIgnition();
  }, [toggle, audio]);

  return (
    <div
      className="h-[100dvh] w-full flex flex-col bg-bg-deep text-text-primary overflow-hidden select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-4 pt-3 pb-2">
        <div className="min-w-0">
          <div className="text-ui-base font-semibold truncate">{preset.name}</div>
          <div className="text-ui-xs text-text-muted truncate">
            {preset.character} · {preset.era}
          </div>
        </div>
        <a
          href={`/editor?preset=${encodeURIComponent(preset.id)}`}
          className="text-ui-xs text-text-muted hover:text-text-primary shrink-0 px-2 py-1 rounded border border-border-subtle"
          title={`Open ${preset.name} in the full editor`}
        >
          Edit →
        </a>
      </header>

      {/* ── Swipe hint ──────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-center gap-2 pb-1">
        {presets.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setIndex(i)}
            aria-label={`Jump to ${p.name}`}
            className={`h-1 rounded-full transition-all ${
              i === index ? 'w-4 bg-accent' : 'w-1 bg-border-subtle'
            }`}
          />
        ))}
      </div>

      {/* ── Blade preview (fills remaining height) ──────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <BladeCanvas engineRef={engineRef} vertical={true} mobileFullscreen />
        {/* Swipe affordance arrows */}
        {index > 0 && (
          <button
            onClick={() => setIndex((i) => i - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-12 rounded-lg bg-bg-deep/60 backdrop-blur-sm flex items-center justify-center text-text-muted"
            aria-label="Previous preset"
          >
            ‹
          </button>
        )}
        {index < presets.length - 1 && (
          <button
            onClick={() => setIndex((i) => i + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-12 rounded-lg bg-bg-deep/60 backdrop-blur-sm flex items-center justify-center text-text-muted"
            aria-label="Next preset"
          >
            ›
          </button>
        )}
      </div>

      {/* ── Ignite control ──────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pb-4 pt-2">
        <button
          onClick={toggleWithAudio}
          className="w-full h-14 rounded-lg font-semibold text-ui-lg transition-colors flex items-center justify-center gap-2"
          style={{
            background: isOn
              ? 'rgb(var(--crystal-accent, var(--accent)) / 0.18)'
              : 'rgb(var(--accent) / 0.15)',
            color: isOn ? 'rgb(var(--crystal-accent, var(--accent)))' : 'rgb(var(--accent))',
            borderColor: isOn
              ? 'rgb(var(--crystal-accent, var(--accent)))'
              : 'rgb(var(--accent) / 0.5)',
            borderWidth: 1,
            borderStyle: 'solid',
            boxShadow: isOn
              ? '0 0 24px rgb(var(--crystal-accent, var(--accent)) / 0.4)'
              : 'none',
          }}
          aria-label={isOn ? 'Retract blade' : 'Ignite blade'}
        >
          <span aria-hidden="true">{isOn ? '◯' : '●'}</span>
          <span>{isOn ? 'Retract' : 'Ignite'}</span>
        </button>
        <p className="text-ui-xs text-text-muted text-center mt-2">
          Swipe left / right to change preset
        </p>
      </div>
    </div>
  );
}

export default function MobileCompanion() {
  return (
    <Suspense fallback={null}>
      <MobileCompanionContent />
    </Suspense>
  );
}
