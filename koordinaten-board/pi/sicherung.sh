#!/usr/bin/env bash
# Nächtliche Sicherung von daten.db im laufenden Betrieb (SQLite-Backup-API, Umbau Phase 4/6).
# Cron (als Nutzer board): 15 3 * * * /opt/companion-board/koordinaten-board/pi/sicherung.sh
# Danach die Kopie vom Pi wegholen (Laptop oder Hetzner), z. B. per rsync/scp im selben Cron oder von außen.
set -e
DATEN="${DATEN_ORDNER:-/var/lib/companion-board}"
ZIEL="${SICHERUNG_ORDNER:-/var/lib/companion-board/sicherung}"
mkdir -p "$ZIEL"
sqlite3 "$DATEN/daten.db" ".backup '$ZIEL/daten-$(date +%F).db'"
cp "$DATEN/pin.txt" "$DATEN/geheim.txt" "$ZIEL/" 2>/dev/null || true
# Nur die letzten 14 Tage behalten
ls -1t "$ZIEL"/daten-*.db | tail -n +15 | xargs -r rm --
echo "Sicherung: $ZIEL/daten-$(date +%F).db"
