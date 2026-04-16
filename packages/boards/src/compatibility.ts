import type { BoardProfile } from './types.js';

// ─── Compatibility Report Types ───

export interface CompatibilityReport {
  overallScore: number; // 0-100
  featureScores: FeatureScore[];
  degradations: FeatureDegradation[];
  warnings: string[];
}

export interface FeatureScore {
  feature: string;
  weight: number; // 0-1, how important this feature is
  score: number; // 0-100
  supported: boolean;
}

export interface FeatureDegradation {
  feature: string;
  original: string;
  degradedTo: string;
  message: string;
}

// ─── Scoring Weights ───

const WEIGHT_BASE_STYLE = 0.30;
const WEIGHT_COLORS = 0.20;
const WEIGHT_IGNITION_RETRACTION = 0.15;
const WEIGHT_EFFECTS = 0.20;
const WEIGHT_MOTION_AUDIO = 0.10;
const WEIGHT_EXTRAS = 0.05;

// ─── All known KyberStation effects ───

const ALL_EFFECTS = ['clash', 'lockup', 'blast', 'drag', 'melt', 'lightning', 'stab', 'force'];

// ─── Scoring Functions ───

function scoreBaseStyle(
  style: string,
  profile: BoardProfile,
): { score: number; degradation: FeatureDegradation | null } {
  const mapping = profile.supportedStyles.find((s) => s.kyberstationStyle === style);

  if (!mapping || mapping.boardStyleName === null) {
    return {
      score: 0,
      degradation: {
        feature: 'Base Style',
        original: style,
        degradedTo: 'unsupported',
        message: `Style "${style}" is not supported on ${profile.name}. No equivalent available.`,
      },
    };
  }

  // If the board style name matches a direct equivalent (not just "solid" fallback)
  if (mapping.boardStyleName !== 'solid' || style === 'stable') {
    return { score: 100, degradation: null };
  }

  // Degraded to solid — partial match
  return {
    score: 30,
    degradation: {
      feature: 'Base Style',
      original: style,
      degradedTo: mapping.boardStyleName,
      message: `Style "${style}" is not available on ${profile.name}; will appear as solid color.`,
    },
  };
}

function scoreColors(profile: BoardProfile): number {
  switch (profile.capabilities.colorChangeMode) {
    case 'full-rgb':
      return 100;
    case 'color-wheel':
      return 80;
    case 'fixed-palette':
      return 50;
    case 'none':
      return 0;
  }
}

function scoreIgnitionRetraction(
  ignition: string,
  retraction: string,
  profile: BoardProfile,
): { score: number; degradations: FeatureDegradation[] } {
  const degradations: FeatureDegradation[] = [];

  if (profile.capabilities.customIgnition && profile.capabilities.customRetraction) {
    return { score: 100, degradations: [] };
  }

  let score = 0;

  // Ignition scoring
  if (profile.capabilities.customIgnition) {
    score += 50;
  } else if (ignition === 'standard') {
    // Standard ignition is available on all boards
    score += 40;
  } else {
    score += 10;
    degradations.push({
      feature: 'Ignition',
      original: ignition,
      degradedTo: 'predefined',
      message: `Custom ignition "${ignition}" is not available on ${profile.name}; a predefined ignition will be used.`,
    });
  }

  // Retraction scoring
  if (profile.capabilities.customRetraction) {
    score += 50;
  } else if (retraction === 'standard') {
    score += 40;
  } else {
    score += 10;
    degradations.push({
      feature: 'Retraction',
      original: retraction,
      degradedTo: 'predefined',
      message: `Custom retraction "${retraction}" is not available on ${profile.name}; a predefined retraction will be used.`,
    });
  }

  return { score, degradations };
}

function scoreEffects(
  config: Record<string, unknown>,
  profile: BoardProfile,
): { score: number; degradations: FeatureDegradation[] } {
  const degradations: FeatureDegradation[] = [];
  let supportedCount = 0;

  for (const effect of ALL_EFFECTS) {
    const mapping = profile.supportedEffects.find((e) => e.kyberstationEffect === effect);
    if (mapping && mapping.boardEffectName !== null) {
      supportedCount++;
    } else {
      // Check if this effect is actually used in the config
      const effectKey = `${effect}Color`;
      if (effectKey in config || effect in config) {
        degradations.push({
          feature: `Effect: ${effect}`,
          original: effect,
          degradedTo: 'unsupported',
          message: `Effect "${effect}" is not available on ${profile.name} and will be removed.`,
        });
      }
    }
  }

  const score = ALL_EFFECTS.length > 0
    ? Math.round((supportedCount / ALL_EFFECTS.length) * 100)
    : 0;

  return { score, degradations };
}

function scoreMotionAudio(profile: BoardProfile): number {
  let score = 0;

  if (profile.capabilities.audioReactiveStyles) {
    score += 50;
  }
  if (profile.capabilities.motionReactiveStyles) {
    score += 50;
  }

  return score;
}

function scoreExtras(profile: BoardProfile): number {
  let score = 0;
  let count = 0;

  // SubBlade support
  count++;
  if (profile.capabilities.subBladeSupport) score += 1;

  // OLED support
  count++;
  if (profile.capabilities.oledSupport) score += 1;

  // Edit mode
  count++;
  if (profile.capabilities.editMode) score += 1;

  return count > 0 ? Math.round((score / count) * 100) : 0;
}

// ─── Main Scoring Function ───

export function scoreCompatibility(
  config: { style: string; ignition: string; retraction: string; [key: string]: unknown },
  profile: BoardProfile,
): CompatibilityReport {
  const featureScores: FeatureScore[] = [];
  const degradations: FeatureDegradation[] = [];
  const warnings: string[] = [];

  // 1. Base Style (30%)
  const styleResult = scoreBaseStyle(config.style, profile);
  featureScores.push({
    feature: 'Base Style',
    weight: WEIGHT_BASE_STYLE,
    score: styleResult.score,
    supported: styleResult.score > 0,
  });
  if (styleResult.degradation) {
    degradations.push(styleResult.degradation);
  }

  // 2. Colors (20%)
  const colorScore = scoreColors(profile);
  featureScores.push({
    feature: 'Colors',
    weight: WEIGHT_COLORS,
    score: colorScore,
    supported: colorScore > 0,
  });
  if (colorScore < 100) {
    const modeLabel = profile.capabilities.colorChangeMode === 'none'
      ? 'No color change'
      : profile.capabilities.colorChangeMode === 'fixed-palette'
        ? 'Fixed palette only'
        : 'Color wheel (limited)';
    warnings.push(`Color support on ${profile.name}: ${modeLabel}.`);
  }

  // 3. Ignition/Retraction (15%)
  const ignRetResult = scoreIgnitionRetraction(
    config.ignition,
    config.retraction,
    profile,
  );
  featureScores.push({
    feature: 'Ignition/Retraction',
    weight: WEIGHT_IGNITION_RETRACTION,
    score: ignRetResult.score,
    supported: ignRetResult.score > 40,
  });
  degradations.push(...ignRetResult.degradations);

  // 4. Effects (20%)
  const effectResult = scoreEffects(config, profile);
  featureScores.push({
    feature: 'Effects',
    weight: WEIGHT_EFFECTS,
    score: effectResult.score,
    supported: effectResult.score > 0,
  });
  degradations.push(...effectResult.degradations);

  // 5. Motion/Audio Reactivity (10%)
  const motionAudioScore = scoreMotionAudio(profile);
  featureScores.push({
    feature: 'Motion/Audio Reactivity',
    weight: WEIGHT_MOTION_AUDIO,
    score: motionAudioScore,
    supported: motionAudioScore > 0,
  });
  if (motionAudioScore === 0) {
    warnings.push(`${profile.name} does not support motion or audio reactive styles.`);
  }

  // 6. Extras (5%)
  const extrasScore = scoreExtras(profile);
  featureScores.push({
    feature: 'Extras (SubBlade, OLED, Edit Mode)',
    weight: WEIGHT_EXTRAS,
    score: extrasScore,
    supported: extrasScore > 0,
  });

  // Calculate overall weighted score
  const overallScore = Math.round(
    featureScores.reduce((sum, fs) => sum + fs.score * fs.weight, 0),
  );

  // Add board-level warnings from uiOverrides
  warnings.push(...profile.uiOverrides.showWarnings);

  return {
    overallScore,
    featureScores,
    degradations,
    warnings,
  };
}
