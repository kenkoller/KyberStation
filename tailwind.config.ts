import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./apps/web/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: '#06060a',
          primary: '#0a0a10',
          secondary: '#0e0e16',
          surface: '#14141e',
          card: '#181824',
        },
        accent: {
          DEFAULT: '#4a9eff',
          dim: 'rgba(74, 158, 255, 0.08)',
          border: 'rgba(74, 158, 255, 0.20)',
          warm: '#ff6b35',
        },
        text: {
          primary: '#d0d4dc',
          secondary: '#8a8f9a',
          muted: '#4a4e58',
        },
        border: {
          subtle: 'rgba(255, 255, 255, 0.04)',
          light: 'rgba(255, 255, 255, 0.08)',
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
