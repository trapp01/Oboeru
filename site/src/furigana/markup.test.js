import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSentence, plainText, readingText, targetText } from './markup.js';

const SENTENCE = '毎朝[まいあさ]パンを{食[た]べます}。';

test('kanji runs carry their reading and kana runs merge', () => {
  assert.deepEqual(parseSentence(SENTENCE), [
    { text: '毎朝', reading: 'まいあさ', target: false },
    { text: 'パンを', reading: '', target: false },
    { text: '食', reading: 'た', target: true },
    { text: 'べます', reading: '', target: true },
    { text: '。', reading: '', target: false },
  ]);
});

test('plain, reading and target text', () => {
  assert.equal(plainText(SENTENCE), '毎朝パンを食べます。');
  assert.equal(readingText(SENTENCE), 'まいあさパンをたべます。');
  assert.equal(targetText(SENTENCE), '食べます');
});

test('a sentence with no braces has no target', () => {
  assert.equal(targetText('お茶[ちゃ]です。'), '');
  assert.ok(parseSentence('お茶[ちゃ]です。').every((s) => !s.target));
});

test('a reading covers only the kanji before it, not a kana prefix: お酒', () => {
  assert.deepEqual(parseSentence('{お酒[さけ]}'), [
    { text: 'お', reading: '', target: true },
    { text: '酒', reading: 'さけ', target: true },
  ]);
});

test('々 counts as kanji', () => {
  assert.deepEqual(parseSentence('時々[ときどき]'), [{ text: '時々', reading: 'ときどき', target: false }]);
});

test('kana does not merge across the edge of the target', () => {
  const segments = parseSentence('これは{ペン}です。');
  assert.deepEqual(segments.map((s) => [s.text, s.target]), [
    ['これは', false],
    ['ペン', true],
    ['です。', false],
  ]);
});

test('refuses a kanji without a reading', () => {
  assert.throws(() => parseSentence('毎朝パン'), /has no \[reading\]/);
});

test('refuses unbalanced braces', () => {
  assert.throws(() => parseSentence('{パン'), /Unclosed/);
  assert.throws(() => parseSentence('パン}'), /Unbalanced/);
  assert.throws(() => parseSentence('{{パン}}'), /Unbalanced/);
});

test('refuses a stray bracket', () => {
  assert.throws(() => parseSentence('パン[ぱん]'), /Stray/);
});
