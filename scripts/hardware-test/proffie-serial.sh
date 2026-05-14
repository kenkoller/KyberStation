#!/usr/bin/env bash
#
# proffie-serial.sh — Send a ProffieOS command over USB CDC and print the response.
#
# Auto-detects the Proffieboard serial port (/dev/cu.usbmodem*), configures
# the port to 115200 8N1 raw, writes one command, captures ~1.5 seconds of
# response, and prints it.
#
# Usage:
#   scripts/hardware-test/proffie-serial.sh <command>
#   scripts/hardware-test/proffie-serial.sh version
#   scripts/hardware-test/proffie-serial.sh "set_preset 3"
#   scripts/hardware-test/proffie-serial.sh battery_voltage
#
# To send multiple commands sequentially, run the script multiple times.
# For interactive use, prefer `screen /dev/cu.usbmodem* 115200`.

CMD="${1:?Usage: $0 <command>}"
RX_TIMEOUT="${RX_TIMEOUT:-1.5}"

# Auto-detect the Proffieboard CDC serial port.
PORT=$(ls /dev/cu.usbmodem* 2>/dev/null | head -1)
if [ -z "$PORT" ]; then
    echo "ERROR: No /dev/cu.usbmodem* device found." >&2
    echo "  Is the saber plugged in and booted on factory firmware?" >&2
    exit 1
fi

# Configure port — silently, only complain on stty failure.
if ! stty -f "$PORT" 115200 cs8 -parenb -cstopb -crtscts raw 2>/dev/null; then
    echo "ERROR: Failed to configure $PORT. Is another program using it?" >&2
    exit 2
fi

TMP=$(mktemp -t proffie-rx)

# Background reader.
cat "$PORT" > "$TMP" 2>/dev/null &
CAT_PID=$!

# Brief settle, write command, wait for response, stop reader.
sleep 0.2
printf "%s\r\n" "$CMD" > "$PORT"
sleep "$RX_TIMEOUT"
kill "$CAT_PID" 2>/dev/null
wait "$CAT_PID" 2>/dev/null

cat "$TMP"
rm -f "$TMP"
exit 0
