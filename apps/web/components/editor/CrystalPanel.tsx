'use client';

// ─── CrystalPanel — "My Crystal" dockable Workbench panel ───
//
// Renders the live 3D Kyber Crystal reflecting the current BladeConfig,
// plus action buttons for triggering animations and exporting a card
// snapshot.

import { useCallback, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useBladeStore } from '@/stores/bladeStore';
import { selectForm, CRYSTAL_FORMS } from '@/lib/crystal';
import type { CrystalHandle, AnimationTrigger } from '@/lib/crystal';
import { encodeGlyphFromConfig } from '@/lib/sharePack/kyberGlyph';
import {
  renderCardSnapshot,
  renderCardGif,
  LAYOUT_CATALOG,
  THEME_CATALOG,
  getLayout,
  getTheme,
  type GifVariant,
} from '@/lib/sharePack/cardSnapshot';
import { toast } from '@/lib/toastManager';

const LAYOUT_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'default', label: '16:9 Card' },
  { id: 'og', label: 'Twitter / OG' },
  { id: 'instagram', label: 'Instagram 1:1' },
  { id: 'story', label: 'Story 9:16' },
];

const THEME_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'default', label: 'Deep Space' },
  { id: 'light', label: 'Light' },
  { id: 'imperial', label: 'Imperial' },
  { id: 'jedi', label: 'Jedi' },
  { id: 'space', label: 'Pure Black' },
];

const GIF_VARIANT_OPTIONS: Array<{ id: GifVariant; label: string; tooltip: string }> = [
  { id: 'idle', label: 'Idle', tooltip: 'Steady-state shimmer loop (~1s, ~1MB)' },
  { id: 'ignition', label: 'Ignition cycle', tooltip: 'Full PREON → ON → RETRACT arc (~2.5s)' },
];

/** Slug a preset name into something filename-safe — falls back to the form id. */
function presetSlug(name: string | undefined, fallback: string): string {
  const base = (name && name.trim()) || fallback;
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 32) || fallback;
}

// Dynamic import keeps Three.js out of the SSR bundle
const KyberCrystal = dynamic(
  () => import('@/lib/crystal/reactComponent').then((m) => m.KyberCrystal),
  { ssr: false, loading: () => <CrystalLoadingShell /> },
);

function CrystalLoadingShell() {
  return (
    <div className="w-full aspect-square flex items-center justify-center bg-bg-deep/40 rounded-md">
      <span className="text-ui-xs text-text-muted font-mono tracking-wide">Forging crystal…</span>
    </div>
  );
}

export function CrystalPanel() {
  const config = useBladeStore((s) => s.config);
  const handleRef = useRef<CrystalHandle | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [layoutId, setLayoutId] = useState<string>('default');
  const [themeId, setThemeId] = useState<string>('default');
  const [gifVariant, setGifVariant] = useState<GifVariant>('idle');
  const [gifEncoding, setGifEncoding] = useState<boolean>(false);

  const form = selectForm(config);
  const formInfo = CRYSTAL_FORMS[form];

  // Real Kyber Glyph (v1) reflecting the current config. Re-encodes on
  // every config change; deterministic per config so the QR surface
  // only regenerates when something actually changed.
  const glyph = useMemo(() => {
    try {
      return encodeGlyphFromConfig(config);
    } catch (err) {
      console.warn('[crystal] glyph encode failed:', err);
      return 'SPC.ERR';
    }
  }, [config]);

  const trigger = useCallback(
    (kind: AnimationTrigger, label: string) => {
      handleRef.current?.trigger(kind);
      setLastAction(label);
    },
    [],
  );

  const saveSnapshot = useCallback(async () => {
    const blob = await handleRef.current?.snapshot(512);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crystal-${form}-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    setLastAction('Snapshot saved');
  }, [form]);

  const saveShareCard = useCallback(async () => {
    try {
      setLastAction('Rendering card…');
      const blob = await renderCardSnapshot({
        config,
        glyph,
        presetName: config.name,
        layout: getLayout(layoutId),
        theme: getTheme(themeId),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kyberstation-card-${layoutId}-${themeId}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setLastAction('Share card saved');
    } catch (err) {
      console.warn('[crystal] card render failed:', err);
      toast.error("Couldn't render share card");
    }
  }, [config, glyph, layoutId, themeId]);

  const saveShareGif = useCallback(async () => {
    if (gifEncoding) return;
    setGifEncoding(true);
    try {
      setLastAction('Encoding GIF… (1–3s)');
      const blob = await renderCardGif({
        variant: gifVariant,
        config,
        glyph,
        presetName: config.name,
        layout: getLayout(layoutId),
        theme: getTheme(themeId),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const slug = presetSlug(config.name, form);
      a.download = `kyberstation-card-${gifVariant}-${slug}-${Date.now()}.gif`;
      a.click();
      URL.revokeObjectURL(url);
      const sizeKb = Math.round(blob.size / 1024);
      setLastAction(`Share GIF saved (${sizeKb} KB)`);
    } catch (err) {
      console.warn('[crystal] gif render failed:', err);
      toast.error("Couldn't render share GIF");
    } finally {
      setGifEncoding(false);
    }
  }, [config, glyph, layoutId, themeId, gifVariant, gifEncoding, form]);

  const copyGlyph = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(glyph);
      toast.success('Glyph copied to clipboard');
      setLastAction('Glyph copied');
    } catch {
      toast.error("Couldn't copy glyph — clipboard permission denied");
    }
  }, [glyph]);

  const copyShareUrl = useCallback(async () => {
    try {
      const url = `${window.location.origin}/editor?s=${encodeURIComponent(glyph)}`;
      await navigator.clipboard.writeText(url);
      toast.success('Share link copied');
      setLastAction('Link copied');
    } catch {
      toast.error("Couldn't copy share link — clipboard permission denied");
    }
  }, [glyph]);

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Crystal live render — square aspect for consistent framing */}
      <div className="w-full aspect-square relative rounded-md overflow-hidden bg-gradient-to-b from-bg-deep via-bg-panel to-bg-deep">
        {/* The QR code no longer lives on the crystal surface — it sits
            in a corner of the share card instead (see cardSnapshot.ts).
            This keeps the crystal readable as a pure gem and gives
            phone cameras a flat, unrefracted scan target. */}
        <KyberCrystal
          onReady={(h) => {
            handleRef.current = h;
          }}
          glyph={glyph}
          qrEnabled={false}
          interactive
        />
      </div>

      {/* Form + faction label */}
      <div className="flex items-baseline justify-between text-ui-xs font-mono">
        <span className="text-text-primary">
          {formInfo.name}
        </span>
        <span
          className="text-text-muted"
          title={formInfo.description}
        >
          Form {formIndex(form)}
        </span>
      </div>

      {/* Animation trigger row */}
      <div className="grid grid-cols-2 gap-1.5">
        <ActionButton onClick={() => trigger('clash', 'Clash')} label="Clash" />
        <ActionButton onClick={() => trigger('preset-saved', 'Saved')} label="Saved" />
        <ActionButton onClick={() => trigger('first-discovery', 'Discovery')} label="Discovery" />
        <ActionButton onClick={() => trigger('attune', 'Attune')} label="Attune" />
      </div>

      {/* Share card layout + theme selectors */}
      <div className="grid grid-cols-2 gap-1.5">
        <label className="flex flex-col gap-1">
          <span className="text-ui-xs font-mono text-text-muted uppercase tracking-wider">
            Layout
          </span>
          <select
            value={layoutId}
            onChange={(e) => setLayoutId(e.target.value)}
            className="py-1.5 px-2 text-ui-xs font-mono bg-bg-panel border border-border-subtle rounded hover:border-border-light focus:outline-none focus:border-accent"
          >
            {LAYOUT_OPTIONS.filter((o) => o.id in LAYOUT_CATALOG).map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-ui-xs font-mono text-text-muted uppercase tracking-wider">
            Theme
          </span>
          <select
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            className="py-1.5 px-2 text-ui-xs font-mono bg-bg-panel border border-border-subtle rounded hover:border-border-light focus:outline-none focus:border-accent"
          >
            {THEME_OPTIONS.filter((o) => o.id in THEME_CATALOG).map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Export row */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={saveSnapshot}
          className="py-1.5 text-ui-xs font-mono border border-border-subtle rounded bg-bg-panel hover:bg-bg-hover transition-colors"
        >
          Save crystal PNG
        </button>
        <button
          type="button"
          onClick={saveShareCard}
          className="py-1.5 text-ui-xs font-mono border border-accent/40 rounded bg-accent/10 hover:bg-accent/20 transition-colors text-accent"
        >
          Save share card
        </button>
      </div>

      {/* Animated share GIF — variant select + render button */}
      <div className="grid grid-cols-[auto,1fr] gap-1.5 items-stretch">
        <select
          value={gifVariant}
          onChange={(e) => setGifVariant(e.target.value as GifVariant)}
          disabled={gifEncoding}
          aria-label="Animation variant"
          className="py-1.5 px-2 text-ui-xs font-mono bg-bg-panel border border-border-subtle rounded hover:border-border-light focus:outline-none focus:border-accent disabled:opacity-60"
        >
          {GIF_VARIANT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id} title={o.tooltip}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={saveShareGif}
          disabled={gifEncoding}
          aria-busy={gifEncoding || undefined}
          className="py-1.5 text-ui-xs font-mono border border-accent/40 rounded bg-accent/10 hover:bg-accent/20 transition-colors text-accent disabled:opacity-60 disabled:cursor-wait"
          title={
            gifEncoding
              ? 'Encoding GIF — please wait'
              : 'Save an animated GIF of the share card'
          }
        >
          {gifEncoding ? 'Encoding GIF…' : 'Save share GIF'}
        </button>
      </div>

      {/* Glyph sharing */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={copyGlyph}
          className="py-1.5 text-ui-xs font-mono border border-border-subtle rounded bg-bg-panel hover:bg-bg-hover transition-colors"
          title={glyph}
        >
          Copy glyph
        </button>
        <button
          type="button"
          onClick={copyShareUrl}
          className="py-1.5 text-ui-xs font-mono border border-border-subtle rounded bg-bg-panel hover:bg-bg-hover transition-colors"
        >
          Copy share link
        </button>
      </div>

      {/* Glyph preview — monospace, truncated */}
      <div
        className="text-ui-xs text-text-muted font-mono text-center truncate"
        title={glyph}
      >
        {glyph.length > 28 ? `${glyph.slice(0, 28)}…` : glyph}
      </div>

      {lastAction && (
        <div className="text-ui-xs text-text-muted font-mono text-center">
          {lastAction}
        </div>
      )}
    </div>
  );
}

// ─── Small sub-components ───

function ActionButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="py-1 text-ui-xs font-mono border border-border-subtle rounded bg-bg-panel hover:bg-bg-hover transition-colors"
    >
      {label}
    </button>
  );
}

function formIndex(form: string): number {
  switch (form) {
    case 'natural': return 1;
    case 'bled': return 2;
    case 'cracked': return 3;
    case 'obsidian-bipyramid': return 4;
    case 'paired': return 5;
    default: return 0;
  }
}
