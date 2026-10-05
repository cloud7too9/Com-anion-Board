import { test } from 'node:test';
import assert from 'node:assert/strict';
import { texterkennung } from '../src/texterkennung.js';

// Dieselben Funktionen, die das Handy benutzt (companion/texterkennung.js), per node:vm geladen.
// Die echte OCR am Referenzbild prüft seit Umbau Phase 3 der Playwright-Test companion/tests/live.test.mjs.
const { bannerAuswerten, schrittLesen } = texterkennung;

const zeilen = (...texte) => texte.map((text) => ({ text }));
const REZEPT = [
  { muster: 'border', farbe: 'cyan' },
  { muster: 'rhombus', farbe: 'light_blue' },
  { muster: 'border', farbe: 'black' },
  { muster: 'flower', farbe: 'black' },
  { muster: 'square_top_left', farbe: 'black' },
  { muster: 'square_bottom_right', farbe: 'black' },
];

test('Schritte mit englischen Namen, auch mit OCR-Störungen', () => {
  assert.deepEqual(schrittLesen('1 Black Base | i - |'), { farbe: 'black', muster: 'stripe_bottom' });
  assert.deepEqual(schrittLesen('3 Light Blue Lozenge Cl'), { farbe: 'light_blue', muster: 'rhombus' });
  assert.deepEqual(schrittLesen('5 Fs Black Flower Charge *'), { farbe: 'black', muster: 'flower' });
  assert.deepEqual(schrittLesen('7 F Black Base Sinister Canton'), { farbe: 'black', muster: 'square_bottom_right' });
  assert.deepEqual(schrittLesen('Light Grey Per Fess'), { farbe: 'light_gray', muster: 'half_horizontal' });
  assert.deepEqual(schrittLesen('Magenta Bordure lndented'), { farbe: 'magenta', muster: 'curly_border' });   // l statt I
  assert.equal(schrittLesen('Stronghold (Stairway)'), null);
  assert.equal(schrittLesen('X: -1,884 Z: -524'), null);
});

test('Anleitung → Grundfarbe und Ebenen (Text wie aus der OCR)', () => {
  const b = bannerAuswerten(zeilen(
    '1 Black Base | i - |', ': |', '2 | Cyan Bordure Cl', '|', '3 Light Blue Lozenge Cl', 'r BN', '. .',
    'A | Black Bordure 1 oo', '5 Fs Black Flower Charge *', '- |', '6 i Black Chief Dexter Canton |', '7 F Black Base Sinister Canton',
  ));
  assert.deepEqual(b, { basis: 'black', ebenen: REZEPT, unklar: [] });
});

test('Fehlende Grundfarbe, unklare Zeilen, keine Anleitung', () => {
  const ohne = bannerAuswerten(zeilen('2 Cyan Bordure', '3 Light Blue Lozenge', '4 Blak Bordur3xx'));
  assert.equal(ohne.basis, null);
  assert.equal(ohne.ebenen.length, 2);
  assert.deepEqual(ohne.unklar, ['4 Blak Bordur3xx']);
  assert.equal(bannerAuswerten(zeilen('1 Black Base')), null);   // nur das Banner, kein Muster
  assert.equal(bannerAuswerten(zeilen('Dimension: Overworld', 'Stronghold (Stairway)', 'X: -1,884 Z: -524')), null);
});
