import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStory } from './story.js';

test('keyword and meaning become their own segments without asterisks', () => {
  assert.deepEqual(parseStory('You **eat** the *table* itself.'), [
    { text: 'You ', kind: 'plain' },
    { text: 'eat', kind: 'meaning' },
    { text: ' the ', kind: 'plain' },
    { text: 'table', kind: 'keyword' },
    { text: ' itself.', kind: 'plain' },
  ]);
});

test('markup at the start and end of the story', () => {
  assert.deepEqual(parseStory('*Gawk* at the **school**'), [
    { text: 'Gawk', kind: 'keyword' },
    { text: ' at the ', kind: 'plain' },
    { text: 'school', kind: 'meaning' },
  ]);
});

test('two keywords in one story', () => {
  const kinds = parseStory('A *knee* and a *hon*: **Japan**.').map((s) => s.kind);
  assert.deepEqual(kinds, ['plain', 'keyword', 'plain', 'keyword', 'plain', 'meaning', 'plain']);
});

test('a story with no markup is one plain segment', () => {
  assert.deepEqual(parseStory('Just words.'), [{ text: 'Just words.', kind: 'plain' }]);
});

test('an unmatched asterisk stays as plain text', () => {
  assert.deepEqual(parseStory('Five * stars and **gold**'), [
    { text: 'Five * stars and ', kind: 'plain' },
    { text: 'gold', kind: 'meaning' },
  ]);
});

test('HTML in a story is kept as text', () => {
  assert.deepEqual(parseStory('<b>x</b> *y*'), [
    { text: '<b>x</b> ', kind: 'plain' },
    { text: 'y', kind: 'keyword' },
  ]);
});

test('an empty story has no segments', () => {
  assert.deepEqual(parseStory(''), []);
});
