'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  type PerformanceTier,
  getPerformanceTier,
  setPerformanceTier,
  applyPerformanceTier,
} from '../lib/performanceTier';

/**
 * Hook for managing the visual performance tier.
 *
 * On mount, detects or loads the user's tier preference and applies the
 * corresponding CSS class to <html>. Returns the current tier and a setter.
 *
 * Usage:
 *   const { tier, isAutoDetected, setTier } = usePerformanceTier();
 */
export function usePerformanceTier() {
  const [tier, setTierState] = useState<PerformanceTier>('medium');
  const [isAutoDetected, setIsAutoDetected] = useState(true);

  useEffect(() => {
    const result = getPerformanceTier();
    setTierState(result.tier);
    setIsAutoDetected(result.isAutoDetected);
    applyPerformanceTier(result.tier);
  }, []);

  const setTier = useCallback((newTier: PerformanceTier | null) => {
    if (newTier === null) {
      // Revert to auto-detection
      setPerformanceTier(null);
      const result = getPerformanceTier();
      setTierState(result.tier);
      setIsAutoDetected(true);
      applyPerformanceTier(result.tier);
    } else {
      setPerformanceTier(newTier);
      setTierState(newTier);
      setIsAutoDetected(false);
      applyPerformanceTier(newTier);
    }
  }, []);

  return { tier, isAutoDetected, setTier };
}
