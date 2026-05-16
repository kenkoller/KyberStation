#!/usr/bin/env bash
#
# keep-vader-and-calkestis.sh — Reduce the saber's preset list to exactly
# two entries for hilt-mounted A/B brightness testing:
#
#   Position 0: Vader (factory, builtin 1 1 / builtin 1 2)
#   Position 1: Cal Kestis Magenta Fire (Phase C, advanced verb)
#
# Recovery: if you want to restore the factory 28 presets, pull the SD
# card, delete `presets.ini`, reinsert, reboot. ProffieOS's CreateINI()
# will regenerate the full bank from the compiled-in preset state.
#
# Current saber state assumed (from bench session log):
#   - 41 presets total
#   - Position 0 = Modified Graflex (has earlier magenta `advanced` test)
#   - Positions 1-24 = factory presets (Vader at 1)
#   - Positions 25-40 = 16 KyberStation Phase C presets (Cal Kestis at 27)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERIAL="$SCRIPT_DIR/proffie-serial.sh"

# Cal Kestis Magenta Fire — original non-boosted Phase C string
# (from /tmp/fixed-presets.ini before we ran the boosted test).
CALKESTIS_STYLE='advanced 235,18,142 235,18,142 235,18,142 255,255,255 10 237,201,199 125,86,215 250,208,174 354 355 255,255,255'

echo "════════════════════════════════════════════"
echo "  Phase 0 — Restore Cal Kestis to non-boosted magenta"
echo "════════════════════════════════════════════"
RX_TIMEOUT=0.5 "$SERIAL" "change_preset 27" > /dev/null 2>&1 || true
sleep 0.3
RX_TIMEOUT=0.8 "$SERIAL" "set_style1 $CALKESTIS_STYLE" > /dev/null 2>&1 || true
RX_TIMEOUT=0.8 "$SERIAL" "set_style2 $CALKESTIS_STYLE" > /dev/null 2>&1 || true
echo "  Cal Kestis styles restored to (235,18,142)."
echo ""

echo "════════════════════════════════════════════"
echo "  Phase 1 — Delete the modified Graflex at position 0"
echo "════════════════════════════════════════════"
RX_TIMEOUT=0.5 "$SERIAL" "change_preset 0" > /dev/null 2>&1 || true
sleep 0.3
RX_TIMEOUT=0.6 "$SERIAL" "delete_preset 1" > /dev/null 2>&1 || true
echo "  Position 0 deleted. Vader is now at position 0."
echo "  Cal Kestis shifted from 27 → 26."
echo ""

echo "════════════════════════════════════════════"
echo "  Phase 2 — Delete the 25 presets between Vader and Cal Kestis"
echo "  (factory presets 2-24 + Phase C entries 25-26)"
echo "════════════════════════════════════════════"
for i in $(seq 1 25); do
  RX_TIMEOUT=0.4 "$SERIAL" "change_preset 1" > /dev/null 2>&1 || true
  RX_TIMEOUT=0.5 "$SERIAL" "delete_preset 1" > /dev/null 2>&1 || true
  printf "  Phase 2 delete %02d/25 done\n" "$i"
done
echo ""
echo "  Saber now has Vader at 0, Cal Kestis at 1, + 13 more Phase C entries (positions 2-14)."
echo ""

echo "════════════════════════════════════════════"
echo "  Phase 3 — Delete the 13 Phase C presets after Cal Kestis"
echo "════════════════════════════════════════════"
for i in $(seq 1 13); do
  RX_TIMEOUT=0.4 "$SERIAL" "change_preset 2" > /dev/null 2>&1 || true
  RX_TIMEOUT=0.5 "$SERIAL" "delete_preset 1" > /dev/null 2>&1 || true
  printf "  Phase 3 delete %02d/13 done\n" "$i"
done
echo ""

echo "════════════════════════════════════════════"
echo "  Final state — should show only 2 presets"
echo "════════════════════════════════════════════"
RX_TIMEOUT=4 "$SERIAL" "list_presets" 2>&1
