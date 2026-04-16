'use client';
import { useMemo } from 'react';
import { SoundFontPanel } from './SoundFontPanel';
import { TimelinePanel } from './TimelinePanel';
import { ReorderableSections, type SectionDef } from '@/components/shared/ReorderableSections';

export function AudioPanel() {
  const sections: SectionDef[] = useMemo(() => [
    {
      id: 'sound-fonts',
      title: 'Sound Fonts',
      children: <SoundFontPanel />,
    },
    {
      id: 'timeline',
      title: 'Effect Sequencer',
      children: <TimelinePanel />,
    },
  ], []);

  return <ReorderableSections tab="audio" sections={sections} />;
}
