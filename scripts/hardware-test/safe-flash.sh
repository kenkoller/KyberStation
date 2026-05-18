#!/usr/bin/env bash
#
# safe-flash.sh — Guarded custom-firmware flash for Proffieboard V3.
#
# This is the if-we-must wrapper described in
# docs/research/PROFFIE_V39BT_FLASH_FEASIBILITY.md §"If a future session
# must flash the V3.9-BT". By default it REFUSES to flash without an
# explicit acknowledgement flag, because every custom flash attempted
# on this board through 2026-05-17 has failed.
#
# Usage:
#   scripts/hardware-test/safe-flash.sh \
#     --firmware /tmp/proffie-build/ProffieOS.ino.iap \
#     --bank 2 \
#     --backup-dir backups/89sabers-v39bt-factory-2026-05-14 \
#     --i-know-this-is-experimental
#
# Required flags:
#   --firmware PATH   path to the compiled .iap (suffix auto-stripped)
#                     or already-stripped .bin
#   --bank N          1 or 2; physical flash bank to write to.
#                     DEFAULT is Bank 1 (0x08000000), matching the
#                     standard arduino-cli .iap link address and
#                     FLASH_GUIDE.md §10's "Bank 1 boots normally"
#                     assertion. The audit's earlier "Bank 2" guidance
#                     was based on a string-density inference that is
#                     not corroborated by FLASH_GUIDE §10's vector-table
#                     forensics; see the 2026-05-18 postscript in
#                     docs/research/PROFFIE_V39BT_FLASH_FEASIBILITY.md
#                     §"Bank-selection reconciliation."
#   --backup-dir DIR  factory-state backup dir to verify against;
#                     this script will NOT proceed without it
#   --i-know-this-is-experimental
#                     explicit ack that you've read the feasibility
#                     audit and accept the risk
#
# Optional:
#   --no-leave        write without :leave (you handle reset manually).
#                     Useful when you want to verify the write before
#                     letting the chip try to boot the new firmware.
#   --skip-fingerprint-check
#                     allow proceeding if the backup hashes don't match
#                     the May 14 fingerprint (e.g. a different vendor
#                     board or a later backup). Strongly discouraged.
#
# What this script does:
#   1. Verifies dfu-util sees the chip.
#   2. Verifies the backup dir matches the May 14 V3.9-BT fingerprint
#      (the only known-good recovery source for this chassis).
#   3. Strips the .iap DFU suffix if needed (16 trailing bytes).
#   4. Writes the firmware to the chosen bank.
#   5. Prints the restore command to keep ready in another terminal.
#
# What this script does NOT do:
#   - Touch Option Bytes. Don't even ask. The 2026-04-29 OB incident
#     bricked the original V3.9 board; we don't go near alt=1.
#   - Touch OTP.
#
# What the audit can NOT yet tell you:
#   - Which bank is the actual boot bank on the V3.9-BT. The audit body
#     argues Bank 2 (string density); FLASH_GUIDE.md §10's existing
#     fingerprint-table entry argues Bank 1 (valid vector table at offset
#     0; chip boots normally). The standard ProffieOS workflow flashes
#     Bank 1, so that's the default here. If Bank 1 turns out to be
#     wrong, the worst case is a no-op write — not a brick. ST-Link
#     analysis is the only way to resolve definitively.

set -euo pipefail

# --- defaults ---
FIRMWARE=""
BANK="1"            # Bank 1 — matches standard ProffieOS workflow (FLASH_GUIDE §10)
BACKUP_DIR=""
ACK=0
SKIP_FINGERPRINT=0
USE_LEAVE=1

# --- parse args ---
while [ $# -gt 0 ]; do
    case "$1" in
        --firmware) FIRMWARE="$2"; shift 2;;
        --bank) BANK="$2"; shift 2;;
        --backup-dir) BACKUP_DIR="$2"; shift 2;;
        --i-know-this-is-experimental) ACK=1; shift;;
        --no-leave) USE_LEAVE=0; shift;;
        --skip-fingerprint-check) SKIP_FINGERPRINT=1; shift;;
        -h|--help)
            sed -n '/^# Usage:/,/^$/p' "$0" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *) echo "Unknown flag: $1" >&2; exit 1;;
    esac
done

# --- validate args ---
if [ "$ACK" != "1" ]; then
    cat >&2 <<'EOF'
ERROR: --i-know-this-is-experimental flag is required.

Custom-firmware flashing on the 89sabers V3.9-BT has not succeeded in
any 2026-05 bench session. Every recompile-and-flash attempt produced a
non-booting saber that required a full dual-bank factory restore.

Before passing this flag, read:
  docs/research/PROFFIE_V39BT_FLASH_FEASIBILITY.md
  docs/archive/SESSION_2026-05-15_V39BT_BENCH.md

For preset changes on this board, use the runtime-preset path instead
(no flashing required):
  scripts/hardware-test/load-runtime-presets.sh path/to/presets.ini

If you're flashing a stock Proffieboard (not vendor-customized) the
recommended path is the documented workflow in:
  docs/FLASH_GUIDE.md
EOF
    exit 2
fi

if [ -z "$FIRMWARE" ] || [ -z "$BACKUP_DIR" ]; then
    echo "ERROR: --firmware and --backup-dir are required." >&2
    echo "Run with --help for usage." >&2
    exit 1
fi

if [ ! -f "$FIRMWARE" ]; then
    echo "ERROR: firmware not found: $FIRMWARE" >&2
    exit 1
fi

case "$BANK" in
    1)
        ADDR="0x08000000"
        echo "==> Target: Bank 1 @ $ADDR (standard ProffieOS workflow)" >&2
        ;;
    2)
        ADDR="0x08040000"
        cat >&2 <<'EOF'
NOTE: --bank 2 selected (0x08040000).

Bank 2 is NOT the standard ProffieOS link address. The arduino-cli .iap
output is linked for Bank 1 (0x08000000); flashing it to Bank 2 lands
the vector table at the wrong offset and may not boot even if Bank 2 is
the boot bank.

The audit considered this target because string analysis of bank2-pre.bin
suggested ProffieOS lives in Bank 2 — but FLASH_GUIDE.md §10 says Bank 1
contains the valid Cortex-M vector table and the chip boots normally.
Without ST-Link analysis we can't resolve which is correct.

If you mean to do this anyway, make sure the firmware was linked for
0x08040000, not the default. Otherwise prefer Bank 1.

Sleeping 5 seconds — Ctrl-C now if you didn't mean this.
EOF
        sleep 5
        ;;
    *)
        echo "ERROR: --bank must be 1 or 2, got: $BANK" >&2
        exit 1
        ;;
esac

# --- verify backup dir ---
if [ ! -d "$BACKUP_DIR" ]; then
    echo "ERROR: backup dir not found: $BACKUP_DIR" >&2
    exit 1
fi
BANK1_BACKUP="$BACKUP_DIR/bank1-pre.bin"
BANK2_BACKUP="$BACKUP_DIR/bank2-pre.bin"
for f in "$BANK1_BACKUP" "$BANK2_BACKUP"; do
    if [ ! -f "$f" ]; then
        echo "ERROR: missing backup file: $f" >&2
        exit 1
    fi
done

EXPECTED_BANK1_SHA="d881a8e781b6199e5894efacab1500b79a24cdfa1979c8ac0f9c22d2b62e1c85"
EXPECTED_BANK2_SHA="61d9f615a8320facd71df368229b9958214a3535637e2800f1584efb3e910185"

BANK1_SHA=$(shasum -a 256 "$BANK1_BACKUP" | awk '{print $1}')
BANK2_SHA=$(shasum -a 256 "$BANK2_BACKUP" | awk '{print $1}')

if [ "$SKIP_FINGERPRINT" = "0" ]; then
    if [ "$BANK1_SHA" != "$EXPECTED_BANK1_SHA" ] || \
       [ "$BANK2_SHA" != "$EXPECTED_BANK2_SHA" ]; then
        echo "ERROR: backup fingerprint mismatch — refusing to flash." >&2
        echo "  This backup is not the known 2026-05-14 V3.9-BT factory dump." >&2
        echo "  Pass --skip-fingerprint-check if you know what you're doing." >&2
        exit 1
    fi
    echo "==> Backup fingerprints match May 14 V3.9-BT factory dump ✓"
else
    echo "==> Skipping fingerprint check (--skip-fingerprint-check)."
fi

# --- verify dfu-util sees the chip ---
echo
echo "==> Checking dfu-util sees the chip..."
if ! dfu-util -l 2>&1 | grep -q "0483:df11"; then
    echo "ERROR: No DFU device at 0483:df11." >&2
    echo "  Enter DFU mode and re-run." >&2
    exit 1
fi

# --- strip DFU suffix if firmware ends in .iap ---
WORK_FW="$FIRMWARE"
case "$FIRMWARE" in
    *.iap)
        SIZE=$(stat -f%z "$FIRMWARE" 2>/dev/null || stat -c%s "$FIRMWARE")
        STRIPPED="/tmp/safe-flash-stripped-$$.bin"
        head -c $((SIZE - 16)) "$FIRMWARE" > "$STRIPPED"
        echo "==> Stripped 16-byte DFU suffix from $FIRMWARE → $STRIPPED"
        WORK_FW="$STRIPPED"
        trap 'rm -f "$STRIPPED"' EXIT
        ;;
esac

FW_SIZE=$(stat -f%z "$WORK_FW" 2>/dev/null || stat -c%s "$WORK_FW")
echo "==> Firmware to flash: $WORK_FW ($FW_SIZE bytes)"

if [ "$FW_SIZE" -gt 262144 ]; then
    echo "ERROR: firmware is $FW_SIZE bytes, exceeds 256 KiB single-bank size." >&2
    echo "  A V3 firmware larger than one bank cannot fit in a single Bank N write." >&2
    exit 1
fi

# --- print recovery handle, then flash ---
RECOVERY_CMD="scripts/hardware-test/restore-factory.sh \"$BACKUP_DIR\""
echo
echo "==> If this flash fails, recovery command (paste in another terminal):"
echo "      $RECOVERY_CMD"
echo

if [ "$USE_LEAVE" = "1" ]; then
    LEAVE_ADDR="${ADDR}:leave"
else
    LEAVE_ADDR="$ADDR"
fi

echo "==> Writing $WORK_FW → $LEAVE_ADDR..."
dfu-util -d 0x0483:0xdf11 -a 0 -s "$LEAVE_ADDR" -D "$WORK_FW"

echo
if [ "$USE_LEAVE" = "1" ]; then
    echo "==> Flash + leave complete. The chip should now attempt to boot."
    echo
    echo "    Within ~5 seconds, check:"
    echo "      ls /dev/cu.usbmodem*      (chip enumerated as USB CDC?)"
    echo "      tail -1 < /dev/cu.usbmodem*  (any output?)"
    echo
    echo "    If no enumeration in 30s and the saber's power button does"
    echo "    nothing: the flash did not boot. Run the recovery command"
    echo "    above to return to factory state, then revisit the audit"
    echo "    before retrying."
else
    echo "==> Flash complete (no :leave). The chip is still in DFU mode."
    echo "    Exit DFU manually when ready: dfu-util -e"
fi
