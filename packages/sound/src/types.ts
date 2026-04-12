export type SoundCategory =
  | 'hum'
  | 'swing'
  | 'clash'
  | 'blast'
  | 'lockup'
  | 'drag'
  | 'melt'
  | 'in'
  | 'out'
  | 'force'
  | 'stab'
  | 'quote'
  | 'boot'
  | 'font'
  | 'track'
  | 'ccbegin'
  | 'ccend'
  | 'swingl'
  | 'swingh';

export type FontFormat = 'proffie' | 'cfx' | 'plecter' | 'generic';

export interface SoundFile {
  name: string;
  category: SoundCategory;
  index?: number; // e.g., swing01 -> 1
  path: string;
}

export interface SmoothSwingPair {
  index: number;
  low: SoundFile;
  high: SoundFile;
}

export interface FontManifest {
  format: FontFormat;
  files: SoundFile[];
  smoothSwingPairs: SmoothSwingPair[];
  categories: Record<SoundCategory, number>; // count per category
  warnings: string[];
}
