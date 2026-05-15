'use client';

import { useState } from 'react';
import {
  ALL_PROFILES,
  byId,
  type HardwareProfile,
} from '@kyberstation/hardware-profiles';
import { useModalDialog } from '@/hooks/useModalDialog';
import { useSaberProfileStore } from '@/stores/saberProfileStore';
import { useChassisPickerStore } from '@/stores/chassisPickerStore';
import { toast } from '@/components/layout/ToastContainer';

const PROVENANCE_LABEL: Record<HardwareProfile['source'], string> = {
  'vendor-confirmed': 'VENDOR',
  'community-validated': 'COMMUNITY',
  'community-submitted': 'SUBMITTED',
  experimental: 'EXPERIMENTAL',
};

const PROVENANCE_COLOR: Record<HardwareProfile['source'], string> = {
  'vendor-confirmed': 'rgb(var(--accent))',
  'community-validated': 'rgb(var(--text-secondary))',
  'community-submitted': 'rgb(var(--text-muted))',
  experimental: 'rgb(var(--warning, 220, 140, 60))',
};

function ProvenanceBadge({ source }: { source: HardwareProfile['source'] }) {
  return (
    <span
      className="text-ui-xs font-mono uppercase tracking-[0.12em]"
      style={{
        color: PROVENANCE_COLOR[source],
        border: `1px solid ${PROVENANCE_COLOR[source]}`,
        padding: '2px 6px',
        borderRadius: '2px',
        opacity: 0.85,
      }}
    >
      {PROVENANCE_LABEL[source]}
    </span>
  );
}

function ProfileCard({
  profile,
  isSelected,
  onClick,
}: {
  profile: HardwareProfile;
  isSelected: boolean;
  onClick: () => void;
}) {
  const ledSummary = profile.blades
    .map((b) => `${b.ledCount} LED ${b.role}`)
    .join(' + ');

  return (
    <button
      onClick={onClick}
      className="text-left corner-rounded btn-hum no-aurebesh w-full"
      style={{
        padding: '12px 14px',
        background: isSelected
          ? 'var(--accent-dim, rgba(0, 140, 255, 0.12))'
          : 'rgb(var(--bg-surface))',
        border: isSelected
          ? '1px solid rgb(var(--accent) / 0.6)'
          : '1px solid var(--border-subtle)',
        cursor: 'pointer',
        transition: 'border-color 150ms ease, background 150ms ease',
      }}
      aria-pressed={isSelected}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div
          className="text-ui-sm font-mono"
          style={{
            color: isSelected ? 'rgb(var(--accent))' : 'rgb(var(--text-primary))',
            fontWeight: 600,
            letterSpacing: '0.08em',
          }}
        >
          {profile.vendor.toUpperCase()} · {profile.model}
        </div>
        <ProvenanceBadge source={profile.source} />
      </div>
      <div
        className="text-ui-xs"
        style={{ color: 'rgb(var(--text-muted))', marginBottom: '4px' }}
      >
        {ledSummary} · {profile.numButtons}-button
      </div>
      {profile.notes && (
        <div
          className="text-ui-xs"
          style={{
            color: 'rgb(var(--text-muted))',
            opacity: 0.7,
            fontStyle: 'italic',
            lineHeight: 1.4,
          }}
        >
          {profile.notes}
        </div>
      )}
    </button>
  );
}

/**
 * Chassis hardware profile picker.
 *
 * Lists every `HardwareProfile` shipped with `@kyberstation/hardware-profiles`
 * and writes the selection to the active saber profile's
 * `hardwareProfileId` field. The selection drives codegen via
 * `profileToConfigOptions` at export time.
 *
 * Entry points:
 *   - StatusBar `CHASSIS` chip click (always available).
 *   - Export-time guard in `CodeOutput.tsx` (when active profile has no
 *     `hardwareProfileId` set yet).
 *
 * Not shown automatically on app mount — the StatusBar chip's visible
 * "NOT SET" warning state is the discovery surface, so the picker
 * doesn't compete with `OnboardingFlow` for the first-run moment.
 */
export function ChassisPicker() {
  const isOpen = useChassisPickerStore((s) => s.isOpen);
  const reason = useChassisPickerStore((s) => s.reason);
  const closeStore = useChassisPickerStore((s) => s.close);
  const activeProfile = useSaberProfileStore((s) => s.getActiveProfile());
  const updateProfile = useSaberProfileStore((s) => s.updateProfile);

  const [selectedId, setSelectedId] = useState<string | null>(
    activeProfile?.hardwareProfileId ?? null,
  );

  const { dialogRef } = useModalDialog<HTMLDivElement>({
    isOpen,
    onClose: closeStore,
  });

  if (!isOpen) return null;
  const onClose = closeStore;

  const handleConfirm = () => {
    if (!activeProfile) {
      toast('Create a saber profile first', 'warning');
      return;
    }
    if (!selectedId) {
      toast('Pick a chassis to continue', 'warning');
      return;
    }
    updateProfile(activeProfile.id, { hardwareProfileId: selectedId });
    const picked = byId(selectedId);
    toast(`Chassis set: ${picked?.vendor ?? ''} ${picked?.model ?? selectedId}`, 'success');
    onClose();
  };

  const headerTitle =
    reason === 'export-block'
      ? 'Pick your chassis before exporting'
      : 'Pick your saber chassis';

  const headerSubtitle =
    reason === 'export-block'
      ? "KyberStation needs to know your hardware before emitting a config — defaults won't boot on a vendor chassis."
      : 'KyberStation will emit a config tailored to this hardware. You can change this anytime from the StatusBar chip.';

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chassis-picker-title"
      aria-describedby="chassis-picker-subtitle"
      className="fixed inset-0 z-[50] flex items-center justify-center"
      style={{ background: 'rgba(var(--bg-deep), 0.92)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-xl mx-4 corner-rounded"
        style={{
          background: 'rgb(var(--bg-secondary))',
          border: '1px solid var(--border-light)',
          padding: '28px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h2
          id="chassis-picker-title"
          className="text-ui-lg font-mono"
          style={{
            color: 'rgb(var(--text-primary))',
            fontWeight: 600,
            letterSpacing: '0.06em',
            marginBottom: '6px',
          }}
        >
          {headerTitle}
        </h2>
        <p
          id="chassis-picker-subtitle"
          className="text-ui-xs"
          style={{
            color: 'rgb(var(--text-muted))',
            marginBottom: '20px',
            lineHeight: 1.5,
          }}
        >
          {headerSubtitle}
        </p>

        {!activeProfile && (
          <div
            className="text-ui-xs"
            style={{
              color: 'rgb(var(--warning, 220, 140, 60))',
              border: '1px solid rgb(var(--warning, 220, 140, 60) / 0.5)',
              padding: '10px 14px',
              borderRadius: '4px',
              marginBottom: '16px',
            }}
            role="alert"
          >
            No active saber profile. Create one from the Saber Profile panel,
            then come back here to pick a chassis.
          </div>
        )}

        <div
          className="flex flex-col gap-2"
          style={{
            overflowY: 'auto',
            paddingRight: '4px',
          }}
        >
          {ALL_PROFILES.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isSelected={selectedId === profile.id}
              onClick={() => setSelectedId(profile.id)}
            />
          ))}
        </div>

        <div
          className="flex items-center justify-end gap-3 pt-5"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            marginTop: '16px',
          }}
        >
          <button
            onClick={onClose}
            className="text-ui-sm btn-hum"
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              color: 'rgb(var(--text-muted))',
              borderRadius: '2px',
              cursor: 'pointer',
              letterSpacing: '0.08em',
            }}
          >
            {reason === 'export-block' ? 'Cancel export' : "I'll do this later"}
          </button>
          <button
            data-autofocus
            onClick={handleConfirm}
            disabled={!activeProfile || !selectedId}
            className="text-ui-sm font-mono btn-hum"
            style={{
              padding: '8px 18px',
              background:
                activeProfile && selectedId
                  ? 'rgb(var(--accent))'
                  : 'rgb(var(--bg-surface))',
              border: '1px solid rgb(var(--accent))',
              color:
                activeProfile && selectedId
                  ? 'rgb(var(--bg-deep))'
                  : 'rgb(var(--text-muted))',
              borderRadius: '2px',
              cursor: activeProfile && selectedId ? 'pointer' : 'not-allowed',
              opacity: activeProfile && selectedId ? 1 : 0.6,
              letterSpacing: '0.08em',
              fontWeight: 600,
            }}
          >
            Save chassis
          </button>
        </div>
      </div>
    </div>
  );
}
