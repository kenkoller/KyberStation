#!/usr/bin/env bash
# Generate the self-signed localhost certificate that `pnpm serve`
# (scripts/local-serve.mjs) uses for its HTTPS proxy. Phones need HTTPS
# before the browser exposes gyro / motion sensors, so this is only needed
# for on-device motion testing over the LAN.
#
# Writes certs/localhost.pem + certs/localhost-key.pem (both gitignored).
# To reach the dev server from a phone, add your machine's LAN IP to
# subjectAltName in certs/openssl.cnf before running this.
set -euo pipefail
cd "$(dirname "$0")/.."

openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
  -keyout certs/localhost-key.pem \
  -out certs/localhost.pem \
  -config certs/openssl.cnf

echo "Wrote certs/localhost.pem and certs/localhost-key.pem"
