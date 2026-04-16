'use client';

import { useState } from 'react';
import { HelpTooltip } from '@/components/shared/HelpTooltip';

type Support = 'full' | 'partial' | 'none';

interface BoardColumn {
  id: string;
  label: string;
  tier: 1 | 2 | 3;
  bladeType: 'neopixel' | 'baselit' | 'both';
}

const ALL_BOARDS: BoardColumn[] = [
  { id: 'proffieV3', label: 'Proffie V3', tier: 1, bladeType: 'neopixel' },
  { id: 'proffieV2', label: 'Proffie V2', tier: 1, bladeType: 'neopixel' },
  { id: 'cfx', label: 'CFX', tier: 1, bladeType: 'neopixel' },
  { id: 'ghv4', label: 'GH V4', tier: 1, bladeType: 'neopixel' },
  { id: 'ghv3', label: 'GH V3', tier: 1, bladeType: 'neopixel' },
  { id: 'xenoV3', label: 'Xeno V3', tier: 2, bladeType: 'neopixel' },
  { id: 'xenoV2', label: 'Xeno V2', tier: 2, bladeType: 'neopixel' },
  { id: 'verso', label: 'Verso', tier: 2, bladeType: 'neopixel' },
  { id: 'snpixelV4', label: 'SN-Pixel V4', tier: 3, bladeType: 'neopixel' },
  { id: 'asteria', label: 'Asteria', tier: 3, bladeType: 'neopixel' },
  { id: 'lgtBaselit', label: 'LGT Baselit', tier: 3, bladeType: 'baselit' },
  { id: 'sRgb', label: 'S-RGB', tier: 3, bladeType: 'baselit' },
];

type FeatureKey = 'neopixel' | 'baselit' | 'customStyles' | 'editMode' | 'gestureControls' |
  'smoothSwing' | 'oled' | 'multiStrip' | 'subBlades' | 'responsiveEffects' |
  'customTransitions' | 'audioReactive' | 'bluetooth' | 'codeGeneration';

interface FeatureRow {
  feature: string;
  key: FeatureKey;
  data: Record<string, Support>;
}

const FEATURES: FeatureRow[] = [
  {
    feature: 'Neopixel Blade', key: 'neopixel',
    data: { proffieV3: 'full', proffieV2: 'full', cfx: 'full', ghv4: 'full', ghv3: 'full', xenoV3: 'full', xenoV2: 'full', verso: 'full', snpixelV4: 'full', asteria: 'full', lgtBaselit: 'none', sRgb: 'none' },
  },
  {
    feature: 'Baselit / In-Hilt', key: 'baselit',
    data: { proffieV3: 'partial', proffieV2: 'partial', cfx: 'partial', ghv4: 'partial', ghv3: 'partial', xenoV3: 'none', xenoV2: 'none', verso: 'none', snpixelV4: 'none', asteria: 'none', lgtBaselit: 'full', sRgb: 'full' },
  },
  {
    feature: 'Custom Styles', key: 'customStyles',
    data: { proffieV3: 'full', proffieV2: 'full', cfx: 'partial', ghv4: 'partial', ghv3: 'partial', xenoV3: 'partial', xenoV2: 'none', verso: 'none', snpixelV4: 'none', asteria: 'none', lgtBaselit: 'none', sRgb: 'none' },
  },
  {
    feature: 'Edit Mode', key: 'editMode',
    data: { proffieV3: 'full', proffieV2: 'full', cfx: 'none', ghv4: 'none', ghv3: 'none', xenoV3: 'none', xenoV2: 'none', verso: 'none', snpixelV4: 'none', asteria: 'none', lgtBaselit: 'none', sRgb: 'none' },
  },
  {
    feature: 'Gesture Controls', key: 'gestureControls',
    data: { proffieV3: 'full', proffieV2: 'full', cfx: 'partial', ghv4: 'partial', ghv3: 'partial', xenoV3: 'partial', xenoV2: 'partial', verso: 'partial', snpixelV4: 'partial', asteria: 'partial', lgtBaselit: 'none', sRgb: 'none' },
  },
  {
    feature: 'Smooth Swing', key: 'smoothSwing',
    data: { proffieV3: 'full', proffieV2: 'full', cfx: 'full', ghv4: 'full', ghv3: 'full', xenoV3: 'full', xenoV2: 'full', verso: 'full', snpixelV4: 'full', asteria: 'full', lgtBaselit: 'none', sRgb: 'none' },
  },
  {
    feature: 'OLED Display', key: 'oled',
    data: { proffieV3: 'full', proffieV2: 'full', cfx: 'none', ghv4: 'none', ghv3: 'none', xenoV3: 'partial', xenoV2: 'none', verso: 'none', snpixelV4: 'none', asteria: 'none', lgtBaselit: 'none', sRgb: 'none' },
  },
  {
    feature: 'Multi-Strip', key: 'multiStrip',
    data: { proffieV3: 'full', proffieV2: 'partial', cfx: 'none', ghv4: 'none', ghv3: 'none', xenoV3: 'none', xenoV2: 'none', verso: 'none', snpixelV4: 'none', asteria: 'none', lgtBaselit: 'none', sRgb: 'none' },
  },
  {
    feature: 'Sub-Blades', key: 'subBlades',
    data: { proffieV3: 'full', proffieV2: 'full', cfx: 'none', ghv4: 'none', ghv3: 'none', xenoV3: 'none', xenoV2: 'none', verso: 'none', snpixelV4: 'none', asteria: 'none', lgtBaselit: 'none', sRgb: 'none' },
  },
  {
    feature: 'Responsive Effects', key: 'responsiveEffects',
    data: { proffieV3: 'full', proffieV2: 'full', cfx: 'partial', ghv4: 'partial', ghv3: 'partial', xenoV3: 'partial', xenoV2: 'none', verso: 'none', snpixelV4: 'none', asteria: 'none', lgtBaselit: 'none', sRgb: 'none' },
  },
  {
    feature: 'Custom Transitions', key: 'customTransitions',
    data: { proffieV3: 'full', proffieV2: 'full', cfx: 'none', ghv4: 'none', ghv3: 'none', xenoV3: 'none', xenoV2: 'none', verso: 'none', snpixelV4: 'none', asteria: 'none', lgtBaselit: 'none', sRgb: 'none' },
  },
  {
    feature: 'Audio Reactive', key: 'audioReactive',
    data: { proffieV3: 'full', proffieV2: 'full', cfx: 'partial', ghv4: 'partial', ghv3: 'partial', xenoV3: 'partial', xenoV2: 'none', verso: 'none', snpixelV4: 'none', asteria: 'none', lgtBaselit: 'none', sRgb: 'none' },
  },
  {
    feature: 'Bluetooth', key: 'bluetooth',
    data: { proffieV3: 'none', proffieV2: 'none', cfx: 'full', ghv4: 'none', ghv3: 'none', xenoV3: 'full', xenoV2: 'none', verso: 'none', snpixelV4: 'full', asteria: 'none', lgtBaselit: 'none', sRgb: 'none' },
  },
  {
    feature: 'KyberStation Code Gen', key: 'codeGeneration',
    data: { proffieV3: 'full', proffieV2: 'full', cfx: 'partial', ghv4: 'partial', ghv3: 'partial', xenoV3: 'partial', xenoV2: 'partial', verso: 'none', snpixelV4: 'none', asteria: 'none', lgtBaselit: 'none', sRgb: 'none' },
  },
];

const TIER_LABELS: Record<number, string> = { 1: 'Pro', 2: 'Mid', 3: 'Budget' };
const TIER_COLORS: Record<number, string> = {
  1: 'text-accent',
  2: 'text-yellow-400',
  3: 'text-text-muted',
};

function SupportBadge({ support }: { support: Support }) {
  const styles = {
    full: 'bg-green-900/30 text-green-400 border-green-800/30',
    partial: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/30',
    none: 'bg-red-900/20 text-red-400/60 border-red-800/20',
  };
  const labels = { full: '●', partial: '◐', none: '○' };
  const ariaLabels = { full: 'Full support', partial: 'Partial support', none: 'No support' };

  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-ui-sm border ${styles[support]}`}
      aria-label={ariaLabels[support]}
      role="img"
    >
      {labels[support]}
    </span>
  );
}

export function CompatibilityPanel() {
  const [filter, setFilter] = useState<'all' | 'neopixel' | 'baselit'>('all');
  const [tierFilter, setTierFilter] = useState<0 | 1 | 2 | 3>(0); // 0 = all

  const filteredBoards = ALL_BOARDS.filter((b) => {
    if (filter === 'neopixel' && b.bladeType === 'baselit') return false;
    if (filter === 'baselit' && b.bladeType === 'neopixel') return false;
    if (tierFilter !== 0 && b.tier !== tierFilter) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <h3 className="text-ui-sm text-accent uppercase tracking-widest font-semibold flex items-center gap-1">
        Board Compatibility
        <HelpTooltip text="Feature support across lightsaber soundboard platforms. KyberStation generates full native code for Proffieboard, with limited export for CFX, Golden Harvest, and Xenopixel. Budget boards show what KyberStation features apply to your hardware." />
      </h3>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 text-ui-xs">
          <span className="text-text-muted self-center mr-1">Blade:</span>
          {(['all', 'neopixel', 'baselit'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded border transition-colors ${
                filter === f
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'border-border-subtle text-text-muted hover:text-text-secondary'
              }`}
              aria-pressed={filter === f}
            >
              {f === 'all' ? 'All' : f === 'neopixel' ? 'Neopixel' : 'Baselit'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 text-ui-xs">
          <span className="text-text-muted self-center mr-1">Tier:</span>
          {([0, 1, 2, 3] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-2 py-0.5 rounded border transition-colors ${
                tierFilter === t
                  ? 'bg-accent-dim border-accent-border text-accent'
                  : 'border-border-subtle text-text-muted hover:text-text-secondary'
              }`}
              aria-pressed={tierFilter === t}
            >
              {t === 0 ? 'All' : TIER_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-ui-xs" role="table">
          <thead>
            <tr className="border-b border-border-subtle">
              <th scope="col" className="text-left py-1.5 pr-2 text-text-muted font-normal sticky left-0 bg-bg-primary z-10">Feature</th>
              {filteredBoards.map((b) => (
                <th key={b.id} scope="col" className="text-center px-1 py-1.5 text-text-muted font-normal whitespace-nowrap">
                  <div>{b.label}</div>
                  <div className={`text-ui-xs ${TIER_COLORS[b.tier]}`}>{TIER_LABELS[b.tier]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((row) => (
              <tr key={row.key} className="border-b border-border-subtle/50 hover:bg-bg-surface/50">
                <td className="py-1 pr-2 text-text-secondary sticky left-0 bg-bg-primary z-10">{row.feature}</td>
                {filteredBoards.map((b) => (
                  <td key={b.id} className="text-center px-1 py-1">
                    <SupportBadge support={row.data[b.id] ?? 'none'} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4 text-ui-xs text-text-muted">
        <span className="flex items-center gap-1">
          <span className="text-green-400" aria-hidden="true">●</span>
          <span>Full</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="text-yellow-400" aria-hidden="true">◐</span>
          <span>Partial</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="text-red-400/60" aria-hidden="true">○</span>
          <span>None</span>
        </span>
      </div>

      <p className="text-ui-xs text-text-muted">
        KyberStation generates native ProffieOS C++ code with full config.h export. CFX, Golden Harvest, and Xenopixel boards
        get simplified style export. Budget boards (Asteria, SN-Pixel, S-RGB) show which KyberStation features apply
        to your hardware. Baselit boards support color selection only.
      </p>
    </div>
  );
}
