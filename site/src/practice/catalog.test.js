import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasJapanese, itemCount, sourceLine } from './catalog.js';

test('item counts', () => {
  assert.equal(itemCount(1), '1 item');
  assert.equal(itemCount(162), '162 items');
});

test('the source names the lesson and the exercise', () => {
  assert.equal(sourceLine({ lessonTitle: 'Food and drink', exercise: { ref: '2' } }), 'Food and drink · Exercise 2');
});

test('the source names the book and the page when the exercise gives them', () => {
  const exercise = { book: 'textbook', ref: 'II-A (b)', page: 95 };
  assert.equal(sourceLine({ lessonTitle: 'Lesson 3', exercise }), 'Lesson 3 · Textbook II-A (b) · p. 95');
  assert.equal(sourceLine({ lessonTitle: 'Lesson 4', exercise: { book: 'workbook', ref: '3-II' } }), 'Lesson 4 · Workbook 3-II');
});

test('a cue is Japanese when it has kana or kanji', () => {
  assert.ok(hasJapanese('何時[なんじ]に起[お]きますか。'));
  assert.ok(hasJapanese('コーヒー'));
  assert.ok(!hasJapanese('coffee · cafe'));
  assert.ok(!hasJapanese('8:00 · eat breakfast'));
});
