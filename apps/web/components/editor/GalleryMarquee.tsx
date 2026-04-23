'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import type { BladeConfig } from '@kyberstation/engine';
import type {
  Preset,
  Era,
  Affiliation,
} from '@kyberstation/presets';
import {
  ALL_PRESETS,
  LEGENDS_PRESETS,
  CREATIVE_COMMUNITY_PRESETS,
} from '@kyberstation/presets';
import { useBladeStore } from '@/stores/bladeStore';
import { useUIStore } from '@/stores/uiStore';
import { useUserPresetStore, type UserPreset } from '@/stores/userPresetStore';
import { playUISound } from '@/lib/uiSounds';
import {
  MarqueeCard,
  MarqueeRow,
  spreadByHue,
  type MarqueeCardPreset,
} from '@/components/shared/SaberMarqueeArray';
import { NewSaberCard } from './NewSaberCard';
import { SurpriseMeCard } from './SurpriseMeCard';
import { SaberWizard } from '@/components/onboarding/SaberWizard';
import { useSurpriseMe } from './Randomizer';
import { CommunityGallery } from './CommunityGallery';

// ─── Gallery Marquee — edge-to-edge preset gallery ──────────────────────
//
// Main body of the Gallery tab per UI Overhaul v2 proposal §5. Replaces
// the grid-of-cards body in PresetGallery.tsx with a marquee shape
// matching the landing page's LandingSaberArray:
//
//   - Filter chip rail at top (~48px): source / era / faction.
//   - NEW SABER card (guided-build wizard launcher) — first.
//   - SURPRISE ME card (random archetype + style + color) — second.
//   - Zip-hue-spread marquee rows of preset cards beneath.
//
// Reuses the shared `<MarqueeCard>` + `<MarqueeRow>` primitives from
// SaberMarqueeArray so rendering is 1:1 with landing behavior: hover
// ignites the blade's live engine tick, click loads the preset into
// bladeStore and auto-switches to the Design tab.
//
// The community gallery is a separate data source (remote JSON cached
// in localStorage); when COMMUNITY is selected we just delegate to the
// existing `<CommunityGallery>` component so we don't duplicate the
// fetch / cache / error-state logic.

// ─── Filter types ───

type SourceFilter = 'all' | 'canonical' | 'creative' | 'my-presets' | 'community';
type EraFilter = Era | 'legends' | null;
type FactionFilter = Affiliation | null;

interface SourceOption {
  id: SourceFilter;
  label: string;
}

interface EraOption {
  id: Era | 'legends';
  label: string;
}

interface FactionOption {
  id: Affiliation;
  label: string;
}

const SOURCE_OPTIONS: SourceOption[] = [
  { id: 'all', label: 'ALL' },
  { id: 'canonical', label: 'CANONICAL' },
  { id: 'creative', label: 'CREATIVE' },
  { id: 'my-presets', label: 'MY PRESETS' },
  { id: 'community', label: 'COMMUNITY' },
];

const ERA_OPTIONS: EraOption[] = [
  { id: 'prequel', label: 'PREQUEL' },
  { id: 'original-trilogy', label: 'OT' },
  { id: 'sequel', label: 'SEQUEL' },
  { id: 'animated', label: 'ANIMATED' },
  { id: 'legends', label: 'LEGENDS' },
];

const FACTION_OPTIONS: FactionOption[] = [
  { id: 'jedi', label: 'JEDI' },
  { id: 'sith', label: 'SITH' },
  { id: 'neutral', label: 'GREY' },
  { id: 'other', label: 'OTHER' },
];

// Top-row / bottom-row marquee durations. Landing page uses 280/340 for
// the premium-slow "showcase" feel; gallery matches for consistency.
const TOP_ROW_DURATION_S = 280;
const BOTTOM_ROW_DURATION_S = 340;

/**
 * Head cards (NEW SABER + SURPRISE ME) always live on the top row, so
 * that row has 2 fewer preset cards than the bottom. We account for
 * this in the split so both rows feel visually balanced.
 */

export function GalleryMarquee() {
  const loadPreset = useBladeStore((s) => s.loadPreset);
  const setActiveTab = useUIStore((s) => s.setActiveTab);

  // User-preset hydration — cheap no-op when already hydrated.
  const hydrateUserPresets = useUserPresetStore((s) => s.hydrate);
  useEffect(() => {
    hydrateUserPresets();
  }, [hydrateUserPresets]);

  const userPresets = useUserPresetStore((s) => s.presets);

  // ─── Filter state ───

  const [source, setSource] = useState<SourceFilter>('all');
  const [era, setEra] = useState<EraFilter>(null);
  const [faction, setFaction] = useState<FactionFilter>(null);

  // ─── Wizard modal ───

  const [wizardOpen, setWizardOpen] = useState(false);
  const handleOpenWizard = useCallback(() => {
    playUISound('button-click');
    setWizardOpen(true);
  }, []);
  const handleCloseWizard = useCallback(() => setWizardOpen(false), []);

  // ─── Surprise-me ───

  const { surprise } = useSurpriseMe();
  const handleSurpriseMe = useCallback(() => {
    playUISound('button-click');
    surprise();
    setActiveTab('design');
  }, [surprise, setActiveTab]);

  // ─── Preset click ───

  const handlePresetClick = useCallback(
    (config: BladeConfig) => {
      playUISound('preset-loaded');
      loadPreset(config);
      setActiveTab('design');
    },
    [loadPreset, setActiveTab],
  );

  // ─── Filtered preset list ───
  //
  // When source is COMMUNITY we delegate to <CommunityGallery> and skip
  // this pipeline entirely. MY PRESETS reads from userPresetStore.
  // All other sources filter ALL_PRESETS by the era + faction chips.

  const filteredPresets = useMemo((): Preset[] => {
    if (source === 'community' || source === 'my-presets') return [];

    let result: Preset[] = ALL_PRESETS;

    // Source (canonical vs creative). 'all' keeps everything, but still
    // drops legends unless the LEGENDS era chip is explicitly selected.
    if (source === 'canonical') {
      result = result.filter((p) => p.screenAccurate === true);
    } else if (source === 'creative') {
      result = result.filter(
        (p) => !p.screenAccurate || CREATIVE_COMMUNITY_PRESETS.some((c) => c.id === p.id),
      );
    } else {
      // source === 'all'
      // Legends are spoilery / deep-cut; only include them when the
      // LEGENDS era chip is active.
      if (era !== 'legends') {
        result = result.filter((p) => !LEGENDS_PRESETS.some((l) => l.id === p.id));
      }
    }

    // Era chip
    if (era && era !== 'legends') {
      result = result.filter((p) => p.era === era);
    } else if (era === 'legends') {
      result = LEGENDS_PRESETS.filter((p) => {
        // Still apply source filter to legends
        if (source === 'canonical') return p.screenAccurate === true;
        if (source === 'creative') return !p.screenAccurate;
        return true;
      });
    }

    // Faction chip
    if (faction) {
      result = result.filter((p) => p.affiliation === faction);
    }

    return result;
  }, [source, era, faction]);

  const filteredUserPresets = useMemo((): UserPreset[] => {
    if (source !== 'my-presets') return [];
    return userPresets;
  }, [source, userPresets]);

  // ─── Split presets into top + bottom rows with hue-spread ───
  //
  // Top row carries the NEW SABER + SURPRISE ME head cards, so it gets
  // slightly fewer preset cards than the bottom. We spread each row
  // independently so adjacent cards within a row rarely share a color.

  const { topPresets, bottomPresets } = useMemo(() => {
    if (source === 'my-presets') {
      const items = filteredUserPresets.map((up) => ({
        label: up.name,
        subtitle: describeUserPreset(up),
        config: up.config,
      }));
      const spread = spreadByHue(items);
      const half = Math.ceil(spread.length / 2);
      return { topPresets: spread.slice(0, half), bottomPresets: spread.slice(half) };
    }

    const items: GalleryMarqueeItem[] = filteredPresets.map((p) => ({
      label: p.name,
      subtitle: p.character,
      config: p.config as BladeConfig,
    }));
    const spread = spreadByHue(items);
    const half = Math.ceil(spread.length / 2);
    return { topPresets: spread.slice(0, half), bottomPresets: spread.slice(half) };
  }, [filteredPresets, filteredUserPresets, source]);

  // ─── Render ───

  return (
    <div className="relative w-full" data-gallery-marquee>
      {/* Filter rail */}
      <FilterRail
        source={source}
        setSource={setSource}
        era={era}
        setEra={setEra}
        faction={faction}
        setFaction={setFaction}
      />

      {/* Body */}
      {source === 'community' ? (
        // Community gallery has its own full-featured body — async fetch,
        // error states, tag filter. Delegate to the existing component
        // rather than trying to reshape it into the marquee format.
        <div className="max-w-6xl mx-auto px-4 py-6">
          <CommunityGallery />
        </div>
      ) : topPresets.length === 0 && bottomPresets.length === 0 && source !== 'my-presets' ? (
        <EmptyState
          title="No presets match these filters."
          hint="Try clearing the era or faction chip, or switch the source back to ALL."
        />
      ) : topPresets.length === 0 && bottomPresets.length === 0 && source === 'my-presets' ? (
        <EmptyState
          title="You haven't saved any presets yet."
          hint="Build a saber in the Design tab, then use Save Current to create your first one."
        />
      ) : (
        <>
          <TopRow
            presets={topPresets}
            durationS={TOP_ROW_DURATION_S}
            onOpenWizard={handleOpenWizard}
            onSurpriseMe={handleSurpriseMe}
            onPresetClick={handlePresetClick}
          />
          <div className="h-6" aria-hidden="true" />
          <BottomRow
            presets={bottomPresets}
            durationS={BOTTOM_ROW_DURATION_S}
            onPresetClick={handlePresetClick}
          />
        </>
      )}

      {/* Saber wizard modal */}
      <SaberWizard open={wizardOpen} onClose={handleCloseWizard} />
    </div>
  );
}

// ─── Filter rail ───

interface FilterRailProps {
  source: SourceFilter;
  setSource: (s: SourceFilter) => void;
  era: EraFilter;
  setEra: (e: EraFilter) => void;
  faction: FactionFilter;
  setFaction: (f: FactionFilter) => void;
}

function FilterRail({
  source,
  setSource,
  era,
  setEra,
  faction,
  setFaction,
}: FilterRailProps) {
  return (
    <div
      className="sticky top-0 z-10 w-full overflow-x-auto backdrop-blur-sm border-b border-border-subtle"
      style={{
        background: 'rgba(var(--bg-deep), 0.85)',
        paddingTop: '10px',
        paddingBottom: '10px',
      }}
    >
      <div className="flex items-center gap-2 px-4 min-w-max">
        {/* Source chips */}
        {SOURCE_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.id}
            label={opt.label}
            active={source === opt.id}
            onClick={() => {
              playUISound('tab-switch');
              setSource(opt.id);
              // Clear era + faction on source change for a clean sweep
              setEra(null);
              setFaction(null);
            }}
          />
        ))}

        <FilterDivider />

        {/* Era chips */}
        {ERA_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.id}
            label={opt.label}
            active={era === opt.id}
            onClick={() => {
              playUISound('tab-switch');
              setEra(era === opt.id ? null : opt.id);
            }}
          />
        ))}

        <FilterDivider />

        {/* Faction chips */}
        {FACTION_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.id}
            label={opt.label}
            active={faction === opt.id}
            onClick={() => {
              playUISound('tab-switch');
              setFaction(faction === opt.id ? null : opt.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded text-ui-xs font-semibold font-mono tracking-[0.1em] uppercase transition-colors border whitespace-nowrap ${
        active
          ? 'bg-accent-dim border-accent-border text-accent'
          : 'bg-bg-primary border-border-subtle text-text-muted hover:text-text-secondary hover:border-border-light'
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function FilterDivider() {
  return (
    <span
      aria-hidden="true"
      className="mx-1 h-5 w-px bg-border-subtle shrink-0"
    />
  );
}

// ─── Empty state ───

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="max-w-xl mx-auto text-center px-4 py-24">
      <div
        aria-hidden="true"
        className="text-text-muted text-6xl mb-4 opacity-40 select-none"
      >
        ∅
      </div>
      <div className="font-cinematic text-ui-lg font-semibold text-text-primary mb-2 tracking-[0.06em]">
        {title}
      </div>
      <div className="text-ui-sm text-text-muted font-mono">{hint}</div>
    </div>
  );
}

// ─── Top row ───

interface GalleryMarqueeItem extends MarqueeCardPreset {}

interface TopRowProps {
  presets: GalleryMarqueeItem[];
  durationS: number;
  onOpenWizard: () => void;
  onSurpriseMe: () => void;
  onPresetClick: (config: BladeConfig) => void;
}

function TopRow({
  presets,
  durationS,
  onOpenWizard,
  onSurpriseMe,
  onPresetClick,
}: TopRowProps) {
  // Head cards + preset cards. We duplicate only the preset cards so the
  // marquee's translateX(-50%) loop is seamless; the head cards stay
  // single-copy at the head of each half (they always scroll on from
  // the left edge). This matches LandingSaberArray's doubling pattern.
  const doubled = [...presets, ...presets];
  return (
    <MarqueeRow direction="left" durationS={durationS}>
      <NewSaberCard onClick={onOpenWizard} cardKey="head-new-saber-0" />
      <SurpriseMeCard onClick={onSurpriseMe} cardKey="head-surprise-me-0" />
      {doubled.map((preset, i) => {
        const key = `top-${preset.label}-${i}`;
        return (
          <MarqueeCard
            key={key}
            cardKey={key}
            preset={preset}
            variant={{ kind: 'button', onClick: () => onPresetClick(preset.config) }}
            ariaLabelPrefix="Load"
          />
        );
      })}
      {/* Second copy of head cards after the doubled preset block so the
          seamless loop still presents NEW SABER + SURPRISE ME twice per
          full revolution (matching the preset-doubling pattern) */}
      <NewSaberCard onClick={onOpenWizard} cardKey="head-new-saber-1" />
      <SurpriseMeCard onClick={onSurpriseMe} cardKey="head-surprise-me-1" />
    </MarqueeRow>
  );
}

// ─── Bottom row ───

interface BottomRowProps {
  presets: GalleryMarqueeItem[];
  durationS: number;
  onPresetClick: (config: BladeConfig) => void;
}

function BottomRow({ presets, durationS, onPresetClick }: BottomRowProps) {
  const doubled = [...presets, ...presets];
  return (
    <MarqueeRow direction="right" durationS={durationS}>
      {doubled.map((preset, i) => {
        const key = `bottom-${preset.label}-${i}`;
        return (
          <MarqueeCard
            key={key}
            cardKey={key}
            preset={preset}
            variant={{ kind: 'button', onClick: () => onPresetClick(preset.config) }}
            ariaLabelPrefix="Load"
          />
        );
      })}
    </MarqueeRow>
  );
}

// ─── Helpers ───

function describeUserPreset(up: UserPreset): string {
  if (up.description) return up.description;
  const parts: string[] = [];
  if (up.tags.length > 0) parts.push(up.tags.slice(0, 3).join(' · '));
  if (up.config.style) parts.push(String(up.config.style));
  return parts.length > 0 ? parts.join(' · ') : 'Custom preset';
}
