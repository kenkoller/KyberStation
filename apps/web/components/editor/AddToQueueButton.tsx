'use client';

import { useCallback, useState } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { addToQueueWithToast } from '@/lib/addToQueue';

/**
 * AddToQueueButton -- one-click action bar button that snapshots the
 * current blade config and adds it to the active saber profile's card
 * queue. Shows brief "Added!" feedback after a successful add.
 */
export function AddToQueueButton() {
  const [showAdded, setShowAdded] = useState(false);
  const config = useBladeStore((s) => s.config);

  const handleClick = useCallback(() => {
    const result = addToQueueWithToast(config);
    if (result.success) {
      setShowAdded(true);
      setTimeout(() => setShowAdded(false), 1000);
    }
  }, [config]);

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-ui-xs font-mono uppercase tracking-wider transition-all border ${
        showAdded
          ? 'bg-green-900/30 border-green-700/50 text-green-400'
          : 'border-accent-border/50 text-accent bg-accent-dim/20 hover:border-accent hover:bg-accent-dim/40'
      }`}
      title="Add current design to card queue"
      aria-label="Add current design to card queue"
    >
      <span aria-hidden="true">{showAdded ? '✓' : '⊕'}</span>
      <span>{showAdded ? 'Added' : 'Queue'}</span>
    </button>
  );
}
