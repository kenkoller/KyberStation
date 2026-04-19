/**
 * Star Wars location-inspired full-skin themes.
 * Each theme defines both the canvas visual ambiance AND the entire UI color palette.
 *
 * Color format conventions:
 *   - Space-separated RGB channels (e.g. '74 158 255') for colors used via Tailwind
 *     opacity modifiers (`bg-accent/50`). Tailwind wraps these as `rgb(R G B / alpha)`.
 *   - Full rgba strings (e.g. 'rgba(74, 158, 255, 0.08)') for colors with baked-in
 *     alpha that are used as-is (accent-dim, accent-border, border-subtle, border-light).
 *   - Hex strings (e.g. '#4a9eff') for canvas-specific colors used in Canvas2D API
 *     calls that require standard CSS color notation.
 */

import { ALL_EXTENDED_THEMES } from './extendedThemes';

export interface UIThemePalette {
  bgDeep: string;
  bgPrimary: string;
  bgSecondary: string;
  bgSurface: string;
  bgCard: string;
  accent: string;
  accentDim: string;
  accentBorder: string;
  accentWarm: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderSubtle: string;
  borderLight: string;
  crystalColor: string;
}

export interface CanvasTheme {
  id: string;
  label: string;
  bgColor: string;        // canvas background fill (hex)
  vignetteColor: string;  // vignette outer ring (rgb only, alpha applied separately)
  vignetteOpacity: number; // 0-1 strength of vignette edge darkening
  gridColor: string;      // grid lines base rgba (for major lines)
  gridLabelColor: string; // measurement label color
  stripBg: string;        // pixel strip panel background (hex)
  stripBorder: string;    // pixel strip border color (rgba)
  graphBg: string;        // RGB graph panel background (hex)
  graphBorder: string;    // RGB graph border color (rgba)
  ui: UIThemePalette;     // full UI skin colors
}

export const CANVAS_THEMES: CanvasTheme[] = [
  // ─── Deep Space ─── Cool void, electric blue
  {
    id: 'deep-space',
    label: 'Deep Space',
    bgColor: '#030305',
    vignetteColor: '0,0,0',
    vignetteOpacity: 0.65,
    gridColor: 'rgba(255,255,255,0.08)',
    gridLabelColor: 'rgba(255,255,255,0.1)',
    stripBg: '#1a2040',
    stripBorder: 'rgba(140,160,255,0.3)',
    graphBg: '#161a32',
    graphBorder: 'rgba(140,160,255,0.25)',
    ui: {
      bgDeep: '6 6 10',
      bgPrimary: '10 10 16',
      bgSecondary: '14 14 22',
      bgSurface: '20 20 30',
      bgCard: '24 24 36',
      accent: '74 158 255',
      accentDim: 'rgba(74, 158, 255, 0.08)',
      accentBorder: 'rgba(74, 158, 255, 0.20)',
      accentWarm: '255 107 53',
      textPrimary: '208 212 220',
      textSecondary: '138 143 154',
      textMuted: '106 110 120',
      borderSubtle: 'rgba(255, 255, 255, 0.04)',
      borderLight: 'rgba(255, 255, 255, 0.08)',
      crystalColor: '#4a9eff',
    },
  },

  // ─── Tatooine ─── Sandy gold, amber accent
  {
    id: 'tatooine',
    label: 'Tatooine',
    bgColor: '#1a1408',
    vignetteColor: '20,12,0',
    vignetteOpacity: 0.50,
    gridColor: 'rgba(255,220,160,0.06)',
    gridLabelColor: 'rgba(255,220,160,0.12)',
    stripBg: '#2a2010',
    stripBorder: 'rgba(255,200,100,0.25)',
    graphBg: '#221c0e',
    graphBorder: 'rgba(255,200,100,0.20)',
    ui: {
      bgDeep: '14 10 4',
      bgPrimary: '26 20 8',
      bgSecondary: '36 28 14',
      bgSurface: '48 38 20',
      bgCard: '58 46 26',
      accent: '255 184 77',
      accentDim: 'rgba(255, 184, 77, 0.10)',
      accentBorder: 'rgba(255, 184, 77, 0.25)',
      accentWarm: '255 107 53',
      textPrimary: '232 220 200',
      textSecondary: '176 164 138',
      textMuted: '138 126 104',
      borderSubtle: 'rgba(255, 200, 120, 0.06)',
      borderLight: 'rgba(255, 200, 120, 0.12)',
      crystalColor: '#ffb84d',
    },
  },

  // ─── Bespin ─── Sunset coral, warm cloud city glow
  {
    id: 'bespin',
    label: 'Bespin',
    bgColor: '#14100c',
    vignetteColor: '30,15,10',
    vignetteOpacity: 0.45,
    gridColor: 'rgba(255,180,140,0.06)',
    gridLabelColor: 'rgba(255,180,140,0.12)',
    stripBg: '#261c16',
    stripBorder: 'rgba(255,160,120,0.25)',
    graphBg: '#201812',
    graphBorder: 'rgba(255,160,120,0.20)',
    ui: {
      bgDeep: '14 8 6',
      bgPrimary: '26 17 14',
      bgSecondary: '36 24 16',
      bgSurface: '48 32 22',
      bgCard: '58 40 28',
      accent: '255 136 102',
      accentDim: 'rgba(255, 136, 102, 0.10)',
      accentBorder: 'rgba(255, 136, 102, 0.25)',
      accentWarm: '255 170 68',
      textPrimary: '232 216 208',
      textSecondary: '176 160 152',
      textMuted: '138 126 118',
      borderSubtle: 'rgba(255, 160, 120, 0.06)',
      borderLight: 'rgba(255, 160, 120, 0.12)',
      crystalColor: '#ff8866',
    },
  },

  // ─── Dagobah ─── Swamp emerald, vivid green
  {
    id: 'dagobah',
    label: 'Dagobah',
    bgColor: '#081008',
    vignetteColor: '0,10,0',
    vignetteOpacity: 0.60,
    gridColor: 'rgba(120,255,120,0.05)',
    gridLabelColor: 'rgba(120,255,120,0.10)',
    stripBg: '#141e14',
    stripBorder: 'rgba(100,200,100,0.25)',
    graphBg: '#101a10',
    graphBorder: 'rgba(100,200,100,0.20)',
    ui: {
      bgDeep: '4 10 4',
      bgPrimary: '8 18 8',
      bgSecondary: '14 26 14',
      bgSurface: '20 34 20',
      bgCard: '26 42 26',
      accent: '74 223 106',
      accentDim: 'rgba(74, 223, 106, 0.10)',
      accentBorder: 'rgba(74, 223, 106, 0.25)',
      accentWarm: '136 204 68',
      textPrimary: '200 224 204',
      textSecondary: '136 168 140',
      textMuted: '104 138 108',
      borderSubtle: 'rgba(100, 200, 100, 0.06)',
      borderLight: 'rgba(100, 200, 100, 0.12)',
      crystalColor: '#4adf6a',
    },
  },

  // ─── Mustafar ─── Volcanic ember, fiery red-orange
  {
    id: 'mustafar',
    label: 'Mustafar',
    bgColor: '#140804',
    vignetteColor: '20,4,0',
    vignetteOpacity: 0.50,
    gridColor: 'rgba(255,120,60,0.06)',
    gridLabelColor: 'rgba(255,120,60,0.12)',
    stripBg: '#281208',
    stripBorder: 'rgba(255,100,40,0.30)',
    graphBg: '#221008',
    graphBorder: 'rgba(255,100,40,0.25)',
    ui: {
      bgDeep: '10 4 2',
      bgPrimary: '26 8 4',
      bgSecondary: '36 14 8',
      bgSurface: '48 20 12',
      bgCard: '58 26 16',
      accent: '255 85 51',
      accentDim: 'rgba(255, 85, 51, 0.10)',
      accentBorder: 'rgba(255, 85, 51, 0.25)',
      accentWarm: '255 136 0',
      textPrimary: '232 208 200',
      textSecondary: '176 144 136',
      textMuted: '138 110 102',
      borderSubtle: 'rgba(255, 100, 40, 0.06)',
      borderLight: 'rgba(255, 100, 40, 0.12)',
      crystalColor: '#ff5533',
    },
  },

  // ─── Hoth ─── Icy blue, frozen tundra
  {
    id: 'hoth',
    label: 'Hoth',
    bgColor: '#0c1018',
    vignetteColor: '10,15,25',
    vignetteOpacity: 0.45,
    gridColor: 'rgba(180,220,255,0.06)',
    gridLabelColor: 'rgba(180,220,255,0.12)',
    stripBg: '#141c2a',
    stripBorder: 'rgba(140,180,255,0.30)',
    graphBg: '#121828',
    graphBorder: 'rgba(140,180,255,0.25)',
    ui: {
      bgDeep: '6 10 16',
      bgPrimary: '12 16 24',
      bgSecondary: '16 24 36',
      bgSurface: '20 32 46',
      bgCard: '24 40 56',
      accent: '102 187 255',
      accentDim: 'rgba(102, 187, 255, 0.10)',
      accentBorder: 'rgba(102, 187, 255, 0.25)',
      accentWarm: '255 153 102',
      textPrimary: '208 220 232',
      textSecondary: '138 160 176',
      textMuted: '106 128 144',
      borderSubtle: 'rgba(140, 180, 255, 0.06)',
      borderLight: 'rgba(140, 180, 255, 0.12)',
      crystalColor: '#66bbff',
    },
  },

  // ─── Coruscant ─── Neon midnight, purple-blue cityscape
  {
    id: 'coruscant',
    label: 'Coruscant',
    bgColor: '#080a14',
    vignetteColor: '5,5,15',
    vignetteOpacity: 0.40,
    gridColor: 'rgba(100,160,255,0.07)',
    gridLabelColor: 'rgba(100,160,255,0.14)',
    stripBg: '#141830',
    stripBorder: 'rgba(80,140,255,0.30)',
    graphBg: '#101428',
    graphBorder: 'rgba(80,140,255,0.25)',
    ui: {
      bgDeep: '6 6 24',
      bgPrimary: '8 10 24',
      bgSecondary: '12 16 36',
      bgSurface: '16 22 46',
      bgCard: '20 28 56',
      accent: '128 128 255',
      accentDim: 'rgba(128, 128, 255, 0.10)',
      accentBorder: 'rgba(128, 128, 255, 0.25)',
      accentWarm: '255 102 170',
      textPrimary: '208 208 232',
      textSecondary: '136 136 176',
      textMuted: '104 104 144',
      borderSubtle: 'rgba(80, 140, 255, 0.06)',
      borderLight: 'rgba(80, 140, 255, 0.12)',
      crystalColor: '#8080ff',
    },
  },

  // ─── Endor ─── Forest moonlit, natural green
  {
    id: 'endor',
    label: 'Endor',
    bgColor: '#0c0e08',
    vignetteColor: '8,10,4',
    vignetteOpacity: 0.55,
    gridColor: 'rgba(160,200,120,0.05)',
    gridLabelColor: 'rgba(160,200,120,0.10)',
    stripBg: '#1a1e14',
    stripBorder: 'rgba(140,180,100,0.25)',
    graphBg: '#161a10',
    graphBorder: 'rgba(140,180,100,0.20)',
    ui: {
      bgDeep: '6 8 4',
      bgPrimary: '14 16 8',
      bgSecondary: '20 26 14',
      bgSurface: '26 34 20',
      bgCard: '32 42 26',
      accent: '136 204 68',
      accentDim: 'rgba(136, 204, 68, 0.10)',
      accentBorder: 'rgba(136, 204, 68, 0.25)',
      accentWarm: '221 170 51',
      textPrimary: '212 220 200',
      textSecondary: '138 154 120',
      textMuted: '106 122 88',
      borderSubtle: 'rgba(140, 180, 100, 0.06)',
      borderLight: 'rgba(140, 180, 100, 0.12)',
      crystalColor: '#88cc44',
    },
  },

  // ─── Death Star ─── Industrial steel, cold metallic gray
  {
    id: 'death-star',
    label: 'Death Star',
    bgColor: '#101012',
    vignetteColor: '10,10,12',
    vignetteOpacity: 0.50,
    gridColor: 'rgba(200,200,210,0.06)',
    gridLabelColor: 'rgba(200,200,210,0.12)',
    stripBg: '#1e1e22',
    stripBorder: 'rgba(180,180,200,0.25)',
    graphBg: '#1a1a1e',
    graphBorder: 'rgba(180,180,200,0.20)',
    ui: {
      bgDeep: '8 8 8',
      bgPrimary: '16 16 18',
      bgSecondary: '24 24 24',
      bgSurface: '32 32 34',
      bgCard: '40 40 40',
      accent: '153 170 204',
      accentDim: 'rgba(153, 170, 204, 0.10)',
      accentBorder: 'rgba(153, 170, 204, 0.25)',
      accentWarm: '204 136 68',
      textPrimary: '216 216 220',
      textSecondary: '144 144 152',
      textMuted: '112 112 120',
      borderSubtle: 'rgba(180, 180, 200, 0.06)',
      borderLight: 'rgba(180, 180, 200, 0.12)',
      crystalColor: '#99aacc',
    },
  },
];

export const DEFAULT_THEME_ID = 'deep-space';

/**
 * Look up a theme by ID across both the base 9 themes and the 21 extended
 * themes.  Extended themes satisfy the CanvasTheme interface (they extend it),
 * so callers that only need CanvasTheme fields work without changes.
 *
 * Falls back to Deep Space if the ID is not found in either list.
 */
export function getThemeById(id: string): CanvasTheme {
  return (
    CANVAS_THEMES.find((t) => t.id === id) ??
    ALL_EXTENDED_THEMES.find((t) => t.id === id) ??
    CANVAS_THEMES[0]
  );
}
