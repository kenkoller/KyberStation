/**
 * Star Wars universe-themed color names for lightsaber hues.
 *
 * Maps HSL ranges to evocative in-universe names. Displayed as flavor text
 * alongside the standard hex/RGB/HSL readouts in the color picker.
 */

interface ColorNameEntry {
  /** Human-readable Star Wars name */
  name: string;
  /** Hue range [min, max] (0-360). Wraps around for reds. */
  hue: [number, number];
  /** Saturation range [min, max] (0-100) */
  sat: [number, number];
  /** Lightness range [min, max] (0-100) */
  lit: [number, number];
  /** Priority — higher wins when ranges overlap */
  priority: number;
}

// Entries are checked in order; first match with highest priority wins.
const COLOR_NAMES: ColorNameEntry[] = [
  // ─── Achromatic / near-white ───
  { name: 'Purified Kyber',       hue: [0, 360], sat: [0, 8],   lit: [92, 100], priority: 10 },
  { name: 'Ahsoka White',         hue: [0, 360], sat: [0, 15],  lit: [85, 92],  priority: 9 },
  { name: 'Darksaber Core',       hue: [0, 360], sat: [0, 10],  lit: [75, 85],  priority: 8 },

  // ─── Near-black / very dark ───
  { name: 'Darksaber Edge',       hue: [0, 360], sat: [0, 100], lit: [0, 8],    priority: 10 },
  { name: 'Void Shadow',          hue: [0, 360], sat: [0, 20],  lit: [8, 18],   priority: 8 },

  // ─── Grays ───
  { name: 'Beskar Silver',        hue: [0, 360], sat: [0, 12],  lit: [55, 75],  priority: 7 },
  { name: 'Durasteel Gray',       hue: [0, 360], sat: [0, 12],  lit: [35, 55],  priority: 7 },
  { name: 'Carbonite',            hue: [0, 360], sat: [0, 12],  lit: [18, 35],  priority: 7 },

  // ─── Reds (hue 0-15, 345-360) ───
  { name: 'Sith Crimson',         hue: [350, 360], sat: [80, 100], lit: [40, 55], priority: 10 },
  { name: 'Sith Crimson',         hue: [0, 10],    sat: [80, 100], lit: [40, 55], priority: 10 },
  { name: 'Vader Bloodshine',     hue: [350, 360], sat: [90, 100], lit: [45, 60], priority: 9 },
  { name: 'Vader Bloodshine',     hue: [0, 8],     sat: [90, 100], lit: [45, 60], priority: 9 },
  { name: 'Kylo Unstable',        hue: [0, 12],    sat: [85, 100], lit: [48, 55], priority: 8 },
  { name: 'Maul Fury',            hue: [355, 360], sat: [85, 100], lit: [35, 48], priority: 8 },
  { name: 'Maul Fury',            hue: [0, 5],     sat: [85, 100], lit: [35, 48], priority: 8 },
  { name: 'Inquisitor Red',       hue: [0, 15],    sat: [60, 85],  lit: [30, 50], priority: 6 },
  { name: 'Inquisitor Red',       hue: [345, 360], sat: [60, 85],  lit: [30, 50], priority: 6 },
  { name: 'Dark Side Ember',      hue: [0, 15],    sat: [40, 65],  lit: [25, 45], priority: 5 },
  { name: 'Dark Side Ember',      hue: [345, 360], sat: [40, 65],  lit: [25, 45], priority: 5 },
  { name: 'Mustafar Glow',        hue: [0, 20],    sat: [70, 100], lit: [55, 70], priority: 4 },

  // ─── Red-Orange (hue 15-30) ───
  { name: 'Fallen Order Ember',   hue: [15, 30],   sat: [80, 100], lit: [45, 60], priority: 8 },
  { name: 'Nal Hutta Rust',       hue: [15, 30],   sat: [50, 80],  lit: [30, 50], priority: 5 },

  // ─── Orange (hue 25-45) ───
  { name: 'Cal Kestis Orange',    hue: [20, 35],   sat: [85, 100], lit: [45, 55], priority: 9 },
  { name: 'Mandalorian Flame',    hue: [25, 40],   sat: [80, 100], lit: [50, 65], priority: 7 },
  { name: 'Tatooine Sunset',      hue: [30, 45],   sat: [60, 85],  lit: [50, 70], priority: 6 },

  // ─── Amber / Gold (hue 40-55) ───
  { name: 'Temple Guard Gold',    hue: [40, 52],   sat: [85, 100], lit: [45, 55], priority: 9 },
  { name: 'Sentinel Amber',       hue: [38, 50],   sat: [70, 100], lit: [48, 62], priority: 7 },
  { name: 'Coruscant Dawn',       hue: [45, 55],   sat: [60, 90],  lit: [55, 70], priority: 5 },

  // ─── Yellow (hue 50-65) ───
  { name: 'Rey Skywalker Gold',   hue: [45, 55],   sat: [85, 100], lit: [45, 55], priority: 9 },
  { name: 'Jedi Sentinel',        hue: [50, 65],   sat: [80, 100], lit: [50, 65], priority: 7 },
  { name: 'Krayt Pearl',          hue: [48, 62],   sat: [40, 70],  lit: [65, 80], priority: 5 },

  // ─── Yellow-Green (hue 65-90) ───
  { name: 'Endor Canopy',         hue: [65, 90],   sat: [50, 85],  lit: [35, 55], priority: 6 },
  { name: 'Dagobah Mist',         hue: [70, 95],   sat: [30, 55],  lit: [40, 60], priority: 4 },

  // ─── Green (hue 90-160) ───
  { name: 'Yoda Verdant',         hue: [95, 130],  sat: [85, 100], lit: [45, 60], priority: 9 },
  { name: 'Luke ROTJ Green',      hue: [115, 135], sat: [90, 100], lit: [40, 55], priority: 10 },
  { name: 'Consular Green',       hue: [100, 140], sat: [70, 100], lit: [35, 55], priority: 7 },
  { name: 'Qui-Gon Sage',         hue: [100, 125], sat: [60, 90],  lit: [40, 55], priority: 6 },
  { name: 'Kit Fisto Emerald',    hue: [130, 160], sat: [75, 100], lit: [40, 60], priority: 7 },
  { name: 'Kashyyyk Jade',        hue: [140, 165], sat: [40, 75],  lit: [30, 50], priority: 5 },
  { name: 'Lothal Grass',         hue: [90, 120],  sat: [40, 70],  lit: [50, 70], priority: 4 },

  // ─── Teal / Cyan (hue 160-195) ───
  { name: 'Mandalorian Ice',      hue: [170, 195], sat: [70, 100], lit: [40, 60], priority: 7 },
  { name: 'Hoth Frost',           hue: [180, 200], sat: [50, 80],  lit: [55, 75], priority: 6 },
  { name: 'Kamino Teal',          hue: [165, 185], sat: [40, 70],  lit: [35, 55], priority: 5 },

  // ─── Cyan / Sky (hue 185-210) ───
  { name: 'Cal Kestis Cyan',      hue: [185, 200], sat: [85, 100], lit: [45, 60], priority: 9 },
  { name: 'Ilum Crystal',         hue: [185, 210], sat: [70, 100], lit: [50, 65], priority: 7 },
  { name: 'Bespin Sky',           hue: [195, 215], sat: [50, 75],  lit: [55, 75], priority: 5 },

  // ─── Blue (hue 210-250) ───
  { name: 'Jedi Guardian',        hue: [215, 240], sat: [85, 100], lit: [40, 55], priority: 8 },
  { name: 'Obi-Wan Azure',        hue: [205, 225], sat: [80, 100], lit: [45, 60], priority: 9 },
  { name: 'Anakin Skywalker',     hue: [225, 245], sat: [85, 100], lit: [45, 58], priority: 9 },
  { name: 'Corellian Blue',       hue: [220, 240], sat: [60, 85],  lit: [40, 55], priority: 6 },
  { name: 'Hyperspace Blue',      hue: [210, 235], sat: [70, 100], lit: [55, 70], priority: 5 },
  { name: 'Senate Guard',         hue: [230, 250], sat: [60, 90],  lit: [30, 50], priority: 6 },
  { name: 'Naboo Royal',          hue: [230, 250], sat: [50, 75],  lit: [35, 55], priority: 4 },

  // ─── Indigo (hue 245-270) ───
  { name: 'Mace Windu Violet',    hue: [260, 280], sat: [80, 100], lit: [35, 55], priority: 9 },
  { name: 'Revan Indigo',         hue: [245, 270], sat: [70, 100], lit: [35, 50], priority: 7 },
  { name: 'Twilight of Republic', hue: [250, 275], sat: [40, 70],  lit: [30, 50], priority: 5 },

  // ─── Purple (hue 270-310) ───
  { name: 'Mace Windu Violet',    hue: [270, 290], sat: [80, 100], lit: [40, 55], priority: 10 },
  { name: 'Mara Jade Orchid',     hue: [270, 295], sat: [60, 85],  lit: [30, 50], priority: 7 },
  { name: 'Coruscant Neon',       hue: [280, 310], sat: [70, 100], lit: [50, 65], priority: 6 },
  { name: 'Dathomir Magick',      hue: [285, 320], sat: [50, 80],  lit: [30, 50], priority: 5 },

  // ─── Magenta / Pink (hue 310-345) ───
  { name: 'Cal Kestis Magenta',   hue: [310, 335], sat: [80, 100], lit: [40, 55], priority: 9 },
  { name: 'Nightsister Pink',     hue: [315, 340], sat: [60, 85],  lit: [45, 65], priority: 6 },
  { name: 'Zeffo Blossom',        hue: [330, 350], sat: [50, 80],  lit: [50, 70], priority: 5 },
  { name: 'Rancor Rose',          hue: [335, 355], sat: [60, 90],  lit: [40, 55], priority: 4 },
];

/**
 * Get the Star Wars universe name for a given RGB color.
 * Returns the best matching name based on HSL proximity.
 */
export function getSaberColorName(r: number, g: number, b: number): string {
  // Convert to HSL
  const rN = r / 255, gN = g / 255, bN = b / 255;
  const max = Math.max(rN, gN, bN), min = Math.min(rN, gN, bN);
  const l = ((max + min) / 2) * 100;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = (l > 50 ? d / (2 - max - min) : d / (max + min)) * 100;
    if (max === rN) h = ((gN - bN) / d + (gN < bN ? 6 : 0)) * 60;
    else if (max === gN) h = ((bN - rN) / d + 2) * 60;
    else h = ((rN - gN) / d + 4) * 60;
  }

  // Find best matching entry
  let bestMatch: ColorNameEntry | null = null;

  for (const entry of COLOR_NAMES) {
    const hueMatch = entry.hue[0] <= entry.hue[1]
      ? h >= entry.hue[0] && h <= entry.hue[1]
      : h >= entry.hue[0] || h <= entry.hue[1]; // wraps around 360
    const satMatch = s >= entry.sat[0] && s <= entry.sat[1];
    const litMatch = l >= entry.lit[0] && l <= entry.lit[1];

    if (hueMatch && satMatch && litMatch) {
      if (!bestMatch || entry.priority > bestMatch.priority) {
        bestMatch = entry;
      }
    }
  }

  if (bestMatch) return bestMatch.name;

  // Fallback: generic names based on broad hue ranges
  if (s < 15) {
    if (l > 80) return 'Kyber White';
    if (l > 50) return 'Durasteel';
    if (l > 25) return 'Shadow';
    return 'Void';
  }

  if (h < 15 || h >= 345) return 'Dark Side Red';
  if (h < 45) return 'Outer Rim Amber';
  if (h < 70) return 'Force Gold';
  if (h < 150) return 'Living Force Green';
  if (h < 200) return 'Kyber Cyan';
  if (h < 250) return 'Guardian Blue';
  if (h < 290) return 'Unifying Force Purple';
  if (h < 345) return 'Nightsister Magenta';

  return 'Unknown Crystal';
}
