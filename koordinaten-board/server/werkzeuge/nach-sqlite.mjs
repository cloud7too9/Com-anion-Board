// Einmaliger Umzug von daten.json (und biome/<weltId>.json) nach daten.db (Umbau Phase 4).
// Der Server macht dasselbe beim ersten Start von selbst; dieses Skript ist zum Ausprobieren
// an einer Kopie der echten Daten gedacht. Die JSON-Dateien bleiben liegen.
//   node werkzeuge/nach-sqlite.mjs [Datenordner]      (Standard: server/daten)
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Daten } from '../src/daten.js';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const ordner = path.resolve(process.argv[2] ?? path.join(HIER, '..', 'daten'));
const json = path.join(ordner, 'daten.json');

if (!existsSync(json)) {
  console.error(`Keine daten.json in ${ordner}`);
  process.exit(1);
}
const daten = new Daten(ordner);
if (!daten.oeffnen().leer()) {
  console.log(`${path.join(ordner, 'daten.db')} hat schon Daten – daten.json wird nicht noch einmal übernommen.`);
  await daten.schliessen();
  process.exit(0);
}
await daten.laden();      // übernimmt daten.json und biome/*.json, meldet die Zeilen
const umfang = daten.speicher.umfang();
await daten.schliessen();
console.log('Zeilen in daten.db:', Object.entries(umfang).filter(([, n]) => n).map(([t, n]) => `${t} ${n}`).join(', '));
console.log('Sicherung (unverändert): daten.json' + (existsSync(path.join(ordner, 'biome')) ? ', biome/' : ''));
