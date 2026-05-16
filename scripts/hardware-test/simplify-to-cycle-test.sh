#!/usr/bin/env bash
#
# simplify-to-cycle-test.sh — Reduce the saber to a minimal 3-preset set
# for the corrected `cycle` verb brightness test, after the first round
# revealed the AudioFlicker slot ordering was inverted (slot 2 = loud-
# audio render, slot 3 = silence; first test had brightened color in
# slot 3 = wasted).
#
# Final state:
#   Position 0: Vader (factory builtin — bright reference, UNCHANGED)
#   Position 1: T01 Cycle Mag (cycle verb, CORRECTED slot order, magenta)
#   Position 2: T02 Cycle Red (cycle verb, CORRECTED slot order, RED — chromatic
#               isolation: if red works but magenta doesn't, magenta is the limit)
#
# Recovery: pull SD card, delete presets.ini, reinsert, reboot. ProffieOS's
# CreateINI() regenerates the factory 28-preset bank from the compiled state.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERIAL="$SCRIPT_DIR/proffie-serial.sh"

# Cycle slot semantics (verified from audio_flicker.h:21-22):
#   AudioFlicker<A, B> = Layers<A, AlphaL<B, NoisySoundLevelCompat>>
#   A renders at SILENCE, B renders during LOUD audio
# Cycle template: AudioFlicker<RgbArg<3>, RgbArg<2>>
#   → slot 3 = silence color, slot 2 = LOUD-AUDIO color (perceived render)
# Slot layout: cycle <slot1=start> <slot2=base/loud> <slot3=flicker/silence> <slot4=blast> <slot5=lockup>

CYCLE_MAG='cycle 235,18,142 245,136,198 235,18,142 250,208,174 125,86,215'
CYCLE_RED='cycle 255,0,0 255,128,128 255,0,0 255,255,255 255,255,0'

echo "════════════════════════════════════════════"
echo "  Step 1 — Update preset 1 → T01 Cycle Mag (corrected slot order)"
echo "════════════════════════════════════════════"
RX_TIMEOUT=0.5 "$SERIAL" "change_preset 1" > /dev/null 2>&1 || true
sleep 0.3
RX_TIMEOUT=0.8 "$SERIAL" "set_font Anakin" > /dev/null 2>&1 || true
RX_TIMEOUT=0.8 "$SERIAL" "set_track tracks/Anakin.wav" > /dev/null 2>&1 || true
RX_TIMEOUT=0.8 "$SERIAL" "set_style1 $CYCLE_MAG" > /dev/null 2>&1 || true
RX_TIMEOUT=0.8 "$SERIAL" "set_style2 $CYCLE_MAG" > /dev/null 2>&1 || true
RX_TIMEOUT=0.8 "$SERIAL" "set_name T01 Cycle Mag" > /dev/null 2>&1 || true
echo "  Done."
echo ""

echo "════════════════════════════════════════════"
echo "  Step 2 — Update preset 2 → T02 Cycle Red (chromatic isolation)"
echo "════════════════════════════════════════════"
RX_TIMEOUT=0.5 "$SERIAL" "change_preset 2" > /dev/null 2>&1 || true
sleep 0.3
RX_TIMEOUT=0.8 "$SERIAL" "set_font Anakin" > /dev/null 2>&1 || true
RX_TIMEOUT=0.8 "$SERIAL" "set_track tracks/Anakin.wav" > /dev/null 2>&1 || true
RX_TIMEOUT=0.8 "$SERIAL" "set_style1 $CYCLE_RED" > /dev/null 2>&1 || true
RX_TIMEOUT=0.8 "$SERIAL" "set_style2 $CYCLE_RED" > /dev/null 2>&1 || true
RX_TIMEOUT=0.8 "$SERIAL" "set_name T02 Cycle Red" > /dev/null 2>&1 || true
echo "  Done."
echo ""

echo "════════════════════════════════════════════"
echo "  Step 3 — Delete 6 extra presets (positions 3-8)"
echo "  We delete position 3 repeatedly; each delete shifts subsequent"
echo "  positions down so we always target the next \"extra\" preset."
echo "════════════════════════════════════════════"
for i in $(seq 1 6); do
  RX_TIMEOUT=0.5 "$SERIAL" "change_preset 3" > /dev/null 2>&1 || true
  RX_TIMEOUT=0.6 "$SERIAL" "delete_preset 1" > /dev/null 2>&1 || true
  printf "  delete %d/6 done\n" "$i"
done
echo ""

echo "════════════════════════════════════════════"
echo "  Final state (should show 3 presets: Vader, T01 Cycle Mag, T02 Cycle Red)"
echo "════════════════════════════════════════════"
RX_TIMEOUT=3 "$SERIAL" "list_presets" 2>&1
