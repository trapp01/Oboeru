import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sameReading, soundKey, toKatakana } from './reading.mjs';

test('hiragana, katakana and punctuation reduce to one form', () => {
  assert.equal(soundKey('たべます。'), soundKey('タベマス'));
  assert.equal(soundKey('はい、そうです'), soundKey('ハイソオデス'));
});

test('long vowels match however they are spelled', () => {
  assert.ok(sameReading('とうきょう', 'トオキョオ'));
  assert.ok(sameReading('がくせい', 'ガクセエ'));
  assert.ok(sameReading('コーヒー', 'コオヒイ'));
});

test('particles match their spoken form', () => {
  assert.ok(sameReading('きょうはとうきょうへいきます', 'キョオワトオキョオエイキマス'));
  assert.ok(sameReading('ほんをよむ', 'ホンオヨム'));
});

test('a different reading of the same kanji does not match', () => {
  assert.ok(!sameReading('きょう', 'コンニチ'));
  assert.ok(!sameReading('いちにち', 'ツイタチ'));
  assert.ok(!sameReading('なんにん', 'ナニジン'));
});

test('small kana and the sokuon are kept', () => {
  assert.ok(sameReading('きって', 'キッテ'));
  assert.ok(!sameReading('きって', 'キテ'));
  assert.ok(!sameReading('びょういん', 'ビヨウイン'));
});

test('Latin letters and digits in the expected reading match whatever the engine says for them', () => {
  assert.ok(sameReading('このTシャツもせんえんですか', 'コノティイシャツモセンエンデスカ'));
  assert.ok(sameReading('こうつうけいICカードで', 'コオツウケエアイシイカアドデ'));
  assert.ok(!sameReading('このTシャツもせんえんですか', 'コノティイシャツモチエンデスカ'));
});

test('katakana conversion leaves other characters alone', () => {
  assert.equal(toKatakana('にほん人、カタカナ'), 'ニホン人、カタカナ');
});
