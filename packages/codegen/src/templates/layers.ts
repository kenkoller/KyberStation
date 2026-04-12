// ─── ProffieOS Layer Template Definitions ───

import type { TemplateDefinition } from '../types.js';

export const layerTemplates: Map<string, TemplateDefinition> = new Map([
  [
    'Layers',
    {
      name: 'Layers',
      argTypes: ['COLOR', 'COLOR'],
      description: 'Main layer compositor: base color + one or more overlay layers',
    },
  ],
  [
    'BlastL',
    {
      name: 'BlastL',
      argTypes: ['COLOR'],
      description: 'Blast effect layer',
    },
  ],
  [
    'SimpleClashL',
    {
      name: 'SimpleClashL',
      argTypes: ['COLOR', 'INTEGER'],
      description: 'Simple clash flash layer with color and threshold',
    },
  ],
  [
    'ResponsiveClashL',
    {
      name: 'ResponsiveClashL',
      argTypes: ['COLOR'],
      description: 'Responsive clash layer with optional parameters',
    },
  ],
  [
    'LockupTrL',
    {
      name: 'LockupTrL',
      argTypes: ['COLOR', 'TRANSITION', 'TRANSITION', 'LOCKUP_TYPE'],
      description: 'Lockup with transition in/out and lockup type enum',
    },
  ],
  [
    'AudioFlickerL',
    {
      name: 'AudioFlickerL',
      argTypes: ['COLOR'],
      description: 'Audio-reactive flicker overlay layer',
    },
  ],
  [
    'AlphaL',
    {
      name: 'AlphaL',
      argTypes: ['COLOR', 'FUNCTION'],
      description: 'Alpha-masked layer: applies function as opacity mask',
    },
  ],
  [
    'ResponsiveLightningBlockL',
    {
      name: 'ResponsiveLightningBlockL',
      argTypes: ['COLOR'],
      description: 'Lightning block responsive layer',
    },
  ],
  [
    'TransitionEffectL',
    {
      name: 'TransitionEffectL',
      argTypes: ['COLOR', 'TRANSITION', 'TRANSITION', 'EFFECT'],
      description: 'Transition-based effect layer triggered by effect events',
    },
  ],
  [
    'InOutTrL',
    {
      name: 'InOutTrL',
      argTypes: ['TRANSITION', 'TRANSITION'],
      description: 'Ignition/retraction transition wrapper (used inside Layers)',
    },
  ],
]);
