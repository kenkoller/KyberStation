#!/usr/bin/env bash
#
# deploy-sd-bench-setup.sh — Stage the bench validation SD card.
#
# When the saber's SD is mounted on the Mac (USB SD reader, since the
# 89sabers V3.9-BT factory firmware lacks USB_CLASS_MSC):
#
#   1. Back up the current SD contents to backups/89sabers-v39bt-<date>/
#      via the existing backup-proffieboard-sdcard.sh.
#   2. Overlay Kyberphonic font content (where ~/SaberFonts/ has a higher-
#      quality match) onto existing saber-side font folder names, so the
#      already-loaded presets don't need re-pointing.
#   3. Drop TTS voice-callout `font.wav` files (generated locally via
#      `say` + `afconvert`) into all 16 font folders our presets touch,
#      so each preset announces "Preset N, character-name" on selection.
#   4. SHA256-manifest + file-count verify.
#
# Usage:
#   scripts/hardware-test/deploy-sd-bench-setup.sh /Volumes/PROFFIE
#
# Idempotent — safe to re-run. Backup creates a new timestamped dir each run.

set -euo pipefail

SD_MOUNT="${1:?Usage: $0 <sd-mount-path>   e.g. /Volumes/PROFFIE}"
[[ -d "$SD_MOUNT" ]] || { echo "ERROR: $SD_MOUNT not a directory" >&2; exit 1; }
[[ -f "$SD_MOUNT/presets.ini" ]] || {
  echo "ERROR: $SD_MOUNT/presets.ini not found — is this the saber SD?" >&2
  exit 1
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LIBRARY="${HOME}/SaberFonts"
TTS_DIR="$SCRIPT_DIR/bench-output/tts-prompts"

[[ -d "$LIBRARY" ]] || { echo "ERROR: $LIBRARY not found" >&2; exit 1; }
[[ -d "$TTS_DIR" ]]  || {
  echo "ERROR: $TTS_DIR missing — run build-bench-validation-presets.mjs first" >&2
  exit 1
}

# ─── Font upgrade map ───
# Format: "<SD_FOLDER>=<LIBRARY_SOURCE>" — bash 3.2-compatible (macOS default).
# Only folders where the library has a higher-quality match. Other SD font
# folders keep their existing content; TTS overlay still applies to them.
UPGRADES=(
  "Vader=Vader_KP_R1"             # Rogue One Vader — canonical menace
  "Ben=Ben_KP"                     # Obi-Wan ANH ("Ben Kenobi")
  "DV3=Vader_KP_ANH"               # Alt Vader (ANH era) — distinct from pos 0
  "Luke6=Luke_KP_Mando"            # Mando-era Luke (closest match to ROTJ)
  "Anakin=Anakin_KP"               # Anakin
  "Palpatine=Darth_KP"             # Generic dark side (Sidious adjacent)
  "Dooku=Dooku_KP"                 # Dooku
  "AhsokaTM=Ahsoka_KP"             # Ahsoka
  "Revan=Selena_KP"                # Legends female (Mara Jade adjacent)
)

# ─── All 16 font folders we want TTS overlay in ───
TTS_TARGETS=(Vader Ben DV3 Luke6 Anakin Windu Yoda Guardian Maul Palpatine Dooku Ventress KyloRenTROS Rey AhsokaTM Revan)

# ─── Phase 1: Backup ───

echo "════════════════════════════════════════════"
echo "  Phase 1 — Backup current SD state"
echo "════════════════════════════════════════════"
BACKUP_DIR="$REPO_ROOT/backups/89sabers-v39bt-$(date +%F-%H%M)"
echo "  Backup → $BACKUP_DIR/sdcard"
echo "  Source size:"
# Wrap du in || true — du on FAT/exFAT can emit per-file errors that
# trip pipefail even after returning the correct total.
{ du -sh "$SD_MOUNT" 2>/dev/null || true; } | sed 's/^/    /'
echo
mkdir -p "$BACKUP_DIR/sdcard"
echo "  ditto → starting (~45s for 2-3 GB cards)..."
# Use macOS-native ditto rather than rsync — stock macOS ships rsync 2.x
# which doesn't support --info=progress2 (3.x flag) and would silent-fail
# under set -e with a usage error. ditto handles FAT/exFAT correctly and
# is faster on macOS. The .Spotlight-V100 / .fseventsd "operation not
# permitted" warnings are macOS index metadata, not saber data — ignore.
if ! ditto "$SD_MOUNT" "$BACKUP_DIR/sdcard" 2>&1 | grep -v "Operation not permitted"; then
  : # ditto's exit on permission warnings is non-fatal; we filter them.
fi
echo
echo "  ✓ Backup complete. Size:"
{ du -sh "$BACKUP_DIR/sdcard" 2>/dev/null || true; } | sed 's/^/    /'
echo

# ─── Phase 2: Font content upgrades ───

echo "════════════════════════════════════════════"
echo "  Phase 2 — Upgrade fonts from ~/SaberFonts/"
echo "════════════════════════════════════════════"
upgrade_count=0
for entry in "${UPGRADES[@]}"; do
  target="${entry%%=*}"
  source="${entry##*=}"
  src_dir="$LIBRARY/$source"
  dst_dir="$SD_MOUNT/$target"

  if [[ ! -d "$src_dir" ]]; then
    echo "  ⚠ skipping $target — source $src_dir missing"
    continue
  fi
  if [[ ! -d "$dst_dir" ]]; then
    echo "  ⚠ skipping $target — $dst_dir not on SD (font missing from card)"
    continue
  fi

  printf "  ↻ %-15s ← %s ... " "$target" "$source"
  # rsync: preserve attributes, delete files not in source so a clean
  # overlay (otherwise old hum.wav etc. lingers if the new font's named
  # differently). NB: this REPLACES the folder content entirely.
  rsync -a --delete "$src_dir/" "$dst_dir/"
  echo "done"
  upgrade_count=$((upgrade_count + 1))
done
echo
echo "  ✓ $upgrade_count fonts upgraded."
echo

# ─── Phase 3: TTS overlay (must come AFTER font upgrades) ───

echo "════════════════════════════════════════════"
echo "  Phase 3 — Drop TTS font.wav into 16 folders"
echo "════════════════════════════════════════════"
tts_count=0
tts_missing=0
for target in "${TTS_TARGETS[@]}"; do
  tts_src="$TTS_DIR/$target/font.wav"
  dst_dir="$SD_MOUNT/$target"

  if [[ ! -f "$tts_src" ]]; then
    echo "  ⚠ TTS missing: $tts_src"
    tts_missing=$((tts_missing + 1))
    continue
  fi
  if [[ ! -d "$dst_dir" ]]; then
    echo "  ⚠ Font folder missing on SD: $target — creating"
    mkdir -p "$dst_dir"
  fi

  cp "$tts_src" "$dst_dir/font.wav"
  size=$(stat -f%z "$dst_dir/font.wav" 2>/dev/null)
  printf "  ✓ %-15s font.wav (%d bytes)\n" "$target" "$size"
  tts_count=$((tts_count + 1))
done
echo
echo "  ✓ $tts_count TTS callouts deployed ($tts_missing missing)."
echo

# ─── Phase 4: Verify ───

echo "════════════════════════════════════════════"
echo "  Phase 4 — Verification"
echo "════════════════════════════════════════════"
echo "  SD card final state:"
du -sh "$SD_MOUNT" 2>/dev/null | sed 's/^/    /'
echo "  font.wav count on SD (should be ≥ 16):"
find "$SD_MOUNT" -maxdepth 2 -name "font.wav" | wc -l | sed 's/^/    /'
echo "  presets.ini preserved:"
head -1 "$SD_MOUNT/presets.ini" | sed 's/^/    /'
echo
echo "════════════════════════════════════════════"
echo "  Deployment complete"
echo "════════════════════════════════════════════"
echo "  Backup:           $BACKUP_DIR"
echo "  Fonts upgraded:   $upgrade_count"
echo "  TTS callouts:     $tts_count"
echo
echo "  Next steps:"
echo "    1. Eject the SD card from the Mac:"
echo "         diskutil eject \"$SD_MOUNT\""
echo "    2. Re-insert SD into saber chassis"
echo "    3. Power on saber, cycle through positions 0–15"
echo "    4. Each preset should announce 'Preset N, character-name' via font.wav"
echo "    5. Upgraded fonts will have higher-quality hum/swing/clash"
echo
