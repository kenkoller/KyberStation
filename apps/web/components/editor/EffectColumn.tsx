'use client';
import { useCallback, useState } from 'react';
import { useBladeStore } from '@/stores/bladeStore';

// ─── Effect Definitions ───

interface EffectDef {
  type: string;
  label: string;
  key: string;
  /** Sustained effects toggle on/off; one-shot effects fire once */
  sustained: boolean;
  /** SVG icon path(s) for the effect */
  icon: React.ReactNode;
}

// ─── Inline SVG Icons ───
// Simple, recognizable 16x16 icons for each effect type.

const IconClash = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="2" y1="14" x2="10" y2="6" />
    <line x1="14" y1="2" x2="6" y2="10" />
    <circle cx="8" cy="8" r="2" fill="currentColor" opacity="0.4" stroke="none" />
    <line x1="8" y1="4" x2="8" y2="1" />
    <line x1="12" y1="8" x2="15" y2="8" />
    <line x1="8" y1="12" x2="8" y2="15" />
    <line x1="4" y1="8" x2="1" y2="8" />
  </svg>
);

const IconBlast = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="8" cy="8" r="2" />
    <line x1="8" y1="1" x2="8" y2="4" />
    <line x1="8" y1="12" x2="8" y2="15" />
    <line x1="1" y1="8" x2="4" y2="8" />
    <line x1="12" y1="8" x2="15" y2="8" />
    <line x1="3" y1="3" x2="5.5" y2="5.5" />
    <line x1="10.5" y1="10.5" x2="13" y2="13" />
    <line x1="13" y1="3" x2="10.5" y2="5.5" />
    <line x1="5.5" y1="10.5" x2="3" y2="13" />
  </svg>
);

const IconStab = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="8" y1="1" x2="8" y2="12" />
    <polyline points="5,9 8,12 11,9" />
    <line x1="5" y1="14" x2="11" y2="14" />
  </svg>
);

const IconLockup = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="8" width="10" height="6" rx="1" />
    <path d="M5 8V5.5a3 3 0 0 1 6 0V8" />
    <circle cx="8" cy="11.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const IconLightning = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9,1 5,9 8,9 7,15 11,7 8,7 9,1" />
  </svg>
);

const IconDrag = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M4,14 Q5,10 8,9 Q11,10 12,14" />
    <path d="M6,12 Q7,8 8,7 Q9,8 10,12" />
    <line x1="8" y1="7" x2="8" y2="2" />
    <line x1="6" y1="4" x2="8" y2="2" />
    <line x1="10" y1="4" x2="8" y2="2" />
  </svg>
);

const IconMelt = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M4,3 Q4,7 6,9 Q4,11 5,14" />
    <path d="M8,1 Q8,5 9,7 Q7,10 8,15" />
    <path d="M12,3 Q12,7 10,9 Q12,11 11,14" />
  </svg>
);

const IconForce = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
    <circle cx="8" cy="8" r="2" />
    <circle cx="8" cy="8" r="5" opacity="0.5" />
    <line x1="8" y1="1" x2="8" y2="3" />
    <line x1="8" y1="13" x2="8" y2="15" />
    <line x1="1" y1="8" x2="3" y2="8" />
    <line x1="13" y1="8" x2="15" y2="8" />
  </svg>
);

// ─── Effect List ───

const EFFECTS: EffectDef[] = [
  { type: 'clash', label: 'Clash', key: 'C', sustained: false, icon: IconClash },
  { type: 'blast', label: 'Blast', key: 'B', sustained: false, icon: IconBlast },
  { type: 'stab', label: 'Stab', key: 'S', sustained: false, icon: IconStab },
  { type: 'lockup', label: 'Lockup', key: 'L', sustained: true, icon: IconLockup },
  { type: 'lightning', label: 'Ltng', key: 'N', sustained: true, icon: IconLightning },
  { type: 'drag', label: 'Drag', key: 'D', sustained: true, icon: IconDrag },
  { type: 'melt', label: 'Melt', key: 'M', sustained: true, icon: IconMelt },
  { type: 'force', label: 'Force', key: 'F', sustained: false, icon: IconForce },
];

// ─── Component ───

interface EffectColumnProps {
  onTrigger: (type: string) => void;
  onRelease: (type: string) => void;
  /** When true, renders border-left instead of border-right (for right-side placement) */
  side?: 'left' | 'right';
}

export function EffectColumn({ onTrigger, onRelease, side = 'left' }: EffectColumnProps) {
  const isOn = useBladeStore((s) => s.isOn);
  const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());

  const handleClick = useCallback((effect: EffectDef) => {
    if (!isOn) return;

    if (effect.sustained) {
      // Toggle: if active → release, if inactive → trigger
      setActiveEffects((prev) => {
        const next = new Set(prev);
        if (next.has(effect.type)) {
          next.delete(effect.type);
          onRelease(effect.type);
        } else {
          next.add(effect.type);
          onTrigger(effect.type);
        }
        return next;
      });
    } else {
      // One-shot: trigger and show brief flash
      onTrigger(effect.type);
      setActiveEffects((prev) => new Set(prev).add(effect.type));
      setTimeout(() => {
        setActiveEffects((prev) => {
          const next = new Set(prev);
          next.delete(effect.type);
          return next;
        });
      }, 400);
    }
  }, [isOn, onTrigger, onRelease]);

  return (
    <div className={`flex flex-col items-center gap-0.5 py-2 px-1 bg-bg-deep/60 ${side === 'right' ? 'border-l' : 'border-r'} border-border-subtle h-full overflow-y-auto shrink-0`}
      style={{ width: '56px' }}
    >
      <span className="text-ui-xs text-text-muted/50 uppercase tracking-wider font-medium mb-1 select-none"
        style={{ fontSize: '7px', letterSpacing: '0.1em' }}
      >
        FX
      </span>

      {EFFECTS.map((effect) => {
        const isActive = activeEffects.has(effect.type);
        const isSustained = effect.sustained;

        return (
          <button
            key={effect.type}
            onClick={() => handleClick(effect)}
            disabled={!isOn}
            aria-label={`${isSustained ? 'Toggle' : 'Trigger'} ${effect.label} effect (${effect.key})`}
            title={`${effect.label} (${effect.key})${isSustained ? ' — click to toggle' : ''}`}
            className={`
              w-11 rounded-md transition-all border flex flex-col items-center justify-center gap-0.5 py-1.5
              ${!isOn
                ? 'bg-bg-deep border-border-subtle text-text-muted/30 cursor-not-allowed'
                : isActive
                  ? isSustained
                    ? 'bg-accent/15 border-accent/40 text-accent shadow-[0_0_6px_rgba(var(--color-accent-rgb),0.2)]'
                    : 'bg-accent/20 border-accent/30 text-accent scale-95'
                  : 'bg-bg-surface/60 border-border-subtle text-text-muted hover:text-text-primary hover:border-accent-border/50 hover:bg-accent-dim/30 active:scale-95'
              }
            `}
          >
            <span className="w-4 h-4 flex items-center justify-center">
              {effect.icon}
            </span>
            <span className="text-[8px] font-semibold uppercase tracking-wide leading-none">
              {effect.label}
            </span>
            <span className="text-[7px] text-text-muted/40 leading-none">
              {effect.key}
            </span>
          </button>
        );
      })}
    </div>
  );
}
