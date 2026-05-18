#!/usr/bin/env bash
#
# backup-proffieboard-sdcard.sh — File-level backup of a Proffieboard SD card
#
# Pairs with backup-proffieboard-v3.sh. That one captures the chip's flash;
# this one captures the SD card contents (factory fonts, tracks, presets.ini,
# common/, etc.). Together they snapshot the full state of a saber.
#
# Copies the SD card to a local folder via rsync, computes a SHA256 manifest
# of every file, and writes a directory tree summary so the backup is
# inspectable months later without remounting the card.
#
# Usage:
#   scripts/hardware-test/backup-proffieboard-sdcard.sh <sd-mount-path> [output-dir]
#
# Example:
#   ./scripts/hardware-test/backup-proffieboard-sdcard.sh /Volumes/PROFFIE \
#     backups/89sabers-v39bt-factory-2026-05-14/sdcard
#
# Requirements:
#   - SD card mounted (e.g. via USB SD reader)
#   - rsync, shasum, find  (all stock on macOS)

set -euo pipefail

SD_MOUNT="${1:?Usage: $0 <sd-mount-path> [output-dir]}"
OUTPUT_DIR="${2:-backups/proffieboard-sdcard-$(date +%F)}"

if [ ! -d "$SD_MOUNT" ]; then
    echo "ERROR: SD mount path not found: $SD_MOUNT" >&2
    echo "  List mounted volumes with:  ls /Volumes/" >&2
    exit 1
fi

echo "==> Source: $SD_MOUNT"
echo "==> Destination: $OUTPUT_DIR"
echo

echo "==> Source content summary:"
# `du` and `find` against an SD mount commonly fail with permission-denied
# on macOS Spotlight metadata (.Spotlight-V100/, .fseventsd/). Their stderr
# is silenced, but pipefail would otherwise abort the whole script silently
# right here, before rsync ever runs. Tolerate a non-zero exit on these
# informational pipelines only.
du -sh "$SD_MOUNT" 2>/dev/null | sed 's/^/    /' || true
echo "    Top-level entries:"
find "$SD_MOUNT" -maxdepth 1 -mindepth 1 2>/dev/null | sort | sed 's/^/      /' || true
echo

mkdir -p "$OUTPUT_DIR"

echo "==> Copying via rsync (this can take several minutes for multi-GB cards)..."
rsync -av --info=progress2 "$SD_MOUNT/" "$OUTPUT_DIR/"
echo

echo "==> Computing SHA256 manifest of every file..."
cd "$OUTPUT_DIR"
find . -type f \
    -not -name 'SHA256SUMS.txt' \
    -not -name 'TREE.txt' \
    -print0 | xargs -0 shasum -a 256 | sort -k2 > SHA256SUMS.txt
echo "    $(wc -l < SHA256SUMS.txt) files hashed."

echo
echo "==> Writing directory tree (TREE.txt)..."
find . \
    -not -name 'SHA256SUMS.txt' \
    -not -name 'TREE.txt' \
    | sort > TREE.txt
echo "    $(wc -l < TREE.txt) entries in tree."

echo
echo "==> Backup complete: $(pwd)"
echo "==> Total size: $(du -sh . | cut -f1)"
echo
echo "==> To restore: rsync -av <this-folder>/ <new-SD-mount-path>/"
