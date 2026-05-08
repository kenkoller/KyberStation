// ─── @kyberstation/template-eval ───
// ProffieOS Template Interpreter — pixel-accurate evaluation of
// C++ template strings for blade preview.

// Core types
export type {
  Color,
  Color16,
  BladeState,
  EffectType,
  EffectEvent,
  LockupType,
  EffectSystem,
  StyleTemplate,
  TemplateNode,
  TemplateFactory,
} from './types.js';

export {
  PROFFIE_MAX,
  BLACK,
  WHITE,
  intToFloat,
  floatToInt,
  clamp,
  color16to8,
  color8to16,
  mixColors,
  alphaBlend,
  isBlack,
  colorAlpha,
} from './types.js';

// Parser
export { parseTemplateString } from './parser.js';

// Evaluator
export { evaluateTemplate, evaluateTemplateString } from './evaluate.js';

// Effect system
export { EffectManager } from './EffectSystem.js';

// Base classes (for extending)
export { BaseStyleTemplate, IntegerLiteral } from './BaseStyle.js';

// Registry introspection
export { isRegistered, registrySize, registeredNames } from './registry.js';
