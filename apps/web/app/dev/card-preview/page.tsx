'use client';
// Dev-only preview for Saber Card — deleted before commit.
import { useBladeStore } from '@/stores/bladeStore';
import { useMemo, useState, useEffect } from 'react';
import { encodeGlyphFromConfig } from '@/lib/sharePack/kyberGlyph';
import { renderCardSnapshot, LAYOUT_CATALOG } from '@/lib/sharePack/cardSnapshot';
import type { CardLayout } from '@/lib/sharePack/card/cardTypes';

function useCardPreview(glyph: string, presetName: string, layout: CardLayout) {
  const config = useBladeStore((s) => s.config);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const blob = await renderCardSnapshot({ config, glyph, presetName, layout });
      if (cancelled) return;
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    })();
    return () => { cancelled = true; };
  }, [config, glyph, presetName, layout]);
  return url;
}

export default function DevCardPreview() {
  const config = useBladeStore((s) => s.config);
  const glyph = useMemo(() => { try { return encodeGlyphFromConfig(config); } catch { return 'SPC.ERR'; } }, [config]);
  const h = useCardPreview(glyph, config.name ?? 'Untitled', LAYOUT_CATALOG.default);
  const v = useCardPreview(glyph, config.name ?? 'Untitled', LAYOUT_CATALOG.vertical);
  return (
    <main className="min-h-screen p-6 flex flex-col gap-6" style={{ background: 'rgb(var(--bg-deep))', color: 'rgb(var(--text-primary))' }}>
      <h1 className="text-ui-xl uppercase tracking-wider">Saber Card — Polish Verification</h1>
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1600px]">
        <div><h2 className="text-ui-md mb-2" style={{ color: 'rgb(var(--accent))' }}>Horizontal (1200×675)</h2>
          {h ? <img data-testid="card-horizontal" src={h} alt="h" style={{ width: '100%', border: '1px solid var(--border-subtle)' }} /> : <div>rendering…</div>}
        </div>
        <div><h2 className="text-ui-md mb-2" style={{ color: 'rgb(var(--accent))' }}>Vertical (675×1200)</h2>
          {v ? <img data-testid="card-vertical" src={v} alt="v" style={{ width: '100%', border: '1px solid var(--border-subtle)' }} /> : <div>rendering…</div>}
        </div>
      </section>
    </main>
  );
}
