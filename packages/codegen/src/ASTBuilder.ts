// ─── AST Builder ───
// Converts a BladeConfig into a ProffieOS style AST (StyleNode tree).

import type { StyleNode } from './types.js';

// ─── Local BladeConfig types (avoids cross-package rootDir issues) ───

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface BladeConfig {
  name?: string;
  baseColor: RGB;
  clashColor: RGB;
  lockupColor: RGB;
  blastColor: RGB;
  dragColor?: RGB;
  meltColor?: RGB;
  lightningColor?: RGB;
  style: string;
  ignition: string;
  retraction: string;
  ignitionMs: number;
  retractionMs: number;
  shimmer: number;
  ledCount: number;
  gradientEnd?: RGB;
  edgeColor?: RGB;
  [key: string]: unknown;
}

// ─── AST Node Helpers ───

function rawNode(value: string): StyleNode {
  return { type: 'raw', name: value, args: [] };
}

function intNode(value: number): StyleNode {
  return { type: 'integer', name: String(value), args: [] };
}

function intTemplateNode(value: number): StyleNode {
  return {
    type: 'function',
    name: 'Int',
    args: [intNode(value)],
  };
}

function rgbNode(color: RGB): StyleNode {
  return {
    type: 'color',
    name: 'Rgb',
    args: [intNode(color.r), intNode(color.g), intNode(color.b)],
  };
}

function templateNode(
  type: StyleNode['type'],
  name: string,
  ...args: StyleNode[]
): StyleNode {
  return { type, name, args };
}

// ─── Brighten Utility ───

function brighten(color: RGB, factor: number): RGB {
  return {
    r: Math.min(255, Math.round(color.r + (255 - color.r) * factor)),
    g: Math.min(255, Math.round(color.g + (255 - color.g) * factor)),
    b: Math.min(255, Math.round(color.b + (255 - color.b) * factor)),
  };
}

// ─── Base Style Mapping ───

function buildBaseStyle(config: BladeConfig): StyleNode {
  const base = rgbNode(config.baseColor);
  const edge = config.edgeColor
    ? rgbNode(config.edgeColor)
    : rgbNode(brighten(config.baseColor, 0.5));
  const gradEnd = config.gradientEnd
    ? rgbNode(config.gradientEnd)
    : rgbNode(brighten(config.baseColor, 0.4));

  switch (config.style) {
    case 'stable':
      // AudioFlicker<Rgb, Mix<Int<16384>, Rgb, White>>
      return templateNode(
        'color',
        'AudioFlicker',
        base,
        templateNode(
          'mix',
          'Mix',
          intTemplateNode(16384),
          rgbNode(config.baseColor),
          rawNode('White'),
        ),
      );

    case 'unstable':
      // StyleFire<Rgb, Mix<Int<10000>, Rgb, White>, 0, 4, FireConfig<3,2000,5>>
      return templateNode(
        'color',
        'StyleFire',
        base,
        templateNode(
          'mix',
          'Mix',
          intTemplateNode(10000),
          rgbNode(config.baseColor),
          rawNode('White'),
        ),
        intNode(0),
        intNode(4),
        templateNode('template', 'FireConfig', intNode(3), intNode(2000), intNode(5)),
      );

    case 'fire':
      // StyleFire<Rgb, Rgb<255,200,50>, 0, 3, FireConfig<2,1500,5>>
      return templateNode(
        'color',
        'StyleFire',
        base,
        rgbNode({ r: 255, g: 200, b: 50 }),
        intNode(0),
        intNode(3),
        templateNode('template', 'FireConfig', intNode(2), intNode(1500), intNode(5)),
      );

    case 'pulse':
      // Pulsing<Rgb, Mix<Int<8000>, Rgb, White>, 3000>
      return templateNode(
        'color',
        'Pulsing',
        base,
        templateNode(
          'mix',
          'Mix',
          intTemplateNode(8000),
          rgbNode(config.baseColor),
          rawNode('White'),
        ),
        intNode(3000),
      );

    case 'rotoscope':
      // Mix<SwingSpeed<400>, Rgb, Mix<Sin<Int<3>>, Rgb, Rgb<brightened>>>
      return templateNode(
        'mix',
        'Mix',
        templateNode('function', 'SwingSpeed', intNode(400)),
        base,
        templateNode(
          'mix',
          'Mix',
          templateNode(
            'function',
            'Sin',
            intTemplateNode(3),
          ),
          rgbNode(config.baseColor),
          rgbNode(brighten(config.baseColor, 0.6)),
        ),
      );

    case 'gradient':
      // Gradient<Rgb, Rgb_end>
      return templateNode('color', 'Gradient', base, gradEnd);

    case 'photon':
      // Stripes<5000,-1500,Rgb,Mix<Int<14000>,Black,Rgb>,Pulsing<Rgb,White,1200>>
      return templateNode(
        'color',
        'Stripes',
        intNode(5000),
        intNode(-1500),
        base,
        templateNode(
          'mix',
          'Mix',
          intTemplateNode(14000),
          rawNode('Black'),
          rgbNode(config.baseColor),
        ),
        templateNode('color', 'Pulsing', rgbNode(config.baseColor), rawNode('White'), intNode(1200)),
      );

    case 'plasma':
      // StyleFire<Rgb, EdgeRgb, 0, 5, FireConfig<4,2500,8>>
      return templateNode(
        'color',
        'StyleFire',
        base,
        edge,
        intNode(0),
        intNode(5),
        templateNode('template', 'FireConfig', intNode(4), intNode(2500), intNode(8)),
      );

    case 'crystalShatter':
      // Stripes<3000,-2000,Rgb,Mix<Sin<Int<5>>,Rgb,White>,Rgb>
      return templateNode(
        'color',
        'Stripes',
        intNode(3000),
        intNode(-2000),
        base,
        templateNode(
          'mix',
          'Mix',
          templateNode('function', 'Sin', intTemplateNode(5)),
          rgbNode(config.baseColor),
          rawNode('White'),
        ),
        rgbNode(config.baseColor),
      );

    case 'aurora':
      return rawNode('Rainbow');

    case 'cinder':
      // Mix<SwingSpeed<300>,StyleFire<Rgb,Rgb<255,100,0>,0,2>,Rgb>
      return templateNode(
        'mix',
        'Mix',
        templateNode('function', 'SwingSpeed', intNode(300)),
        templateNode(
          'color',
          'StyleFire',
          base,
          rgbNode({ r: 255, g: 100, b: 0 }),
          intNode(0),
          intNode(2),
        ),
        rgbNode(config.baseColor),
      );

    case 'prism':
      return rawNode('Rainbow');

    default:
      // Default to stable style
      return templateNode(
        'color',
        'AudioFlicker',
        base,
        templateNode(
          'mix',
          'Mix',
          intTemplateNode(16384),
          rgbNode(config.baseColor),
          rawNode('White'),
        ),
      );
  }
}

// ─── Effect Layers ───

function buildEffectLayers(config: BladeConfig): StyleNode[] {
  const layers: StyleNode[] = [];

  // Blast layer
  layers.push(
    templateNode('template', 'BlastL', rgbNode(config.blastColor)),
  );

  // Clash layer
  layers.push(
    templateNode('template', 'SimpleClashL', rgbNode(config.clashColor), intNode(40)),
  );

  // Lockup Normal
  layers.push(
    templateNode(
      'template',
      'LockupTrL',
      templateNode('template', 'AudioFlickerL', rgbNode(config.lockupColor)),
      rawNode('TrInstant'),
      templateNode('transition', 'TrFade', intNode(300)),
      rawNode('LOCKUP_NORMAL'),
    ),
  );

  // Drag lockup
  const dragColor = config.dragColor ?? { r: 255, g: 150, b: 0 };
  layers.push(
    templateNode(
      'template',
      'LockupTrL',
      templateNode('template', 'AudioFlickerL', rgbNode(dragColor)),
      rawNode('TrInstant'),
      templateNode('transition', 'TrFade', intNode(400)),
      rawNode('LOCKUP_DRAG'),
    ),
  );

  // Lightning block lockup
  const lightningColor = config.lightningColor ?? { r: 100, g: 100, b: 255 };
  layers.push(
    templateNode(
      'template',
      'LockupTrL',
      templateNode(
        'color',
        'Stripes',
        intNode(3000),
        intNode(-3500),
        rgbNode(lightningColor),
        rawNode('White'),
        rgbNode({ r: 50, g: 50, b: 200 }),
      ),
      rawNode('TrInstant'),
      templateNode('transition', 'TrFade', intNode(500)),
      rawNode('LOCKUP_LIGHTNING_BLOCK'),
    ),
  );

  // Melt lockup
  layers.push(
    templateNode(
      'template',
      'LockupTrL',
      templateNode(
        'mix',
        'Mix',
        templateNode(
          'function',
          'SmoothStep',
          intTemplateNode(26000),
          intTemplateNode(4000),
        ),
        rawNode('Black'),
        templateNode(
          'mix',
          'Mix',
          templateNode('function', 'NoisySoundLevel'),
          rgbNode({ r: 255, g: 200, b: 0 }),
          rawNode('White'),
        ),
      ),
      rawNode('TrInstant'),
      templateNode('transition', 'TrFade', intNode(500)),
      rawNode('LOCKUP_MELT'),
    ),
  );

  return layers;
}

// ─── Ignition / Retraction Transitions ───

function buildIgnitionTransition(config: BladeConfig): StyleNode {
  const ms = config.ignitionMs;
  switch (config.ignition) {
    case 'standard':
      return templateNode('transition', 'TrWipeIn', intNode(ms));
    case 'scroll':
      return templateNode('transition', 'TrWipe', intNode(ms));
    case 'spark':
      return templateNode(
        'transition',
        'TrWipeSparkTipL',
        rawNode('White'),
        intNode(ms),
      );
    case 'center':
      return templateNode('transition', 'TrCenterWipeIn', intNode(ms));
    case 'wipe':
      return templateNode('transition', 'TrWipe', intNode(ms));
    case 'stutter':
      return templateNode(
        'transition',
        'TrConcat',
        templateNode('transition', 'TrWipe', intNode(Math.round(ms / 3))),
        templateNode('transition', 'TrDelay', intNode(Math.round(ms / 6))),
        templateNode('transition', 'TrWipe', intNode(Math.round(ms / 2))),
      );
    case 'glitch':
      return templateNode(
        'transition',
        'TrConcat',
        templateNode('transition', 'TrFade', intNode(Math.round(ms / 4))),
        templateNode('transition', 'TrDelay', intNode(Math.round(ms / 8))),
        templateNode('transition', 'TrWipeIn', intNode(Math.round(ms / 2))),
      );
    default:
      return templateNode('transition', 'TrWipeIn', intNode(ms));
  }
}

function buildRetractionTransition(config: BladeConfig): StyleNode {
  const ms = config.retractionMs;
  switch (config.retraction) {
    case 'standard':
      return templateNode('transition', 'TrWipeIn', intNode(ms));
    case 'scroll':
      return templateNode('transition', 'TrWipe', intNode(ms));
    case 'fadeout':
      return templateNode('transition', 'TrFade', intNode(ms));
    case 'center':
      return templateNode('transition', 'TrCenterWipeIn', intNode(ms));
    case 'shatter':
      return templateNode('transition', 'TrFade', intNode(ms));
    default:
      return templateNode('transition', 'TrWipeIn', intNode(ms));
  }
}

// ─── Main Builder ───

/**
 * Build a complete ProffieOS style AST from a BladeConfig.
 *
 * The resulting tree structure is:
 *   StylePtr<
 *     Layers<
 *       BaseStyle,
 *       BlastL<...>,
 *       SimpleClashL<...>,
 *       LockupTrL<...>  (normal)
 *       LockupTrL<...>  (drag)
 *       LockupTrL<...>  (lightning)
 *       LockupTrL<...>  (melt)
 *       InOutTrL<ignition, retraction>
 *     >
 *   >()
 */
export function buildAST(config: BladeConfig): StyleNode {
  const baseStyle = buildBaseStyle(config);
  const effectLayers = buildEffectLayers(config);
  const ignitionTr = buildIgnitionTransition(config);
  const retractionTr = buildRetractionTransition(config);

  // InOutTrL layer
  const inOutLayer = templateNode(
    'wrapper',
    'InOutTrL',
    ignitionTr,
    retractionTr,
  );

  // Layers<base, effects..., InOutTrL>
  const layersNode = templateNode(
    'template',
    'Layers',
    baseStyle,
    ...effectLayers,
    inOutLayer,
  );

  // StylePtr<Layers<...>>()
  const stylePtrNode: StyleNode = {
    type: 'wrapper',
    name: 'StylePtr',
    args: [layersNode],
  };

  return stylePtrNode;
}

export type { BladeConfig, RGB };
