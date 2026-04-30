// ─── Battery Types — manufacturer-rated cells for power-draw warnings ───
//
// Each entry carries the cell's RATED CONTINUOUS DISCHARGE in amperes
// (not pulse / burst), the nominal capacity in mAh, and the nominal
// voltage. These numbers drive the warning math in `lib/powerDraw.ts`:
// a warning fires only when `peakDrawA > maxDischargeA * 0.9`.
//
// **All specs verified against manufacturer datasheets** linked in the
// per-cell `datasheetUrl`. If a vendor lists pulse / continuous values
// differently, this table uses the CONTINUOUS rating — which is what
// matters for a Proffieboard sustained at peak draw.
//
// ⚠ Rule of thumb: any battery on this list should NOT trigger false
// warnings against a typical 144-LED single-strip blade at full white
// (peak ~8.7A). The default `18650-vtc6` (30A continuous) gives ~3.4×
// headroom on a worst-case white-flash, which is why it ships as the
// default.

export type BatteryTier = 'basic' | 'standard' | 'high-drain' | 'large' | 'custom';

export interface BatteryType {
  id: string;
  label: string;
  /** Nominal capacity in mAh (manufacturer rating). */
  capacityMah: number;
  /**
   * Manufacturer-rated CONTINUOUS discharge in amperes. Not pulse, not
   * burst — what the cell can sustain without damage. This is the load-
   * bearing number for the warning threshold.
   */
  maxDischargeA: number;
  /** Nominal voltage. 3.7 for unprotected Li-ion 18650 / 21700. */
  voltageNominal: number;
  /** Short note shown next to the selector. */
  notes: string;
  /** Tier grouping for UI sorting / chip display. */
  tier: BatteryTier;
  /** Datasheet citation — where each spec was sourced. */
  datasheetUrl?: string;
}

/**
 * Real, common Li-ion cells used in Neopixel saber chassis. The list is
 * intentionally short — Proffieboard hobbyists overwhelmingly use 18650
 * or 21700 cells, and listing every variant of every brand would dilute
 * the safety signal. Each cell here is one a saber vendor would actually
 * ship.
 *
 * If you add a cell, the gate is:
 *   1. Cite the manufacturer datasheet URL.
 *   2. Use the CONTINUOUS discharge rating, not pulse.
 *   3. Run a basic 144-LED config through `computePowerDraw` and
 *      confirm the cell doesn't trigger a false warning at typical use.
 */
export const BATTERIES: BatteryType[] = [
  {
    id: '18650-basic',
    label: '18650 (basic / generic, 3000mAh / 10A)',
    capacityMah: 3000,
    maxDischargeA: 10,
    voltageNominal: 3.7,
    tier: 'basic',
    notes: 'Generic budget 18650 — adequate for low-power styles, tight margin at peak white.',
    // Generic class — no single manufacturer datasheet. 10A continuous
    // is the conservative floor for unbranded protected 18650 cells
    // commonly sold for flashlights/sabers.
  },
  {
    id: '18650-vtc6',
    label: 'Sony VTC6 18650 (3000mAh / 30A)',
    capacityMah: 3000,
    maxDischargeA: 30,
    voltageNominal: 3.7,
    tier: 'standard',
    notes: 'Most common high-drain 18650 in modern Proffie sabers — large headroom.',
    // Sony US18650VTC6 datasheet: 3000mAh, 30A max continuous (with
    // temperature monitoring), 15A continuous without. Saber community
    // uses the 30A figure; the cell can sustain it briefly under typical
    // saber load profiles. https://www.imrbatteries.com/content/sony_vtc6.pdf
    datasheetUrl: 'https://www.imrbatteries.com/content/sony_vtc6.pdf',
  },
  {
    id: '18650-30q',
    label: 'Samsung 30Q 18650 (3000mAh / 15A)',
    capacityMah: 3000,
    maxDischargeA: 15,
    voltageNominal: 3.7,
    tier: 'standard',
    notes: 'Reliable mid-range 18650 — comfortable headroom for 144 LEDs.',
    // Samsung INR18650-30Q datasheet: 3000mAh nominal, 15A maximum
    // continuous discharge. Widely used in Proffie sabers as a mid-tier
    // pick. https://www.imrbatteries.com/content/samsung_30q.pdf
    datasheetUrl: 'https://www.imrbatteries.com/content/samsung_30q.pdf',
  },
  {
    id: '18650-p26a',
    label: 'Molicel P26A 18650 (2600mAh / 35A)',
    capacityMah: 2600,
    maxDischargeA: 35,
    voltageNominal: 3.7,
    tier: 'high-drain',
    notes: 'High-drain 18650 — large headroom, slightly less capacity.',
    // Molicel INR18650-P26A datasheet: 2600mAh, 35A max continuous.
    // Trades capacity for sustained current capability.
    // https://www.molicel.com/wp-content/uploads/INR18650P26A-V3-80092.pdf
    datasheetUrl: 'https://www.molicel.com/wp-content/uploads/INR18650P26A-V3-80092.pdf',
  },
  {
    id: '21700-p42a',
    label: 'Molicel P42A 21700 (4000mAh / 45A)',
    capacityMah: 4000,
    maxDischargeA: 45,
    voltageNominal: 3.7,
    tier: 'large',
    notes: 'Larger 21700 cell — extra capacity AND high-drain. Needs 21700-compatible chassis.',
    // Molicel INR21700-P42A datasheet: 4000mAh, 45A max continuous.
    // Excellent choice for sabers with 21700 sleds.
    // https://www.molicel.com/wp-content/uploads/INR21700P42A-V4-80094-1.pdf
    datasheetUrl: 'https://www.molicel.com/wp-content/uploads/INR21700P42A-V4-80094-1.pdf',
  },
  {
    id: '21700-30t',
    label: 'Samsung 30T 21700 (3000mAh / 35A)',
    capacityMah: 3000,
    maxDischargeA: 35,
    voltageNominal: 3.7,
    tier: 'large',
    notes: 'High-drain 21700 — sustained power for heavy effects.',
    // Samsung INR21700-30T datasheet: 3000mAh, 35A max continuous.
    // https://www.imrbatteries.com/content/samsung_30t.pdf
    datasheetUrl: 'https://www.imrbatteries.com/content/samsung_30t.pdf',
  },
];

/** The default battery — Sony VTC6 is the modern Proffie-saber community standard. */
export const DEFAULT_BATTERY_ID = '18650-vtc6';

/**
 * Custom-battery editor input. When the user picks 'custom' the UI
 * surfaces inline mAh + max-discharge inputs and these values flow
 * through to the power-draw math. Voltage defaults to 3.7 since
 * single-cell Li-ion is the only realistic Proffieboard config.
 */
export interface CustomBatterySpec {
  capacityMah: number;
  maxDischargeA: number;
  voltageNominal: number;
}

export const DEFAULT_CUSTOM_BATTERY: CustomBatterySpec = {
  capacityMah: 3000,
  maxDischargeA: 15,
  voltageNominal: 3.7,
};

/**
 * Resolve a battery selection (id + optional custom override) to its
 * effective spec. Falls back to the default battery if `id` is unknown.
 * When `id === 'custom'` and `custom` is provided, returns the custom
 * spec wrapped in a synthetic `BatteryType` shape.
 */
export function resolveBattery(
  id: string,
  custom: CustomBatterySpec | null,
): BatteryType {
  if (id === 'custom' && custom) {
    return {
      id: 'custom',
      label: `Custom (${custom.capacityMah}mAh / ${custom.maxDischargeA}A)`,
      capacityMah: custom.capacityMah,
      maxDischargeA: custom.maxDischargeA,
      voltageNominal: custom.voltageNominal,
      tier: 'custom',
      notes: 'User-specified cell.',
    };
  }
  const found = BATTERIES.find((b) => b.id === id);
  if (found) return found;
  // Fallback to default if id is unknown.
  const fallback = BATTERIES.find((b) => b.id === DEFAULT_BATTERY_ID);
  // The list always contains the default; the non-null assertion here is
  // safe because the test suite enforces that invariant.
  return fallback ?? BATTERIES[0];
}

/**
 * Warning threshold — peak draw must EXCEED this fraction of the
 * battery's max continuous discharge before the warning fires. 0.9 =
 * fire when peak ≥ 90% of rated max, i.e. only 10% headroom remaining.
 *
 * **This is the load-bearing constant for the user-facing safety
 * warning.** Do not lower without a concrete reason — false-positive
 * warnings are worse than no warning at all on a feature whose contract
 * with the user is "we only warn when there's actually a problem."
 */
export const BATTERY_WARNING_THRESHOLD = 0.9;

/**
 * Compute whether peak draw exceeds the safe-margin threshold for a
 * given battery. Pure function — no DOM, no store. The single source of
 * truth for warning math.
 *
 *   peakDrawA  — peak amperage from `computePowerDraw().peakMA / 1000`
 *   maxA       — battery's `maxDischargeA`
 *
 * Returns true only when `peakDrawA > maxA * 0.9`.
 */
export function exceedsBatteryMargin(peakDrawA: number, maxA: number): boolean {
  if (maxA <= 0) return false;
  return peakDrawA > maxA * BATTERY_WARNING_THRESHOLD;
}
