'use client';
import { useEffect, useState } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { decodeConfig } from '@/lib/configUrl';
import {
  decodeGlyph,
  KyberGlyphVersionError,
} from '@/lib/sharePack/kyberGlyph';
import { toast } from '@/lib/toastManager';

export function useSharedConfig() {
  const loadPreset = useBladeStore((s) => s.loadPreset);
  const [shareError, setShareError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // ── Kyber Glyph handler (`?s=<glyph>`) takes precedence ──
    const params = new URLSearchParams(window.location.search);
    const glyphParam = params.get('s');
    if (glyphParam && glyphParam.length > 0) {
      try {
        const payload = decodeGlyph(glyphParam);
        const blade = payload.blades[0];
        if (blade) {
          loadPreset(blade);
          setLoaded(true);
          // Friendly notification with the archetype prefix + first 8 chars
          const shortForm = glyphParam.length <= 16
            ? glyphParam
            : `${glyphParam.slice(0, glyphParam.indexOf('.') + 1)}${glyphParam.slice(glyphParam.indexOf('.') + 1, glyphParam.indexOf('.') + 9)}…`;
          toast.success(`Loaded crystal: ${shortForm}`);
        }
        // Strip `?s=` from URL so reload doesn't re-trigger
        params.delete('s');
        const remaining = params.toString();
        const url = remaining.length > 0
          ? `${window.location.pathname}?${remaining}${window.location.hash}`
          : `${window.location.pathname}${window.location.hash}`;
        window.history.replaceState(null, '', url);
        return;
      } catch (err) {
        if (err instanceof KyberGlyphVersionError) {
          toast.error(
            `Couldn't decode this crystal — it may be from a newer version of KyberStation`,
          );
        } else {
          toast.error(`Couldn't decode this crystal — the glyph is malformed`);
        }
        setShareError(err instanceof Error ? err.message : 'Invalid crystal glyph');
        // Fall through — try legacy handlers below
      }
    }

    // ── Legacy `#<base64>` handler (deprecated, kept for one release) ──
    const hash = window.location.hash.slice(1);
    if (!hash || hash.length < 10) return;

    decodeConfig(hash)
      .then((config) => {
        loadPreset(config);
        setLoaded(true);
        // Clear hash from URL without page reload
        window.history.replaceState(null, '', window.location.pathname);
      })
      .catch((err) => {
        setShareError(err instanceof Error ? err.message : 'Invalid share link');
      });
  }, [loadPreset]);

  return { shareError, loaded };
}
