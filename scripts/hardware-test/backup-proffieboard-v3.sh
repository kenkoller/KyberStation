#!/usr/bin/env bash
#
# backup-proffieboard-v3.sh — Safe factory firmware backup for Proffieboard V3
#
# Captures Bank 1, Bank 2, Option Bytes, and OTP from a Proffieboard V3 that
# is currently in DFU mode. Computes a SHA256 manifest. For vendor-customized
# boards (89sabers, KR, Saberbay, Vader's Vault), runs a sanity gate against
# known-good and known-bricked Option Byte fingerprints from prior forensic
# dumps.
#
# Every dfu-util call here is `-U` (upload from device). No writes.
#
# Usage:
#   scripts/hardware-test/backup-proffieboard-v3.sh [output-dir]
#
# Requirements:
#   - dfu-util 0.11+ in PATH
#   - Saber in DFU mode — hold POWER+AUX (89sabers/KR/Saberbay) while
#     plugging in USB, then verify with `dfu-util -l`. See FLASH_GUIDE.md §6.
#
# Output structure (mirrors backups/89sabers-firmware-recovery-2026-04-30/):
#   bank1-pre.bin           256 KiB at 0x08000000
#   bank2-pre.bin           256 KiB at 0x08040000
#   option-bytes-pre.bin    64 B    at alt=1   (do not write this later)
#   otp-memory.bin          alt=2
#   SHA256SUMS.txt

set -euo pipefail

OUTPUT_DIR="${1:-backups/proffieboard-v3-factory-$(date +%F)}"

# Known fingerprints from backups/89sabers-firmware-recovery-2026-04-30/.
KNOWN_GOOD_89SABERS_OB_SHA="5e98c71ace8fafc19938b38bb62ab94117b11a0b0cff56db9e9169d8124964ea"
KNOWN_BRICKED_89SABERS_OB_SHA="4c2b2194ca8148d12dc751e2cba1cf0039169b6d08f80fab6aa9c74b4c3a2112"

echo "==> Verifying dfu-util sees the saber..."
if ! dfu-util -l 2>&1 | grep -q "0483:df11"; then
    echo
    echo "ERROR: No DFU device at 0483:df11."
    echo "  - Is the saber in DFU mode? Hold POWER+AUX while plugging in USB."
    echo "  - See docs/FLASH_GUIDE.md §6 for vendor-specific button combos."
    echo "  - Then re-run this script."
    exit 1
fi

mkdir -p "$OUTPUT_DIR"
cd "$OUTPUT_DIR"
echo "==> Writing to: $(pwd)"
echo

echo "==> Dumping Bank 1 (256 KiB at 0x08000000)..."
dfu-util -d 0x0483:0xdf11 -a 0 -U bank1-pre.bin -s 0x08000000:262144

echo
echo "==> Dumping Bank 2 (256 KiB at 0x08040000)..."
dfu-util -d 0x0483:0xdf11 -a 0 -U bank2-pre.bin -s 0x08040000:262144

echo
echo "==> Dumping Option Bytes (alt=1)..."
if dfu-util -d 0x0483:0xdf11 -a 1 -U option-bytes-pre.bin; then
    OB_OK=1
else
    echo "WARN: alt=1 not accessible. Vendor may have masked Option Byte read."
    echo "Continuing without Option Bytes dump."
    OB_OK=0
fi

echo
echo "==> Dumping OTP (alt=2)..."
if ! dfu-util -d 0x0483:0xdf11 -a 2 -U otp-memory.bin; then
    echo "WARN: alt=2 not accessible. Continuing without OTP dump."
fi

echo
echo "==> Computing SHA256 manifest..."
shasum -a 256 *.bin > SHA256SUMS.txt
cat SHA256SUMS.txt

if [ "$OB_OK" = "1" ]; then
    OB_SHA=$(shasum -a 256 option-bytes-pre.bin | awk '{print $1}')
    echo
    echo "==> Option Bytes sanity gate (89sabers V3.9 fingerprint comparison):"
    if [ "$OB_SHA" = "$KNOWN_GOOD_89SABERS_OB_SHA" ]; then
        echo "  [PASS] Option Bytes match KNOWN-GOOD 89sabers V3.9 fingerprint."
        echo "         (sha256: 5e98c71a...)"
        echo "         Safe to proceed. DO NOT write to alt=1."
    elif [ "$OB_SHA" = "$KNOWN_BRICKED_89SABERS_OB_SHA" ]; then
        echo "  [FAIL] Option Bytes match the BRICKED 89sabers state."
        echo "         (sha256: 4c2b2194...)"
        echo "         The board is in or near the failure state from 2026-04-29."
        echo "         DO NOT FLASH. Stop and investigate."
        exit 2
    else
        echo "  [INFO] Option Bytes have an unrecognized fingerprint:"
        echo "         $OB_SHA"
        echo "         This may be a different vendor variant. Document in"
        echo "         docs/FLASH_GUIDE.md §10 before any write operation."
    fi
fi

echo
echo "==> Backup complete: $(pwd)"
echo "==> Next: keep this folder somewhere safe. If anything goes wrong, you"
echo "    can restore Bank 1 with:"
echo "      dfu-util -d 0x0483:0xdf11 -a 0 -s 0x08000000:leave \\"
echo "        -D \"$(pwd)/bank1-pre.bin\""
echo
echo "    See docs/FLASH_GUIDE.md §11 for the full recovery procedure."
