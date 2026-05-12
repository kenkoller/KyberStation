// ─── Template Transformations ──────────────────────────────────────
//
// Phase 6: AST-to-AST transformations for ProffieOS template editing.
// Four tools matching Fredrik's Style Editor toolbar:
//
//   1. Expand   — expand shorthand (StylePtr, StyleNormalPtr) to full form
//   2. Layerize — wrap non-Layers root in Layers<>
//   3. Argify   — wrap integers/colors in IntArg/RgbArg for OLED editing
//   4. Rotate   — rotate ColorChange color arguments
//
// All transformations are immutable — they return new TemplateNode trees.

/**
 * Minimal TemplateNode shape (same contract as templateSerializer.ts).
 */
interface TemplateNode {
  name: string;
  args: TemplateNode[];
}

// ─── Helpers ─

function node(name: string, args: TemplateNode[] = []): TemplateNode {
  return { name, args };
}

function deepClone(n: TemplateNode): TemplateNode {
  return JSON.parse(JSON.stringify(n));
}

/** Check if a node name looks like a bare integer literal (positive or negative). */
function isIntegerLiteral(name: string): boolean {
  return /^-?\d+$/.test(name);
}

/** Check if this node is a simple named color (Red, Blue, White, etc.). */
function isNamedColor(name: string): boolean {
  return NAMED_COLORS.has(name);
}

/** Check if this node is an Rgb<r,g,b> or Rgb16<r,g,b> call with 3 integer args. */
function isRgbNode(n: TemplateNode): boolean {
  return (
    (n.name === 'Rgb' || n.name === 'Rgb16') &&
    n.args.length === 3 &&
    n.args.every((a) => isIntegerLiteral(a.name) && a.args.length === 0)
  );
}

/** Check if a node represents a color value (named, Rgb, Rgb16, RgbArg, Hue). */
function _isColorValue(n: TemplateNode): boolean {
  return isNamedColor(n.name) || isRgbNode(n) || n.name === 'RgbArg' || n.name === 'Hue';
}
// Exported for potential future use in advanced argify heuristics
export { _isColorValue as isColorValue };

const NAMED_COLORS = new Set([
  'Red', 'Green', 'Blue', 'White', 'Black', 'Yellow', 'Cyan', 'Magenta',
  'Orange', 'Pink', 'DeepSkyBlue', 'DodgerBlue', 'Purple', 'Brown',
  'Gray', 'Silver', 'Gold', 'Lime', 'Maroon', 'Navy', 'Olive', 'Teal',
  'Crimson', 'Coral', 'Salmon', 'Tomato', 'Violet', 'Indigo', 'Turquoise',
  'AliceBlue', 'Aqua', 'Aquamarine', 'Azure', 'Bisque', 'BlanchedAlmond',
  'Chartreuse', 'Cornsilk', 'DarkOrange', 'DeepPink', 'FloralWhite',
  'ForestGreen', 'Fuchsia', 'GhostWhite', 'GreenYellow', 'HoneyDew',
  'HotPink', 'Ivory', 'LavenderBlush', 'LemonChiffon', 'LightCyan',
  'LightPink', 'LightSalmon', 'LightSkyBlue', 'LightYellow', 'MintCream',
  'MistyRose', 'Moccasin', 'NavajoWhite', 'PaleGreen', 'PapayaWhip',
  'PeachPuff', 'RoyalBlue', 'SeaShell', 'Snow', 'SpringGreen', 'SteelBlue',
  'Amber',
]);

// ─── 1. Expand ─

/**
 * Expand shorthand template wrappers into their full form.
 *
 * - StyleNormalPtr<C, CLASH, ignMs, retMs>
 *     → Layers<C, SimpleClashL<CLASH>, InOutTrL<TrWipe<ignMs>, TrWipeIn<retMs>>>
 *
 * - StylePtr<C>  (single-arg shorthand)
 *     → InOutTrL<Layers<C>, TrWipe<300>, TrWipeIn<500>>
 *
 * - StyleFirePtr<C1, C2>
 *     → InOutTrL<Layers<StyleFire<C1, C2>>, TrWipe<300>, TrWipeIn<500>>
 *
 * - StyleRainbowPtr<ignMs, retMs>
 *     → InOutTrL<Layers<Rainbow>, TrWipe<ignMs>, TrWipeIn<retMs>>
 *
 * - StyleStrobePtr<C, CLASH, ignMs, retMs>
 *     → InOutTrL<Layers<Strobe<C, White, 15, 1>, SimpleClashL<CLASH>>,
 *                TrWipe<ignMs>, TrWipeIn<retMs>>
 *
 * Returns the original node unchanged if it's not a shorthand wrapper.
 * Recursively expands children (in case of nested shorthands).
 */
export function expandTemplate(root: TemplateNode): TemplateNode {
  // Recursively expand children first
  const expanded: TemplateNode = {
    ...root,
    args: root.args.map(expandTemplate),
  };

  switch (expanded.name) {
    case 'StyleNormalPtr': {
      // StyleNormalPtr<Color, ClashColor, ignMs, retMs>
      const [color, clashColor, ignMs, retMs] = expanded.args;
      if (!color) return expanded;
      const clashNode = clashColor ?? node('White');
      const ignition = ignMs ?? node('300');
      const retraction = retMs ?? node('500');
      return node('InOutTrL', [
        node('Layers', [
          deepClone(color),
          node('SimpleClashL', [deepClone(clashNode)]),
        ]),
        node('TrWipe', [deepClone(ignition)]),
        node('TrWipeIn', [deepClone(retraction)]),
      ]);
    }

    case 'StylePtr': {
      // StylePtr<Style, ...> — wraps everything in InOutTrL with default transitions
      if (expanded.args.length === 0) return expanded;
      // If it has a single style arg, wrap it
      return node('InOutTrL', [
        node('Layers', expanded.args.map(deepClone)),
        node('TrWipe', [node('300')]),
        node('TrWipeIn', [node('500')]),
      ]);
    }

    case 'StyleFirePtr': {
      // StyleFirePtr<C1, C2, ignMs, retMs>
      const [c1, c2, ignMs, retMs] = expanded.args;
      if (!c1) return expanded;
      const color2 = c2 ?? node('Red');
      const ignition = ignMs ?? node('300');
      const retraction = retMs ?? node('500');
      return node('InOutTrL', [
        node('Layers', [
          node('StyleFire', [deepClone(c1), deepClone(color2)]),
        ]),
        node('TrWipe', [deepClone(ignition)]),
        node('TrWipeIn', [deepClone(retraction)]),
      ]);
    }

    case 'StyleRainbowPtr': {
      // StyleRainbowPtr<ignMs, retMs>
      const [ignMs, retMs] = expanded.args;
      const ignition = ignMs ?? node('300');
      const retraction = retMs ?? node('500');
      return node('InOutTrL', [
        node('Layers', [node('Rainbow')]),
        node('TrWipe', [deepClone(ignition)]),
        node('TrWipeIn', [deepClone(retraction)]),
      ]);
    }

    case 'StyleStrobePtr': {
      // StyleStrobePtr<Color, ClashColor, ignMs, retMs>
      const [color, clashColor, ignMs, retMs] = expanded.args;
      if (!color) return expanded;
      const clashNode = clashColor ?? node('White');
      const ignition = ignMs ?? node('300');
      const retraction = retMs ?? node('500');
      return node('InOutTrL', [
        node('Layers', [
          node('Strobe', [
            deepClone(color),
            node('White'),
            node('15'),
            node('1'),
          ]),
          node('SimpleClashL', [deepClone(clashNode)]),
        ]),
        node('TrWipe', [deepClone(ignition)]),
        node('TrWipeIn', [deepClone(retraction)]),
      ]);
    }

    default:
      return expanded;
  }
}

/**
 * Check whether a template is in an expandable shorthand form.
 */
export function isExpandable(root: TemplateNode): boolean {
  const expandableNames = new Set([
    'StyleNormalPtr', 'StylePtr', 'StyleFirePtr',
    'StyleRainbowPtr', 'StyleStrobePtr',
  ]);
  if (expandableNames.has(root.name)) return true;
  // Check children recursively
  return root.args.some(isExpandable);
}

// ─── 2. Layerize ─

/**
 * Wrap a non-Layers root node in Layers<>.
 *
 * If the root is already a Layers<> node, returns it unchanged.
 * If the root is an InOutTrL<> whose first arg is already Layers<>,
 * returns unchanged (already layerized).
 *
 * Otherwise: root → Layers<root>
 */
export function layerizeTemplate(root: TemplateNode): TemplateNode {
  if (root.name === 'Layers') return root;

  // If it's InOutTrL<Layers<...>, ...>, already layerized
  if (root.name === 'InOutTrL' && root.args.length > 0 && root.args[0].name === 'Layers') {
    return root;
  }

  // If it's InOutTrL<NonLayers, ...>, wrap the first arg in Layers
  if (root.name === 'InOutTrL' && root.args.length > 0 && root.args[0].name !== 'Layers') {
    return {
      ...root,
      args: [
        node('Layers', [deepClone(root.args[0])]),
        ...root.args.slice(1).map(deepClone),
      ],
    };
  }

  return node('Layers', [deepClone(root)]);
}

/**
 * Check whether a template can be layerized (i.e., is not already in Layers<> form).
 */
export function isLayerizable(root: TemplateNode): boolean {
  if (root.name === 'Layers') return false;
  if (root.name === 'InOutTrL' && root.args.length > 0 && root.args[0].name === 'Layers') {
    return false;
  }
  return true;
}

// ─── 3. Argify ─

/**
 * Wrap integer and color arguments in IntArg<N, default> / RgbArg<N, default>
 * for Fett263-style OLED in-hilt editing.
 *
 * Numbering: arguments are numbered sequentially starting from 1.
 * Colors get RgbArg, integers get IntArg.
 *
 * Already-argified values (IntArg, RgbArg) are skipped.
 *
 * @param root The template node to argify
 * @param startArgNum Starting argument number (default 1)
 * @returns The argified template and the next available argument number
 */
export function argifyTemplate(
  root: TemplateNode,
  startArgNum: number = 1,
): { result: TemplateNode; nextArgNum: number } {
  let argNum = startArgNum;

  function argifyNode(n: TemplateNode): TemplateNode {
    // Already wrapped — skip
    if (n.name === 'IntArg' || n.name === 'RgbArg') {
      return n;
    }

    // Bare integer → IntArg<N, value>
    if (isIntegerLiteral(n.name) && n.args.length === 0) {
      const wrapped = node('IntArg', [
        node(String(argNum)),
        node(n.name),
      ]);
      argNum++;
      return wrapped;
    }

    // Named color → RgbArg<N, Color>
    if (isNamedColor(n.name) && n.args.length === 0) {
      const wrapped = node('RgbArg', [
        node(String(argNum)),
        deepClone(n),
      ]);
      argNum++;
      return wrapped;
    }

    // Rgb<r,g,b> → RgbArg<N, Rgb<r,g,b>>
    if (isRgbNode(n)) {
      const wrapped = node('RgbArg', [
        node(String(argNum)),
        deepClone(n),
      ]);
      argNum++;
      return wrapped;
    }

    // Recurse into children
    return {
      ...n,
      args: n.args.map(argifyNode),
    };
  }

  const result = argifyNode(root);
  return { result, nextArgNum: argNum };
}

/**
 * Check whether a template has any non-argified integer or color values.
 */
export function isArgifiable(root: TemplateNode): boolean {
  if (root.name === 'IntArg' || root.name === 'RgbArg') return false;
  if (isIntegerLiteral(root.name) && root.args.length === 0) return true;
  if (isNamedColor(root.name) && root.args.length === 0) return true;
  if (isRgbNode(root)) return true;
  return root.args.some(isArgifiable);
}

// ─── 4. Rotate ─

/**
 * Rotate color arguments in a ColorChange<> template.
 *
 * ColorChange<TrInstant, C1, C2, C3>
 *   → ColorChange<TrInstant, C2, C3, C1>    (direction = 1, forward)
 *   → ColorChange<TrInstant, C3, C1, C2>    (direction = -1, backward)
 *
 * For non-ColorChange templates, searches children recursively for the
 * first ColorChange and rotates that.
 *
 * @param root The template tree
 * @param direction +1 for forward rotation, -1 for backward. Default 1.
 * @returns The rotated template, or unchanged if no ColorChange found.
 */
export function rotateTemplate(root: TemplateNode, direction: number = 1): TemplateNode {
  if (root.name === 'ColorChange' || root.name === 'ColorChangeLX') {
    // First arg is the transition, remaining args are colors
    if (root.args.length < 3) return root; // Need transition + at least 2 colors

    const transition = root.args[0];
    const colors = root.args.slice(1);

    if (colors.length <= 1) return root; // Nothing to rotate

    let rotated: TemplateNode[];
    if (direction >= 0) {
      // Forward: C1,C2,C3 → C2,C3,C1
      rotated = [...colors.slice(1), colors[0]];
    } else {
      // Backward: C1,C2,C3 → C3,C1,C2
      rotated = [colors[colors.length - 1], ...colors.slice(0, -1)];
    }

    return {
      ...root,
      args: [deepClone(transition), ...rotated.map(deepClone)],
    };
  }

  // Recursively search children for ColorChange
  let found = false;
  const newArgs = root.args.map((arg) => {
    if (found) return arg;
    if (hasColorChange(arg)) {
      found = true;
      return rotateTemplate(arg, direction);
    }
    return arg;
  });

  if (found) {
    return { ...root, args: newArgs };
  }

  return root;
}

/**
 * Check whether a template contains a rotatable ColorChange node.
 */
export function isRotatable(root: TemplateNode): boolean {
  if ((root.name === 'ColorChange' || root.name === 'ColorChangeLX') && root.args.length >= 3) {
    return true;
  }
  return root.args.some(isRotatable);
}

/** Recursive check for ColorChange presence. */
function hasColorChange(n: TemplateNode): boolean {
  if (n.name === 'ColorChange' || n.name === 'ColorChangeLX') return true;
  return n.args.some(hasColorChange);
}

// ─── Convenience ─

/**
 * Get a summary of which transformations are applicable to the given template.
 */
export function getApplicableTransformations(root: TemplateNode): {
  expand: boolean;
  layerize: boolean;
  argify: boolean;
  rotate: boolean;
} {
  return {
    expand: isExpandable(root),
    layerize: isLayerizable(root),
    argify: isArgifiable(root),
    rotate: isRotatable(root),
  };
}
