# Style Authoring Guide

> Step-by-step guide for adding a new blade style to the engine: class
> skeleton, `getColor()` signature, codegen registration, and UI wiring.
> Companion to [CONTRIBUTING.md](./CONTRIBUTING.md) and
> [ARCHITECTURE.md](./ARCHITECTURE.md).

## Overview

A blade style determines the color of each LED at each point in time. Styles are classes that extend `BaseStyle` and implement the `getColor()` method. The engine calls `getColor()` for every LED position on every frame.

## Step 1: Create the Style Class

Create a new file in `packages/engine/src/styles/`:

```typescript
// packages/engine/src/styles/YourStyle.ts

import { BaseStyle } from './BaseStyle';
import type { RGB, StyleContext } from '../types';

export class YourStyle extends BaseStyle {
  readonly id = 'your-style';
  readonly name = 'Your Style';
  readonly description = 'Brief description of what this style looks like';

  getColor(position: number, time: number, context: StyleContext): RGB {
    // position: 0 (hilt) to 1 (tip)
    // time: elapsed seconds
    // context: swing speed, blade angle, twist, sound level, battery, config

    const { baseColor } = context.config;

    // Your color logic here
    return {
      r: baseColor.r,
      g: baseColor.g,
      b: baseColor.b,
    };
  }
}
```

### The StyleContext

Your `getColor` method receives a `StyleContext` with these fields:

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| `time` | number | 0+ | Elapsed time in seconds |
| `swingSpeed` | number | 0–1 | Normalized swing speed (0 = still, 1 = fast) |
| `bladeAngle` | number | -1 to 1 | Blade tilt (-1 = down, 1 = up) |
| `twistAngle` | number | -1 to 1 | Twist rotation |
| `soundLevel` | number | 0–1 | Current audio level |
| `batteryLevel` | number | 0–1 | Battery charge |
| `config` | BladeConfig | — | Full blade config (colors, shimmer, ledCount, etc.) |

### Available Utilities

Import from `LEDArray` or other engine modules:

```typescript
import { lerpColor, scaleColor, hslToRgb, clampColor } from '../LEDArray';
import { perlinNoise2D } from '../noise';
import { createEasingFunction, EASING_PRESETS } from '../easing';
```

## Step 2: Register the Style

Add your style to the registry in `packages/engine/src/styles/index.ts`:

```typescript
import { YourStyle } from './YourStyle';

export const STYLE_REGISTRY: Record<string, new () => BladeStyle> = {
  // ... existing styles
  'your-style': YourStyle,
};
```

The `createStyle(id)` function uses this registry to instantiate styles by ID.

## Step 3: Add Codegen Mapping

In `packages/codegen/src/ASTBuilder.ts`, add the ProffieOS template mapping for your style. This tells the code generator which C++ template to emit:

```typescript
case 'your-style':
  return templateNode('YourProffieTemplate', [
    colorNode(config.baseColor),
    // ... template arguments
  ]);
```

If your style doesn't map to a single ProffieOS template, you can compose multiple templates using `Layers<>`, `Mix<>`, etc.

## Step 4: Add UI Entry

In `apps/web/components/editor/StylePanel.tsx`, add your style to the style selector. The panel reads from the style registry, so it may pick up your style automatically — check the implementation.

## Step 5: Write Tests

Create tests in `packages/engine/tests/styles.test.ts` (or a new test file):

```typescript
describe('YourStyle', () => {
  const style = createStyle('your-style');
  const config = { ...DEFAULT_CONFIG };
  const context: StyleContext = {
    time: 0,
    swingSpeed: 0,
    bladeAngle: 0,
    twistAngle: 0,
    soundLevel: 0,
    batteryLevel: 1,
    config,
  };

  it('returns valid RGB values', () => {
    for (let pos = 0; pos <= 1; pos += 0.1) {
      const color = style.getColor(pos, 0, context);
      expect(color.r).toBeGreaterThanOrEqual(0);
      expect(color.r).toBeLessThanOrEqual(255);
      expect(color.g).toBeGreaterThanOrEqual(0);
      expect(color.g).toBeLessThanOrEqual(255);
      expect(color.b).toBeGreaterThanOrEqual(0);
      expect(color.b).toBeLessThanOrEqual(255);
    }
  });

  it('uses base color from config', () => {
    const color = style.getColor(0.5, 0, context);
    // Verify your style uses the config colors appropriately
  });

  it('responds to swing speed', () => {
    const still = style.getColor(0.5, 1, { ...context, swingSpeed: 0 });
    const fast = style.getColor(0.5, 1, { ...context, swingSpeed: 1 });
    // Verify motion reactivity if applicable
  });
});
```

## Tips

- **Keep it pure.** `getColor()` should be a pure function of its inputs. No side effects, no DOM access, no state mutation.
- **Use the config.** Read colors from `context.config` rather than hardcoding values. Users set their colors in the UI.
- **Respect position.** `position` goes from 0 (hilt) to 1 (tip). Many styles vary along this axis.
- **Use noise for organic effects.** `perlinNoise2D(x, y)` gives smooth random variation. Pass `position` and `time` as coordinates.
- **Clamp your output.** Always return RGB values in 0–255. Use `clampColor()` if your math might exceed bounds.
- **Test edge cases.** Test at position 0, 0.5, and 1. Test at time 0 and after several seconds. Test with extreme swing speeds.

## Example: A Simple Breathing Style

```typescript
export class BreathingStyle extends BaseStyle {
  readonly id = 'breathing';
  readonly name = 'Breathing';
  readonly description = 'Gentle pulsing glow that breathes in and out';

  getColor(position: number, time: number, context: StyleContext): RGB {
    const { baseColor } = context.config;
    // Sine wave oscillation, 2-second cycle
    const brightness = 0.5 + 0.5 * Math.sin(time * Math.PI);
    return {
      r: Math.round(baseColor.r * brightness),
      g: Math.round(baseColor.g * brightness),
      b: Math.round(baseColor.b * brightness),
    };
  }
}
```

## New Style Patterns (Phase 5)

The following patterns were used in the 8 new styles added in Phase 5. They demonstrate advanced techniques beyond the basic `getColor()` pattern.

### Pattern: Accelerometer-Driven (GravityStyle)

Use `context.bladeAngle` to shift the style's center of gravity:

```typescript
getColor(position: number, time: number, context: StyleContext): RGB {
  const { baseColor } = context.config;
  // Map blade angle (-1..1) to a gravity center (0..1)
  const gravityCenter = 0.5 + context.bladeAngle * 0.4;
  // Use EMA smoothing to avoid jitter
  this.smoothCenter += (gravityCenter - this.smoothCenter) * 0.08;
  // Gaussian distribution around the gravity point
  const sigma = 0.2;
  const dist = position - this.smoothCenter;
  const intensity = Math.exp(-(dist * dist) / (2 * sigma * sigma));
  return {
    r: Math.round(baseColor.r * intensity),
    g: Math.round(baseColor.g * intensity),
    b: Math.round(baseColor.b * intensity),
  };
}
```

**Key takeaway:** Store smoothing state as instance fields. Initialize in the constructor, update in `getColor()`. This breaks pure-function purity but is necessary for temporal smoothing.

### Pattern: Particle System (DataStreamStyle, EmberStyle, NeutronStyle)

Manage an array of particle objects with position, speed, and lifetime:

```typescript
private particles: Array<{ pos: number; speed: number; brightness: number }> = [];

getColor(position: number, time: number, context: StyleContext): RGB {
  const { baseColor } = context.config;
  // Advance particles
  for (const p of this.particles) {
    p.pos += p.speed * 0.016; // ~60fps delta
    if (p.pos > 1) p.pos = 0; // Wrap or respawn
  }
  // Find nearest particle contribution
  let brightness = 0;
  for (const p of this.particles) {
    const dist = Math.abs(position - p.pos);
    if (dist < 0.03) brightness += p.brightness * (1 - dist / 0.03);
  }
  brightness = Math.min(1, brightness);
  return {
    r: Math.round(baseColor.r * brightness),
    g: Math.round(baseColor.g * brightness),
    b: Math.round(baseColor.b * brightness),
  };
}
```

**Key takeaway:** Particle systems need pre-allocated arrays (avoid GC pressure). Keep particle count low (7-12) since `getColor()` runs per-LED per-frame.

### Pattern: Cellular Automaton (AutomataStyle)

Maintain a state grid that evolves based on mathematical rules:

```typescript
private cells: number[] = new Array(144).fill(0);
private lastUpdateTime = 0;

getColor(position: number, time: number, context: StyleContext): RGB {
  const { baseColor } = context.config;
  const ledIndex = Math.floor(position * (this.cells.length - 1));
  
  // Evolve the automaton at a fixed rate
  if (time - this.lastUpdateTime > 0.05) {
    const next = [...this.cells];
    for (let i = 1; i < this.cells.length - 1; i++) {
      const neighborhood = (this.cells[i-1] << 2) | (this.cells[i] << 1) | this.cells[i+1];
      next[i] = (30 >> neighborhood) & 1; // Rule 30
    }
    this.cells = next;
    this.lastUpdateTime = time;
  }
  
  const intensity = this.cells[ledIndex];
  return {
    r: Math.round(baseColor.r * intensity),
    g: Math.round(baseColor.g * intensity),
    b: Math.round(baseColor.b * intensity),
  };
}
```

**Key takeaway:** Rate-limit state evolution (don't evolve every `getColor()` call -- evolve once per frame). Use `time` to control update frequency.

### Pattern: Fractal Noise with Events (CandleStyle)

Combine continuous noise with discrete random events:

```typescript
getColor(position: number, time: number, context: StyleContext): RGB {
  // Fractal Brownian motion (3 octaves)
  let flicker = 0;
  for (let octave = 0; octave < 3; octave++) {
    const freq = Math.pow(2, octave);
    const amp = Math.pow(0.5, octave);
    flicker += Math.sin(time * freq * 4 + position * 3) * amp;
  }
  flicker = flicker * 0.3 + 0.7; // Normalize to 0.4-1.0 range

  // Random gust events
  if (Math.random() < 0.001) this.gustIntensity = 0.8;
  if (this.gustIntensity > 0) {
    flicker *= (1 - this.gustIntensity * 0.5);
    this.gustIntensity *= 0.95; // Decay
  }

  // Warm gradient (orange at base, yellow at tip)
  return {
    r: Math.round(255 * flicker),
    g: Math.round((180 + position * 75) * flicker),
    b: Math.round(30 * flicker * (1 - position)),
  };
}
```

**Key takeaway:** Combine deterministic noise (reproducible, smooth) with stochastic events (rare, dramatic). The blend creates organic-feeling effects.
