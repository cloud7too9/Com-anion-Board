#!/usr/bin/env bash
# Koordinaten-Board starten: Server + Anzeige im Vollbild (Chromium-Kiosk auf dem Board-Gerät)
# Die Anzeige braucht auch hier ihren Anzeige-Link; der Server schreibt ihn nach server/daten/anzeige-link.txt.
set -e
cd "$(dirname "$0")"

[ -d server/node_modules ] || npm run installieren
[ -d client/dist ] || npm run build

node server/src/server.js &
SERVER=$!
trap 'kill $SERVER' EXIT

sleep 3
LINK_DATEI="${DATEN_ORDNER:-server/daten}/anzeige-link.txt"
LINK=$(cat "$LINK_DATEI" 2>/dev/null || true)
if [ -z "$LINK" ]; then
  echo "Anzeige-Link noch nicht da ($LINK_DATEI) – Link aus der Konsole oben nehmen."
  LINK="http://localhost:3000/anzeige"
fi
BROWSER=$(command -v chromium-browser || command -v chromium || command -v google-chrome || true)
if [ -n "$BROWSER" ] && [ -n "$DISPLAY$WAYLAND_DISPLAY" ]; then
  "$BROWSER" --kiosk --noerrdialogs --disable-infobars --no-first-run "$LINK" &
else
  echo "Kein Browser/Bildschirm gefunden – Anzeige manuell öffnen: $LINK"
fi

wait $SERVER
