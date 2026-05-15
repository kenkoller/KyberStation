import { create } from 'zustand';

/**
 * Why the ChassisPicker is currently open. Affects the modal's header
 * copy + Cancel-button label.
 */
export type ChassisPickerReason = 'manual' | 'export-block';

interface ChassisPickerStore {
  isOpen: boolean;
  reason: ChassisPickerReason;
  open: (reason?: ChassisPickerReason) => void;
  close: () => void;
}

/**
 * Global open/close state for the ChassisPicker modal. Both the
 * StatusBar `CHASSIS` chip click and the export-time guard call
 * `open()` here; one `<ChassisPicker />` mounted in the editor layout
 * reads `isOpen` and `reason` and renders accordingly. Avoids two
 * parallel modal instances fighting over focus.
 *
 * Not persisted — ephemeral UI state only.
 */
export const useChassisPickerStore = create<ChassisPickerStore>((set) => ({
  isOpen: false,
  reason: 'manual',
  open: (reason = 'manual') => set({ isOpen: true, reason }),
  close: () => set({ isOpen: false }),
}));
