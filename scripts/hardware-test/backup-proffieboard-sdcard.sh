#!/usr/bin/env bash
#
# backup-proffieboard-sdcard.sh — File-level backup of a Proffieboard SD card
#
# Pairs with backup-proffieboard-v3.sh. That one captures the chip's flash;
# this one captures the SD card contents (factory fonts, tracks, presets.ini,
# common/, etc.). Together they snapshot the full state of a saber.
#
# Copies the SD card to a local folder via rsync, checks that the backup holds
# as many files as the card (failing loudly if not), computes a SHA256 manifest
# of every file, and writes a directory tree summary so the backup is
# inspectable months later without remounting the card.
#
# Works with either rsync. Current macOS ships Apple's openrsync as
# /usr/bin/rsync ("openrsync: protocol version 29"), which rejects rsync 3.x's
# --info=progress2 and exits before copying anything. The script test-runs that
# flag first and falls back to per-file --progress when it's refused.
#
# The macOS system folders at the card root (.Spotlight-V100, .fseventsd,
# .Trashes, .TemporaryItems) are not copied: they aren't saber data, and
# they're often unreadable, which fails the whole copy.
#
# Usage:
#   scripts/hardware-test/backup-proffieboard-sdcard.sh <sd-mount-path> [output-dir]
#
# Example:
#   ./scripts/hardware-test/backup-proffieboard-sdcard.sh /Volumes/PROFFIE \
#     backups/89sabers-v39bt-factory-2026-05-14/sdcard
#
# To use a specific rsync instead of the first one on PATH (e.g. Homebrew's):
#   RSYNC=/opt/homebrew/bin/rsync ./scripts/hardware-test/backup-proffieboard-sdcard.sh ...
#
# Requirements:
#   - SD card mounted (e.g. via USB SD reader)
#   - rsync (openrsync or 3.x), shasum, find  (all stock on macOS)

set -euo pipefail
unset CDPATH  # an exported CDPATH can send `cd` elsewhere and make it print the path

SD_MOUNT="${1:?Usage: $0 <sd-mount-path> [output-dir]}"
OUTPUT_DIR="${2:-backups/proffieboard-sdcard-$(date +%F)}"
RSYNC="${RSYNC:-rsync}"

# macOS writes these at the root of every volume it mounts. They're often
# root-owned or unreadable, so rsync would exit 23 (partial transfer). Both the
# copy and the file-count check skip them.
MACOS_SYSTEM_DIRS=(.Spotlight-V100 .fseventsd .Trashes .TemporaryItems)

if [ ! -d "$SD_MOUNT" ]; then
    echo "ERROR: SD mount path not found: $SD_MOUNT" >&2
    echo "  List mounted volumes with:  ls /Volumes/" >&2
    exit 1
fi

if ! RSYNC_PATH="$(command -v "$RSYNC")"; then
    echo "ERROR: rsync not found: $RSYNC" >&2
    exit 1
fi

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/proffie-sdcard-backup.XXXXXX")"
trap 'rm -rf "$WORK_DIR"' EXIT

# Test-run --info=progress2 between two empty folders rather than parsing
# `rsync --version`: openrsync rejects the flag, and so does rsync 3.0.x (it
# arrived in 3.1.0).
mkdir "$WORK_DIR/probe-src" "$WORK_DIR/probe-dst"
if "$RSYNC" -a --dry-run --info=progress2 \
        "$WORK_DIR/probe-src/" "$WORK_DIR/probe-dst/" >/dev/null 2>&1; then
    PROGRESS_ARGS=(--info=progress2)
    PROGRESS_NOTE="overall progress (--info=progress2)"
else
    PROGRESS_ARGS=(--progress)
    PROGRESS_NOTE="per-file progress (--progress); this rsync has no --info=progress2"
fi
# Informational only, so tolerate a non-zero exit (see the du note below).
RSYNC_VERSION="$("$RSYNC" --version 2>&1 | sed -n 1p || true)"

EXCLUDE_ARGS=()
PRUNE_ARGS=(-false)  # seed, so each folder below appends "-o -path ./<dir>"
for dir in "${MACOS_SYSTEM_DIRS[@]}"; do
    EXCLUDE_ARGS+=("--exclude=/$dir")  # leading / = card root only
    PRUNE_ARGS+=(-o -path "./$dir")
done

echo "==> Source: $SD_MOUNT"
echo "==> Destination: $OUTPUT_DIR"
echo "==> rsync: $RSYNC_PATH ($RSYNC_VERSION)"
echo "    Showing $PROGRESS_NOTE."
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
echo "    Skipping macOS system folders: ${MACOS_SYSTEM_DIRS[*]}"
rsync_status=0
"$RSYNC" -av "${PROGRESS_ARGS[@]}" "${EXCLUDE_ARGS[@]}" \
    "$SD_MOUNT/" "$OUTPUT_DIR/" || rsync_status=$?
if [ "$rsync_status" -ne 0 ]; then
    echo "ERROR: rsync exited with status $rsync_status; the backup is incomplete." >&2
    exit "$rsync_status"
fi
echo

# Sorted relative paths of every regular file under $1, minus the macOS system
# folders at its root and the two files this script writes into the backup
# (an earlier run into the same folder leaves them there).
list_files() {
    ( cd "$1" && find . \( "${PRUNE_ARGS[@]}" \) -prune -o -type f \
        ! -path ./SHA256SUMS.txt ! -path ./TREE.txt -print ) | LC_ALL=C sort
}

# Indent the first 20 lines of stdin; say so when there are none or more.
first_20() {
    awk 'NR <= 20 { print "    " $0 }
         END { if (NR == 0) print "    (none)"; else if (NR > 20) print "    ... and " (NR - 20) " more" }'
}

echo "==> Verifying the file count (macOS system folders not counted)..."
if ! list_files "$SD_MOUNT" > "$WORK_DIR/card-files.txt" ||
   ! list_files "$OUTPUT_DIR" > "$WORK_DIR/backup-files.txt"; then
    echo "ERROR: couldn't list every file to verify the backup (see above)." >&2
    exit 1
fi
card_count="$(wc -l < "$WORK_DIR/card-files.txt" | tr -d ' ')"
backup_count="$(wc -l < "$WORK_DIR/backup-files.txt" | tr -d ' ')"
echo "    Card:   $card_count files"
echo "    Backup: $backup_count files"
if [ "$card_count" -ne "$backup_count" ]; then
    {
        echo
        echo "ERROR: file count mismatch: $card_count on the card, $backup_count in the backup."
        echo "  On the card but missing from the backup:"
        LC_ALL=C comm -23 "$WORK_DIR/card-files.txt" "$WORK_DIR/backup-files.txt" | first_20
        echo "  In the backup but not on the card (e.g. left by an earlier run into this folder):"
        LC_ALL=C comm -13 "$WORK_DIR/card-files.txt" "$WORK_DIR/backup-files.txt" | first_20
        echo "  SHA256SUMS.txt and TREE.txt were not updated. Don't change the card until a backup verifies."
    } >&2
    exit 1
fi
echo "    OK, counts match."
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
