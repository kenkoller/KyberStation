// ─── Template Serializer ────────────────────────────────────────────
//
// Utilities for converting a TemplateNode AST back to a ProffieOS
// template string, and for immutably updating nodes at a given path.
//
// Used by the Template Tree Panel (Phase 5D) to support inline editing:
// user edits a value in the tree → AST is updated → serialized back to
// a string → written to bladeStore.importedRawCode.

/**
 * Minimal TemplateNode shape (avoids importing the full package
 * in SSR-test contexts where the ESM re-exports break vitest).
 */
interface TemplateNode {
  name: string;
  args: TemplateNode[];
}

// ─── Serialization ─

/**
 * Serialize a TemplateNode AST back to a ProffieOS template string.
 * Inverse of `parseTemplateString()`.
 *
 * Examples:
 *   { name: 'Rgb', args: [{ name: '255', ... }, { name: '0', ... }, { name: '128', ... }] }
 *   → 'Rgb<255,0,128>'
 *
 *   { name: '42', args: [] }
 *   → '42'
 */
export function templateNodeToString(node: TemplateNode): string {
  if (node.args.length === 0) return node.name;
  const args = node.args.map(templateNodeToString).join(',');
  return `${node.name}<${args}>`;
}

// ─── Immutable AST Updates ─

/**
 * Immutably update a node at the given index path in the AST.
 * Returns a new root with structural sharing — only the spine
 * from root to the target is cloned.
 *
 * @param root    The AST root node.
 * @param path    Index path, e.g. [1, 2] → root.args[1].args[2].
 * @param updater Function that receives the target node and returns
 *                a replacement. The original node is never mutated.
 *
 * @example
 *   // Change the first arg of Rgb<255,0,128> to 200:
 *   updateNodeAtPath(rgb, [0], () => ({ name: '200', args: [] }))
 */
export function updateNodeAtPath(
  root: TemplateNode,
  path: number[],
  updater: (node: TemplateNode) => TemplateNode,
): TemplateNode {
  if (path.length === 0) return updater(root);
  const [head, ...rest] = path;
  if (head < 0 || head >= root.args.length) return root; // out of bounds — no-op
  return {
    ...root,
    args: root.args.map((arg, i) =>
      i === head ? updateNodeAtPath(arg, rest, updater) : arg,
    ),
  };
}

// ─── Path Navigation ─

/**
 * Retrieve a node at the given index path.
 * Returns null if the path is invalid.
 */
export function getNodeAtPath(
  root: TemplateNode,
  path: number[],
): TemplateNode | null {
  let current: TemplateNode = root;
  for (const idx of path) {
    if (idx < 0 || idx >= current.args.length) return null;
    current = current.args[idx];
  }
  return current;
}

// ─── Layer Operations (Phase 5C) ─

/**
 * Move a child of a Layers<> (or any parent) node from one position to another.
 * Returns a new root with the child moved. If the path doesn't point to a valid
 * parent or indices are out of bounds, returns the root unchanged.
 *
 * @param root       The AST root node.
 * @param parentPath Index path to the parent node whose children to reorder.
 * @param fromIndex  Current position of the child.
 * @param toIndex    Target position to move the child to.
 */
export function moveChildAtPath(
  root: TemplateNode,
  parentPath: number[],
  fromIndex: number,
  toIndex: number,
): TemplateNode {
  if (fromIndex === toIndex) return root;
  return updateNodeAtPath(root, parentPath, (parent) => {
    const { args } = parent;
    if (fromIndex < 0 || fromIndex >= args.length) return parent;
    if (toIndex < 0 || toIndex >= args.length) return parent;
    const newArgs = [...args];
    const [moved] = newArgs.splice(fromIndex, 1);
    newArgs.splice(toIndex, 0, moved);
    return { ...parent, args: newArgs };
  });
}

/**
 * Insert a new child into a parent node at the given position.
 *
 * @param root       The AST root node.
 * @param parentPath Index path to the parent node.
 * @param insertAt   Position to insert (0 = before first, args.length = after last).
 * @param child      The new TemplateNode to insert.
 */
export function insertChildAtPath(
  root: TemplateNode,
  parentPath: number[],
  insertAt: number,
  child: TemplateNode,
): TemplateNode {
  return updateNodeAtPath(root, parentPath, (parent) => {
    const pos = Math.max(0, Math.min(insertAt, parent.args.length));
    const newArgs = [...parent.args];
    newArgs.splice(pos, 0, child);
    return { ...parent, args: newArgs };
  });
}

/**
 * Remove a child from a parent node at the given index.
 * Returns the root unchanged if the index is out of bounds.
 *
 * @param root       The AST root node.
 * @param parentPath Index path to the parent node.
 * @param childIndex Index of the child to remove.
 */
export function removeChildAtPath(
  root: TemplateNode,
  parentPath: number[],
  childIndex: number,
): TemplateNode {
  return updateNodeAtPath(root, parentPath, (parent) => {
    if (childIndex < 0 || childIndex >= parent.args.length) return parent;
    // Layers<> must always have at least 1 child (base layer)
    if (parent.name === 'Layers' && parent.args.length <= 1) return parent;
    const newArgs = parent.args.filter((_, i) => i !== childIndex);
    return { ...parent, args: newArgs };
  });
}

/**
 * Duplicate a child in a parent node (insert copy directly after the original).
 *
 * @param root       The AST root node.
 * @param parentPath Index path to the parent node.
 * @param childIndex Index of the child to duplicate.
 */
export function duplicateChildAtPath(
  root: TemplateNode,
  parentPath: number[],
  childIndex: number,
): TemplateNode {
  return updateNodeAtPath(root, parentPath, (parent) => {
    if (childIndex < 0 || childIndex >= parent.args.length) return parent;
    const newArgs = [...parent.args];
    // Deep clone the child to avoid shared references
    const clone = JSON.parse(JSON.stringify(newArgs[childIndex]));
    newArgs.splice(childIndex + 1, 0, clone);
    return { ...parent, args: newArgs };
  });
}

// ─── Color Conversion ─

/**
 * Convert RGB values (0-255) to a hex color string for `<input type="color">`.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.min(255, Math.max(0, Math.round(v)));
  const hex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/**
 * Parse a hex color string (e.g. `#ff0080`) to RGB components.
 * Returns null if the string is not a valid 6-digit hex color.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}
