// ─── Ignition / retraction direction: codegen output vs ProffieOS ───
//
// KyberStation used to emit TrWipeIn (tip → hilt) in InOutTrL's ignition
// slot for the default `standard` ignition, so exported firmware would have
// ignited from the tip. ProffieOS 7.12 semantics:
//   - transitions/wipe.h: TrWipe grows color B from the hilt to the tip;
//     TrWipeIn runs tip → hilt.
//   - transitions/center_wipe.h: TrCenterWipe grows from the center out;
//     TrCenterWipeIn from both ends toward the center.
//   - styles/inout_helper.h: InOutTrL<IGNITION, RETRACTION> — the ignition
//     runs off → blade, the retraction blade → off.
//
// Each test takes the transition codegen emits for an id, evaluates it with
// the template-eval interpreter half-way through, and checks where color B
// has reached. The interpreter's own wipe semantics are pinned first, so a
// drift on either side fails here.

import { describe, it, expect } from 'vitest';
import { emitCode, ignitionFromID, retractionFromID } from '@kyberstation/codegen';
import {
  evaluateTemplateString,
  EffectManager,
  PROFFIE_MAX,
} from '@kyberstation/template-eval';
import type { BladeState } from '@kyberstation/template-eval';

const NUM_LEDS = 100;
const MS = 1000;

function bladeState(timeMs: number): BladeState {
  return {
    isOn: true,
    numLeds: NUM_LEDS,
    timeMs,
    deltaMsF: 16,
    swingSpeed: 0,
    bladeAngle: 16384,
    twistAngle: 16384,
    soundLevel: 0,
    batteryLevel: PROFFIE_MAX,
    variation: 0,
  };
}

/** Per-LED fraction (0..1) that has reached color B at `fraction` of `MS`. */
function transitionedAt(transitionCode: string, fraction: number): number[] {
  const tr = evaluateTemplateString(transitionCode);
  const effects = new EffectManager();
  tr.run(bladeState(0), effects); // latches the start time
  tr.run(bladeState(MS * fraction), effects);
  return Array.from({ length: NUM_LEDS }, (_, led) => tr.getInteger(led) / PROFFIE_MAX);
}

const HILT = 5;
const MIDDLE = 50;
const TIP = NUM_LEDS - 6;

function code(node: ReturnType<typeof ignitionFromID>): string {
  return emitCode(node, { minified: true });
}

describe('interpreter wipe semantics match ProffieOS', () => {
  it('TrWipe reaches the hilt half first', () => {
    const t = transitionedAt(`TrWipe<${MS}>`, 0.5);
    expect(t[HILT]).toBe(1);
    expect(t[TIP]).toBe(0);
  });

  it('TrWipeIn reaches the tip half first', () => {
    const t = transitionedAt(`TrWipeIn<${MS}>`, 0.5);
    expect(t[TIP]).toBe(1);
    expect(t[HILT]).toBe(0);
  });

  it('TrCenterWipe starts in the middle; TrCenterWipeIn at the ends', () => {
    const out = transitionedAt(`TrCenterWipe<${MS}>`, 0.5);
    expect(out[MIDDLE]).toBe(1);
    expect(out[0]).toBe(0);
    const inward = transitionedAt(`TrCenterWipeIn<${MS}>`, 0.5);
    expect(inward[0]).toBe(1);
    expect(inward[MIDDLE]).toBe(0);
  });
});

describe('ignition slot: the blade appears where the editor shows it', () => {
  // Each of these engine ignitions fills from the hilt.
  it.each(['standard', 'scroll', 'wipe', 'fracture', 'summon', 'seismic', 'twist', 'no-such-id'])(
    '%s ignites from the hilt',
    (id) => {
      const t = transitionedAt(code(ignitionFromID(id, MS)), 0.5);
      expect(t[HILT]).toBe(1);
      expect(t[TIP]).toBe(0);
    },
  );

  // Center-out engine ignitions.
  it.each(['center', 'stab'])('%s ignites from the middle outward', (id) => {
    const t = transitionedAt(code(ignitionFromID(id, MS)), 0.5);
    expect(t[MIDDLE]).toBe(1);
    expect(t[0]).toBe(0);
    expect(t[NUM_LEDS - 1]).toBe(0);
  });

  it('spark uses the hilt-first spark-tip wipe', () => {
    expect(ignitionFromID('spark', MS).name).toBe('TrWipeSparkTip');
  });

  // TrConcat restarts each part from the same colors, so the last part
  // decides the final sweep; it must run hilt → tip.
  it.each(['stutter', 'glitch', 'flash-fill', 'swing', 'crackle', 'pulse-wave', 'hyperspace'])(
    "%s ends with a hilt-first TrWipe",
    (id) => {
      const node = ignitionFromID(id, MS);
      expect(node.name).toBe('TrConcat');
      expect(node.args[node.args.length - 1]?.name).toBe('TrWipe');
      expect(code(node)).not.toContain('TrWipeIn');
    },
  );
});

describe('retraction slot: the blade goes dark where the editor shows it', () => {
  // Blade → off: color B is "off", so the dark region is where B has reached.
  it.each(['standard', 'scroll', 'no-such-id'])('%s retracts tip first', (id) => {
    const t = transitionedAt(code(retractionFromID(id, MS)), 0.5);
    expect(t[TIP]).toBe(1);
    expect(t[HILT]).toBe(0);
  });

  it.each(['center', 'implode'])('%s collapses toward the middle', (id) => {
    const t = transitionedAt(code(retractionFromID(id, MS)), 0.5);
    expect(t[0]).toBe(1);
    expect(t[MIDDLE]).toBe(0);
  });
});
