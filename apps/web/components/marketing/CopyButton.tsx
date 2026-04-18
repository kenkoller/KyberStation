'use client';

import { useCallback, useState } from 'react';

export interface CopyButtonProps {
  /** Returns the current text to copy. Called each time the button is clicked. */
  getText: () => string;
  /** Label when idle. Default: 'COPY'. */
  label?: string;
  /** Label when copied. Default: '✓ COPIED'. */
  copiedLabel?: string;
  /** How long to show the copied state, in ms. Default: 1400. */
  resetDelay?: number;
  className?: string;
}

/**
 * Small dot-matrix-styled copy button for inline code blocks and
 * anywhere else we want the "click to copy" affordance without
 * pulling in a toast system. Isolated as its own client component
 * so its parent can stay server-rendered.
 */
export function CopyButton({
  getText,
  label = 'COPY',
  copiedLabel = '\u2713 COPIED',
  resetDelay = 1400,
  className = '',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(() => {
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    if (!nav?.clipboard) return;
    void nav.clipboard.writeText(getText()).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), resetDelay);
    });
  }, [getText, resetDelay]);

  return (
    <button
      type="button"
      onClick={onCopy}
      className={`dot-matrix tabular-nums transition-colors ${className}`}
      style={{
        color: copied
          ? 'rgb(var(--status-ok))'
          : 'rgb(var(--accent) / 0.75)',
      }}
      aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
