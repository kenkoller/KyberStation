// ─── useCommitCeremony — motion primitive pure-logic tests ───
//
// The hook's stateful side (useState + useEffect + matchMedia
// listeners) is exercised by manual visual QA per the task spec.
// What's unit-testable here is the pure mapping from granular
// phase strings to ceremonial stages — `phaseToStage` is what any
// consumer actually imports to bridge their own state machine into
// the ceremony, so drift there would silently break the envelope.
//
// Node environment — matches vitest.config.ts (no jsdom). We do not
// render React here.

import { describe, it, expect } from 'vitest';
import { phaseToStage } from '../useCommitCeremony';

describe('phaseToStage — CardWriter phase → ceremony stage mapping', () => {
  it('maps idle + selecting to idle (pre-ceremony)', () => {
    expect(phaseToStage('idle')).toBe('idle');
    // `selecting` is the browser directory-picker dialog — the user
    // hasn't committed to anything yet, so the envelope stays dark.
    expect(phaseToStage('selecting')).toBe('idle');
  });

  it('maps detecting + backing_up to prepared (priming ring)', () => {
    expect(phaseToStage('detecting')).toBe('prepared');
    expect(phaseToStage('backing_up')).toBe('prepared');
  });

  it('maps writing + verifying to writing (amber halo lit)', () => {
    expect(phaseToStage('writing')).toBe('writing');
    // Verification is still part of the hot-path commit in
    // user-perception terms — the halo stays on until the full
    // "verified" triumph.
    expect(phaseToStage('verifying')).toBe('writing');
  });

  it('maps done to verified (green triumph flash)', () => {
    expect(phaseToStage('done')).toBe('verified');
  });

  it('maps error to error (red scold flash)', () => {
    expect(phaseToStage('error')).toBe('error');
  });

  it('falls back to idle for unknown phase strings', () => {
    // Defensive: consumers might extend their state machine before
    // updating phaseToStage; unknown strings should not render a
    // broken envelope. They render as `idle` (dark chrome).
    expect(phaseToStage('' as string)).toBe('idle');
    expect(phaseToStage('some_future_phase')).toBe('idle');
  });

  it('returns exactly one of the 5 ceremonial stages', () => {
    // Lock the full mapping surface — if we add a new case we force
    // the type-union to stay synced.
    const valid = new Set(['idle', 'prepared', 'writing', 'verified', 'error']);
    const phases = [
      'idle',
      'selecting',
      'detecting',
      'backing_up',
      'writing',
      'verifying',
      'done',
      'error',
      'garbage',
    ];
    for (const p of phases) {
      expect(valid.has(phaseToStage(p))).toBe(true);
    }
  });
});
