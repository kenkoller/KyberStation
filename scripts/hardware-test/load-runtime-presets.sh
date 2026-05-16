#!/usr/bin/env bash
#
# load-runtime-presets.sh — Load a presets.ini into a Proffieboard via
# serial commands. Used when the saber's factory firmware doesn't have
# USB_CLASS_MSC defined (no USB-mounted SD card).
#
# Usage:
#   scripts/hardware-test/load-runtime-presets.sh <path-to-presets.ini>
#
# Strategy:
#   1. Read the file, parse each `new_preset` block into { font, track,
#      style1, style2, name, variation }.
#   2. For each preset, send the matching serial commands:
#        duplicate_preset 999  → creates new preset at end of list
#        change_preset N       → move to the new preset
#        set_font <font>
#        set_track <track>
#        set_style1 <style>
#        set_style2 <style>
#   3. Verify with list_presets at the end.
#
# Note: this does NOT wipe the existing preset list. Adds 16 new entries
# after whatever's already there. Run delete loop separately if needed.

set -euo pipefail

FILE="${1:?Usage: $0 <path-to-presets.ini>}"
[[ -f "$FILE" ]] || { echo "ERROR: $FILE not found" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERIAL="$SCRIPT_DIR/proffie-serial.sh"

if [[ ! -x "$SERIAL" ]]; then
  echo "ERROR: $SERIAL not found or not executable" >&2
  exit 1
fi

# Parse presets.ini into bash arrays
declare -a FONTS TRACKS STYLE1S STYLE2S NAMES VARIATIONS

current_font=""
current_track=""
current_style1=""
current_style2=""
current_name=""
current_variation="0"
in_preset=0
style_count=0

while IFS= read -r line; do
  line="${line%$'\r'}"  # strip CR for CRLF safety
  if [[ "$line" == "new_preset" ]]; then
    if [[ $in_preset -eq 1 ]]; then
      FONTS+=("$current_font")
      TRACKS+=("$current_track")
      STYLE1S+=("$current_style1")
      STYLE2S+=("$current_style2")
      NAMES+=("$current_name")
      VARIATIONS+=("$current_variation")
    fi
    in_preset=1
    style_count=0
    current_font=""; current_track=""; current_style1=""; current_style2=""
    current_name=""; current_variation="0"
    continue
  fi
  if [[ "$line" == "end" ]]; then
    if [[ $in_preset -eq 1 ]]; then
      FONTS+=("$current_font")
      TRACKS+=("$current_track")
      STYLE1S+=("$current_style1")
      STYLE2S+=("$current_style2")
      NAMES+=("$current_name")
      VARIATIONS+=("$current_variation")
    fi
    break
  fi
  if [[ "$line" =~ ^font= ]]; then
    current_font="${line#font=}"
  elif [[ "$line" =~ ^track= ]]; then
    current_track="${line#track=}"
  elif [[ "$line" =~ ^style= ]]; then
    if [[ $style_count -eq 0 ]]; then
      current_style1="${line#style=}"
    else
      current_style2="${line#style=}"
    fi
    style_count=$((style_count + 1))
  elif [[ "$line" =~ ^name= ]]; then
    current_name="${line#name=}"
  elif [[ "$line" =~ ^variation= ]]; then
    current_variation="${line#variation=}"
  fi
done < "$FILE"

TOTAL=${#NAMES[@]}
echo "Parsed $TOTAL presets from $FILE"
echo ""

# Capture starting preset count
STARTING_COUNT=$(RX_TIMEOUT=3 "$SERIAL" list_presets 2>&1 | grep -c "^FONT=" || true)
echo "Saber currently has $STARTING_COUNT presets. Adding $TOTAL more (won't wipe existing)."
echo ""

for i in "${!NAMES[@]}"; do
  TARGET_POS=$((STARTING_COUNT + i))
  printf "  [%02d/%02d] %s → font=%s\n" "$((i + 1))" "$TOTAL" "${NAMES[$i]}" "${FONTS[$i]}"

  RX_TIMEOUT=0.5 "$SERIAL" "duplicate_preset $TARGET_POS" > /dev/null 2>&1 || true
  RX_TIMEOUT=0.5 "$SERIAL" "change_preset $TARGET_POS" > /dev/null 2>&1 || true
  RX_TIMEOUT=0.5 "$SERIAL" "set_font ${FONTS[$i]}" > /dev/null 2>&1 || true
  RX_TIMEOUT=0.5 "$SERIAL" "set_track ${TRACKS[$i]}" > /dev/null 2>&1 || true
  RX_TIMEOUT=0.8 "$SERIAL" "set_style1 ${STYLE1S[$i]}" > /dev/null 2>&1 || true
  RX_TIMEOUT=0.8 "$SERIAL" "set_style2 ${STYLE2S[$i]}" > /dev/null 2>&1 || true
  RX_TIMEOUT=0.5 "$SERIAL" "set_name ${NAMES[$i]}" > /dev/null 2>&1 || true
done

echo ""
echo "=== Final preset list (head) ==="
RX_TIMEOUT=4 "$SERIAL" list_presets 2>&1 | tail -60
