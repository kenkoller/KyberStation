import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./apps/web/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: 'rgb(var(--bg-deep) / <alpha-value>)',
          primary: 'rgb(var(--bg-primary) / <alpha-value>)',
          secondary: 'rgb(var(--bg-secondary) / <alpha-value>)',
          surface: 'rgb(var(--bg-surface) / <alpha-value>)',
          card: 'rgb(var(--bg-card) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          dim: 'var(--accent-dim)',
          border: 'var(--accent-border)',
          warm: 'rgb(var(--accent-warm) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          light: 'var(--border-light)',
        },
      },
      fontFamily: {
        // UX North Star §6: Inter for chrome + labels.
        sans: [
          'var(--font-inter)',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
        // UX North Star §6: JetBrains Mono for all data / numerics / code /
        // identifiers / ceremonial display. Replaces IBM Plex Mono.
        mono: [
          'var(--font-jetbrains-mono)',
          'JetBrains Mono',
          'SF Mono',
          'Fira Code',
          'monospace',
        ],
        cinematic: ['Orbitron', 'Exo 2', 'sans-serif'],
        'sw-body': ['Exo 2', 'JetBrains Mono', 'sans-serif'],
        aurebesh: ['FT Aurebesh', 'monospace'],
      },
      borderRadius: {
        panel: '6px',
        // W12 (2026-04-22): existing codebase uses `rounded-chrome` +
        // `rounded-interactive` as class names assuming they map to
        // the CSS variables defined in globals.css. They previously
        // didn't resolve (no Tailwind token); `rounded-chrome` was
        // silently rendering 0px. Wiring them up here so the two
        // radius scales are consistent everywhere the classes appear.
        chrome: 'var(--r-chrome)',
        interactive: 'var(--r-interactive)',
      },
      screens: {
        // Phase 4 PR #1 (2026-04-30): `phone-sm` adds a tighter reflow inflection
        // INSIDE MobileShell (≤479px) without changing the existing macro-shell
        // switch points (600 / 1024 / 1440). Per docs/mobile-design.md §1.
        // Consumed by Phase 4 PRs #2-#10 (Sheet primitive, ChipStrip, action bar
        // icon-only mode, edge-to-edge sheets, etc.).
        'phone-sm': { max: '479px' },
        phone: { max: '599px' },
        tablet: { min: '600px', max: '1023px' },
        desktop: '1024px',
        wide: '1440px',
      },
    },
  },
  plugins: [],
};

export default config;
