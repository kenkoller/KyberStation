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
    'InOutTrL',
    {
      name: 'InOutTrL',
      argTypes: ['TRANSITION', 'TRANSITION'],
      description: 'Ignition/retraction transition layer wrapper',
    },
  ],
]);
