import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignBreakdown } from './breakdown.js';
import { parseSentence } from './markup.js';

const SENTENCE = '土曜日[どようび]に{映画[えいが]}を見[み]ませんか。';
const piece = (text) => ({ text, en: text });
const texts = (groups) => groups.map((g) => [g.piece?.text ?? null, g.segments.map((s) => s.text).join('')]);

test('pieces take their segments and punctuation falls between them', () => {
  const groups = alignBreakdown(parseSentence(SENTENCE), ['土曜日', 'に', '映画', 'を', '見ません', 'か'].map(piece));
  assert.deepEqual(texts(groups), [
    ['土曜日', '土曜日'],
    ['に', 'に'],
    ['映画', '映画'],
    ['を', 'を'],
    ['見ません', '見ません'],
    ['か', 'か'],
    [null, '。'],
  ]);
});

test('a kana run is split between pieces and keeps readings and target', () => {
  const groups = alignBreakdown(parseSentence(SENTENCE), ['土曜日', 'に', '映画', 'を', '見ません', 'か'].map(piece));
  assert.deepEqual(groups[4].segments, [
    { text: '見', reading: 'み', target: false },
    { text: 'ません', reading: '', target: false },
  ]);
  assert.deepEqual(groups[2].segments, [{ text: '映画', reading: 'えいが', target: true }]);
});

test('quotation marks between pieces are punctuation', () => {
  const groups = alignBreakdown(parseSentence('「{ええ}、そうです。」'), ['ええ', 'そう', 'です'].map(piece));
  assert.deepEqual(texts(groups), [
    [null, '「'],
    ['ええ', 'ええ'],
    [null, '、'],
    ['そう', 'そう'],
    ['です', 'です'],
    [null, '。」'],
  ]);
});

test('an uncovered word is refused', () => {
  const segments = parseSentence(SENTENCE);
  assert.throws(() => alignBreakdown(segments, ['土曜日', '映画', 'を', '見ません', 'か'].map(piece)), /"に" is not covered/);
  assert.throws(() => alignBreakdown(segments, ['土曜日', 'に', '映画', 'を', '見ません'].map(piece)), /"か。" is not covered/);
});

test('a piece out of order or not in the sentence is refused', () => {
  const segments = parseSentence(SENTENCE);
  assert.throws(() => alignBreakdown(segments, ['土曜日', 'に', '映画', 'を', 'に'].map(piece)), /"に" does not come next/);
  assert.throws(() => alignBreakdown(segments, [piece('')]), /does not come next/);
});

test('a piece that cuts a kanji run from its reading is refused', () => {
  assert.throws(() => alignBreakdown(parseSentence(SENTENCE), ['土曜', '日', 'に'].map(piece)), /cuts through 土曜日\[どようび\]/);
});
