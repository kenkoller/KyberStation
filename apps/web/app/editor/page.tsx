'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { OnboardingFlow, isOnboardingComplete } from '@/components/layout/OnboardingFlow';
import ToastContainer from '@/components/layout/ToastContainer';
import { useSharedConfig } from '@/hooks/useSharedConfig';
import { ALL_PRESETS } from '@kyberstation/presets';
import type { BladeConfig } from '@kyberstation/engine';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore, type ActiveTab } from '@/stores/uiStore';
import { useUserPresetStore } from '@/stores/userPresetStore';
import { useImportBatchHydration } from '@/hooks/useImportBatchHydration';

const SPLASH_SEEN_KEY = 'kyberstation-splash-seen';

// Valid tab identifiers accepted by the `?tab=` URL param. Kept in sync with
// `ActiveTab` in `uiStore.ts`; a runtime guard is used so unknown values are
// ignored instead of corrupting the store.
const VALID_TABS: readonly ActiveTab[] = [
  'gallery',
  'design',
  'audio',
  'output',
] as const;

// OV6 (2026-04-21): Dynamics was absorbed into Design. Any legacy
// `?tab=dynamics` deep-link should land on Design so old bookmarks /
// marketing links keep working.
const TAB_ALIASES: Readonly<Record<string, ActiveTab>> = {
  dynamics: 'design',
};

function isValidTab(v: string): v is ActiveTab {
  return (VALID_TABS as readonly string[]).includes(v);
}

function resolveTab(v: string): ActiveTab | null {
  if (isValidTab(v)) return v;
  return TAB_ALIASES[v] ?? null;
}

/**
 * Editor entry point.
 *
 * Orchestrates the launch sequence:
 *   1. SplashScreen — always shown on first visit, skipped on repeat visits.
 *   2. OnboardingFlow — shown once after the splash, first visit only.
 *   3. AppShell — the main editor UI.
 *   4. ToastContainer — always mounted, renders nothing when there are no toasts.
 */
function EditorPageContent() {
  const { shareError } = useSharedConfig();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Sprint 5E persistence follow-up: hydrate userPresetStore from
  // IndexedDB on mount, then restore the imported-config banner state
  // if a recentImportBatch was persisted from a prior session.
  const hydrateUserPresets = useUserPresetStore((s) => s.hydrate);
  useEffect(() => {
    void hydrateUserPresets();
  }, [hydrateUserPresets]);
  useImportBatchHydration();

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

  // ── Tab query-param handoff (e.g. from landing-page "BROWSE GALLERY" CTA)
  // If the URL carries ?tab=<name> and <name> maps to a valid ActiveTab,
  // switch the editor to that tab on mount. Unknown / absent values are
  // ignored (no crash, keeps default). The param is stripped so a refresh
  // doesn't override tab changes the user subsequently makes.
  //
  // Coexists with `?s=<glyph>` / `?config=<base64>` (handled by
  // useSharedConfig) and `?preset=<id>` above — we only touch the `tab`
  // key, preserving everything else through the stripping step.
  useEffect(() => {
    const rawTab = searchParams.get('tab');
    if (!rawTab) return;
    const normalized = rawTab.toLowerCase();
    // W7 (2026-04-22): `?tab=gallery` used to flip the editor's inner
    // tab bar. Gallery is now a top-level route (/gallery), so legacy
    // deep-links redirect there instead of nudging the editor into a
    // tab that no longer exists.
    if (normalized === 'gallery') {
      router.replace('/gallery', { scroll: false });
      return;
    }
    const resolved = resolveTab(normalized);
    if (resolved) {
      useUIStore.getState().setActiveTab(resolved);
    }
    // Strip the param whether valid or not — prevents stale values from
    // re-firing on refresh. Read from `window.location.search` rather than
    // the (possibly stale) `searchParams` snapshot so we don't clobber
    // writes made by other effects that already ran this cycle (e.g.
    // `useSharedConfig` stripping `?s=<glyph>` via `history.replaceState`).
    const live = new URLSearchParams(window.location.search);
    live.delete('tab');
    const query = live.toString();
    router.replace(query ? `/editor?${query}` : '/editor', { scroll: false });
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

export default function EditorPage() {
  return (
    <Suspense fallback={null}>
      <EditorPageContent />
    </Suspense>
  );
}
