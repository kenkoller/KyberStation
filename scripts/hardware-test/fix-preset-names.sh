#!/usr/bin/env bash
#
# fix-preset-names.sh — Rename a contiguous range of presets on the saber
# via `change_preset N` + `set_name <name>`. Used to fix the all-name=
# "Graflex" bug introduced by load-runtime-presets.sh before it learned
# to call set_name (now fixed in the loader; this script is for fixing
# already-loaded preset lists).
#
# Usage:
#   scripts/hardware-test/fix-preset-names.sh <start-position> <path-to-presets.ini>
#
# Reads the names from <presets.ini> in order and applies them to
# preset positions <start-position> .. <start-position + N - 1>.

set -euo pipefail

START="${1:?Usage: $0 <start-position> <path-to-presets.ini>}"
FILE="${2:?Usage: $0 <start-position> <path-to-presets.ini>}"
[[ -f "$FILE" ]] || { echo "ERROR: $FILE not found" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERIAL="$SCRIPT_DIR/proffie-serial.sh"

# Extract names in order from presets.ini
NAMES=()
while IFS= read -r line; do
  line="${line%$'\r'}"
  if [[ "$line" =~ ^name= ]]; then
    NAMES+=("${line#name=}")
  fi
done < "$FILE"

TOTAL=${#NAMES[@]}
echo "Renaming $TOTAL presets starting at position $START..."
echo ""

for i in "${!NAMES[@]}"; do
  POS=$((START + i))
  NAME="${NAMES[$i]}"
  printf "  [%02d/%02d] position %d  →  %s\n" "$((i + 1))" "$TOTAL" "$POS" "$NAME"
  RX_TIMEOUT=0.5 "$SERIAL" "change_preset $POS" > /dev/null 2>&1 || true
  RX_TIMEOUT=0.5 "$SERIAL" "set_name $NAME" > /dev/null 2>&1 || true
done

echo ""
echo "=== Final list_presets tail ==="
RX_TIMEOUT=4 "$SERIAL" list_presets 2>&1 | tail -80
