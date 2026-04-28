'use client';
import { useMemo } from 'react';
import { useBladeStore } from '@/stores/bladeStore';
import { CodeOutput } from './CodeOutput';
import { CardWriter } from './CardWriter';
import { OLEDPreview } from './OLEDPreview';
import { PresetListPanel } from './PresetListPanel';
// SaberProfileManager moved to MySaberPanel under SETUP/My Saber as part of
// the 2026-04-27 sidebar IA reorganization (docs/SIDEBAR_IA_AUDIT_2026-04-27.md §7).
import { ReorderableSections, type SectionDef } from '@/components/shared/ReorderableSections';

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

function ExportSummary() {
  const config = useBladeStore((s) => s.config);
  const topology = useBladeStore((s) => s.topology);

  const baseHex = rgbToHex(config.baseColor.r, config.baseColor.g, config.baseColor.b);
  const clashHex = rgbToHex(config.clashColor.r, config.clashColor.g, config.clashColor.b);

  return (
    <div className="bg-bg-surface rounded-panel border border-border-subtle p-3">
      <h4 className="text-ui-sm text-accent uppercase tracking-widest font-semibold mb-2">
        Configuration Summary
      </h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-ui-sm">
        <div className="flex justify-between">
          <span className="text-text-muted">Style</span>
          <span className="text-text-secondary font-medium">{config.style}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Topology</span>
          <span className="text-text-secondary font-medium">{topology.presetId}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-muted">Base Color</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: baseHex }} />
            <span className="text-text-secondary font-mono">{baseHex}</span>
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-muted">Clash Color</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: clashHex }} />
            <span className="text-text-secondary font-mono">{clashHex}</span>
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Ignition</span>
          <span className="text-text-secondary">{config.ignition} ({config.ignitionMs}ms)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Retraction</span>
          <span className="text-text-secondary">{config.retraction} ({config.retractionMs}ms)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">LEDs</span>
          <span className="text-text-secondary tabular-nums">{config.ledCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Board</span>
          <span className="text-text-secondary">ProffieOS 7.x</span>
        </div>
      </div>
    </div>
  );
}

export function OutputPanel() {
  const sections: SectionDef[] = useMemo(() => [
    {
      id: 'preset-list',
      title: 'Preset List',
      children: <PresetListPanel />,
    },
    {
      id: 'config-summary',
      title: 'Configuration Summary',
      children: <ExportSummary />,
    },
    {
      id: 'generated-code',
      title: 'Generated Code',
      children: <CodeOutput />,
    },
    {
      id: 'export-card',
      title: 'Export to Card',
      children: <CardWriter />,
    },
    {
      id: 'oled-preview',
      title: 'OLED Preview',
      defaultOpen: false,
      children: <OLEDPreview />,
    },
  ], []);

  return <ReorderableSections tab="output" sections={sections} />;
}
