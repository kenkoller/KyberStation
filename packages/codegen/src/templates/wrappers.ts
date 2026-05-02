// ─── ProffieOS Wrapper Template Definitions ───

import type { TemplateDefinition } from '../types.js';

export const wrapperTemplates: Map<string, TemplateDefinition> = new Map([
  [
    'StylePtr',
    {
      name: 'StylePtr',
      argTypes: ['COLOR'],
      description: 'Outermost wrapper: produces a StyleFactory from a style tree',
    },
  ],
  [
    'StyleNormalPtr',
    {
      name: 'StyleNormalPtr',
      argTypes: ['COLOR', 'COLOR', 'INTEGER', 'INTEGER'],
      description:
        'Legacy ProffieOS shorthand wrapper: <BASE, CLASH, IGNITION_MS, RETRACTION_MS>. Equivalent to StylePtr<InOutHelper<...>>.',
    },
  ],
  [
    'StyleFirePtr',
    {
      name: 'StyleFirePtr',
      argTypes: ['COLOR', 'COLOR', 'INTEGER'],
      description: 'Legacy fire-style wrapper: <COLOR_LO, COLOR_HI, SIZE>',
    },
  ],
  [
    'StyleStrobePtr',
    {
      name: 'StyleStrobePtr',
      argTypes: ['COLOR', 'COLOR', 'INTEGER', 'INTEGER', 'INTEGER'],
      description: 'Legacy strobe wrapper: <COLOR, BG_COLOR, HZ, IGNITION_MS, RETRACTION_MS>',
    },
  ],
  [
    'StyleRainbowPtr',
    {
      name: 'StyleRainbowPtr',
      argTypes: ['INTEGER', 'INTEGER'],
      description: 'Legacy rainbow wrapper: <IGNITION_MS, RETRACTION_MS>',
    },
  ],
  [
    'ChargingStylePtr',
    {
      name: 'ChargingStylePtr',
      argTypes: ['COLOR'],
      description: 'Style wrapper used while the saber is on a charging cradle',
    },
  ],
  [
    'IgnitionDelay',
    {
      // Per styles/ignition_delay.h: IgnitionDelay<DELAY_MILLIS, BASE>.
      // 2-arg form (delay + base style); previously registered as 1-arg.
      name: 'IgnitionDelay',
      argTypes: ['INTEGER', 'COLOR'],
      description: 'Delay ignition by N milliseconds, then run the wrapped BASE style',
    },
  ],
  [
    'RetractionDelay',
    {
      // Per styles/retraction_delay.h: RetractionDelay<DELAY_MILLIS, BASE>.
      name: 'RetractionDelay',
      argTypes: ['INTEGER', 'COLOR'],
      description: 'Delay retraction by N milliseconds, then run the wrapped BASE style',
    },
  ],
  [
    'DimBlade',
    {
      // Per styles/dim_blade.h: DimBlade<BASE, PERCENT>.
      name: 'DimBlade',
      argTypes: ['COLOR', 'INTEGER'],
      description: 'Dim a wrapped style by a percentage (0-100)',
    },
  ],
  [
    'InOutHelper',
    {
      // Per styles/inout_helper.h: InOutHelper<BASE, OUT_MILLIS, IN_MILLIS>.
      name: 'InOutHelper',
      argTypes: ['COLOR', 'INTEGER', 'INTEGER'],
      description: 'Older in/out helper wrapper: <BASE, OUT_MILLIS, IN_MILLIS>',
    },
  ],
  [
    'InOutHelperX',
    {
      // Per styles/inout_helper.h: InOutHelperX<BASE, EXTENSION, OFF_COLOR>.
      // Previously registered as 2-arg; 3-arg form lets the wrapped style
      // specify both an extension function and an off-state color.
      name: 'InOutHelperX',
      argTypes: ['COLOR', 'FUNCTION', 'COLOR'],
      description: 'Function-parameterised in/out helper: <BASE, EXTENSION, OFF_COLOR>',
    },
  ],
  [
    'InOutSparkTip',
    {
      // Per styles/inout_sparktip.h: InOutSparkTip<BASE, OUT_MILLIS, IN_MILLIS, SPARK_COLOR>.
      name: 'InOutSparkTip',
      argTypes: ['COLOR', 'INTEGER', 'INTEGER', 'COLOR'],
      description: 'In/out wrapper with a tip-spark on ignition: <BASE, OUT_MS, IN_MS, SPARK_COLOR>',
    },
  ],
  [
    'InOutTr',
    {
      // Per styles/inout_helper.h: InOutTr<BASE, OUT_TRANSITION, IN_TRANSITION, OFF_COLOR>.
      // Previously registered as 3-arg; correct is 4-arg (off-color is mandatory).
      name: 'InOutTr',
      argTypes: ['COLOR', 'TRANSITION', 'TRANSITION', 'COLOR'],
      description: 'Plain in/out transition wrapper: <BASE, OUT_TRANSITION, IN_TRANSITION, OFF_COLOR>',
    },
  ],
  [
    'InOutTrL',
    {
      name: 'InOutTrL',
      argTypes: ['TRANSITION', 'TRANSITION'],
      description: 'Ignition/retraction transition layer wrapper',
    },
  ],
  [
    'LengthFinder',
    {
      name: 'LengthFinder',
      argTypes: ['COLOR'],
      description: 'Diagnostic helper that counts pixels along the blade',
    },
  ],
  [
    'DisplayStyle',
    {
      name: 'DisplayStyle',
      argTypes: ['COLOR'],
      description: 'Display-only style helper (rare)',
    },
  ],
  [
    'ByteOrderStyle',
    {
      name: 'ByteOrderStyle',
      argTypes: ['INTEGER', 'COLOR'],
      description: 'Force a byte order on a wrapped color (rare hardware adapter)',
    },
  ],
]);
