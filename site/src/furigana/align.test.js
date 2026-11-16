import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignReading } from './align.js';

test('a word without kanji is one kana segment', () => {
  assert.deepEqual(alignReading('', 'コーヒー'), [{ text: 'コーヒー', reading: '' }]);
});

test('okurigana after the kanji is not repeated: 食べる', () => {
  assert.deepEqual(alignReading('食べる', 'たべる'), [
    { text: '食', reading: 'た' },
    { text: 'べる', reading: '' },
  ]);
});

test('a kana prefix is not repeated: お酒', () => {
  assert.deepEqual(alignReading('お酒', 'おさけ'), [
    { text: 'お', reading: '' },
    { text: '酒', reading: 'さけ' },
  ]);
});

test('katakana and particles before the kanji: シャワーを浴びる', () => {
  assert.deepEqual(alignReading('シャワーを浴びる', 'シャワーをあびる'), [
    { text: 'シャワーを', reading: '' },
    { text: '浴', reading: 'あ' },
    { text: 'びる', reading: '' },
  ]);
});

test('a kanji compound takes the whole reading', () => {
  assert.deepEqual(alignReading('映画', 'えいが'), [{ text: '映画', reading: 'えいが' }]);
});

test('two kanji runs split around the kana between them: 朝ご飯', () => {
  assert.deepEqual(alignReading('朝ご飯', 'あさごはん'), [
    { text: '朝', reading: 'あさ' },
    { text: 'ご', reading: '' },
    { text: '飯', reading: 'はん' },
  ]);
});

test('a reading that contains the following kana still aligns: 召し上がる', () => {
  assert.deepEqual(alignReading('召し上がる', 'めしあがる'), [
    { text: '召', reading: 'め' },
    { text: 'し', reading: '' },
    { text: '上', reading: 'あ' },
    { text: 'がる', reading: '' },
  ]);
});

test('punctuation and 〜 match literally', () => {
  assert.deepEqual(alignReading('分かりました。', 'わかりました。'), [
    { text: '分', reading: 'わ' },
    { text: 'かりました。', reading: '' },
  ]);
  assert.deepEqual(alignReading('〜年生', '〜ねんせい'), [
    { text: '〜', reading: '' },
    { text: '年生', reading: 'ねんせい' },
  ]);
});

test('parentheses in the kana give the whole kana over the kanji: すき(な)', () => {
  assert.deepEqual(alignReading('好き', 'すき(な)'), [{ text: '好き', reading: 'すき(な)' }]);
});

test('parentheses in the kanji form are unalignable even when the kana matches', () => {
  assert.deepEqual(alignReading('残念(ですね)', 'ざんねん(ですね)'), [{ text: '残念(ですね)', reading: 'ざんねん(ですね)' }]);
  assert.deepEqual(alignReading('暑い (weather) 熱い (thing)', 'あつい'), [
    { text: '暑い (weather) 熱い (thing)', reading: 'あつい' },
  ]);
});

test('slashes are unalignable: 四 with よん／し／(よ), 早く／速く', () => {
  assert.deepEqual(alignReading('四', 'よん／し／(よ)'), [{ text: '四', reading: 'よん／し／(よ)' }]);
  assert.deepEqual(alignReading('早く／速く', 'はやく'), [{ text: '早く／速く', reading: 'はやく' }]);
});

test('kana that does not match the kanji form falls back to the whole reading', () => {
  assert.deepEqual(alignReading('使えません', 'つかえません。'), [{ text: '使えません', reading: 'つかえません。' }]);
  assert.deepEqual(alignReading('交通系ICカード', 'こうつうけいアイシーカード'), [
    { text: '交通系ICカード', reading: 'こうつうけいアイシーカード' },
  ]);
});

test('a kanji form with no kanji in it falls back to the whole reading', () => {
  assert.deepEqual(alignReading('ゴミ', 'ごみ'), [{ text: 'ゴミ', reading: 'ごみ' }]);
});
