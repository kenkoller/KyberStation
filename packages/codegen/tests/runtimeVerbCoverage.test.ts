// ─── Runtime-preset coverage over the gallery ────────────────────────
//
// Runs mapBladeConfigToRuntimeStyle() over every gallery preset and tallies
// fidelity × verb × gallery section. Source of the numbers in
// docs/research/RUNTIME_PRESET_COVERAGE_2026-09-24.md. To reprint the
// tables:
//
//   KS_PRINT_RUNTIME_COVERAGE=1 pnpm --filter @kyberstation/codegen exec \
//     vitest run tests/runtimeVerbCoverage.test.ts
//
// The assertions are deliberately loose (totals add up, every string is
// valid, the big buckets exist) so preset-library edits in other lanes
// don't break this file; the pinned mapping behavior lives in
// runtimeVerbs.test.ts.

import { describe, it, expect } from 'vitest';
import { ALL_PRESETS } from '@kyberstation/presets';
import {
  mapBladeConfigToRuntimeStyle,
  isValidRuntimeStyleString,
  type RuntimeFidelity,
  type RuntimeVerb,
} from '../src/emitters/runtimeVerbs.js';

const FIDELITIES: RuntimeFidelity[] = ['faithful', 'approximate', 'colors-only'];

interface Row {
  id: string;
  style: string;
  section: string;
  verb: RuntimeVerb;
  fidelity: RuntimeFidelity;
}

function tally<K extends string>(rows: Row[], key: (r: Row) => K): Map<K, Row[]> {
  const out = new Map<K, Row[]>();
  for (const r of rows) {
    const k = key(r);
    out.set(k, [...(out.get(k) ?? []), r]);
  }
  return out;
}

function pct(n: number, total: number): string {
  return `${((100 * n) / total).toFixed(1)}%`;
}

function renderTables(rows: Row[]): string {
  const total = rows.length;
  const lines: string[] = [];
  const byFidelity = tally(rows, (r) => r.fidelity);
  lines.push('| Fidelity | Presets | Share |', '|---|---:|---:|');
  for (const f of FIDELITIES) {
    const n = byFidelity.get(f)?.length ?? 0;
    lines.push(`| ${f} | ${n} | ${pct(n, total)} |`);
  }
  lines.push(`| **total** | **${total}** | |`, '');

  const byVerb = [...tally(rows, (r) => r.verb)].sort((a, b) => b[1].length - a[1].length);
  lines.push('| Verb | Presets | faithful | approximate | colors-only |', '|---|---:|---:|---:|---:|');
  for (const [verb, list] of byVerb) {
    const c = (f: RuntimeFidelity) => list.filter((r) => r.fidelity === f).length;
    lines.push(`| \`${verb}\` | ${list.length} | ${c('faithful')} | ${c('approximate')} | ${c('colors-only')} |`);
  }
  lines.push('');

  const bySection = [...tally(rows, (r) => r.section)].sort((a, b) => b[1].length - a[1].length);
  lines.push('| Gallery section | Presets | faithful | approximate | colors-only |', '|---|---:|---:|---:|---:|');
  for (const [section, list] of bySection) {
    const c = (f: RuntimeFidelity) => list.filter((r) => r.fidelity === f).length;
    lines.push(`| ${section} | ${list.length} | ${c('faithful')} | ${c('approximate')} | ${c('colors-only')} |`);
  }
  lines.push('');

  const byStyle = [...tally(rows, (r) => r.style)].sort((a, b) => b[1].length - a[1].length);
  lines.push('| Style | Presets | Verb | Fidelity |', '|---|---:|---|---|');
  for (const [style, list] of byStyle) {
    const verbs = [...new Set(list.map((r) => r.verb))].join(', ');
    const fids = [...tally(list, (r) => r.fidelity)].map(([f, l]) => `${f} ${l.length}`).join(', ');
    lines.push(`| ${style} | ${list.length} | ${verbs} | ${fids} |`);
  }
  return lines.join('\n');
}

describe('runtime-preset coverage over ALL_PRESETS', () => {
  const rows: Row[] = ALL_PRESETS.map((p) => {
    const m = mapBladeConfigToRuntimeStyle(p.config);
    expect(isValidRuntimeStyleString(m.styleString)).toBe(true);
    return {
      id: p.id,
      style: p.config.style,
      section: p.continuity ?? 'canon',
      verb: m.verb,
      fidelity: m.fidelity,
    };
  });

  it('maps every gallery preset exactly once', () => {
    expect(rows).toHaveLength(ALL_PRESETS.length);
    const byFidelity = tally(rows, (r) => r.fidelity);
    const sum = FIDELITIES.reduce((n, f) => n + (byFidelity.get(f)?.length ?? 0), 0);
    expect(sum).toBe(ALL_PRESETS.length);
  });

  it('never needs the builtin fallback in custom-styles mode', () => {
    expect(rows.filter((r) => r.verb === 'builtin')).toEqual([]);
  });

  it('uses the animated verbs, not just advanced', () => {
    const verbs = new Set(rows.map((r) => r.verb));
    for (const v of ['advanced', 'unstable', 'fire', 'cycle', 'rainbow'] as RuntimeVerb[]) {
      expect(verbs.has(v)).toBe(true);
    }
  });

  it('prints the report tables on request', () => {
    const md = renderTables(rows);
    expect(md).toContain('| **total** |');
    if (process.env.KS_PRINT_RUNTIME_COVERAGE) {
      console.log(`\n${md}\n`);
    }
  });
});
