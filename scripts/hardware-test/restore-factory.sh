#!/usr/bin/env bash
#
# restore-factory.sh — Restore the 89sabers V3.9-BT bench board to factory
# firmware from the 2026-05-14 dual-bank dump.
#
# This is the always-works recovery path documented in
# docs/research/PROFFIE_V39BT_FLASH_FEASIBILITY.md §"Recovery protocol".
# Use it when a custom flash attempt has left the saber in a non-booting
# state, or whenever you need a known-good baseline to start from.
#
# Usage:
#   scripts/hardware-test/restore-factory.sh [path/to/backup-dir]
#
# Default backup dir: backups/89sabers-v39bt-factory-2026-05-14
#
# Requirements:
#   - dfu-util 0.11+ in PATH
#   - Saber in DFU mode (POWER+AUX while plugging in USB, or hardware
#     BOOT+RESET on the board). See docs/FLASH_GUIDE.md §6.
#   - The backup dir must contain bank1-pre.bin, bank2-pre.bin, and
#     SHA256SUMS.txt with matching hashes.
#
# What this script does NOT do:
#   - It does NOT write Option Bytes. The factory OB state is preserved
#     by virtue of being left alone. Writing OB is what bricked the
#     retired V3.9 board on 2026-04-29; we do not go near it.
#   - It does NOT write OTP. OTP is captured in the backup for forensics
#     but is never re-written.

set -euo pipefail

BACKUP_DIR="${1:-backups/89sabers-v39bt-factory-2026-05-14}"

# Expected fingerprints — match the captured 2026-05-14 backup.
EXPECTED_BANK1_SHA="d881a8e781b6199e5894efacab1500b79a24cdfa1979c8ac0f9c22d2b62e1c85"
EXPECTED_BANK2_SHA="61d9f615a8320facd71df368229b9958214a3535637e2800f1584efb3e910185"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "ERROR: Backup directory not found: $BACKUP_DIR"
    echo
    echo "If the repo is in a worktree and the backup lives in the main"
    echo "checkout, pass the absolute path:"
    echo "  scripts/hardware-test/restore-factory.sh \\"
    echo "    /Users/KK/Development/KyberStation/backups/89sabers-v39bt-factory-2026-05-14"
    exit 1
fi

BANK1="$BACKUP_DIR/bank1-pre.bin"
BANK2="$BACKUP_DIR/bank2-pre.bin"

for f in "$BANK1" "$BANK2"; do
    if [ ! -f "$f" ]; then
        echo "ERROR: Missing $f"
        exit 1
    fi
done

echo "==> Verifying backup integrity..."
BANK1_SHA=$(shasum -a 256 "$BANK1" | awk '{print $1}')
BANK2_SHA=$(shasum -a 256 "$BANK2" | awk '{print $1}')

if [ "$BANK1_SHA" != "$EXPECTED_BANK1_SHA" ]; then
    echo "ERROR: Bank 1 backup hash mismatch."
    echo "  expected: $EXPECTED_BANK1_SHA"
    echo "  got:      $BANK1_SHA"
    echo
    echo "This is the wrong backup, a corrupted backup, or a backup of a"
    echo "different board. Aborting — refusing to write unverified data."
    exit 1
fi
if [ "$BANK2_SHA" != "$EXPECTED_BANK2_SHA" ]; then
    echo "ERROR: Bank 2 backup hash mismatch."
    echo "  expected: $EXPECTED_BANK2_SHA"
    echo "  got:      $BANK2_SHA"
    exit 1
fi
echo "  Bank 1: $BANK1_SHA ✓"
echo "  Bank 2: $BANK2_SHA ✓"

echo
echo "==> Confirming saber is in DFU mode..."
if ! dfu-util -l 2>&1 | grep -q "0483:df11"; then
    echo "ERROR: No DFU device at 0483:df11."
    echo "  Enter DFU mode (POWER+AUX while plugging in USB, or BOOT+RESET"
    echo "  on the board itself), then re-run."
    exit 1
fi

echo
echo "==> Writing Bank 1 (0x08000000)..."
dfu-util -d 0x0483:0xdf11 -a 0 -s 0x08000000 -D "$BANK1"

echo
echo "==> Writing Bank 2 (0x08040000) with :leave to boot factory firmware..."
dfu-util -d 0x0483:0xdf11 -a 0 -s 0x08040000:leave -D "$BANK2"

echo
echo "==> Restore complete. The saber should ignite on the next power-on."
echo
echo "    If it does not boot:"
echo "    1. Re-enter DFU (hardware BOOT+RESET always works)."
echo "    2. Verify with: dfu-util -l   (expect 0483:df11)"
echo "    3. Re-run this script."
echo
echo "    If it still does not boot after that — file an issue. The"
echo "    fingerprint check above is the strongest evidence we have that"
echo "    the bits are right; if those bits don't boot, the chip itself"
echo "    has a problem and ST-Link / SWD is the next step."
