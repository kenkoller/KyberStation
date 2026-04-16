'use client';

import { useCallback, useState } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { encodeConfig, buildShareUrl } from '@/lib/configUrl';
import { playUISound } from '@/lib/uiSounds';

/**
 * ShareButton — generates a Kyber Code (shareable URL) for the current blade
 * configuration, copies it to the clipboard, and briefly shows a confirmation.
 *
 * Lives in the header bar. Reads config from bladeStore directly — no props needed.
 */
export function ShareButton() {
  const config = useBladeStore((s) => s.config);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const handleShare = useCallback(async () => {
    try {
      const encoded = await encodeConfig(config);
      const url = buildShareUrl(encoded);
      await navigator.clipboard.writeText(url);
      playUISound('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  }, [config]);

  return (
    <button
      onClick={handleShare}
      title="Share Kyber Code — copies a shareable URL for this blade configuration"
      aria-label="Share Kyber Code"
      className={[
        'flex items-center gap-1 px-2 py-1 rounded text-ui-xs font-medium border transition-colors',
        copied
          ? 'border-accent-border/60 text-accent bg-accent-dim/40'
          : error
            ? 'border-red-700/50 text-red-400 bg-red-900/20'
            : 'border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light',
      ].join(' ')}
    >
      {copied ? (
        <>
          <span aria-hidden="true">✓</span>
          <span>Copied!</span>
        </>
      ) : error ? (
        <>
          <span aria-hidden="true">✕</span>
          <span>Failed</span>
        </>
      ) : (
        <>
          {/* Link / share icon (SVG, no external dependency) */}
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0"
          >
            <circle cx="13" cy="3" r="2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="13" cy="13" r="2" stroke="currentColor" strokeWidth="1.5" />
            <line x1="4.9" y1="7.1" x2="11.1" y2="4.0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="4.9" y1="8.9" x2="11.1" y2="12.0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>Kyber Code</span>
        </>
      )}
    </button>
  );
}
