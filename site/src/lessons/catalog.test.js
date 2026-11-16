import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupByCategory, lessonTitle, wordCount } from './catalog.js';

test('lesson titles', () => {
  assert.equal(lessonTitle({ lesson: 6, title: 'Food and drink' }), 'Food and drink');
  assert.equal(lessonTitle({ lesson: 3 }), 'Lesson 3');
  assert.equal(lessonTitle({ lesson: 0, title: '' }), 'Lesson 0');
});

test('word counts', () => {
  assert.equal(wordCount(0), '0 words');
  assert.equal(wordCount(1), '1 word');
  assert.equal(wordCount(56), '56 words');
});

test('groups follow list order and start anew when the category changes', () => {
  const words = [
    { id: 'a', category: 'Nouns' },
    { id: 'b', category: 'Nouns' },
    { id: 'c', category: 'Verbs' },
    { id: 'd', category: 'Nouns' },
  ];
  assert.deepEqual(
    groupByCategory(words).map((g) => [g.category, g.words.map((w) => w.id)]),
    [
      ['Nouns', ['a', 'b']],
      ['Verbs', ['c']],
      ['Nouns', ['d']],
    ],
  );
});

test('no words, no groups', () => {
  assert.deepEqual(groupByCategory([]), []);
});
