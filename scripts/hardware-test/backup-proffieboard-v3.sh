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

# Known fingerprints — see docs/FLASH_GUIDE.md §10.
# These are informational, not authoritative for brick detection.
KNOWN_89SABERS_VARIANT_A_OB_SHA="5e98c71ace8fafc19938b38bb62ab94117b11a0b0cff56db9e9169d8124964ea"
KNOWN_89SABERS_BT_PRISTINE_OB_SHA="4c2b2194ca8148d12dc751e2cba1cf0039169b6d08f80fab6aa9c74b4c3a2112"

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
echo "==> Dumping Option Bytes (64 bytes at 0x1FFF7800)..."
# Explicit -s required — without it dfu-util pads to 16 KiB and the SHA is meaningless.
if dfu-util -d 0x0483:0xdf11 -a 1 -U option-bytes-pre.bin -s 0x1FFF7800:64; then
    OB_OK=1
else
    echo "WARN: alt=1 not accessible. Vendor may have masked Option Byte read."
    echo "Continuing without Option Bytes dump."
    OB_OK=0
fi

echo
echo "==> Dumping OTP (1024 bytes at 0x1FFF7000)..."
if ! dfu-util -d 0x0483:0xdf11 -a 2 -U otp-memory.bin -s 0x1FFF7000:1024; then
    echo "WARN: alt=2 not accessible. Continuing without OTP dump."
fi

echo
echo "==> Computing SHA256 manifest..."
shasum -a 256 *.bin > SHA256SUMS.txt
cat SHA256SUMS.txt

if [ "$OB_OK" = "1" ]; then
    OB_SHA=$(shasum -a 256 option-bytes-pre.bin | awk '{print $1}')
    echo
    echo "==> Option Bytes fingerprint check (informational — see FLASH_GUIDE.md §10):"
    if [ "$OB_SHA" = "$KNOWN_89SABERS_BT_PRISTINE_OB_SHA" ]; then
        echo "  [INFO] Matches 89sabers V3.9-BT pristine fingerprint (4c2b2194...)."
        echo "         Expected state for the BT-enabled variant."
    elif [ "$OB_SHA" = "$KNOWN_89SABERS_VARIANT_A_OB_SHA" ]; then
        echo "  [INFO] Matches 89sabers V3.9 variant A fingerprint (5e98c71a...)."
        echo "         Expected for non-BT V3.9 boards from one vendor batch."
    else
        echo "  [INFO] Unrecognized fingerprint: $OB_SHA"
        echo "         May be a new vendor variant. Document in FLASH_GUIDE.md §10."
    fi
    echo
    echo "  Reminder: fingerprint match alone does NOT prove the board is healthy;"
    echo "  the decisive test is whether the saber boots when DFU is exited."
fi

# Sanity gate: check that Bank 1 starts with a valid ARM Cortex-M vector table.
# A valid vector table has:
#   - bytes 0-3 = stack pointer (must point into SRAM: 0x20000000-0x2003FFFF)
#   - bytes 4-7 = reset handler  (must point into flash: 0x08000000-0x0807FFFF, odd for Thumb)
echo
echo "==> Bank 1 vector table sanity check..."
SP=$(xxd -l 4 -p bank1-pre.bin)
RH=$(xxd -l 4 -s 4 -p bank1-pre.bin)
# Bytes are little-endian — re-pack for human reading.
SP_BE=$(echo "$SP" | sed 's/\(..\)\(..\)\(..\)\(..\)/\4\3\2\1/')
RH_BE=$(echo "$RH" | sed 's/\(..\)\(..\)\(..\)\(..\)/\4\3\2\1/')
echo "  Initial stack pointer: 0x$SP_BE"
echo "  Reset handler:         0x$RH_BE"
case "$SP_BE" in
    20*) SP_OK=1 ;;
    *)   SP_OK=0 ;;
esac
case "$RH_BE" in
    080*) RH_OK=1 ;;
    *)    RH_OK=0 ;;
esac
if [ "$SP_OK" = "1" ] && [ "$RH_OK" = "1" ]; then
    echo "  [PASS] Vector table looks valid. Bank 1 likely contains bootable firmware."
else
    echo "  [WARN] Vector table does not look valid (SP not in SRAM, or reset handler"
    echo "         not in flash). If the saber fails to boot on next power cycle,"
    echo "         this is the cause. Restore from bank1-pre.bin per FLASH_GUIDE §11."
fi

echo
echo "==> Backup complete: $(pwd)"
echo "==> Next: keep this folder somewhere safe. If anything goes wrong, you"
echo "    can restore Bank 1 with:"
echo "      dfu-util -d 0x0483:0xdf11 -a 0 -s 0x08000000:leave \\"
echo "        -D \"$(pwd)/bank1-pre.bin\""
echo
echo "    See docs/FLASH_GUIDE.md §11 for the full recovery procedure."
