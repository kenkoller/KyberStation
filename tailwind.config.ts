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
        mono: [
          'IBM Plex Mono',
          'SF Mono',
          'Fira Code',
          'monospace',
        ],
        cinematic: ['Orbitron', 'Exo 2', 'sans-serif'],
        'sw-body': ['Exo 2', 'IBM Plex Mono', 'sans-serif'],
        aurebesh: ['FT Aurebesh', 'monospace'],
      },
      borderRadius: {
        panel: '6px',
      },
      screens: {
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
