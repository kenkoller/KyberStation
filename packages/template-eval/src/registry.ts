// ─── Template Registry ───
// Maps ProffieOS template names to their factory constructors.
// This is the bridge between the parser (produces TemplateNode trees)
// and the evaluator (produces StyleTemplate instances).

import type { StyleTemplate } from './types.js';

// Color templates
import {
  Red, Green, Blue, White, Black, Yellow, Cyan, Magenta, Orange, Pink,
  DeepSkyBlue, DodgerBlue, Purple, Brown, Gray, Silver, Gold, Lime,
  Maroon, Navy, Olive, Teal, Crimson, Coral, Salmon, Tomato, Violet,
  Indigo, Turquoise,
  RgbTemplate, Rgb16Template, HueTemplate, MixTemplate,
  GradientTemplate, RainbowTemplate, RgbCycleTemplate,
  RotateColorsXTemplate, ColorChangeTemplate, ColorSelectTemplate,
  AlphaLTemplate, RgbArgTemplate, IntArgTemplate,
} from './templates/colors.js';

// Function templates
import {
  IntTemplate, ScaleTemplate, SwingSpeedTemplate, BladeAngleTemplate,
  TwistAngleTemplate, SoundLevelTemplate, NoisySoundLevelTemplate,
  SmoothSoundLevelTemplate, BatteryLevelTemplate, VariationTemplate,
  SinTemplate, BumpTemplate, SmoothStepTemplate, ClampFTemplate,
  ChangeSlowlyTemplate, SumTemplate, MultTemplate, PercentageTemplate,
  IsLessThanTemplate, ClashImpactFTemplate, TimeSinceEffectTemplate,
  EffectPositionTemplate, EffectRandomFTemplate, RandomFTemplate,
  RandomPerLEDFTemplate, CenterDistFTemplate, WavLenTemplate,
  IncrementWithResetTemplate, AltFTemplate, IfonTemplate,
  IgnitionTimeTemplate, RetractionTimeTemplate, BendTimePowInvXTemplate,
} from './templates/functions.js';

// Style templates
import {
  LayersTemplate, AudioFlickerTemplate, StyleFireTemplate,
  PulsingTemplate, StripesTemplate, StripesXTemplate,
  BlinkingTemplate, CylonTemplate, RandomFlickerTemplate,
  BrownNoiseFlickerTemplate, BrownNoiseFlickerLTemplate,
  HumpFlickerTemplate, HumpFlickerLTemplate,
  RandomPerLEDFlickerLTemplate, StrobeTemplate, OnSparkTemplate,
} from './templates/styles.js';

// Effect templates
import {
  SimpleClashLTemplate, ResponsiveClashLTemplate,
  BlastLTemplate, ResponsiveBlastLTemplate,
  ResponsiveLockupLTemplate, LockupTrLTemplate,
  ResponsiveStabLTemplate, ResponsiveDragLTemplate,
  ResponsiveLightningBlockLTemplate, ResponsiveMeltLTemplate,
  TransitionEffectLTemplate, EffectSequenceTemplate,
  MultiTransitionEffectLTemplate,
} from './templates/effects.js';

// Transition templates
import {
  TrInstantTemplate, TrFadeTemplate, TrFadeXTemplate,
  TrSmoothFadeTemplate, TrWipeTemplate, TrWipeXTemplate,
  TrWipeInTemplate, TrWipeInXTemplate, TrCenterWipeTemplate,
  TrCenterWipeXTemplate, TrDelayTemplate, TrConcatTemplate,
  TrJoinTemplate, TrJoinRTemplate, TrExtendTemplate,
  TrWaveXTemplate, TrCenterWipeInTemplate, TrCenterWipeInXTemplate,
} from './templates/transitions.js';

// Wrapper templates
import {
  InOutTrLTemplate, InOutHelperLTemplate,
  StyleNormalPtrTemplate, TransitionLoopTemplate,
  SequenceLTemplate,
} from './templates/wrappers.js';

type TemplateClass = new (args: StyleTemplate[]) => StyleTemplate;

const REGISTRY = new Map<string, TemplateClass | (() => StyleTemplate)>();

function registerClass(name: string, cls: TemplateClass): void {
  REGISTRY.set(name, cls);
}

function registerNamedColor(name: string, cls: new () => StyleTemplate): void {
  REGISTRY.set(name, () => new cls());
}

// ─── Named Colors ───
registerNamedColor('Red', Red);
registerNamedColor('GREEN', Green);
registerNamedColor('Green', Green);
registerNamedColor('Blue', Blue);
registerNamedColor('White', White);
registerNamedColor('Black', Black);
registerNamedColor('Yellow', Yellow);
registerNamedColor('Cyan', Cyan);
registerNamedColor('Magenta', Magenta);
registerNamedColor('Orange', Orange);
registerNamedColor('OrangeRed', Orange);
registerNamedColor('Pink', Pink);
registerNamedColor('DeepSkyBlue', DeepSkyBlue);
registerNamedColor('DodgerBlue', DodgerBlue);
registerNamedColor('Purple', Purple);
registerNamedColor('Brown', Brown);
registerNamedColor('Gray', Gray);
registerNamedColor('Grey', Gray);
registerNamedColor('Silver', Silver);
registerNamedColor('Gold', Gold);
registerNamedColor('Lime', Lime);
registerNamedColor('LimeGreen', Lime);
registerNamedColor('Maroon', Maroon);
registerNamedColor('Navy', Navy);
registerNamedColor('Olive', Olive);
registerNamedColor('Teal', Teal);
registerNamedColor('Crimson', Crimson);
registerNamedColor('Coral', Coral);
registerNamedColor('Salmon', Salmon);
registerNamedColor('Tomato', Tomato);
registerNamedColor('Violet', Violet);
registerNamedColor('Indigo', Indigo);
registerNamedColor('Turquoise', Turquoise);

// ─── Color Templates ───
registerClass('Rgb', RgbTemplate);
registerClass('Rgb16', Rgb16Template);
registerClass('Hue', HueTemplate);
registerClass('Mix', MixTemplate);
registerClass('Gradient', GradientTemplate);
registerClass('Rainbow', RainbowTemplate);
registerClass('RgbCycle', RgbCycleTemplate);
registerClass('RotateColorsX', RotateColorsXTemplate);
registerClass('ColorChange', ColorChangeTemplate);
registerClass('ColorSelect', ColorSelectTemplate);
registerClass('AlphaL', AlphaLTemplate);
registerClass('RgbArg', RgbArgTemplate);
registerClass('IntArg', IntArgTemplate);

// ─── Function Templates ───
registerClass('Int', IntTemplate);
registerClass('Scale', ScaleTemplate);
registerClass('SwingSpeed', SwingSpeedTemplate);
registerClass('BladeAngle', BladeAngleTemplate);
registerClass('TwistAngle', TwistAngleTemplate);
registerClass('SoundLevel', SoundLevelTemplate);
registerClass('NoisySoundLevel', NoisySoundLevelTemplate);
registerClass('NoisySoundLevelCompat', NoisySoundLevelTemplate);
registerClass('SmoothSoundLevel', SmoothSoundLevelTemplate);
registerClass('BatteryLevel', BatteryLevelTemplate);
registerClass('Variation', VariationTemplate);
registerClass('Sin', SinTemplate);
registerClass('Bump', BumpTemplate);
registerClass('SmoothStep', SmoothStepTemplate);
registerClass('ClampF', ClampFTemplate);
registerClass('ChangeSlowly', ChangeSlowlyTemplate);
registerClass('Sum', SumTemplate);
registerClass('Mult', MultTemplate);
registerClass('Percentage', PercentageTemplate);
registerClass('IsLessThan', IsLessThanTemplate);
registerClass('ClashImpactF', ClashImpactFTemplate);
registerClass('ClashImpactFX', ClashImpactFTemplate);
registerClass('TimeSinceEffect', TimeSinceEffectTemplate);
registerClass('WavLen', WavLenTemplate);
registerClass('WavNum', EffectRandomFTemplate);
registerClass('EffectPosition', EffectPositionTemplate);
registerClass('EffectRandomF', EffectRandomFTemplate);
registerClass('RandomF', RandomFTemplate);
registerClass('RandomPerLEDF', RandomPerLEDFTemplate);
registerClass('CenterDistF', CenterDistFTemplate);
registerClass('IncrementWithReset', IncrementWithResetTemplate);
registerClass('AltF', AltFTemplate);
registerClass('Ifon', IfonTemplate);
registerClass('IgnitionTime', IgnitionTimeTemplate);
registerClass('RetractionTime', RetractionTimeTemplate);
registerClass('BendTimePowInvX', BendTimePowInvXTemplate);

// ─── Style Templates ───
registerClass('Layers', LayersTemplate);
registerClass('AudioFlicker', AudioFlickerTemplate);
registerClass('StyleFire', StyleFireTemplate);
registerClass('Pulsing', PulsingTemplate);
registerClass('PulsingL', PulsingTemplate);
registerClass('PulsingX', PulsingTemplate);
registerClass('Stripes', StripesTemplate);
registerClass('StripesX', StripesXTemplate);
registerClass('Blinking', BlinkingTemplate);
registerClass('BlinkingL', BlinkingTemplate);
registerClass('BlinkingX', BlinkingTemplate);
registerClass('Cylon', CylonTemplate);
registerClass('RandomFlicker', RandomFlickerTemplate);
registerClass('RandomFlickerL', RandomFlickerTemplate);
registerClass('BrownNoiseFlicker', BrownNoiseFlickerTemplate);
registerClass('BrownNoiseFlickerL', BrownNoiseFlickerLTemplate);
registerClass('HumpFlicker', HumpFlickerTemplate);
registerClass('HumpFlickerL', HumpFlickerLTemplate);
registerClass('RandomPerLEDFlickerL', RandomPerLEDFlickerLTemplate);
registerClass('Strobe', StrobeTemplate);
registerClass('StrobeL', StrobeTemplate);
registerClass('StrobeX', StrobeTemplate);
registerClass('OnSpark', OnSparkTemplate);
registerClass('OnSparkL', OnSparkTemplate);
registerClass('OnSparkX', OnSparkTemplate);

// ─── Effect Templates ───
registerClass('SimpleClashL', SimpleClashLTemplate);
registerClass('ResponsiveClashL', ResponsiveClashLTemplate);
registerClass('BlastL', BlastLTemplate);
registerClass('BlastFadeoutL', BlastLTemplate);
registerClass('ResponsiveBlastL', ResponsiveBlastLTemplate);
registerClass('ResponsiveBlastFadeoutL', ResponsiveBlastLTemplate);
registerClass('ResponsiveLockupL', ResponsiveLockupLTemplate);
registerClass('LockupTrL', LockupTrLTemplate);
registerClass('ResponsiveStabL', ResponsiveStabLTemplate);
registerClass('ResponsiveDragL', ResponsiveDragLTemplate);
registerClass('ResponsiveLightningBlockL', ResponsiveLightningBlockLTemplate);
registerClass('ResponsiveMeltL', ResponsiveMeltLTemplate);
registerClass('TransitionEffectL', TransitionEffectLTemplate);
registerClass('MultiTransitionEffectL', MultiTransitionEffectLTemplate);
registerClass('EffectSequence', EffectSequenceTemplate);

// ─── Transition Templates ───
registerClass('TrInstant', TrInstantTemplate);
registerClass('TrFade', TrFadeTemplate);
registerClass('TrFadeX', TrFadeXTemplate);
registerClass('TrSmoothFade', TrSmoothFadeTemplate);
registerClass('TrSmoothFadeX', TrSmoothFadeTemplate);
registerClass('TrWipe', TrWipeTemplate);
registerClass('TrWipeX', TrWipeXTemplate);
registerClass('TrWipeIn', TrWipeInTemplate);
registerClass('TrWipeInX', TrWipeInXTemplate);
registerClass('TrCenterWipe', TrCenterWipeTemplate);
registerClass('TrCenterWipeX', TrCenterWipeXTemplate);
registerClass('TrCenterWipeIn', TrCenterWipeInTemplate);
registerClass('TrCenterWipeInX', TrCenterWipeInXTemplate);
registerClass('TrDelay', TrDelayTemplate);
registerClass('TrConcat', TrConcatTemplate);
registerClass('TrJoin', TrJoinTemplate);
registerClass('TrJoinR', TrJoinRTemplate);
registerClass('TrExtend', TrExtendTemplate);
registerClass('TrExtendX', TrExtendTemplate);
registerClass('TrWaveX', TrWaveXTemplate);

// ─── Wrapper Templates ───
registerClass('InOutTrL', InOutTrLTemplate);
registerClass('InOutHelperL', InOutHelperLTemplate);
registerClass('StyleNormalPtr', StyleNormalPtrTemplate);
registerClass('TransitionLoop', TransitionLoopTemplate);
registerClass('SequenceL', SequenceLTemplate);

/**
 * Look up a template class/factory by name.
 * Returns undefined for unregistered names.
 */
export function getTemplate(name: string): TemplateClass | (() => StyleTemplate) | undefined {
  return REGISTRY.get(name);
}

/**
 * Check whether a template name is registered.
 */
export function isRegistered(name: string): boolean {
  return REGISTRY.has(name);
}

/**
 * Get the count of registered template names.
 */
export function registrySize(): number {
  return REGISTRY.size;
}

/**
 * Get all registered template names (for debugging / UI).
 */
export function registeredNames(): string[] {
  return Array.from(REGISTRY.keys()).sort();
}
