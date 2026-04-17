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
import { toast } from '@/lib/toastManager';

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
        <KyberCrystal
          onReady={(h) => {
            handleRef.current = h;
          }}
          glyph={glyph}
          qrEnabled
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

      {/* Export row */}
      <button
        type="button"
        onClick={saveSnapshot}
        className="w-full py-1.5 text-ui-xs font-mono border border-border-subtle rounded bg-bg-panel hover:bg-bg-hover transition-colors"
      >
        Save crystal snapshot
      </button>

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
