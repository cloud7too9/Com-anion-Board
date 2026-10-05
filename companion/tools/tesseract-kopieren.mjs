// Kopiert die Dateien von tesseract.js für die Texterkennung am Handy nach companion/vendor/tesseract/
// (Umbau Phase 3): Bibliothek, Worker, WebAssembly-Kern (nur LSTM, mit SIMD) und die englischen
// Sprachdaten. Versionen sind in package.json gepinnt. Aufruf: cd companion/tools && npm run tesseract
import { copyFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const MODULE = path.join(HIER, "node_modules");
const ZIEL = path.join(HIER, "..", "vendor", "tesseract");
const version = (paket) => JSON.parse(readFileSync(path.join(MODULE, paket, "package.json"), "utf8")).version;

const DATEIEN = [
  ["tesseract.js/dist/tesseract.min.js", "tesseract.min.js"],
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  // Geräte ohne WebAssembly-SIMD holen den Kern vom CDN (texterkennung.js); TESSERACT_CORE_VERSION dort muss passen
  ["tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"],
  ["@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "eng.traineddata.gz"],
];

mkdirSync(ZIEL, { recursive: true });
for (const [quelle, name] of DATEIEN) {
  copyFileSync(path.join(MODULE, quelle), path.join(ZIEL, name));
  console.log(`${name.padEnd(36)} ${(statSync(path.join(ZIEL, name)).size / 1024 / 1024).toFixed(2)} MB`);
}
console.log(`tesseract.js ${version("tesseract.js")} · tesseract.js-core ${version("tesseract.js-core")} · @tesseract.js-data/eng ${version("@tesseract.js-data/eng")}`);
console.log("Lizenztexte: vendor/LIZENZEN.txt (Apache-2.0)");
