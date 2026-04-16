/**
 * Performance tier detection and management.
 *
 * Detects device capability and recommends a visual performance tier.
 * Users can override the detected tier in settings.
 *
 * Tiers:
 *   'full'   — All animations, particles, shaders, backdrop-filter
 *   'medium' — Reduced animations, no backdrop-filter, simpler particles
 *   'lite'   — No ambient animations, instant transitions, flat surfaces
 */

export type PerformanceTier = 'full' | 'medium' | 'lite';

interface DeviceCapabilities {
  cores: number;
  memoryGB: number | null;
  gpuRenderer: string | null;
  isMobile: boolean;
  prefersReducedMotion: boolean;
}

const STORAGE_KEY = 'kyberstation-perf-tier';
const STORAGE_KEY_AUTO = 'kyberstation-perf-auto-detected';

/**
 * Detect raw device capabilities from browser APIs.
 */
export function detectCapabilities(): DeviceCapabilities {
  const cores = navigator.hardwareConcurrency || 2;

  const memoryGB =
    'deviceMemory' in navigator
      ? (navigator as unknown as { deviceMemory: number }).deviceMemory
      : null;

  let gpuRenderer: string | null = null;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    if (gl && gl instanceof WebGLRenderingContext) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        gpuRenderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
      }
    }
  } catch {
    // WebGL not available
  }

  const isMobile =
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || (navigator.maxTouchPoints > 1 && cores <= 4);

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  return { cores, memoryGB, gpuRenderer, isMobile, prefersReducedMotion };
}

/**
 * Known weak GPU patterns (integrated / mobile / older chips).
 */
const WEAK_GPU_PATTERNS = [
  /Intel.*HD.*[2-5]\d{3}/i,
  /Intel.*UHD.*6[0-2]\d/i,
  /Mali-[GT][0-5]/i,
  /Adreno.*[2-4]\d{2}/i,
  /PowerVR/i,
  /SwiftShader/i,
  /llvmpipe/i,
  /Software/i,
];

const STRONG_GPU_PATTERNS = [
  /Apple.*M[1-9]/i,
  /NVIDIA.*RTX/i,
  /NVIDIA.*GTX.*1[6-9]/i,
  /Radeon.*RX.*[5-7]\d{3}/i,
  /Intel.*Arc/i,
  /Apple.*GPU/i,
];

/**
 * Recommend a performance tier based on detected capabilities.
 */
export function recommendTier(caps: DeviceCapabilities): PerformanceTier {
  // Reduced motion preference always maps to lite
  if (caps.prefersReducedMotion) return 'lite';

  let score = 0;

  // Core count scoring
  if (caps.cores >= 8) score += 3;
  else if (caps.cores >= 4) score += 2;
  else score += 1;

  // Memory scoring
  if (caps.memoryGB !== null) {
    if (caps.memoryGB >= 8) score += 3;
    else if (caps.memoryGB >= 4) score += 2;
    else score += 1;
  } else {
    score += 2; // Unknown, assume mid-range
  }

  // GPU scoring
  if (caps.gpuRenderer) {
    if (STRONG_GPU_PATTERNS.some((p) => p.test(caps.gpuRenderer!))) score += 3;
    else if (WEAK_GPU_PATTERNS.some((p) => p.test(caps.gpuRenderer!))) score += 0;
    else score += 2; // Unknown GPU, assume mid
  } else {
    score += 1; // No GPU info
  }

  // Mobile penalty
  if (caps.isMobile) score -= 2;

  // Map score to tier
  if (score >= 7) return 'full';
  if (score >= 4) return 'medium';
  return 'lite';
}

/**
 * Get the user's selected performance tier, or auto-detect.
 * Returns both the tier and whether it was auto-detected.
 */
export function getPerformanceTier(): {
  tier: PerformanceTier;
  isAutoDetected: boolean;
} {
  // Check for user override
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'full' || stored === 'medium' || stored === 'lite') {
      return { tier: stored, isAutoDetected: false };
    }
  }

  // Auto-detect
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    // Check cached auto-detection
    const cached = sessionStorage.getItem(STORAGE_KEY_AUTO);
    if (cached === 'full' || cached === 'medium' || cached === 'lite') {
      return { tier: cached, isAutoDetected: true };
    }

    const caps = detectCapabilities();
    const tier = recommendTier(caps);

    // Cache for this session so we don't re-detect on every call
    sessionStorage.setItem(STORAGE_KEY_AUTO, tier);

    return { tier, isAutoDetected: true };
  }

  // SSR fallback
  return { tier: 'medium', isAutoDetected: true };
}

/**
 * Save the user's explicit tier choice.
 * Pass null to clear override and revert to auto-detection.
 */
export function setPerformanceTier(tier: PerformanceTier | null): void {
  if (tier === null) {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY_AUTO);
  } else {
    localStorage.setItem(STORAGE_KEY, tier);
  }
}

/**
 * Apply the performance tier CSS class to <html>.
 * Call this on mount and when the tier changes.
 */
export function applyPerformanceTier(tier: PerformanceTier): void {
  const html = document.documentElement;
  html.classList.remove('perf-full', 'perf-medium', 'perf-lite');
  if (tier !== 'full') {
    html.classList.add(`perf-${tier}`);
  }
  // 'full' is the default — no class needed
}
