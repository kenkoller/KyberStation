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
  // Extended CSS / ProffieOS named colors
  AliceBlue, Aqua, Aquamarine, Azure, Bisque, BlanchedAlmond,
  Chartreuse, Cornsilk, DarkOrange, DeepPink, FloralWhite, ForestGreen,
  Fuchsia, GhostWhite, GreenYellow, HoneyDew, HotPink, Ivory,
  LavenderBlush, LemonChiffon, LightCyan, LightPink, LightSalmon,
  LightSkyBlue, LightYellow, MintCream, MistyRose, Moccasin,
  NavajoWhite, PaleGreen, PapayaWhip, PeachPuff, RoyalBlue, SeaShell,
  Snow, SpringGreen, SteelBlue, Amber,
  // Extended ProffieOS color wheel colors
  MossGreen, ElectricPurple, ElectricViolet, ElectricLime, CyberYellow,
  CanaryYellow, Flamingo, VividViolet, PsychedelicPurple, HotMagenta,
  BrutalPink, NeonRose, VividRaspberry, HaltRed, MoltenCore, SafetyOrange,
  OrangeJuice, ImperialYellow, SchoolBus, SuperSaiyan, Star, Lemon,
  ElectricBanana, BusyBee, ZeusBolt, LimeZest, Limoncello, CathodeGreen,
  MintyParadise, PlungePool, VibrantMint, MasterSwordBlue, BrainFreeze,
  BlueRibbon, RareBlue, OverdueBlue, ViolentViolet,
  RgbTemplate, Rgb16Template, HueTemplate, MixTemplate,
  GradientTemplate, RainbowTemplate, RgbCycleTemplate,
  RotateColorsXTemplate, ColorChangeTemplate, ColorSelectTemplate,
  AlphaLTemplate, RgbArgTemplate, IntArgTemplate,
  PixelateXTemplate, ColorSequenceTemplate, ColorCycleTemplate,
  RandomLTemplate,
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
  PulsingFTemplate, VolumeLevelTemplate, EffectPulseFTemplate,
  ModFTemplate, BendTimePowXTemplate,
  HoldPeakFTemplate, EffectIncrementFTemplate, LinearSectionFTemplate,
  IsGreaterThanTemplate, SlowNoiseTemplate, SwingAccelerationTemplate,
  SparkleFTemplate, RemapTemplate,
  IsBetweenTemplate, IncrementModuloTemplate, CircularSectionFTemplate,
  TwistAccelerationTemplate, IntSelectTemplate, BlastFTemplate,
  DivideTemplate, SubtractTemplate, ThresholdPulseFTemplate,
  RampFTemplate, LockupPulseFTemplate, IncrementFTemplate,
  SliceFTemplate, IgnitionDelayTemplate, RetractionDelayTemplate,
  BrownNoiseFTemplate, StrobeFTemplate, BlinkingFTemplate,
  HumpFlickerFXTemplate, OnSparkFTemplate, RandomBlinkFTemplate,
  InOutFuncTemplate, TriggerTemplate, BulletCountFTemplate,
  BlasterChargeFTemplate, BlasterModeFTemplate, MarbleFTemplate,
  AnalogReadPinFTemplate, ReadPinFTemplate,
} from './templates/functions.js';

// Style templates
import {
  LayersTemplate, AudioFlickerTemplate, StyleFireTemplate,
  PulsingTemplate, StripesTemplate, StripesXTemplate,
  BlinkingTemplate, CylonTemplate, RandomFlickerTemplate,
  BrownNoiseFlickerTemplate, BrownNoiseFlickerLTemplate,
  HumpFlickerTemplate, HumpFlickerLTemplate,
  RandomPerLEDFlickerLTemplate, StrobeTemplate, OnSparkTemplate,
  AlphaMixLTemplate, AudioFlickerLTemplate, BlastFadeoutTemplate,
  LockupTemplate, LocalizedClashTemplate, LocalizedClashLTemplate,
  RandomBlinkTemplate, RandomPerLEDFlickerTemplate, SparkleTemplate,
  StaticFireTemplate,
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
  ResponsiveBlastFadeLTemplate, ResponsiveBlastWaveLTemplate,
} from './templates/effects.js';

// Transition templates
import {
  TrInstantTemplate, TrFadeTemplate, TrFadeXTemplate,
  TrSmoothFadeTemplate, TrWipeTemplate, TrWipeXTemplate,
  TrWipeInTemplate, TrWipeInXTemplate, TrCenterWipeTemplate,
  TrCenterWipeXTemplate, TrDelayTemplate, TrConcatTemplate,
  TrJoinTemplate, TrJoinRTemplate, TrExtendTemplate,
  TrWaveXTemplate, TrCenterWipeInTemplate, TrCenterWipeInXTemplate,
  TrCenterWipeInSparkTemplate,
  TrBoingTemplate, TrBoingXTemplate, TrColorCycleXTemplate,
  TrDelayXTemplate, TrDoEffectTemplate, TrDoEffectAlwaysXTemplate,
  TrSelectTemplate, TrSparkXTemplate, TrWipeSparkTipTemplate,
  TrWipeSparkTipXTemplate,
  TrBlinkTemplate, TrCenterWipeSparkTemplate,
  TrLoopNTemplate, TrLoopUntilTemplate, TrSequenceTemplate,
} from './templates/transitions.js';

// Wrapper templates
import {
  InOutTrLTemplate, InOutHelperLTemplate,
  StyleNormalPtrTemplate, TransitionLoopTemplate,
  SequenceLTemplate,
  StylePtrTemplate, StyleFirePtrTemplate, StyleRainbowPtrTemplate,
  StyleStrobePtrTemplate, InOutSparkTipLTemplate,
  TransitionEffectTemplate, TransitionLoopLTemplate,
  TransitionLoopWhileLTemplate, TransitionPulseTemplate,
  DimBladeTemplate, EffectPulseTemplate,
  LengthFinderTemplate, DisplayStyleTemplate, ByteOrderStyleTemplate,
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

// ─── Extended Named Colors (CSS / ProffieOS) ───
registerNamedColor('AliceBlue', AliceBlue);
registerNamedColor('Amber', Amber);
registerNamedColor('Aqua', Aqua);
registerNamedColor('Aquamarine', Aquamarine);
registerNamedColor('Azure', Azure);
registerNamedColor('Bisque', Bisque);
registerNamedColor('BlanchedAlmond', BlanchedAlmond);
registerNamedColor('Chartreuse', Chartreuse);
registerNamedColor('Cornsilk', Cornsilk);
registerNamedColor('DarkOrange', DarkOrange);
registerNamedColor('DeepPink', DeepPink);
registerNamedColor('FloralWhite', FloralWhite);
registerNamedColor('ForestGreen', ForestGreen);
registerNamedColor('Fuchsia', Fuchsia);
registerNamedColor('GhostWhite', GhostWhite);
registerNamedColor('GreenYellow', GreenYellow);
registerNamedColor('HoneyDew', HoneyDew);
registerNamedColor('HotPink', HotPink);
registerNamedColor('Ivory', Ivory);
registerNamedColor('LavenderBlush', LavenderBlush);
registerNamedColor('LemonChiffon', LemonChiffon);
registerNamedColor('LightCyan', LightCyan);
registerNamedColor('LightPink', LightPink);
registerNamedColor('LightSalmon', LightSalmon);
registerNamedColor('LightSkyBlue', LightSkyBlue);
registerNamedColor('LightYellow', LightYellow);
registerNamedColor('MintCream', MintCream);
registerNamedColor('MistyRose', MistyRose);
registerNamedColor('Moccasin', Moccasin);
registerNamedColor('NavajoWhite', NavajoWhite);
registerNamedColor('PaleGreen', PaleGreen);
registerNamedColor('PapayaWhip', PapayaWhip);
registerNamedColor('PeachPuff', PeachPuff);
registerNamedColor('RoyalBlue', RoyalBlue);
registerNamedColor('SeaShell', SeaShell);
registerNamedColor('Snow', Snow);
registerNamedColor('SpringGreen', SpringGreen);
registerNamedColor('SteelBlue', SteelBlue);

// ─── Extended ProffieOS Color Wheel Colors ───
registerNamedColor('MossGreen', MossGreen);
registerNamedColor('ElectricPurple', ElectricPurple);
registerNamedColor('ElectricViolet', ElectricViolet);
registerNamedColor('ElectricLime', ElectricLime);
registerNamedColor('CyberYellow', CyberYellow);
registerNamedColor('CanaryYellow', CanaryYellow);
registerNamedColor('Flamingo', Flamingo);
registerNamedColor('VividViolet', VividViolet);
registerNamedColor('PsychedelicPurple', PsychedelicPurple);
registerNamedColor('HotMagenta', HotMagenta);
registerNamedColor('BrutalPink', BrutalPink);
registerNamedColor('NeonRose', NeonRose);
registerNamedColor('VividRaspberry', VividRaspberry);
registerNamedColor('HaltRed', HaltRed);
registerNamedColor('MoltenCore', MoltenCore);
registerNamedColor('SafetyOrange', SafetyOrange);
registerNamedColor('OrangeJuice', OrangeJuice);
registerNamedColor('ImperialYellow', ImperialYellow);
registerNamedColor('SchoolBus', SchoolBus);
registerNamedColor('SuperSaiyan', SuperSaiyan);
registerNamedColor('Star', Star);
registerNamedColor('Lemon', Lemon);
registerNamedColor('ElectricBanana', ElectricBanana);
registerNamedColor('BusyBee', BusyBee);
registerNamedColor('ZeusBolt', ZeusBolt);
registerNamedColor('LimeZest', LimeZest);
registerNamedColor('Limoncello', Limoncello);
registerNamedColor('CathodeGreen', CathodeGreen);
registerNamedColor('MintyParadise', MintyParadise);
registerNamedColor('PlungePool', PlungePool);
registerNamedColor('VibrantMint', VibrantMint);
registerNamedColor('MasterSwordBlue', MasterSwordBlue);
registerNamedColor('BrainFreeze', BrainFreeze);
registerNamedColor('BlueRibbon', BlueRibbon);
registerNamedColor('RareBlue', RareBlue);
registerNamedColor('OverdueBlue', OverdueBlue);
registerNamedColor('ViolentViolet', ViolentViolet);

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
registerClass('ColorChangeL', ColorChangeTemplate);
registerClass('ColorSelect', ColorSelectTemplate);
registerClass('AlphaL', AlphaLTemplate);
registerClass('RgbArg', RgbArgTemplate);
registerClass('IntArg', IntArgTemplate);
registerClass('PixelateX', PixelateXTemplate);
registerClass('Pixelate', PixelateXTemplate);
registerClass('ColorSequence', ColorSequenceTemplate);
registerClass('ColorCycle', ColorCycleTemplate);
registerClass('RandomL', RandomLTemplate);

// ─── Function Templates ───
registerClass('Int', IntTemplate);
registerClass('Scale', ScaleTemplate);
registerClass('SwingSpeed', SwingSpeedTemplate);
registerClass('BladeAngle', BladeAngleTemplate);
registerClass('BladeAngleX', BladeAngleTemplate);
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
registerClass('PulsingF', PulsingFTemplate);
registerClass('VolumeLevel', VolumeLevelTemplate);
registerClass('EffectPulseF', EffectPulseFTemplate);
registerClass('ModF', ModFTemplate);
registerClass('BendTimePowX', BendTimePowXTemplate);
registerClass('HoldPeakF', HoldPeakFTemplate);
registerClass('EffectIncrementF', EffectIncrementFTemplate);
registerClass('LinearSectionF', LinearSectionFTemplate);
registerClass('IsGreaterThan', IsGreaterThanTemplate);
registerClass('SlowNoise', SlowNoiseTemplate);
registerClass('SwingAcceleration', SwingAccelerationTemplate);
registerClass('SparkleF', SparkleFTemplate);
registerClass('Remap', RemapTemplate);
registerClass('IsBetween', IsBetweenTemplate);
registerClass('IncrementModulo', IncrementModuloTemplate);
registerClass('CircularSectionF', CircularSectionFTemplate);
registerClass('TwistAcceleration', TwistAccelerationTemplate);
registerClass('IntSelect', IntSelectTemplate);
registerClass('IntSelectX', IntSelectTemplate);
registerClass('BlastF', BlastFTemplate);
registerClass('BlastFadeoutF', BlastFTemplate);
registerClass('Divide', DivideTemplate);
registerClass('Subtract', SubtractTemplate);
registerClass('ThresholdPulseF', ThresholdPulseFTemplate);
registerClass('RampF', RampFTemplate);
registerClass('LockupPulseF', LockupPulseFTemplate);
registerClass('IncrementF', IncrementFTemplate);
registerClass('IncrementModuloF', IncrementFTemplate);
registerClass('SliceF', SliceFTemplate);
registerClass('IgnitionDelay', IgnitionDelayTemplate);
registerClass('IgnitionDelayX', IgnitionDelayTemplate);
registerClass('RetractionDelay', RetractionDelayTemplate);
registerClass('RetractionDelayX', RetractionDelayTemplate);
registerClass('BrownNoiseF', BrownNoiseFTemplate);
registerClass('BrownNoiseFX', BrownNoiseFTemplate);
registerClass('StrobeF', StrobeFTemplate);
registerClass('StrobeFX', StrobeFTemplate);
registerClass('BlinkingF', BlinkingFTemplate);
registerClass('BlinkingFX', BlinkingFTemplate);
registerClass('HumpFlickerFX', HumpFlickerFXTemplate);
registerClass('HumpFlickerF', HumpFlickerFXTemplate);
registerClass('OnSparkF', OnSparkFTemplate);
registerClass('OnSparkFX', OnSparkFTemplate);
registerClass('RandomBlinkF', RandomBlinkFTemplate);
registerClass('RandomBlinkFX', RandomBlinkFTemplate);
registerClass('InOutFunc', InOutFuncTemplate);
registerClass('InOutFuncX', InOutFuncTemplate);
registerClass('Trigger', TriggerTemplate);
registerClass('TriggerX', TriggerTemplate);
registerClass('BulletCountF', BulletCountFTemplate);
registerClass('BlasterChargeF', BlasterChargeFTemplate);
registerClass('BlasterModeF', BlasterModeFTemplate);
registerClass('MarbleF', MarbleFTemplate);
registerClass('AnalogReadPinF', AnalogReadPinFTemplate);
registerClass('ReadPinF', ReadPinFTemplate);
registerClass('OnsparkF', OnSparkFTemplate);
registerClass('OriginalBlastF', BlastFTemplate);

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
registerClass('AlphaMixL', AlphaMixLTemplate);
registerClass('AudioFlickerL', AudioFlickerLTemplate);
registerClass('BlastFadeout', BlastFadeoutTemplate);
registerClass('BlastFadeoutL', BlastFadeoutTemplate);
registerClass('Lockup', LockupTemplate);
registerClass('LockupL', LockupTemplate);
registerClass('LocalizedClash', LocalizedClashTemplate);
registerClass('LocalizedClashL', LocalizedClashLTemplate);
registerClass('RandomBlink', RandomBlinkTemplate);
registerClass('RandomBlinkL', RandomBlinkTemplate);
registerClass('RandomBlinkX', RandomBlinkTemplate);
registerClass('RandomPerLEDFlicker', RandomPerLEDFlickerTemplate);
registerClass('Sparkle', SparkleTemplate);
registerClass('SparkleL', SparkleTemplate);
registerClass('StaticFire', StaticFireTemplate);
registerClass('StaticFireL', StaticFireTemplate);
registerClass('StaticFireX', StaticFireTemplate);
registerClass('HardStripes', StripesXTemplate);

// ─── Effect Templates ───
registerClass('SimpleClashL', SimpleClashLTemplate);
registerClass('SimpleClash', SimpleClashLTemplate);
registerClass('ResponsiveClashL', ResponsiveClashLTemplate);
registerClass('Blast', BlastLTemplate);
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
registerClass('ResponsiveBlastFadeL', ResponsiveBlastFadeLTemplate);
registerClass('ResponsiveBlastWaveL', ResponsiveBlastWaveLTemplate);
registerClass('ResponsiveBlastFadeLX', ResponsiveBlastFadeLTemplate);
registerClass('ResponsiveBlastWaveLX', ResponsiveBlastWaveLTemplate);
registerClass('OriginalBlast', BlastLTemplate);
registerClass('OriginalBlastL', BlastLTemplate);
registerClass('MultiTransitionEffectLX', MultiTransitionEffectLTemplate);
registerClass('TransitionEffectLX', TransitionEffectLTemplate);

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
registerClass('TrCenterWipeInSpark', TrCenterWipeInSparkTemplate);
registerClass('TrCenterWipeInSparkX', TrCenterWipeInSparkTemplate);
registerClass('TrBoing', TrBoingTemplate);
registerClass('TrBoingX', TrBoingXTemplate);
registerClass('TrColorCycleX', TrColorCycleXTemplate);
registerClass('TrDelayX', TrDelayXTemplate);
registerClass('TrDoEffect', TrDoEffectTemplate);
registerClass('TrDoEffectX', TrDoEffectTemplate);
registerClass('TrDoEffectAlwaysX', TrDoEffectAlwaysXTemplate);
registerClass('TrSelect', TrSelectTemplate);
registerClass('TrSelectX', TrSelectTemplate);
registerClass('TrSparkX', TrSparkXTemplate);
registerClass('TrWipeSparkTip', TrWipeSparkTipTemplate);
registerClass('TrWipeSparkTipX', TrWipeSparkTipXTemplate);
registerClass('TrWipeInSpark', TrCenterWipeInSparkTemplate);
registerClass('TrWipeInSparkX', TrCenterWipeInSparkTemplate);
registerClass('TrWipeInSparkTip', TrWipeSparkTipTemplate);
registerClass('TrWipeInSparkTipX', TrWipeSparkTipXTemplate);
registerClass('TrColorCycle', TrColorCycleXTemplate);
registerClass('TrLoop', TransitionLoopTemplate);
registerClass('TrRandom', TrSelectTemplate);
registerClass('TrRandomX', TrSelectTemplate);
registerClass('TrBlink', TrBlinkTemplate);
registerClass('TrBlinkX', TrBlinkTemplate);
registerClass('TrCenterWipeSpark', TrCenterWipeSparkTemplate);
registerClass('TrCenterWipeSparkX', TrCenterWipeSparkTemplate);
registerClass('TrLoopN', TrLoopNTemplate);
registerClass('TrLoopNX', TrLoopNTemplate);
registerClass('TrLoopUntil', TrLoopUntilTemplate);
registerClass('TrLoopUntilX', TrLoopUntilTemplate);
registerClass('TrSequence', TrSequenceTemplate);

// ─── Wrapper Templates ───
registerClass('InOutTrL', InOutTrLTemplate);
registerClass('InOutHelperL', InOutHelperLTemplate);
registerClass('InOutHelper', InOutHelperLTemplate);
registerClass('InOutHelperX', InOutHelperLTemplate);
registerClass('StyleNormalPtr', StyleNormalPtrTemplate);
registerClass('TransitionLoop', TransitionLoopTemplate);
registerClass('SequenceL', SequenceLTemplate);
registerClass('StylePtr', StylePtrTemplate);
registerClass('StyleFirePtr', StyleFirePtrTemplate);
registerClass('StyleRainbowPtr', StyleRainbowPtrTemplate);
registerClass('StyleStrobePtr', StyleStrobePtrTemplate);
registerClass('InOutSparkTipL', InOutSparkTipLTemplate);
registerClass('InOutSparkTip', InOutSparkTipLTemplate);
registerClass('TransitionEffect', TransitionEffectTemplate);
registerClass('TransitionLoopL', TransitionLoopLTemplate);
registerClass('InOutTr', InOutTrLTemplate);
registerClass('InOutHelperF', InOutHelperLTemplate);
registerClass('InOutSparkTipLX', InOutSparkTipLTemplate);
registerClass('ChargingStylePtr', StylePtrTemplate);
registerClass('Sequence', EffectSequenceTemplate);
registerClass('SequenceX', EffectSequenceTemplate);
registerClass('ColorChangeLX', ColorChangeTemplate);
registerClass('TransitionLoopWhileL', TransitionLoopWhileLTemplate);
registerClass('TransitionPulse', TransitionPulseTemplate);
registerClass('TransitionPulseL', TransitionPulseTemplate);
registerClass('DimBlade', DimBladeTemplate);
registerClass('EffectPulse', EffectPulseTemplate);
registerClass('LengthFinder', LengthFinderTemplate);
registerClass('DisplayStyle', DisplayStyleTemplate);
registerClass('ByteOrderStyle', ByteOrderStyleTemplate);
registerClass('BlasterCharge', BlasterChargeFTemplate);
registerClass('BulletCount', BulletCountFTemplate);

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
