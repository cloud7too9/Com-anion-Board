// Texterkennung für Seed-Map-Screenshots (Chunkbase) und Banner-Anleitungen – am Handy im Browser
// (Umbau Phase 3). Die Auswertung (reine Funktionen) lädt auch der Board-Server per node:vm für
// seine Feature-Liste und seine Tests; die OCR selbst (tesseract.js, Canvas) läuft nur im Browser.
// Klassisches Script wie regeln.js (muss vorher geladen sein: biomFinden, BIOMES, FARBEN, MUSTER).
//
// Aufbau des Seed-Map-Popups (immer gleich):
//   Stronghold (Stairway)        ← Titel = was angezeigt wird
//   X: -1,884 Z: -524            ← Koordinaten, manchmal mit Y dazwischen
// Die Dimension steht oben im Dropdown „Dimension: Overworld“.
//
// Banner-Anleitungen listen die Schritte als „<Farbe> <Muster>“ mit den englischen Namen:
//   1  Black Base                 ← Schritt 1 ist das Banner selbst (Grundfarbe)
//   2  Cyan Bordure
//   …  Black Base Sinister Canton
const TEXTERKENNUNG = (() => {
  "use strict";

  // ---------- Seed-Map-Popup ----------

  const ZAHL = String.raw`(-?\s?\d[\d,.' ]*)`;
  // OCR liest „Z“ gelegentlich als „2“ – dann aber nur mit Doppelpunkt dahinter
  const KOORD_ZEILE = new RegExp(
    String.raw`X\s*[:;.]?\s*${ZAHL}?\s*(?:Y\s*[:;.]?\s*${ZAHL}\s*)?(?:Z\s*[:;.]?|2\s*[:;])\s*${ZAHL}`,
    "i",
  );

  /** "-1,884" / "- 1.884" / "1 884" → -1884 */
  function zahlLesen(roh) {
    if (roh == null) return null;
    const ziffern = roh.replace(/\D/g, "");
    if (!ziffern) return null;
    const wert = Number(ziffern);
    return roh.trim().startsWith("-") ? -wert : wert;
  }

  const normalisieren = (text) => text.replace(/[—–−]/g, "-").replace(/\s+/g, " ").trim();

  /** Entfernt Icon-Reste am Ende des Titels, z. B. „(1)“, „@“, „[%“ vom Teilen-Symbol */
  function titelBereinigen(text) {
    const woerter = normalisieren(text).split(" ");
    while (woerter.length > 1) {
      const letztes = woerter.at(-1);
      const buchstaben = (letztes.match(/[A-Za-zÄÖÜäöüß]/g) ?? []).length;
      if (buchstaben === 0 || (letztes.length <= 2 && !/^[A-Z][a-z]?$/.test(letztes))) woerter.pop();
      else break;
    }
    return woerter.join(" ").replace(/^[^A-Za-zÄÖÜäöü0-9(]+/, "").trim();
  }

  // Features der Seed Map (Chunkbase). Typ = Button-Name in der Feature-Liste.
  // [Typ, Kategorie im Board, feste Dimension, weitere Schreibweisen in Popups]
  const FEATURES = [
    ["Spawn Point", "sonstiges", null, ["Spawn"]],
    ["Slime Chunk", "farm"],
    ["Village", "dorf"],
    ["Ancient City", "struktur"],
    ["Dungeon", "farm", null, ["Monster Room", "Spawner"]],
    ["Stronghold", "struktur"],
    ["Mansion", "struktur", null, ["Woodland Mansion"]],
    ["Monument", "struktur", null, ["Ocean Monument"]],
    ["Outpost", "struktur", null, ["Pillager Outpost"]],
    ["Mineshaft", "struktur"],
    ["Ruined Portal", "portal"],
    ["Jungle Temple", "struktur", null, ["Jungle Pyramid"]],
    ["Desert Temple", "struktur", null, ["Desert Pyramid"]],
    ["Witch Hut", "struktur", null, ["Swamp Hut"]],
    ["Treasure", "ressource", null, ["Buried Treasure"]],
    ["Shipwreck", "struktur"],
    ["Igloo", "struktur"],
    ["Ocean Ruins", "struktur", null, ["Ocean Ruin"]],
    ["Fossil", "ressource"],
    ["Cave", "ressource"],
    ["Ravine", "ressource"],
    ["Lava Pool", "ressource"],
    ["Geode", "ressource", null, ["Amethyst Geode"]],
    ["Apple", "ressource"],
    ["Ore Veins", "ressource", null, ["Ore Vein"]],
    ["Desert Well", "struktur"],
    ["Trail Ruins", "struktur"],
    ["Trial Chamber", "struktur", null, ["Trial Chambers"]],
    ["Camp", "struktur"],
    ["Nether Fortress", "struktur", "nether", ["Fortress"]],
    ["Nether Fossil", "ressource", "nether"],
    ["Bastion", "struktur", "nether", ["Bastion Remnant"]],
    ["End City", "struktur", "ende"],
    ["End Gateway", "portal", "ende"],
  ].flatMap(([typ, kategorie, dimension, aliase = []]) =>
    [typ, ...aliase].map((name) => ({ name, typ, kategorie, dimension })));

  /** Levenshtein-Abstand – für unscharfe Vergleiche mit OCR-Text */
  function abstand(a, b) {
    const d = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i += 1) {
      let vorher = d[0];
      d[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const tmp = d[j];
        d[j] = Math.min(d[j] + 1, d[j - 1] + 1, vorher + (a[i - 1] === b[j - 1] ? 0 : 1));
        vorher = tmp;
      }
    }
    return d[b.length];
  }

  /**
   * Sucht das Feature am Anfang des Titels (tolerant gegenüber OCR-Fehlern)
   * und ersetzt den Anfang durch die korrekte Schreibweise.
   * „Strongho1d (Stairway)“ → { feature: Stronghold, name: „Stronghold (Stairway)“ }
   */
  function featureErkennen(titel) {
    const woerter = titel.split(" ");
    let bestes = null;
    for (const feature of FEATURES) {
      const anzahl = feature.name.split(" ").length;
      if (woerter.length < anzahl) continue;
      const anfang = woerter.slice(0, anzahl).join(" ");
      const erlaubt = feature.name.length <= 5 ? 0 : feature.name.length <= 8 ? 1 : 2;
      const d = abstand(anfang.toLowerCase(), feature.name.toLowerCase());
      // Bei Gleichstand gewinnt das längere Feature („Ocean Ruins“ vor „Ocean Ruin“)
      if (d <= erlaubt && (!bestes || d < bestes.d || (d === bestes.d && anzahl > bestes.anzahl))) {
        bestes = { feature, d, anzahl };
      }
    }
    if (!bestes) return { feature: null, name: titel };
    return {
      feature: bestes.feature,
      name: [bestes.feature.name, ...woerter.slice(bestes.anzahl)].join(" "),
    };
  }

  function kategorieRaten(name) {
    return featureErkennen(name).feature?.kategorie ?? "sonstiges";
  }

  function dimensionFinden(zeilen, feature) {
    if (feature?.dimension) return feature.dimension;
    for (const z of zeilen) {
      const treffer = normalisieren(z.text).match(/Dimension\W*(?:The\s+)?(Overworld|Nether|End)\b/i);
      if (treffer) return { overworld: "oberwelt", nether: "nether", end: "ende" }[treffer[1].toLowerCase()];
    }
    return "oberwelt";
  }

  /**
   * @param {{ text: string, bbox?: { x0: number, y0: number, x1: number, y1: number } }[]} zeilen OCR-Zeilen von oben nach unten
   */
  function seedMapAuswerten(zeilen) {
    for (let i = 0; i < zeilen.length; i += 1) {
      const treffer = normalisieren(zeilen[i].text).match(KOORD_ZEILE);
      if (!treffer) continue;
      const x = zahlLesen(treffer[1]);
      const z = zahlLesen(treffer[3]);
      if (x === null || z === null) continue;
      const y = zahlLesen(treffer[2]);

      // Titel = nächste Zeile darüber mit echtem Text
      let name = "";
      let titelZeile = null;
      for (let j = i - 1; j >= Math.max(0, i - 2) && !name; j -= 1) {
        const kandidat = titelBereinigen(zeilen[j].text);
        if ((kandidat.match(/[A-Za-z]/g) ?? []).length >= 3) {
          name = kandidat;
          titelZeile = zeilen[j];
        }
      }

      const boxen = [titelZeile?.bbox, zeilen[i].bbox].filter(Boolean);
      const box = boxen.length
        ? {
            x0: Math.min(...boxen.map((b) => b.x0)),
            y0: Math.min(...boxen.map((b) => b.y0)),
            x1: Math.max(...boxen.map((b) => b.x1)),
            y1: Math.max(...boxen.map((b) => b.y1)),
          }
        : null;

      const { feature, name: korrigiert } = featureErkennen(name);
      return {
        name: korrigiert || "Unbenannter Ort",
        typ: feature?.typ ?? "",
        x,
        y,
        z,
        dimension: dimensionFinden(zeilen, feature),
        kategorie: feature?.kategorie ?? "sonstiges",
        box,
      };
    }
    return null;
  }

  const DIM_COMPANION = { oberwelt: "overworld", nether: "nether", ende: "end" };

  /**
   * Ergebnis im Format der Prüfliste (früher API-Vertrag /orte/auslesen):
   * Seed-Map-Typ → kategorie, Klammer im Titel → variante („Stronghold (Stairway)“ → Stairway).
   * Unbekannte Titel bleiben als Kategorie stehen – die Regeln melden sie dann.
   * Biome: Ist der Titel ein Name aus der Biom-Liste (regeln.js), wird es ein Biom-Ort.
   */
  function fuerCompanion(e) {
    if (!e) return null;
    const koord = { x: e.x, y: e.y ?? null, z: e.z };
    const biom = !e.typ && biomFinden(e.name);
    if (biom) return { titel: biom.name, kategorie: BIOMES, variante: biom.name, dimension: biom.dimension, ...koord };
    const klammer = /\(([^()]+)\)\s*$/.exec(e.name);
    return {
      titel: e.name,
      kategorie: e.typ || e.name.replace(/\s*\([^()]*\)\s*$/, "").trim(),
      variante: klammer ? klammer[1].trim() : null,
      dimension: DIM_COMPANION[e.dimension] ?? "overworld",
      ...koord,
    };
  }

  // ---------- Banner-Anleitung ----------

  // „light_blue“ → „light blue“; Grau auch britisch. Erst beim ersten Aufruf, damit regeln.js sicher geladen ist.
  let FARBEN_OCR = null, MUSTER_OCR = null;
  function bannerNamen() {
    if (FARBEN_OCR) return;
    FARBEN_OCR = FARBEN.flatMap((f) => {
      const name = f.id.replace("_", " ");
      return [name, ...(name.includes("gray") ? [name.replace("gray", "grey")] : [])].map((n) => ({ id: f.id, name: n, woerter: n.split(" ").length }));
    }).sort((a, b) => b.woerter - a.woerter);
    MUSTER_OCR = MUSTER.map((m) => ({ id: m.id, name: m.en.toLowerCase() }));
  }
  const GRUND = "stripe_bottom";   // „Base“ – in Schritt 1 das Banner selbst

  /** erlaubte Tippfehler je nach Länge */
  const toleranz = (text) => (text.length <= 4 ? 0 : text.length <= 8 ? 1 : 2);

  function farbeFinden(woerter) {
    for (const f of FARBEN_OCR) {
      if (woerter.length < f.woerter) continue;
      const kandidat = woerter.slice(0, f.woerter).join(" ");
      if (abstand(kandidat, f.name) <= toleranz(f.name)) return { id: f.id, woerter: f.woerter };
    }
    return null;
  }

  /** Längster Anfang der Wörter, der ein Muster ist („Base Sinister Canton“ vor „Base“) */
  function musterFinden(woerter) {
    for (let n = Math.min(woerter.length, 4); n >= 1; n -= 1) {
      const kandidat = woerter.slice(0, n).join(" ");
      let bestes = null;
      for (const m of MUSTER_OCR) {
        const d = abstand(kandidat, m.name);
        if (d <= toleranz(m.name) && (!bestes || d < bestes.d)) bestes = { id: m.id, d };
      }
      if (bestes) return bestes.id;
    }
    return null;
  }

  /** Eine OCR-Zeile → { farbe, muster } oder null. Bis zu zwei Störwörter vorn werden übersprungen. */
  function schrittLesen(text) {
    bannerNamen();
    const woerter = String(text).split(/\s+/)
      .map((w) => w.replace(/[^A-Za-z-]/g, "").toLowerCase())
      .filter((w) => w.length > 0);
    for (let start = 0; start <= Math.min(2, woerter.length - 2); start += 1) {
      const farbe = farbeFinden(woerter.slice(start));
      if (!farbe) continue;
      const muster = musterFinden(woerter.slice(start + farbe.woerter));
      if (muster) return { farbe: farbe.id, muster };
    }
    return null;
  }

  /**
   * OCR-Zeilen einer Banner-Anleitung → { basis, ebenen:[{ muster, farbe }], unklar:[text] } oder null.
   * basis ist null, wenn Schritt 1 („<Farbe> Base“) fehlt. unklar: nummerierte Zeilen,
   * die wie ein Schritt aussehen, aber nicht zugeordnet werden konnten.
   */
  function bannerAuswerten(zeilen) {
    const schritte = [], unklar = [];
    for (const { text } of zeilen) {
      const s = schrittLesen(text);
      if (s) schritte.push(s);
      else if (/^\s*[1-9]\s*\W*\s*[A-Za-z]{3,}/.test(text)) unklar.push(text.trim());
    }
    const mitGrund = schritte[0]?.muster === GRUND;
    const ebenen = (mitGrund ? schritte.slice(1) : schritte).map(({ muster, farbe }) => ({ muster, farbe }));
    if (ebenen.length < (mitGrund ? 1 : 2)) return null;   // zu wenig für eine Anleitung
    return { basis: mitGrund ? schritte[0].farbe : null, ebenen, unklar };
  }

  // ---------- OCR im Browser (tesseract.js, nur am Handy) ----------

  // Die Dateien liegen neben der Seite unter vendor/tesseract/ (companion/tools/tesseract-kopieren.mjs):
  // tesseract.min.js, worker.min.js, tesseract-core-simd-lstm.wasm.js, eng.traineddata.gz.
  // Geräte ohne WebAssembly-SIMD (sehr alt) holen den Kern vom CDN.
  const TESSERACT_ORDNER = "vendor/tesseract/";
  const TESSERACT_CORE_VERSION = "7.0.0";
  const MAX_PIXEL = 6_000_000;   // Zielgröße begrenzen – große Handy-Screenshots brauchen keine Vergrößerung

  let workerPromise = null;
  let warteschlange = Promise.resolve();

  function skriptLaden(src) {
    return new Promise((ok, fehler) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = () => { s.remove(); fehler(new Error(`Skript nicht geladen: ${src}`)); };
      document.head.appendChild(s);
    });
  }

  /** Kann der Browser WebAssembly-SIMD? (kleinstes gültiges Modul mit einer SIMD-Anweisung) */
  function simd() {
    try {
      return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]));
    } catch { return false; }
  }

  /** Den OCR-Worker einmal starten (lädt beim ersten Mal ~7 MB: Kern und englische Sprachdaten), danach wiederverwenden */
  function worker() {
    if (workerPromise) return workerPromise;
    workerPromise = (async () => {
      const basis = new URL(TESSERACT_ORDNER, document.baseURI).href;
      if (typeof Tesseract === "undefined") await skriptLaden(`${basis}tesseract.min.js`);
      const corePath = simd() ? `${basis}tesseract-core-simd-lstm.wasm.js` : `https://cdn.jsdelivr.net/npm/tesseract.js-core@v${TESSERACT_CORE_VERSION}`;
      // OEM 1 = nur LSTM (passt zu best_int). workerBlobURL false: der Worker kommt direkt von unserer Adresse.
      return Tesseract.createWorker("eng", 1, { workerPath: `${basis}worker.min.js`, corePath, langPath: basis.replace(/\/$/, ""), workerBlobURL: false });
    })();
    workerPromise.catch(() => { workerPromise = null; });
    return workerPromise;
  }

  /** Texterkennung eines Bildes (File, Blob, Canvas, ImageBitmap) → { zeilen:[{ text, bbox }], text }. Aufträge laufen nacheinander. */
  function texterkennung(bild) {
    const auftrag = warteschlange.then(async () => {
      const w = await worker();
      const { data } = await w.recognize(bild, {}, { blocks: true, text: true });
      const zeilen = (data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines))
        .map((l) => ({ text: l.text, bbox: l.bbox }));
      return { zeilen, text: data.text };
    });
    warteschlange = auftrag.catch(() => {});
    return auftrag;
  }

  /** Datei → ImageBitmap (null, wenn der Browser das Format nicht lesen kann) */
  async function dekodieren(datei) {
    try { return await createImageBitmap(datei); } catch { return null; }
  }

  /**
   * Vergrößert (höchstens 3×, bis MAX_PIXEL), Graustufen, dann Schwarz-Weiß – Tesseract liest weiße
   * Schrift auf grauem Grund (Banner-Anleitungen) sonst gar nicht:
   *   schrift 'hell'   – helle Schrift (Helligkeit > 185) wird schwarz, alles andere weiß
   *   schrift 'dunkel' – dunkle Schrift (Helligkeit < 70) wird schwarz
   * Gibt ein Canvas zurück.
   */
  function fuerTexterkennung(bild, { schrift = "hell", faktor = 3 } = {}) {
    const f = Math.max(1, Math.min(faktor, Math.sqrt(MAX_PIXEL / (bild.width * bild.height))));
    const B = Math.round(bild.width * f), H = Math.round(bild.height * f);
    const canvas = document.createElement("canvas");
    canvas.width = B; canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bild, 0, 0, B, H);
    const img = ctx.getImageData(0, 0, B, H);
    const d = img.data;
    const schwarz = schrift === "hell" ? (v) => v > 185 : (v) => v < 70;
    for (let i = 0; i < d.length; i += 4) {
      const wert = schwarz(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) ? 0 : 255;
      d[i] = d[i + 1] = d[i + 2] = wert; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }

  /**
   * Screenshot → Banner oder null. Erst helle Schrift auf dunklerem Grund versuchen
   * (typische Anleitungen), dann dunkle Schrift auf hellem Grund.
   */
  async function bannerAuslesen(datei) {
    const roh = await dekodieren(datei);
    if (!roh) return null;
    let bestes = null;
    try {
      for (const schrift of ["hell", "dunkel"]) {
        const { zeilen } = await texterkennung(fuerTexterkennung(roh, { schrift }));
        const b = bannerAuswerten(zeilen);
        if (b && (!bestes || b.ebenen.length + (b.basis ? 1 : 0) > bestes.ebenen.length + (bestes.basis ? 1 : 0))) bestes = b;
        if (bestes?.basis) break;
      }
    } finally { roh.close?.(); }
    return bestes;
  }

  /**
   * Screenshot (File) auslesen – dasselbe Ergebnis wie früher POST /orte/auslesen:
   * { erkannt: { titel, kategorie, variante, dimension, x, y|null, z } | null, banner: { basis, ebenen, unklar } | null }.
   * Erst Seed-Map-Popup, sonst Banner-Anleitung.
   */
  async function screenshotAuslesen(datei) {
    const { zeilen } = await texterkennung(datei);
    const erkannt = seedMapAuswerten(zeilen);
    const banner = erkannt ? null : await bannerAuslesen(datei);
    return { erkannt: fuerCompanion(erkannt), banner };
  }

  /** Worker beenden (Speicher freigeben), beim nächsten Screenshot startet er neu */
  async function beenden() {
    const w = workerPromise; workerPromise = null;
    if (w) await (await w).terminate().catch(() => {});
  }

  return Object.freeze({
    FEATURES, titelBereinigen, abstand, featureErkennen, kategorieRaten, dimensionFinden, seedMapAuswerten, fuerCompanion,
    schrittLesen, bannerAuswerten,
    texterkennung, fuerTexterkennung, bannerAuslesen, screenshotAuslesen, beenden,
  });
})();
