import type { BladeConfig, RGB } from '@bladeforge/engine';
import type { UserPreset } from '@/lib/fontDB';
import type { CardConfig } from '@/stores/saberProfileStore';

const SCHEMA_ID = 'bladeforge-config';
const SCHEMA_VERSION = 1;

interface BladeConfigFile {
  $schema: string;
  version: number;
  config: BladeConfig;
  exportedAt: string;
  exportedFrom: string;
}

// ─── Validation ───

function isRGB(val: unknown): val is RGB {
  if (typeof val !== 'object' || val === null) return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.r === 'number' && obj.r >= 0 && obj.r <= 255 &&
    typeof obj.g === 'number' && obj.g >= 0 && obj.g <= 255 &&
    typeof obj.b === 'number' && obj.b >= 0 && obj.b <= 255
  );
}

export function validateBladeConfig(obj: unknown): obj is BladeConfig {
  if (typeof obj !== 'object' || obj === null) return false;
  const c = obj as Record<string, unknown>;

  // Required RGB colors
  if (!isRGB(c.baseColor)) return false;
  if (!isRGB(c.clashColor)) return false;
  if (!isRGB(c.lockupColor)) return false;
  if (!isRGB(c.blastColor)) return false;

  // Required strings
  if (typeof c.style !== 'string') return false;
  if (typeof c.ignition !== 'string') return false;
  if (typeof c.retraction !== 'string') return false;

  // Required numbers
  if (typeof c.ignitionMs !== 'number' || c.ignitionMs < 0) return false;
  if (typeof c.retractionMs !== 'number' || c.retractionMs < 0) return false;
  if (typeof c.shimmer !== 'number' || c.shimmer < 0 || c.shimmer > 1) return false;
  if (typeof c.ledCount !== 'number' || c.ledCount < 1 || !Number.isInteger(c.ledCount)) return false;

  // Optional RGB colors
  if (c.edgeColor !== undefined && !isRGB(c.edgeColor)) return false;
  if (c.gradientEnd !== undefined && !isRGB(c.gradientEnd)) return false;
  if (c.dragColor !== undefined && !isRGB(c.dragColor)) return false;
  if (c.meltColor !== undefined && !isRGB(c.meltColor)) return false;
  if (c.lightningColor !== undefined && !isRGB(c.lightningColor)) return false;

  // Optional name
  if (c.name !== undefined && typeof c.name !== 'string') return false;

  return true;
}

// ─── Serialization ───

export function serializeConfig(config: BladeConfig): string {
  const file: BladeConfigFile = {
    $schema: SCHEMA_ID,
    version: SCHEMA_VERSION,
    config,
    exportedAt: new Date().toISOString(),
    exportedFrom: 'BladeForge v0.1.0',
  };
  return JSON.stringify(file, null, 2);
}

export function deserializeConfig(json: string): BladeConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Expected a JSON object');
  }

  const file = parsed as Record<string, unknown>;

  // Accept either a BladeConfigFile envelope or a raw BladeConfig
  let config: unknown;
  if (file.$schema === SCHEMA_ID && file.config !== undefined) {
    config = file.config;
  } else {
    // Try treating the whole object as a BladeConfig directly
    config = file;
  }

  if (!validateBladeConfig(config)) {
    throw new Error('Invalid blade configuration — missing or malformed fields');
  }

  return config;
}

// ─── File I/O ───

export function downloadConfigAsFile(config: BladeConfig): void {
  const json = serializeConfig(config);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(config.name ?? 'blade-style').replace(/\s+/g, '_')}.bladeforge.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const MAX_CONFIG_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export function readConfigFromFile(file: File): Promise<BladeConfig> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_CONFIG_FILE_SIZE) {
      reject(new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const config = deserializeConfig(reader.result as string);
        resolve(config);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// ─── Collection Import/Export ───

const COLLECTION_SCHEMA = 'bladeforge-collection';
const COLLECTION_VERSION = 1;

interface CollectionFile {
  $schema: string;
  version: number;
  presets: UserPreset[];
  exportedAt: string;
  exportedFrom: string;
}

export function serializeCollection(presets: UserPreset[]): string {
  const file: CollectionFile = {
    $schema: COLLECTION_SCHEMA,
    version: COLLECTION_VERSION,
    presets,
    exportedAt: new Date().toISOString(),
    exportedFrom: 'BladeForge v0.1.0',
  };
  return JSON.stringify(file, null, 2);
}

export function deserializeCollection(json: string): UserPreset[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Expected a JSON object');
  }

  const file = parsed as Record<string, unknown>;

  if (file.$schema !== COLLECTION_SCHEMA || !Array.isArray(file.presets)) {
    throw new Error('Not a valid BladeForge collection file');
  }

  // Validate each preset has at least name and config
  const presets = (file.presets as unknown[]).filter((p): p is UserPreset => {
    if (typeof p !== 'object' || p === null) return false;
    const obj = p as Record<string, unknown>;
    return typeof obj.name === 'string' && validateBladeConfig(obj.config);
  });

  return presets;
}

export function downloadCollection(presets: UserPreset[], filename?: string): void {
  const json = serializeCollection(presets);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `presets.bladeforge-collection.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function readCollectionFile(file: File): Promise<UserPreset[]> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_CONFIG_FILE_SIZE) {
      reject(new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const presets = deserializeCollection(reader.result as string);
        resolve(presets);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// ─── Card Preset Template Export/Import ───

const CARD_TEMPLATE_SCHEMA = 'bladeforge-card';
const CARD_TEMPLATE_VERSION = 1;

interface CardTemplateFile {
  $schema: string;
  version: number;
  name: string;
  entries: Array<{
    presetName: string;
    fontName: string;
    config: BladeConfig;
    source: { type: string; presetId?: string; userPresetId?: string };
  }>;
  exportedAt: string;
  exportedFrom: string;
}

export function serializeCardTemplate(cardConfig: CardConfig): string {
  const file: CardTemplateFile = {
    $schema: CARD_TEMPLATE_SCHEMA,
    version: CARD_TEMPLATE_VERSION,
    name: cardConfig.name,
    entries: cardConfig.entries.map((e) => ({
      presetName: e.presetName,
      fontName: e.fontName,
      config: e.config,
      source: e.source,
    })),
    exportedAt: new Date().toISOString(),
    exportedFrom: 'BladeForge v0.1.0',
  };
  return JSON.stringify(file, null, 2);
}

export function deserializeCardTemplate(json: string): { name: string; entries: CardTemplateFile['entries'] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Expected a JSON object');
  }

  const file = parsed as Record<string, unknown>;
  if (file.$schema !== CARD_TEMPLATE_SCHEMA || !Array.isArray(file.entries)) {
    throw new Error('Not a valid BladeForge card template file');
  }

  const entries = (file.entries as unknown[]).filter((e): e is CardTemplateFile['entries'][0] => {
    if (typeof e !== 'object' || e === null) return false;
    const obj = e as Record<string, unknown>;
    return typeof obj.presetName === 'string' && typeof obj.fontName === 'string' && validateBladeConfig(obj.config);
  });

  return {
    name: typeof file.name === 'string' ? file.name : 'Imported Template',
    entries,
  };
}

export function downloadCardTemplate(cardConfig: CardConfig, filename?: string): void {
  const json = serializeCardTemplate(cardConfig);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `${cardConfig.name.replace(/\s+/g, '_')}.bladeforge-card.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function readCardTemplateFile(file: File): Promise<{ name: string; entries: CardTemplateFile['entries'] }> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_CONFIG_FILE_SIZE) {
      reject(new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = deserializeCardTemplate(reader.result as string);
        resolve(result);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
