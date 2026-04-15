'use client';
import { useMemo, useState } from 'react';
import { EffectPanel } from './EffectPanel';
import { MotionSimPanel } from './MotionSimPanel';
import { ComparisonView } from './ComparisonView';
import { HelpTooltip } from '@/components/shared/HelpTooltip';
import { ReorderableSections, type SectionDef } from '@/components/shared/ReorderableSections';

function ABComparisonWrapper() {
  const [showComparison, setShowComparison] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setShowComparison(!showComparison)}
          aria-expanded={showComparison}
          aria-label={`${showComparison ? 'Hide' : 'Show'} A/B comparison view`}
          className={`text-ui-xs px-2 py-0.5 rounded border transition-colors ${
            showComparison
              ? 'border-accent-border text-accent bg-accent-dim'
              : 'border-border-subtle text-text-muted hover:text-text-secondary'
          }`}
        >
          {showComparison ? 'Hide' : 'Show'}
        </button>
      </div>
      {showComparison && <ComparisonView />}
    </div>
  );
}

export function DynamicsPanel() {
  const sections: SectionDef[] = useMemo(() => [
    {
      id: 'effects-ignition',
      title: 'Effects & Ignition',
      tooltip: <HelpTooltip text="Configure how the blade ignites, retracts, and responds to combat events. Set timing, animation styles, and easing curves." />,
      children: <EffectPanel />,
    },
    {
      id: 'motion-simulation',
      title: 'Motion Simulation',
      tooltip: <HelpTooltip text="Simulate gyroscope data — swing speed, blade angle, and twist — to preview motion-reactive blade styles without holding a physical saber." />,
      children: <MotionSimPanel />,
    },
    {
      id: 'ab-comparison',
      title: 'A/B Comparison',
      tooltip: <HelpTooltip text="Compare two blade configurations side by side. Useful for fine-tuning colors and effects before exporting." />,
      defaultOpen: false,
      children: <ABComparisonWrapper />,
    },
  ], []);

  return <ReorderableSections tab="dynamics" sections={sections} />;
}
