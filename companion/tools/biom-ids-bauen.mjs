// Erzeugt companion/biom-ids.js: die Biom-IDs, wie Bedrock sie in Data3D speichert, mit Name,
// Anzeigename und Farbe. Aufruf: cd companion/tools && npm run biom-ids
//
// Zwei Quellen:
// 1. mojang-biomes.json (hier im Ordner, Kopie aus Mojangs bedrock-samples,
//    metadata/vanilladata_modules/mojang-biomes.json, Stand 1.26.50.4): die verbindliche Liste
//    aller IDs. Bei einem neuen Spielstand die Datei neu holen und das Skript laufen lassen.
// 2. minecraft-data, bedrock/1.20.0/biomes.json: Anzeigename (Chunkbase-Schreibweise) und Farbe.
//    NICHT bedrock/1.21.60 nehmen – dort sind die IDs alphabetisch durchnummeriert (plains 64)
//    und passen nicht zu den gespeicherten Daten.
// Jede ID aus minecraft-data muss zu Mojangs ID passen, sonst bricht das Skript ab. Biome, die
// minecraft-data nicht kennt, brauchen einen Eintrag in NACHTRAG (Anzeigename wie in regeln.js).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const MCDATA = path.join(HIER, "node_modules", "minecraft-data");
const QUELLE = "bedrock/1.20.0";
const MOJANG_STAND = "1.26.50.4";
const mojang = JSON.parse(readFileSync(path.join(HIER, "mojang-biomes.json"), "utf8")).data_items
  .map((e) => ({ id: e.id, name: e.name.replace(/^minecraft:/, "") }));
const biome = JSON.parse(readFileSync(path.join(MCDATA, "minecraft-data", "data", QUELLE, "biomes.json"), "utf8"));
const mcdataVersion = JSON.parse(readFileSync(path.join(MCDATA, "package.json"), "utf8")).version;

// Biome, die in minecraft-data 1.20.0 fehlen: Anzeigename wie in der Biom-Liste von regeln.js, eigene Farbe.
// Die ID kommt aus mojang-biomes.json; steht der Name dort nicht, bricht das Skript ab.
const NACHTRAG = [
  { name: "cherry_grove", displayName: "Cherry Grove", color: 0xf2a7c4 },    // Kirschhain: rosa Blüten
  { name: "pale_garden", displayName: "Pale Garden", color: 0x8f9a8d },      // Blasser Garten: fahles Graugrün
  { name: "sulfur_caves", displayName: "Sulfur Caves", color: 0xd4b52e },    // Schwefelhöhlen: schwefelgelb
  // Bestätigt 29.09.2026 an der Fixture-Welt von Max (1.26.51): Spawn X 0 / Z 0, Chunkbase „Dappled Forest“,
  // alle 8 Stichproben passen. Herbstwald mit roten und orangen Blättern.
  { name: "dappled_forest", displayName: "Dappled Forest", color: 0xc96a2b },
];
// minecraft-data hat für diese Biome keine Farbe (0) – eigene, damit sie in Vorschaubildern sichtbar sind
const FARBE_ERSATZ = { deep_dark: 0x1d2b33, mangrove_swamp: 0x4f6b3a };

const mojangId = new Map(mojang.map((e) => [e.name, e.id]));
for (const b of biome) {
  if (mojangId.get(b.name) !== b.id) throw new Error(`${b.name}: minecraft-data sagt ${b.id}, Mojang ${mojangId.get(b.name)}`);
}
const bekannt = new Set(biome.map((b) => b.name));
const nachtraege = NACHTRAG.map((n) => {
  if (!mojangId.has(n.name)) throw new Error(`${n.name} steht nicht in mojang-biomes.json`);
  if (bekannt.has(n.name)) throw new Error(`${n.name} kennt minecraft-data schon – aus NACHTRAG streichen`);
  return { id: mojangId.get(n.name), ...n };
});
const fehlt = mojang.filter((e) => !bekannt.has(e.name) && !NACHTRAG.some((n) => n.name === e.name));
if (fehlt.length) throw new Error(`Ohne Anzeigename und Farbe (NACHTRAG ergänzen): ${fehlt.map((e) => `${e.name} (${e.id})`).join(", ")}`);

const hex = (n) => `#${n.toString(16).padStart(6, "0")}`;
const eintraege = [...biome, ...nachtraege]
  .map((b) => ({ id: b.id, name: b.name, displayName: b.displayName, color: hex(b.color || FARBE_ERSATZ[b.name] || 0x777777) }))
  .sort((a, b) => a.id - b.id);
const doppelt = eintraege.find((b, i) => eintraege.findIndex((x) => x.id === b.id) !== i);
if (doppelt) throw new Error(`Biom-ID ${doppelt.id} doppelt`);

const zeilen = eintraege.map((b) => `  { id:${b.id}, name:${JSON.stringify(b.name)}, displayName:${JSON.stringify(b.displayName)}, color:"${b.color}" },`);
writeFileSync(path.join(HIER, "..", "biom-ids.js"), `/* biom-ids.js – erzeugt von companion/tools/biom-ids-bauen.mjs, nicht von Hand ändern.
   Biom-IDs, wie Bedrock sie in Data3D speichert. IDs: Mojang bedrock-samples ${MOJANG_STAND} (tools/mojang-biomes.json);
   Anzeigename und Farbe: minecraft-data ${mcdataVersion}, ${QUELLE}/biomes.json, ${nachtraege.length} neuere Biome ergänzt.
   displayName entspricht der Schreibweise von Chunkbase und der Biom-Liste in regeln.js.
   Klassisches Script: Seite (<script src>), Worker und Node (import "./biom-ids.js") lesen globalThis.BIOM_IDS. */
globalThis.BIOM_IDS = Object.freeze([
${zeilen.join("\n")}
].map(Object.freeze));
`);
console.log(`biom-ids.js: ${eintraege.length} Biome, IDs ${eintraege[0].id}–${eintraege.at(-1).id}`);
