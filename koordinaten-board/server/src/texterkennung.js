// Auswertung der Texterkennung – dieselbe Datei wie am Handy (companion/texterkennung.js), per node:vm
// geladen wie regeln.js. Der Server braucht daraus die Feature-Liste (sicht.js) und prüft die reinen
// Funktionen in seinen Tests; die OCR selbst läuft seit Umbau Phase 3 nur noch im Browser.
import path from 'node:path';
import { COMPANION_ORDNER, scriptsLaden } from './regeln.js';

const geladen = scriptsLaden(
  [path.join(COMPANION_ORDNER, 'regeln.js'), path.join(COMPANION_ORDNER, 'texterkennung.js')],
  ['TEXTERKENNUNG'],
).TEXTERKENNUNG;

// Werte aus dem vm-Kontext haben fremde Prototypen (deepStrictEqual stolpert darüber) → in diesen Realm kopieren
const kopie = (wert) => (wert && typeof wert === 'object' ? JSON.parse(JSON.stringify(wert)) : wert);

export const texterkennung = Object.freeze(Object.fromEntries(Object.entries(geladen).map(([name, wert]) =>
  [name, typeof wert === 'function' ? (...args) => kopie(wert(...args)) : kopie(wert)])));
