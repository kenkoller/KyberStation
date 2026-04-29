/**
 * addToQueue — one-click "add current design to card queue" action.
 *
 * The "queue" is the active saber profile's active card config preset
 * list. When a user builds a config.h for their SD card, they pick
 * which presets go on the card. This function snapshots the current
 * bladeStore config and adds it as a new card entry.
 */
import type { BladeConfig } from '@kyberstation/engine';
import { useSaberProfileStore, type CardPresetEntry } from '@/stores/saberProfileStore';
import { getSaberColorName } from '@/lib/namingMath';
import { toast } from '@/lib/toastManager';

/** Maximum queue size before we warn the user. */
const QUEUE_WARNING_THRESHOLD = 20;

/** Generate a human-readable preset name from the current config. */
export function generatePresetName(config: BladeConfig): string {
  const colorName = getSaberColorName(
    config.baseColor.r,
    config.baseColor.g,
    config.baseColor.b,
  );

  // Capitalize the style id for display (e.g. "stable" -> "Stable")
  const styleName = config.style
    ? config.style.charAt(0).toUpperCase() + config.style.slice(1)
    : 'Custom';

  return `${colorName} ${styleName}`;
}

export interface AddToQueueResult {
  success: boolean;
  presetCount: number;
  profileName: string;
  createdProfile: boolean;
}

/**
 * Snapshot the given config and add it to the active saber profile's
 * active card config. If no profile exists, auto-creates "My Saber".
 *
 * Returns metadata about the operation for the caller to show feedback.
 */
export function addConfigToQueue(config: BladeConfig): AddToQueueResult {
  const store = useSaberProfileStore.getState();

  let createdProfile = false;
  let profile = store.getActiveProfile();

  // Auto-create a profile if none exists
  if (!profile) {
    profile = store.createProfile('My Saber');
    createdProfile = true;
  }

  // Get or default to the first card config
  const cardConfig =
    store.getActiveCardConfig(profile.id) ?? profile.cardConfigs[0];

  if (!cardConfig) {
    // Shouldn't happen — createProfile always makes a "Default" card config
    return { success: false, presetCount: 0, profileName: profile.name, createdProfile };
  }

  const presetName = generatePresetName(config);

  // Build the entry (id + order are set by addCardEntry)
  const entry: Omit<CardPresetEntry, 'id' | 'order'> = {
    presetName,
    fontName: '',
    source: { type: 'inline' },
    config: { ...config },
  };

  store.addCardEntry(profile.id, cardConfig.id, entry);

  const newCount = cardConfig.entries.length + 1;

  return {
    success: true,
    presetCount: newCount,
    profileName: profile.name,
    createdProfile,
  };
}

/**
 * High-level action: add current config to queue and show toast feedback.
 * This is the handler for the action bar button.
 */
export function addToQueueWithToast(config: BladeConfig): AddToQueueResult {
  const result = addConfigToQueue(config);

  if (!result.success) {
    toast.error('Could not add to queue');
    return result;
  }

  toast.success(`Added to queue (${result.presetCount} presets)`);

  if (result.presetCount > QUEUE_WARNING_THRESHOLD) {
    // Delayed warning so it appears after the success toast
    setTimeout(() => {
      toast.warning(
        'Queue is getting large — consider removing unused presets',
      );
    }, 500);
  }

  return result;
}
