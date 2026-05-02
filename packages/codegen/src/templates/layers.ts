// ─── ProffieOS Layer Template Definitions ───

import type { TemplateDefinition } from '../types.js';

export const layerTemplates: Map<string, TemplateDefinition> = new Map([
  [
    'Layers',
    {
      name: 'Layers',
      argTypes: ['COLOR', 'COLOR'],
      description: 'Main layer compositor: base color + one or more overlay layers (variadic)',
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
    'AlphaMixL',
    {
      name: 'AlphaMixL',
      argTypes: ['FUNCTION', 'COLOR', 'COLOR'],
      description: 'Alpha-aware Mix layer: blends two color layers by a function (variadic colors)',
    },
  ],
  [
    'BlastL',
    {
      name: 'BlastL',
      argTypes: ['COLOR'],
      description: 'Blast effect layer (legacy/simple form)',
    },
  ],
  [
    'ResponsiveBlastL',
    {
      name: 'ResponsiveBlastL',
      argTypes: ['COLOR', 'INTEGER', 'INTEGER', 'INTEGER', 'EFFECT'],
      description: 'Spatial blast at impact location. Fett263 OS7 default for Blast.',
    },
  ],
  [
    'ResponsiveBlastFadeL',
    {
      name: 'ResponsiveBlastFadeL',
      argTypes: ['COLOR', 'INTEGER', 'INTEGER', 'INTEGER', 'EFFECT'],
      description: 'Spatial blast that fades after impact',
    },
  ],
  [
    'ResponsiveBlastWaveL',
    {
      name: 'ResponsiveBlastWaveL',
      argTypes: ['COLOR', 'INTEGER', 'INTEGER', 'INTEGER', 'INTEGER', 'EFFECT'],
      description: 'Spatial blast that propagates as a wave',
    },
  ],
  [
    'SimpleClashL',
    {
      name: 'SimpleClashL',
      argTypes: ['COLOR', 'INTEGER'],
      description: 'Simple whole-blade clash flash with color and threshold',
    },
  ],
  [
    'ResponsiveClashL',
    {
      name: 'ResponsiveClashL',
      argTypes: ['COLOR'],
      description: 'Spatial clash flash with optional position/size parameters',
    },
  ],
  [
    'LocalizedClashL',
    {
      name: 'LocalizedClashL',
      argTypes: ['COLOR', 'INTEGER', 'INTEGER'],
      description: 'Localized clash flash bounded to a section of the blade',
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
    'ResponsiveLockupL',
    {
      name: 'ResponsiveLockupL',
      // <COLOR, TR1, TR2, TOP, BOTTOM, SIZE> — positional lockup layer from OS7.
      // TOP / BOTTOM / SIZE are Int<> wrappers in 0..32768 (hilt=0, tip=32768).
      // The optional 7th CONDITION arg defaults to Int<1> (always-on) and is
      // not emitted by the ASTBuilder.
      argTypes: ['COLOR', 'TRANSITION', 'TRANSITION', 'INTEGER', 'INTEGER', 'INTEGER'],
      description: 'Spatial lockup layer (OS7): positions the lockup glow at a specific blade location.',
    },
  ],
  [
    'ResponsiveLightningBlockL',
    {
      name: 'ResponsiveLightningBlockL',
      argTypes: ['COLOR'],
      description: 'Force-Lightning block layer with begin/end transitions and condition',
    },
  ],
  [
    'ResponsiveStabL',
    {
      name: 'ResponsiveStabL',
      argTypes: ['COLOR', 'TRANSITION', 'TRANSITION', 'INTEGER', 'INTEGER'],
      description: 'Stab effect at tip with transitions and position/size',
    },
  ],
  [
    'ResponsiveDragL',
    {
      name: 'ResponsiveDragL',
      argTypes: ['COLOR', 'TRANSITION', 'TRANSITION', 'INTEGER', 'INTEGER'],
      description: 'Drag effect at tip with sparks',
    },
  ],
  [
    'ResponsiveMeltL',
    {
      name: 'ResponsiveMeltL',
      argTypes: ['COLOR', 'TRANSITION', 'TRANSITION', 'INTEGER', 'INTEGER'],
      description: 'Spatial melt at tip with transitions and position/size',
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
    'BrownNoiseFlickerL',
    {
      name: 'BrownNoiseFlickerL',
      argTypes: ['COLOR', 'INTEGER'],
      description: 'Brown-noise flicker as overlay layer (color + depth)',
    },
  ],
  [
    'RandomPerLEDFlickerL',
    {
      name: 'RandomPerLEDFlickerL',
      argTypes: ['COLOR'],
      description: 'Per-LED random flicker as overlay layer',
    },
  ],
  [
    'HumpFlickerL',
    {
      name: 'HumpFlickerL',
      argTypes: ['COLOR', 'INTEGER'],
      description: 'Hump-shaped flicker as overlay layer',
    },
  ],
  [
    'TransitionEffectL',
    {
      // OS7 form: TransitionEffectL<TRANSITION, EFFECT> — first arg is a
      // transition (often a TrConcat<>), second is the EFFECT trigger.
      // Pre-OS7 (Fredrik Style Editor) form: TransitionEffectL<COLOR,
      // TR_IN, TR_OUT, EFFECT>. The parser disambiguates by arg count.
      // Registered as 2-arg here since OS7 is the dominant emission;
      // the parser allows the 4-arg form via flagging in
      // VARIADIC_TEMPLATES (treated as min 2 args).
      name: 'TransitionEffectL',
      argTypes: ['TRANSITION', 'EFFECT'],
      description: 'Effect-triggered transition layer. OS7: <TRANSITION, EFFECT>. Pre-OS7: <COLOR, TR_IN, TR_OUT, EFFECT>.',
    },
  ],
  [
    'TransitionEffect',
    {
      name: 'TransitionEffect',
      argTypes: ['COLOR', 'COLOR', 'TRANSITION', 'TRANSITION', 'EFFECT'],
      description: 'Function-form effect transition (used inside AlphaL etc.)',
    },
  ],
  [
    'TransitionLoopL',
    {
      name: 'TransitionLoopL',
      argTypes: ['COLOR', 'TRANSITION'],
      description: 'Looping transition layer (overlay form)',
    },
  ],
  [
    'TransitionLoop',
    {
      name: 'TransitionLoop',
      argTypes: ['COLOR', 'TRANSITION'],
      description: 'Looping transition (function form, used inside other layers)',
    },
  ],
  [
    'TransitionPulseL',
    {
      name: 'TransitionPulseL',
      argTypes: ['COLOR', 'TRANSITION', 'FUNCTION'],
      description: 'Pulsing transition layer driven by a Trigger<> function',
    },
  ],
  [
    'EffectSequence',
    {
      name: 'EffectSequence',
      argTypes: ['FUNCTION', 'COLOR', 'COLOR'],
      description: 'Sequence-of-AlphaLs cycler. Required for OS7 Power Save and looping FX (variadic AlphaLs after the selector function).',
    },
  ],
  [
    'OnSpark',
    {
      name: 'OnSpark',
      argTypes: ['COLOR'],
      description: 'Spark on ignition (overlay layer)',
    },
  ],
  [
    'LocalizedClash',
    {
      name: 'LocalizedClash',
      argTypes: ['COLOR', 'INTEGER', 'INTEGER'],
      description: 'Localized clash flash with position and size (legacy non-L form)',
    },
  ],
  [
    'ColorChangeL',
    {
      name: 'ColorChangeL',
      argTypes: ['FUNCTION', 'COLOR', 'COLOR'],
      description: 'Layer-form ColorChange: function-driven color rotation across N colors (variadic)',
    },
  ],
  [
    'Remap',
    {
      name: 'Remap',
      argTypes: ['FUNCTION', 'COLOR'],
      description: 'Remap blade positions through a function before evaluating the inner color',
    },
  ],
  // ── Legacy non-L variants (parsed without warnings; pre-OS6 hand-written
  //    or Fredrik Style Editor exports).
  [
    'Blast',
    {
      name: 'Blast',
      argTypes: ['COLOR', 'INTEGER', 'INTEGER'],
      description: 'Plain blast (legacy non-L form)',
    },
  ],
  [
    'BlastFadeout',
    {
      name: 'BlastFadeout',
      argTypes: ['COLOR', 'INTEGER'],
      description: 'Blast that fades, no responsive logic (legacy)',
    },
  ],
  [
    'OriginalBlast',
    {
      name: 'OriginalBlast',
      argTypes: ['COLOR'],
      description: 'Original (very early) blast layer (legacy)',
    },
  ],
  [
    'SimpleClash',
    {
      name: 'SimpleClash',
      argTypes: ['COLOR', 'INTEGER'],
      description: 'Whole-blade clash, non-L variant (legacy)',
    },
  ],
  [
    'Lockup',
    {
      name: 'Lockup',
      argTypes: ['COLOR', 'COLOR'],
      description: 'Plain lockup (legacy non-Tr form)',
    },
  ],
  [
    'LockupTr',
    {
      name: 'LockupTr',
      argTypes: ['COLOR', 'TRANSITION', 'TRANSITION'],
      description: 'Lockup with transitions, no type enum (legacy)',
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
