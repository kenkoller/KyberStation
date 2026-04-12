import type { BladeConfig, RGB } from '@bladeforge/engine';

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

export function readConfigFromFile(file: File): Promise<BladeConfig> {
  return new Promise((resolve, reject) => {
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
