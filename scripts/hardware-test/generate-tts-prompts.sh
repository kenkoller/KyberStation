#!/usr/bin/env bash
#
# generate-tts-prompts.sh — Generate ProffieOS-format `font.wav` voice
# callout files for bench-validation preset identification.
#
# Pairs with build-bench-validation-presets.mjs (the curated 15 picks)
# and deploy-sd-bench-setup.sh (the SD copy step). Outputs one
# `font.wav` per saber-side font folder name, voiced with a short
# "Position N, character-name" callout using macOS `say` + `afconvert`.
#
# Format: 44.1kHz 16-bit mono PCM WAV (ProffieOS-compatible).
#
# Usage:
#   scripts/hardware-test/generate-tts-prompts.sh
#
# Output:
#   scripts/hardware-test/bench-output/tts-prompts/<font>/font.wav  (×16)
#
# To customize callouts, edit the TTS array below. Format per line:
#   "<font_folder>|<text spoken>"

set -euo pipefail

OUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/bench-output/tts-prompts"
VOICE="${TTS_VOICE:-Daniel}"

# (font_folder, spoken_text) — matches the 16 presets emitted by
# build-bench-validation-presets.mjs + the SD font folders the bench
# session targets. To change preset ordering or fonts, update both
# scripts together.
TTS=(
  "Vader|Zero, factory Vader"
  "Ben|One, Obi-Wan A-N-H"
  "DV3|Two, Vader"
  "Luke6|Three, Luke, Return of the Jedi"
  "Anakin|Four, Anakin"
  "Windu|Five, Mace Windu"
  "Yoda|Six, Yoda"
  "Guardian|Seven, Plo Koon"
  "Maul|Eight, Darth Maul"
  "Palpatine|Nine, Sidious"
  "Dooku|Ten, Count Dooku"
  "Ventress|Eleven, Asajj Ventress"
  "KyloRenTROS|Twelve, Kylo Ren"
  "Rey|Thirteen, Rey"
  "AhsokaTM|Fourteen, Ahsoka"
  "Revan|Fifteen, Mara Jade"
)

# Sanity: macOS-only dependencies
command -v say       >/dev/null || { echo "ERROR: 'say' not found — script is macOS-only" >&2; exit 1; }
command -v afconvert >/dev/null || { echo "ERROR: 'afconvert' not found — script is macOS-only" >&2; exit 1; }

echo "=== Generating $((${#TTS[@]})) TTS font.wav prompts ==="
echo "  Voice: $VOICE  (override via TTS_VOICE=<name>)"
echo "  Output: $OUT_DIR"
echo

for entry in "${TTS[@]}"; do
  font="${entry%%|*}"
  text="${entry##*|}"
  mkdir -p "$OUT_DIR/$font"
  AIFF="$OUT_DIR/$font/font.aiff"
  WAV="$OUT_DIR/$font/font.wav"
  say -v "$VOICE" -o "$AIFF" "$text" 2>/dev/null
  afconvert "$AIFF" "$WAV" -d LEI16@44100 -f WAVE -c 1 2>/dev/null
  rm -f "$AIFF"
  size=$(stat -f%z "$WAV" 2>/dev/null)
  printf "  ✓ %-15s %6d bytes — \"%s\"\n" "$font/font.wav" "$size" "$text"
done

echo
echo "=== Bundle ==="
du -sh "$OUT_DIR" | sed 's/^/  /'
echo
echo "  Next: scripts/hardware-test/deploy-sd-bench-setup.sh /Volumes/<SD_NAME>"
