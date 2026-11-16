import { test } from 'node:test';
import assert from 'node:assert/strict';
import { finishKana, romajiToKana } from './kana.js';

test('romaji becomes hiragana', () => {
  assert.equal(romajiToKana('tabemasu'), 'たべます');
  assert.equal(romajiToKana('gakusei desu'), 'がくせい です');
  assert.equal(romajiToKana('ryokou'), 'りょこう');
});

test('Hepburn and its common variants give the same kana', () => {
  const pairs = [['shi', 'si'], ['chi', 'ti'], ['tsu', 'tu'], ['fu', 'hu'], ['ji', 'zi'], ['sha', 'sya'], ['cha', 'tya'], ['ja', 'jya'], ['ja', 'zya']];
  for (const [hepburn, variant] of pairs) assert.equal(romajiToKana(variant), romajiToKana(hepburn), variant);
  assert.equal(romajiToKana('shashin'), 'しゃしn');
  assert.equal(romajiToKana('jugyou'), 'じゅぎょう');
});

test('a doubled consonant is a small tsu', () => {
  assert.equal(romajiToKana('kitte'), 'きって');
  assert.equal(romajiToKana('zasshi'), 'ざっし');
  assert.equal(romajiToKana('matcha'), 'まっちゃ');
  assert.equal(romajiToKana('maccha'), 'まっちゃ');
});

test('nn, n apostrophe and n before a consonant are ん', () => {
  assert.equal(romajiToKana('sanpo'), 'さんぽ');
  assert.equal(romajiToKana('kon\'ya'), 'こんや');
  assert.equal(romajiToKana('konya'), 'こにゃ');
  assert.equal(romajiToKana('minna'), 'みんあ');
  assert.equal(romajiToKana('minnna'), 'みんな');
  assert.equal(romajiToKana('konnichiwa'), 'こんいちわ');
  assert.equal(romajiToKana('konnnichiha'), 'こんにちは');
  assert.equal(romajiToKana('honnda'), 'ほんだ');
});

test('a last n waits, and finishing turns it into ん', () => {
  assert.equal(romajiToKana('hon'), 'ほn');
  assert.equal(romajiToKana('honn'), 'ほん');
  assert.equal(finishKana('hon'), 'ほん');
  assert.equal(finishKana('honn'), 'ほん');
  assert.equal(finishKana('nihon desu'), 'にほん です');
});

test('an unfinished syllable stays as typed', () => {
  assert.equal(romajiToKana('tabemas'), 'たべまs');
  assert.equal(romajiToKana('ky'), 'ky');
  assert.equal(romajiToKana('kk'), 'っk');
});

test('a hyphen is a long-vowel mark and x or l makes a small kana', () => {
  assert.equal(romajiToKana('ko-hi-'), 'こーひー');
  assert.equal(romajiToKana('xa'), 'ぁ');
  assert.equal(romajiToKana('ltu'), 'っ');
  assert.equal(romajiToKana('xtsu'), 'っ');
  assert.equal(romajiToKana('lyo'), 'ょ');
  assert.equal(romajiToKana('fa'), 'ふぁ');
});

test('only ASCII letters are converted, in either case', () => {
  assert.equal(romajiToKana('食べmasu'), '食べます');
  assert.equal(romajiToKana('5ji desu。'), '5じ です。');
  assert.equal(romajiToKana('ｔａ'), 'ｔａ');
  assert.equal(romajiToKana('Tabemasu'), 'たべます');
});
