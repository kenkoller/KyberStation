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
          // Friendly notification: prefer the encoded publicName, fall
          // back to the first blade's name, then to a generic 'crystal'.
          const label = payload.publicName ?? blade.name ?? 'crystal';
          toast.success(`Loaded ${label}`);
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

    // ── Legacy `#<base64>` handler ──
    //
    // Decode-only: the editor used to emit `${origin}/editor#<base64>`
    // share links via the now-removed `encodeConfig` + `buildShareUrl`.
    // This branch keeps decoding alive so old URLs in the wild (Twitter
    // shares, bookmarks, embedded links) still load. New share emission
    // uses Kyber Glyph (`?s=<glyph>`) — see the modern handler above and
    // `apps/web/lib/sharePack/kyberGlyph.ts`.
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
