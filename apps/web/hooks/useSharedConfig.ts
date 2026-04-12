'use client';
import { useEffect, useState } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { decodeConfig } from '@/lib/configUrl';

export function useSharedConfig() {
  const loadPreset = useBladeStore((s) => s.loadPreset);
  const [shareError, setShareError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
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
