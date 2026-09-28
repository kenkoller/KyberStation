'use client';

import { useMemo, useState } from 'react';
import {
  ALL_PROFILES,
  byId,
  getDeliveryGuidance,
  type HardwareProfile,
} from '@kyberstation/hardware-profiles';
import { validateFactoryConfig } from '@kyberstation/codegen';
import { useModalDialog } from '@/hooks/useModalDialog';
import { useSaberProfileStore } from '@/stores/saberProfileStore';
import { useChassisPickerStore } from '@/stores/chassisPickerStore';
import { toast } from '@/components/layout/ToastContainer';

/**
 * Sentinel `hardwareProfileId` meaning "ignore the HardwareProfile
 * registry; use `customPasteConfig` from the saber profile verbatim
 * and only splice in KyberStation's `Preset presets[]` array on export."
 *
 * Kept in sync with `apps/web/components/editor/CodeOutput.tsx` and
 * `apps/web/components/layout/AppPerfStrip.tsx`.
 */
export const CUSTOM_PASTE_PROFILE_ID = 'custom-paste';

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

function DeliveryBadge({ label, warn }: { label: string; warn: boolean }) {
  const color = warn ? 'rgb(var(--status-warn))' : 'rgb(var(--accent))';
  return (
    <span
      className="text-ui-xs font-mono uppercase tracking-[0.12em]"
      style={{ color, border: `1px solid ${color}`, padding: '2px 6px', borderRadius: '2px' }}
    >
      {label}
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
  const delivery = getDeliveryGuidance(profile);

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
        <div className="flex items-center gap-1.5 shrink-0">
          <DeliveryBadge label={delivery.badge} warn={delivery.flashKnownToFail} />
          <ProvenanceBadge source={profile.source} />
        </div>
      </div>
      <div
        className="text-ui-xs"
        style={{ color: 'rgb(var(--text-muted))', marginBottom: '4px' }}
      >
        {ledSummary} · {profile.numButtons}-button
      </div>
      <div
        className="text-ui-xs"
        style={{
          color: delivery.flashKnownToFail
            ? 'rgb(var(--status-warn))'
            : 'rgb(var(--text-secondary))',
          marginBottom: '4px',
          lineHeight: 1.4,
        }}
      >
        {delivery.summary}
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
 * Special card for the "paste your own config.h" path. Clicking it
 * switches the modal into paste view rather than just selecting an id —
 * the user can't save a custom-paste profile without actually pasting
 * their config first.
 */
function CustomPasteCard({
  isSelected,
  hasExistingPaste,
  onClick,
}: {
  isSelected: boolean;
  hasExistingPaste: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left corner-rounded btn-hum no-aurebesh w-full"
      style={{
        padding: '12px 14px',
        background: isSelected
          ? 'var(--accent-dim, rgba(0, 140, 255, 0.12))'
          : 'rgb(var(--bg-surface))',
        border: '1px dashed var(--border-subtle)',
        cursor: 'pointer',
        transition: 'border-color 150ms ease, background 150ms ease',
      }}
      aria-pressed={isSelected}
      data-custom-paste-card
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
          CUSTOM · Paste your config.h
        </div>
        <ProvenanceBadge source="experimental" />
      </div>
      <div
        className="text-ui-xs"
        style={{ color: 'rgb(var(--text-muted))', lineHeight: 1.4 }}
      >
        {hasExistingPaste
          ? 'You have a paste saved — click to edit or replace it.'
          : 'For vendors KyberStation doesn’t yet profile (Sabertrio, KR Sabers, DIY builds, etc.). Paste your factory config.h and KyberStation will preserve everything except the Preset presets[] array on export.'}
      </div>
    </button>
  );
}

interface PasteViewProps {
  initialText: string;
  onSave: (text: string) => void;
  onBack: () => void;
}

function PasteView({ initialText, onSave, onBack }: PasteViewProps) {
  const [text, setText] = useState(initialText);
  const errors = useMemo(
    () => (text.trim().length === 0 ? [] : validateFactoryConfig(text)),
    [text],
  );
  const canSave = text.trim().length > 0 && errors.length === 0;

  return (
    <>
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
        Paste your factory config.h
      </h2>
      <p
        id="chassis-picker-subtitle"
        className="text-ui-xs"
        style={{
          color: 'rgb(var(--text-muted))',
          marginBottom: '16px',
          lineHeight: 1.5,
        }}
      >
        KyberStation preserves everything except the{' '}
        <code style={{ fontFamily: 'monospace', color: 'rgb(var(--text-secondary))' }}>
          Preset presets[]
        </code>{' '}
        array. Your CONFIG_TOP defines, BladeConfig, prop file, and CONFIG_BUTTONS
        sections ship verbatim on every export.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 262144))}
        spellCheck={false}
        placeholder="// Paste the full contents of your factory config.h here&#10;#ifdef CONFIG_TOP&#10;..."
        data-autofocus
        className="font-mono text-ui-xs"
        style={{
          flex: 1,
          minHeight: '220px',
          padding: '12px',
          background: 'rgb(var(--bg-deep))',
          border: '1px solid var(--border-subtle)',
          color: 'rgb(var(--text-primary))',
          borderRadius: '2px',
          resize: 'vertical',
          lineHeight: 1.4,
        }}
      />

      {text.trim().length > 0 && errors.length > 0 && (
        <div
          className="text-ui-xs"
          style={{
            color: 'rgb(var(--status-error, 255, 80, 80))',
            border: '1px solid rgb(var(--status-error, 255, 80, 80) / 0.4)',
            padding: '8px 12px',
            borderRadius: '2px',
            marginTop: '12px',
          }}
          role="alert"
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            Validation issues — fix before saving:
          </div>
          <ul style={{ margin: 0, paddingLeft: '16px' }}>
            {errors.map((e, i) => (
              <li key={i} style={{ marginTop: '2px' }}>
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {text.trim().length > 0 && errors.length === 0 && (
        <div
          className="text-ui-xs"
          style={{
            color: 'rgb(var(--accent))',
            border: '1px solid rgb(var(--accent) / 0.4)',
            padding: '8px 12px',
            borderRadius: '2px',
            marginTop: '12px',
          }}
          role="status"
        >
          ✓ Looks like a valid factory config.h — ready to save.
        </div>
      )}

      <div
        className="flex items-center justify-end gap-3 pt-5"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          marginTop: '16px',
        }}
      >
        <button
          onClick={onBack}
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
          Back to list
        </button>
        <button
          onClick={() => canSave && onSave(text)}
          disabled={!canSave}
          className="text-ui-sm font-mono btn-hum"
          style={{
            padding: '8px 18px',
            background: canSave ? 'rgb(var(--accent))' : 'rgb(var(--bg-surface))',
            border: '1px solid rgb(var(--accent))',
            color: canSave ? 'rgb(var(--bg-deep))' : 'rgb(var(--text-muted))',
            borderRadius: '2px',
            cursor: canSave ? 'pointer' : 'not-allowed',
            opacity: canSave ? 1 : 0.6,
            letterSpacing: '0.08em',
            fontWeight: 600,
          }}
        >
          Save custom config
        </button>
      </div>
    </>
  );
}

/**
 * Chassis hardware profile picker.
 *
 * Two views:
 *   1. List view — shows every shipped `HardwareProfile` plus a special
 *      "Custom · Paste your config.h" card. Selection writes a typed
 *      `hardwareProfileId`.
 *   2. Paste view — full-screen textarea for vendor configs we don't
 *      profile. Validates the paste against a few structural checks
 *      (CONFIG_TOP, CONFIG_PRESETS, `Preset presets[]`, `BladeConfig`).
 *      Save stores the text in `SaberProfile.customPasteConfig` and
 *      flips `hardwareProfileId` to the `'custom-paste'` sentinel.
 *
 * Entry points:
 *   - StatusBar `CHASSIS` chip click (always available).
 *   - Export-time guard in `CodeOutput.tsx` (when active profile has
 *     no `hardwareProfileId` set yet).
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
  const assignChassis = useSaberProfileStore((s) => s.assignChassis);

  const [view, setView] = useState<'list' | 'paste'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(
    activeProfile?.hardwareProfileId ?? null,
  );

  const { dialogRef } = useModalDialog<HTMLDivElement>({
    isOpen,
    onClose: closeStore,
  });

  if (!isOpen) return null;
  const onClose = closeStore;
  const canSave = !!selectedId && selectedId !== CUSTOM_PASTE_PROFILE_ID;

  const handleConfirmList = () => {
    if (!selectedId) {
      toast('Pick a chassis to continue', 'warning');
      return;
    }
    if (selectedId === CUSTOM_PASTE_PROFILE_ID) {
      // The Custom card transitions to paste view rather than saving
      // directly — guard against accidental Save clicks.
      setView('paste');
      return;
    }
    const picked = byId(selectedId);
    const label = picked ? `${picked.vendor} ${picked.model}` : selectedId;
    assignChassis(selectedId, label);
    const viaSdCard = picked?.recommendedDelivery === 'runtime-presets';
    toast(
      viaSdCard
        ? `Chassis set: ${label} — export with SD-card runtime presets`
        : `Chassis set: ${label}`,
      'success',
    );
    onClose();
  };

  const handleSavePaste = (text: string) => {
    const profile = assignChassis(CUSTOM_PASTE_PROFILE_ID, 'My saber');
    updateProfile(profile.id, { customPasteConfig: text });
    toast('Custom chassis config saved', 'success');
    onClose();
  };

  const headerTitle =
    reason === 'export-block'
      ? 'Pick your chassis before exporting'
      : 'Pick your saber chassis';

  const headerSubtitle =
    reason === 'export-block'
      ? "KyberStation needs to know your hardware before emitting a config — defaults won't boot on a vendor chassis."
      : 'KyberStation uses this to recommend how your designs reach the saber and to tailor exported configs. Change it anytime from the StatusBar chip.';

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
        {view === 'paste' ? (
          <PasteView
            initialText={activeProfile?.customPasteConfig ?? ''}
            onSave={handleSavePaste}
            onBack={() => setView('list')}
          />
        ) : (
          <>
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
                  color: 'rgb(var(--text-secondary))',
                  border: '1px solid var(--border-subtle)',
                  padding: '10px 14px',
                  borderRadius: '4px',
                  marginBottom: '16px',
                }}
              >
                No saber profile yet — saving creates one named after the chassis
                you pick. You can rename it later in Saber Profiles.
              </div>
            )}

            <div
              className="flex flex-col gap-2"
              style={{ overflowY: 'auto', paddingRight: '4px' }}
            >
              {ALL_PROFILES.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  isSelected={selectedId === profile.id}
                  onClick={() => setSelectedId(profile.id)}
                />
              ))}
              <CustomPasteCard
                isSelected={selectedId === CUSTOM_PASTE_PROFILE_ID}
                hasExistingPaste={
                  !!activeProfile?.customPasteConfig &&
                  activeProfile.customPasteConfig.trim().length > 0
                }
                onClick={() => {
                  setSelectedId(CUSTOM_PASTE_PROFILE_ID);
                  setView('paste');
                }}
              />
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
                onClick={handleConfirmList}
                disabled={!selectedId || selectedId === CUSTOM_PASTE_PROFILE_ID}
                className="text-ui-sm font-mono btn-hum"
                style={{
                  padding: '8px 18px',
                  background:
                    canSave
                      ? 'rgb(var(--accent))'
                      : 'rgb(var(--bg-surface))',
                  border: '1px solid rgb(var(--accent))',
                  color:
                    canSave
                      ? 'rgb(var(--bg-deep))'
                      : 'rgb(var(--text-muted))',
                  borderRadius: '2px',
                  cursor:
                    canSave
                      ? 'pointer'
                      : 'not-allowed',
                  opacity:
                    canSave
                      ? 1
                      : 0.6,
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                }}
              >
                Save chassis
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
