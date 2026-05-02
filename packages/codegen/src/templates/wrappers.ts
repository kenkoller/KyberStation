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
      name: 'IgnitionDelay',
      argTypes: ['INTEGER'],
      description: 'Delay ignition by N milliseconds',
    },
  ],
  [
    'RetractionDelay',
    {
      name: 'RetractionDelay',
      argTypes: ['INTEGER'],
      description: 'Delay retraction by N milliseconds',
    },
  ],
  [
    'DimBlade',
    {
      name: 'DimBlade',
      argTypes: ['COLOR', 'INTEGER'],
      description: 'Dim a wrapped style by a percentage (0-100)',
    },
  ],
  [
    'InOutHelper',
    {
      name: 'InOutHelper',
      argTypes: ['COLOR', 'INTEGER', 'INTEGER'],
      description: 'Older in/out helper wrapper (pre-OS6 tutorials)',
    },
  ],
  [
    'InOutHelperX',
    {
      name: 'InOutHelperX',
      argTypes: ['COLOR', 'FUNCTION'],
      description: 'Function-parameterised in/out helper',
    },
  ],
  [
    'InOutSparkTip',
    {
      name: 'InOutSparkTip',
      argTypes: ['COLOR', 'INTEGER', 'INTEGER', 'COLOR'],
      description: 'In/out wrapper with a tip-spark on ignition',
    },
  ],
  [
    'InOutTr',
    {
      name: 'InOutTr',
      argTypes: ['COLOR', 'TRANSITION', 'TRANSITION'],
      description: 'Plain in/out transition wrapper (predecessor of InOutTrL)',
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
