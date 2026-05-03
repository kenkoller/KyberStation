// ─── ProffieOS C++ Style Recursive Descent Parser ───
// Parses a token stream into a StyleNode AST.

import type { StyleNode } from '../types.js';
import type { Token } from './Lexer.js';
import { tokenize, filterTokens } from './Lexer.js';
import { lookupTemplate } from '../templates/index.js';

/**
 * Named ProffieOS colour + identifier primitives that parse as
 * standalone identifiers without being templates. We skip these
 * during template validation so they don't trigger spurious "unknown
 * template" warnings.
 *
 * Note: bare `EFFECT_*`, `LOCKUP_*`, and `SaberBase::*` identifiers are
 * already filtered out by prefix in `validateTemplate` below — they
 * don't need to be enumerated here.
 */
const NAMED_PRIMITIVES = new Set([
  // ── PascalCase named colors (ProffieOS color.h) ──
  'White', 'Black', 'Red', 'Green', 'Blue',
  'Yellow', 'Cyan', 'Magenta', 'Orange', 'Pink',
  'DeepSkyBlue', 'DodgerBlue', 'Purple', 'Brown',
  'Gray', 'Silver', 'Gold', 'Lime', 'Maroon',
  'Navy', 'Olive', 'Teal', 'Crimson', 'Coral',
  'Salmon', 'Tomato', 'Violet', 'Indigo',
  'Turquoise', 'MossGreen', 'PaleGreen', 'ForestGreen',
  'LightSkyBlue', 'RoyalBlue', 'SteelBlue',
  // ── Legacy ALL-CAPS color macros (Fredrik Style Editor exports) ──
  'WHITE', 'BLACK', 'RED', 'GREEN', 'BLUE',
  'YELLOW', 'CYAN', 'MAGENTA', 'ORANGE',
  'PURPLE', 'PINK',
  // ── Zero-arg transitions / functions usable as bare identifiers ──
  'TrInstant',
  'BladeAngle', 'TwistAngle', 'BatteryLevel',
  'NoisySoundLevel', 'SoundLevel', 'CenterDistF',
  'ClashImpactF', 'RandomF', 'RandomPerLEDF',
  'Variation', 'Rainbow', 'RgbCycle',
  'AltF',
  // ── 0-arg ProffieOS sound / blaster / haptic helpers (Sprint 5A) ──
  'SmoothSoundLevel', 'NoisySoundLevelCompat', 'VolumeLevel',
  'WavNum', 'BlasterModeF', 'BlasterCharge', 'BulletCount',
  // ── ProffieOS preset-builder macros (parens, not angle brackets) ──
  'EASYBLADE', 'SIMPLE_BLADE', 'STANDARD_BLADE',
  // ── C++ keywords that may appear in `using ALIAS = Layers<…>;` declarations ──
  'using',
]);

/**
 * Templates that accept a variable number of arguments. The registry
 * declares a representative count, but ProffieOS allows more: Layers
 * takes a base style + any number of effect layers, Gradient takes any
 * number of colour stops, TrConcat chains 2+ transitions, etc. Treat
 * arg-count mismatches for these as informational, not warnings.
 *
 * `min` is the minimum arg count required for the template to be
 * structurally meaningful — a Gradient with 1 color is degenerate, a
 * Layers with 0 children has no base style. Anything below the minimum
 * still warns; anything at or above it is silent.
 */
const VARIADIC_TEMPLATES = new Map<string, number>([
  // ── Compositors ──
  ['Layers', 1],
  ['Gradient', 2],
  // ── Color templates with variadic color stops ──
  ['Stripes', 4],
  ['StripesX', 3],
  ['HardStripes', 4],
  ['ColorChange', 2],
  ['ColorSelect', 3],
  ['ColorSequence', 2],
  ['ColorChangeL', 2],
  ['Sequence', 2],
  // ── Transitions ──
  ['TrConcat', 2],
  ['TrJoin', 2],
  ['TrJoinR', 2],
  ['TrSelect', 2],
  ['TrRandom', 1],
  ['TrSequence', 1],
  // ── Layer compositors ──
  ['EffectSequence', 2],
  ['AlphaMixL', 3],
  // ── Function combinators ──
  ['Sum', 2],
  ['Mult', 2],
  // ── IntSelect / IntSelectX (variadic select-by-index — Sprint 5A) ──
  // First arg is a SELECTION function; remaining N args are the int (or
  // function) values to choose from. Minimum 2 args (selection + at least one).
  ['IntSelect', 2],
  ['IntSelectX', 2],
  // ── LayerFunctions composer (Sprint 5A) ──
  // Per functions/layer_functions.h: LayerFunctions<F1, F2, ...>.
  ['LayerFunctions', 2],
  // ── Pre-OS7 form: TransitionEffectL<COLOR, TR_IN, TR_OUT, EFFECT>
  //    OS7 form: TransitionEffectL<TRANSITION, EFFECT>
  //    Both forms are valid; treat the 4-arg form as a "wider variadic".
  ['TransitionEffectL', 2],
  // ── Sprint 5A — multi-trigger TransitionEffectL extension ──
  // MultiTransitionEffectL<TRANSITION, EFFECT, N=3>; N defaults to 3.
  ['MultiTransitionEffectL', 2],
  // ── WavLen / EffectPosition / TimeSinceEffect — 0 or 1 EFFECT arg ──
  // Per ProffieOS source these accept either WavLen<> (uses last-detected
  // effect) OR WavLen<EFFECT>. Min 0 to silence the 1-arg-default case.
  ['WavLen', 0],
  ['EffectPosition', 0],
  // ── Sprint 5A — center-wipe optional POSITION arg (defaults to 16384) ──
  ['TrCenterWipeX', 1],
  ['TrCenterWipeInX', 1],
  ['TrCenterWipe', 1],
  ['TrCenterWipeIn', 1],
  // ── Sprint 5A — wipe-spark-tip optional SIZE arg (defaults to 400) ──
  ['TrWipeSparkTip', 2],
  ['TrWipeSparkTipX', 2],
  ['TrWipeInSparkTip', 2],
  ['TrWipeInSparkTipX', 2],
  ['TrCenterWipeSpark', 2],
  ['TrCenterWipeSparkX', 2],
  ['TrCenterWipeInSpark', 2],
  ['TrCenterWipeInSparkX', 2],
  // ── Sprint 5A — TrColorCycle optional START_RPM/END_RPM (defaults 0/6000) ──
  ['TrColorCycle', 1],
  ['TrColorCycleX', 1],
]);

export interface ParseError {
  message: string;
  position: number;
}

export interface ParseWarning {
  message: string;
  position: number;
  /** Template name the warning applies to, when applicable. */
  template?: string;
}

export interface ParseResult {
  ast: StyleNode | null;
  errors: ParseError[];
  /** Non-fatal notices — unknown template names, arg-count mismatches, etc. */
  warnings: ParseWarning[];
}

class Parser {
  private tokens: Token[];
  private pos: number = 0;
  private errors: ParseError[] = [];
  private warnings: ParseWarning[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: 'EOF', value: '', position: -1 };
  }

  private advance(): Token {
    const token = this.tokens[this.pos];
    this.pos++;
    return token ?? { type: 'EOF', value: '', position: -1 };
  }

  private expect(type: Token['type']): Token | null {
    const token = this.peek();
    if (token.type === type) {
      return this.advance();
    }
    this.errors.push({
      message: `Expected ${type}, got ${token.type} '${token.value}'`,
      position: token.position,
    });
    return null;
  }

  /**
   * Parse a template expression:
   *   TemplateName<arg1, arg2, ...>
   *   TemplateName<arg1, arg2, ...>()
   *   TemplateName (no args, e.g., Rainbow, Black)
   *   INTEGER
   */
  parseExpression(): StyleNode | null {
    const token = this.peek();

    // Integer literal
    if (token.type === 'INTEGER') {
      this.advance();
      return {
        type: 'integer',
        name: 'Int',
        args: [{ type: 'raw', name: token.value, args: [] }],
      };
    }

    // Template name
    if (token.type === 'TEMPLATE_NAME') {
      const nameToken = this.advance();
      const name = nameToken.value;

      // Check for angle bracket arguments
      if (this.peek().type === 'OPEN_ANGLE') {
        this.advance(); // consume '<'
        const args: StyleNode[] = [];

        // Parse comma-separated arguments
        while (this.peek().type !== 'CLOSE_ANGLE' && this.peek().type !== 'EOF') {
          const arg = this.parseExpression();
          if (arg) {
            args.push(arg);
          } else {
            // Skip to next comma or close angle on error
            while (
              this.peek().type !== 'COMMA' &&
              this.peek().type !== 'CLOSE_ANGLE' &&
              this.peek().type !== 'EOF'
            ) {
              this.advance();
            }
          }

          if (this.peek().type === 'COMMA') {
            this.advance(); // consume ','
          }
        }

        // Missing close at EOF: real-world Fett263 sources sometimes ship
        // with a stray-bracket typo (e.g. `BC_Ronin_fett263_7.x.h` is
        // under-closed by one `>`). Downgrade to a warning so the partial
        // AST still flows through; the import path preserves the raw code
        // verbatim regardless of reconstruction fidelity.
        if (this.peek().type === 'CLOSE_ANGLE') {
          this.advance();
        } else {
          this.warnings.push({
            message: `Unclosed angle bracket in "${name}<...>" — source may be missing a '>'.`,
            position: nameToken.position,
            template: name,
          });
        }

        // Optional trailing () — e.g., StylePtr<...>()
        if (this.peek().type === 'OPEN_PAREN') {
          this.advance();
          this.expect('CLOSE_PAREN');
        }

        // ── Validation (v0.10.0) ──
        // Non-fatal warnings only — validation never prevents a parse from
        // succeeding. Unknown templates still parse as generic nodes so
        // downstream can at least display them.
        this.validateTemplate(name, args, nameToken.position);

        return {
          type: this.classifyNode(name),
          name,
          args,
        };
      }

      // C-preprocessor macro syntax: NAME(arg1, arg2, ...)
      // ProffieOS preset-builder macros from `style_defaults.h` —
      // EASYBLADE, SIMPLE_BLADE, STANDARD_BLADE — invoke with parens
      // rather than angle brackets. Parse the same way as <args>; the
      // round-trip path preserves the original raw code verbatim, so
      // we only need a non-erroring parse to keep the import flow alive.
      if (this.peek().type === 'OPEN_PAREN') {
        this.advance(); // consume '('
        const args: StyleNode[] = [];

        while (this.peek().type !== 'CLOSE_PAREN' && this.peek().type !== 'EOF') {
          const arg = this.parseExpression();
          if (arg) {
            args.push(arg);
          } else {
            while (
              this.peek().type !== 'COMMA' &&
              this.peek().type !== 'CLOSE_PAREN' &&
              this.peek().type !== 'EOF'
            ) {
              this.advance();
            }
          }
          if (this.peek().type === 'COMMA') {
            this.advance();
          }
        }

        if (this.peek().type === 'CLOSE_PAREN') {
          this.advance();
        } else {
          this.warnings.push({
            message: `Unclosed paren in "${name}(...)" — source may be missing a ')'.`,
            position: nameToken.position,
            template: name,
          });
        }

        this.validateTemplate(name, args, nameToken.position);

        return {
          type: this.classifyNode(name),
          name,
          args,
        };
      }

      // No angle brackets — zero-arg template (Rainbow, Black, etc.)
      this.validateTemplate(name, [], nameToken.position);
      return {
        type: this.classifyNode(name),
        name,
        args: [],
      };
    }

    // Unexpected token
    this.errors.push({
      message: `Unexpected token: ${token.type} '${token.value}'`,
      position: token.position,
    });
    this.advance();
    return null;
  }

  /**
   * Classify a node type based on its template name.
   */
  private classifyNode(name: string): StyleNode['type'] {
    const tmpl = lookupTemplate(name);
    if (!tmpl) return 'template';

    // ── Color templates (per registry categorisation) ──
    // The base set covers most common templates; the suffix-based fallback
    // below catches the long tail (HumpFlickerL, RandomPerLEDFlickerL, etc.).
    if (
      name === 'Rgb' || name === 'Rgb16' || name === 'RgbArg' || name === 'RgbCycle' ||
      name === 'Mix' || name === 'Gradient' ||
      name === 'AudioFlicker' || name === 'BrownNoiseFlicker' ||
      name === 'RandomFlicker' || name === 'RandomPerLEDFlicker' ||
      name === 'StyleFire' || name === 'StaticFire' || name === 'Pulsing' ||
      name === 'Stripes' || name === 'StripesX' || name === 'HardStripes' ||
      name === 'HumpFlicker' || name === 'Rainbow' ||
      name === 'RotateColorsX' || name === 'FireConfig' ||
      name === 'ColorChange' || name === 'ColorSelect' || name === 'ColorSequence' ||
      name === 'ColorCycle' || name === 'Sparkle' || name === 'Blinking' ||
      name === 'RandomBlink' || name === 'Strobe' || name === 'Cylon' ||
      name === 'PixelateX' || name === 'Sequence'
    ) {
      return 'color';
    }
    if (name.startsWith('Tr') || name === 'TrConcat') return 'transition';
    if (name === 'Int' || name === 'IntArg' || name === 'Scale' || name === 'Sin' ||
        name === 'SwingSpeed' || name === 'SwingAcceleration' || name === 'Bump' ||
        name === 'SmoothStep' || name === 'LinearSectionF' || name === 'SliceF' ||
        name === 'ModF' || name === 'ClampF' || name === 'HoldPeakF' ||
        name === 'ThresholdPulseF' || name === 'LockupPulseF' || name === 'ChangeSlowly' ||
        name === 'IsLessThan' || name === 'IsGreaterThan' || name === 'Sum' ||
        name === 'Mult' || name === 'Ifon' || name === 'InOutFunc' ||
        name === 'IncrementModuloF' || name === 'IncrementWithReset' ||
        name === 'EffectIncrementF' || name === 'EffectPosition' ||
        name === 'TimeSinceEffect' || name === 'EffectRandomF' || name === 'Trigger' ||
        name === 'Variation' || name === 'NoisySoundLevel' || name === 'SoundLevel' ||
        name === 'BatteryLevel' || name === 'BladeAngle' || name === 'TwistAngle' ||
        name === 'CenterDistF' || name === 'ClashImpactF' || name === 'ClashImpactFX' ||
        name === 'SlowNoise' || name === 'RandomF' || name === 'RandomPerLEDF' ||
        name === 'HumpFlickerFX' || name === 'SparkleF' || name === 'StrobeF' ||
        name === 'IgnitionTime' || name === 'RetractionTime' || name === 'BendTimePowInvX' ||
        name === 'WavLen' ||
        // ── Sprint 5A function additions ──
        name === 'Subtract' || name === 'Divide' || name === 'IsBetween' ||
        name === 'Percentage' || name === 'IntSelect' || name === 'IntSelectX' ||
        name === 'EffectPulse' || name === 'EffectPulseF' || name === 'LayerFunctions' ||
        name === 'SmoothSoundLevel' || name === 'NoisySoundLevelCompat' ||
        name === 'VolumeLevel' || name === 'WavNum' ||
        name === 'BlasterModeF' || name === 'BlasterCharge' || name === 'BulletCount' ||
        name === 'BladeAngleX' || name === 'TwistAcceleration' ||
        name === 'MarbleF' || name === 'CircularSectionF' || name === 'BrownNoiseF' ||
        name === 'BlastF' || name === 'BlastFadeoutF' || name === 'OriginalBlastF' ||
        name === 'OnsparkF' || name === 'ReadPinF' || name === 'AnalogReadPinF' ||
        name === 'BlinkingF' || name === 'RandomBlinkF' ||
        name === 'IncrementF' || name === 'IncrementModulo') {
      return 'function';
    }
    if (
      name === 'StylePtr' || name === 'StyleNormalPtr' || name === 'StyleFirePtr' ||
      name === 'StyleStrobePtr' || name === 'StyleRainbowPtr' || name === 'ChargingStylePtr' ||
      name === 'IgnitionDelay' || name === 'RetractionDelay' || name === 'DimBlade' ||
      name === 'InOutHelper' || name === 'InOutHelperX' || name === 'InOutSparkTip' ||
      name === 'InOutTr' || name === 'InOutTrL' || name === 'Layers' ||
      name === 'LengthFinder' || name === 'DisplayStyle' || name === 'ByteOrderStyle'
    ) {
      return 'wrapper';
    }
    if (name === 'Mix') return 'mix';

    // ── Suffix-based fallback for the long tail of layer / function names ──
    if (name.endsWith('L')) return 'template'; // overlay layers (BlastL, AlphaL, ResponsiveBlastL, etc.)
    if (name.endsWith('F') || name.endsWith('FX')) return 'function';

    return 'template';
  }

  getErrors(): ParseError[] {
    return this.errors;
  }

  getWarnings(): ParseWarning[] {
    return this.warnings;
  }

  /**
   * Non-fatal validation of a parsed template invocation.
   *
   * Emits a warning when:
   *   - The template name isn't in our known registry. Most common cause:
   *     user typo ("StyleFIRE" vs "StyleFire") or an OS7 primitive we
   *     haven't registered yet. We still parse the node through —
   *     ProffieOS's compiler is the ultimate authority.
   *   - The argument count doesn't match the registered `argTypes.length`.
   *     A mismatch usually indicates the user pasted code from a different
   *     ProffieOS version, or a typo. Keeping this as a warning lets
   *     forward-compatible templates parse without noise.
   */
  private validateTemplate(
    name: string,
    args: StyleNode[],
    position: number,
  ): void {
    // Skip numeric-literal-passthrough nodes the parser emits (integer
    // literals take the path through parseExpression's INTEGER branch,
    // but the trailing raw-literal "Int<123>" wrap comes through here).
    // Also skip reserved ProffieOS primitives: the SaberBase enum values,
    // effect / lockup enum tokens, and named colours (White, Red, etc.)
    // which parse as standalone identifiers rather than proper templates.
    //
    // Edit-Mode arg-slot identifiers (`BASE_COLOR_ARG`, `LOCKUP_POSITION_ARG`,
    // `IGNITION_OPTION2_ARG`, etc.) appear bare as the FIRST argument to
    // `RgbArg<>` / `IntArg<>`. They're #defined indices in
    // `style_defaults.h`, not templates. Recognized by the `_ARG` suffix.
    if (
      name.startsWith('SaberBase::') ||
      name.startsWith('EFFECT_') ||
      name.startsWith('LOCKUP_') ||
      name.startsWith('OFF_') ||
      name === 'SaberBase' ||  // appears bare when ::-splitting is disabled
      name.endsWith('_ARG') ||  // Fett263 OS7 Edit-Mode arg slots
      NAMED_PRIMITIVES.has(name)
    ) {
      return;
    }

    const registered = lookupTemplate(name);
    if (!registered) {
      this.warnings.push({
        message: `Unknown template "${name}" — may be a typo or an OS7 feature not yet registered in KyberStation.`,
        position,
        template: name,
      });
      return;
    }

    const expected = registered.argTypes.length;
    const minArgs = VARIADIC_TEMPLATES.get(name);
    if (minArgs !== undefined) {
      // Variadic — only warn if the user supplied FEWER than the
      // template's minimum (per VARIADIC_TEMPLATES table).
      if (args.length < minArgs) {
        this.warnings.push({
          message: `Template "${name}" expects at least ${minArgs} arg${
            minArgs === 1 ? '' : 's'
          }, got ${args.length}.`,
          position,
          template: name,
        });
      }
      return;
    }
    if (expected > 0 && args.length !== expected) {
      this.warnings.push({
        message: `Template "${name}" expects ${expected} arg${
          expected === 1 ? '' : 's'
        }, got ${args.length}. Emitted code may fail to compile.`,
        position,
        template: name,
      });
    }
  }
}

/**
 * Parse a ProffieOS C++ style code string into a StyleNode AST.
 */
export function parseStyleCode(code: string): ParseResult {
  const rawTokens = tokenize(code);
  const tokens = filterTokens(rawTokens);

  const parser = new Parser(tokens);
  const ast = parser.parseExpression();

  return {
    ast,
    errors: parser.getErrors(),
    warnings: parser.getWarnings(),
  };
}
