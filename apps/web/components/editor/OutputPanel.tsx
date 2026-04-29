'use client';
import { useMemo } from 'react';
import { CodeOutput } from './CodeOutput';
import { CardWriter } from './CardWriter';
import { OLEDPreview } from './OLEDPreview';
import { PresetListPanel } from './PresetListPanel';
import { ConfigSummary } from './output/ConfigSummary';
// SaberProfileManager moved to MySaberPanel under SETUP/My Saber as part of
// the 2026-04-27 sidebar IA reorganization (docs/SIDEBAR_IA_AUDIT_2026-04-27.md §7).
import { ReorderableSections, type SectionDef } from '@/components/shared/ReorderableSections';

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
      children: <ConfigSummary />,
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
