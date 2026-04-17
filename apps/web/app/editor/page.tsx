'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { OnboardingFlow, isOnboardingComplete } from '@/components/layout/OnboardingFlow';
import ToastContainer from '@/components/layout/ToastContainer';
import { useSharedConfig } from '@/hooks/useSharedConfig';
import { ALL_PRESETS } from '@kyberstation/presets';
import type { BladeConfig } from '@kyberstation/engine';
import { useBladeStore } from '@/stores/bladeStore';

const SPLASH_SEEN_KEY = 'kyberstation-splash-seen';

/**
 * Editor entry point.
 *
 * Orchestrates the launch sequence:
 *   1. SplashScreen — always shown on first visit, skipped on repeat visits.
 *   2. OnboardingFlow — shown once after the splash, first visit only.
 *   3. AppShell — the main editor UI.
 *   4. ToastContainer — always mounted, renders nothing when there are no toasts.
 */
export default function EditorPage() {
  const { shareError } = useSharedConfig();
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── Preset query-param handoff (e.g. from /m "Edit →" link) ───────────────
  // If the URL carries ?preset=<id>, look it up in ALL_PRESETS and load it
  // into the store. Then strip the param so refreshing doesn't keep
  // overriding whatever the user subsequently edits. Runs once on mount.
  useEffect(() => {
    const presetId = searchParams.get('preset');
    if (!presetId) return;
    const preset = ALL_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      useBladeStore.getState().loadPreset(preset.config as BladeConfig);
    }
    // Strip the param regardless — stale ids shouldn't poison future loads.
    const next = new URLSearchParams(searchParams.toString());
    next.delete('preset');
    const query = next.toString();
    router.replace(query ? `/editor?${query}` : '/editor', { scroll: false });
    // searchParams is a stable reference in app router; safe to depend on.
  }, [searchParams, router]);

  // ── Splash ──────────────────────────────────────────────────────────────────
  // splashDone: true once the animation has finished (or was skipped).
  // showSplash: null until localStorage is read (avoids hydration flicker).
  const [splashDone, setSplashDone] = useState(false);
  const [showSplash, setShowSplash] = useState<boolean | null>(null);

  // ── Onboarding ───────────────────────────────────────────────────────────────
  const [onboardingNeeded, setOnboardingNeeded] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  // Read localStorage once on client mount
  useEffect(() => {
    const seen = localStorage.getItem(SPLASH_SEEN_KEY) === 'true';
    const needsOnboarding = !isOnboardingComplete();

    setOnboardingNeeded(needsOnboarding);

    if (seen) {
      // Returning user — skip splash entirely
      setShowSplash(false);
      setSplashDone(true);
    } else {
      // First visit — show splash, mark as seen for future visits
      setShowSplash(true);
      localStorage.setItem(SPLASH_SEEN_KEY, 'true');
    }
  }, []);

  const handleSplashComplete = () => setSplashDone(true);
  const handleOnboardingComplete = () => setOnboardingDone(true);

  // App is ready when splash is done AND (no onboarding needed, or onboarding is done)
  const appReady = splashDone && (!onboardingNeeded || onboardingDone);

  // During SSR / before localStorage is read, render nothing to avoid flash
  if (showSplash === null) return null;

  return (
    <>
      {/* ── Splash screen (first visit only) ── */}
      {showSplash && !splashDone && (
        <SplashScreen
          version="0.3.0-alpha"
          onComplete={handleSplashComplete}
        />
      )}

      {/* ── First-run onboarding (shown after splash, first visit only) ── */}
      {splashDone && onboardingNeeded && !onboardingDone && (
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      )}

      {/* ── Main editor shell ── */}
      {appReady && (
        <>
          {shareError && (
            <div
              className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-md text-ui-xs font-mono shadow-lg border"
              style={{
                background: 'rgb(var(--status-error) / 0.2)',
                borderColor: 'rgb(var(--status-error) / 0.5)',
                color: 'rgb(var(--status-error))',
              }}
            >
              {shareError}
            </div>
          )}
          <AppShell />
        </>
      )}

      {/* ── Toast notifications (always mounted) ── */}
      <ToastContainer />
    </>
  );
}
