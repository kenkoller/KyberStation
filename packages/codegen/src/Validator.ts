// ─── AST Validator ───
// Validates a StyleNode AST for structural correctness.

import type { StyleNode, ValidationResult, ValidationError } from './types.js';
import { isKnownTemplate } from './templates/index.js';

// Raw values that are valid ProffieOS identifiers (not templates with angle brackets)
const KNOWN_RAW_VALUES = new Set([
  'White',
  'Black',
  'Red',
  'Green',
  'Blue',
  'Yellow',
  'Orange',
  'Cyan',
  'Magenta',
  'DeepSkyBlue',
  'DodgerBlue',
  'Rainbow',
  'TrInstant',
  'NoisySoundLevel',
  'BatteryLevel',
  'BladeAngle',
  'TwistAngle',
  'LOCKUP_NORMAL',
  'LOCKUP_DRAG',
  'LOCKUP_LIGHTNING_BLOCK',
  'LOCKUP_MELT',
  'EFFECT_BLAST',
  'EFFECT_CLASH',
  'EFFECT_STAB',
  'EFFECT_FORCE',
]);

/**
 * Validate a StyleNode AST for structural correctness.
 *
 * Checks performed:
 * - All template names are recognized (or valid raw identifiers)
 * - Angle brackets balance (recursive)
 * - Node structure is well-formed
 */
export function validateAST(ast: StyleNode): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  validateNode(ast, 'root', errors, warnings);

  // Bracket balance check on emitted output
  const bracketBalance = countBrackets(ast);
  if (bracketBalance !== 0) {
    errors.push({
      path: 'root',
      message: `Angle brackets are unbalanced: ${bracketBalance > 0 ? 'excess <' : 'excess >'} (off by ${Math.abs(bracketBalance)})`,
      severity: 'error',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── Recursive Node Validation ───

function validateNode(
  node: StyleNode,
  path: string,
  errors: ValidationError[],
  warnings: ValidationError[],
): void {
  // Check node has required fields
  if (!node.name) {
    errors.push({
      path,
      message: 'Node is missing a name',
      severity: 'error',
    });
    return;
  }

  if (!node.type) {
    errors.push({
      path,
      message: 'Node is missing a type',
      severity: 'error',
    });
    return;
  }

  // For raw nodes, check if the value is known
  if (node.type === 'raw') {
    if (!KNOWN_RAW_VALUES.has(node.name) && !isKnownTemplate(node.name)) {
      // Might be a number literal used as raw
      if (!/^-?\d+$/.test(node.name)) {
        warnings.push({
          path,
          message: `Unknown raw value: "${node.name}"`,
          severity: 'warning',
        });
      }
    }
    return;
  }

  // For integer nodes with no args, they are bare values — valid
  if (node.type === 'integer' && node.args.length === 0) {
    if (!/^-?\d+$/.test(node.name)) {
      errors.push({
        path,
        message: `Integer node has non-numeric name: "${node.name}"`,
        severity: 'error',
      });
    }
    return;
  }

  // For template/color/function/transition/wrapper/mix nodes with args,
  // check the template name is known
  if (node.args.length > 0 && !isKnownTemplate(node.name) && !KNOWN_RAW_VALUES.has(node.name)) {
    warnings.push({
      path,
      message: `Unknown template name: "${node.name}"`,
      severity: 'warning',
    });
  }

  // Validate children
  for (let i = 0; i < node.args.length; i++) {
    validateNode(node.args[i], `${path}.${node.name}[${i}]`, errors, warnings);
  }
}

// ─── Bracket Balance ───

/**
 * Count angle bracket balance in the AST.
 * Each node with args contributes one < and one >.
 * Returns 0 if balanced, positive if excess <, negative if excess >.
 */
function countBrackets(node: StyleNode): number {
  if (node.type === 'raw' || (node.type === 'integer' && node.args.length === 0)) {
    return 0;
  }

  if (node.args.length === 0) {
    return 0;
  }

  // This node contributes < and > (balanced = 0)
  let balance = 0;
  for (const child of node.args) {
    balance += countBrackets(child);
  }
  return balance;
}
