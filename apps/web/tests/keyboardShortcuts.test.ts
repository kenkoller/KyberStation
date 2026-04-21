// ─── Keyboard shortcut registry regression tests ────────────────────────────
//
// `@/lib/keyboardShortcuts` is the single source of truth shared between
// `useKeyboardShortcuts` (the event dispatcher) and the
// `KeyboardShortcutsModal` (the help overlay). These tests pin the shape
// of the registry so accidental drift — duplicated keys, missing effects,
// wrong sustained flags — fails loudly in CI.

import { describe, it, expect } from 'vitest';
import {
  EFFECT_SHORTCUTS,
  EFFECT_SHORTCUTS_BY_CODE,
  SUSTAINED_EFFECT_IDS,
  BLADE_CONTROL_SHORTCUTS,
  EDITOR_SHORTCUTS,
} from '../lib/keyboardShortcuts';

describe('EFFECT_SHORTCUTS', () => {
  it('exposes 16 effect shortcuts (12 one-shot + 4 sustained)', () => {
    expect(EFFECT_SHORTCUTS).toHaveLength(16);
    const oneShot = EFFECT_SHORTCUTS.filter((s) => !s.sustained);
    const sustained = EFFECT_SHORTCUTS.filter((s) => s.sustained);
    expect(oneShot).toHaveLength(12);
    expect(sustained).toHaveLength(4);
  });

  it('has no duplicate keys, codes, or effect ids', () => {
    const keys = EFFECT_SHORTCUTS.map((s) => s.key);
    const codes = EFFECT_SHORTCUTS.map((s) => s.code);
    const effects = EFFECT_SHORTCUTS.map((s) => s.effect);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(codes).size).toBe(codes.length);
    expect(new Set(effects).size).toBe(effects.length);
  });

  it('every entry has a matching key ↔ code pair (KeyX ↔ X)', () => {
    for (const s of EFFECT_SHORTCUTS) {
      expect(s.code).toBe(`Key${s.key}`);
    }
  });

  it('every entry has a non-empty label and effect id', () => {
    for (const s of EFFECT_SHORTCUTS) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.effect.length).toBeGreaterThan(0);
    }
  });

  it('marks exactly the known sustained effects as sustained', () => {
    const sustained = new Set(
      EFFECT_SHORTCUTS.filter((s) => s.sustained).map((s) => s.effect),
    );
    expect(sustained).toEqual(new Set(['lockup', 'drag', 'melt', 'lightning']));
  });
});

describe('EFFECT_SHORTCUTS_BY_CODE', () => {
  it('indexes every shortcut by its code', () => {
    expect(EFFECT_SHORTCUTS_BY_CODE.size).toBe(EFFECT_SHORTCUTS.length);
    for (const s of EFFECT_SHORTCUTS) {
      expect(EFFECT_SHORTCUTS_BY_CODE.get(s.code)).toBe(s);
    }
  });

  it('resolves KeyC → clash', () => {
    expect(EFFECT_SHORTCUTS_BY_CODE.get('KeyC')?.effect).toBe('clash');
  });
});

describe('SUSTAINED_EFFECT_IDS', () => {
  it('contains the four sustained-effect ids', () => {
    expect(SUSTAINED_EFFECT_IDS).toEqual(
      new Set(['lockup', 'drag', 'melt', 'lightning']),
    );
  });
});

describe('BLADE_CONTROL_SHORTCUTS', () => {
  it('includes the Space → Ignite/Retract binding', () => {
    const space = BLADE_CONTROL_SHORTCUTS.find((r) => r.key === 'Space');
    expect(space).toBeDefined();
    expect(space?.label).toMatch(/ignite/i);
  });
});

describe('EDITOR_SHORTCUTS', () => {
  it('advertises the ? and F1 help-overlay shortcuts', () => {
    const keys = EDITOR_SHORTCUTS.map((r) => r.key);
    expect(keys).toContain('?');
    expect(keys).toContain('F1');
  });
});
