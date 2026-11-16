import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyKey, KEY_COLUMNS, KEY_ROWS, keyLabel, keyName } from './kana-keyboard.js';

const width = (row) => row.reduce((sum, key) => sum + (KEY_COLUMNS[key] ?? 1), 0);

test('every row fills the ten columns', () => {
  for (const row of KEY_ROWS) assert.equal(width(row), 10, row.join(''));
});

test('the grid reads by column, with the gaps of the や and わ rows', () => {
  assert.deepEqual(KEY_ROWS[0], [...'あかさたなはまやらわ']);
  assert.deepEqual(KEY_ROWS[1], [...'いきしちにひみ', null, 'り', null]);
  assert.deepEqual(KEY_ROWS[2], [...'うくすつぬふむゆるを']);
  assert.deepEqual(KEY_ROWS[4], [...'おこそとのほもよろん']);
  assert.deepEqual(KEY_ROWS[5], [...'ぁぃぅぇぉっゃゅょー']);
  assert.deepEqual(KEY_ROWS[6], ['dakuten', 'handakuten', null, null, null, null, 'delete']);
});

test('the small kana and the marks have spoken names; plain kana speak for themselves', () => {
  assert.equal(keyName('ぁ'), 'small a');
  assert.equal(keyName('っ'), 'small tsu');
  assert.equal(keyName('ょ'), 'small yo');
  assert.equal(keyName('ー'), 'long vowel mark');
  assert.equal(keyName('delete'), 'delete');
  assert.equal(keyName('か'), null);
  assert.equal(keyLabel('dakuten'), '◌\u3099');
  assert.equal(keyLabel('か'), 'か');
  const named = KEY_ROWS.slice(5).flat().filter(Boolean);
  for (const key of named) assert.ok(keyName(key), key);
});

test('a kana goes in at the caret and replaces a selection', () => {
  assert.deepEqual(applyKey('か', '', 0, 0), { text: 'か', caret: 1 });
  assert.deepEqual(applyKey('の', 'わたしほん', 3, 3), { text: 'わたしのほん', caret: 4 });
  assert.deepEqual(applyKey('ー', 'コヒ', 1, 1), { text: 'コーヒ', caret: 2 });
  assert.deepEqual(applyKey('を', 'ほんがよむ', 2, 3), { text: 'ほんをよむ', caret: 3 });
});

test('dakuten toggles the kana before the caret', () => {
  assert.deepEqual(applyKey('dakuten', 'か', 1, 1), { text: 'が', caret: 1 });
  assert.deepEqual(applyKey('dakuten', 'が', 1, 1), { text: 'か', caret: 1 });
  assert.deepEqual(applyKey('dakuten', 'はし', 1, 1), { text: 'ばし', caret: 1 });
  assert.deepEqual(applyKey('dakuten', 'う', 1, 1), { text: 'ゔ', caret: 1 });
  assert.deepEqual(applyKey('dakuten', 'ぱ', 1, 1), { text: 'ば', caret: 1 });
  assert.deepEqual(applyKey('dakuten', 'カ', 1, 1), { text: 'ガ', caret: 1 });
});

test('handakuten works on the は row only', () => {
  assert.deepEqual(applyKey('handakuten', 'は', 1, 1), { text: 'ぱ', caret: 1 });
  assert.deepEqual(applyKey('handakuten', 'ぱ', 1, 1), { text: 'は', caret: 1 });
  assert.deepEqual(applyKey('handakuten', 'ぶ', 1, 1), { text: 'ぷ', caret: 1 });
  assert.equal(applyKey('handakuten', 'か', 1, 1), null);
  assert.equal(applyKey('handakuten', 'が', 1, 1), null);
});

test('a mark that cannot apply does nothing', () => {
  assert.equal(applyKey('dakuten', '', 0, 0), null);
  assert.equal(applyKey('dakuten', 'あ', 1, 1), null);
  assert.equal(applyKey('dakuten', 'っ', 1, 1), null);
  assert.equal(applyKey('dakuten', 'かき', 0, 2), null);
});

test('delete removes the selection or the character before the caret', () => {
  assert.deepEqual(applyKey('delete', 'たべます', 4, 4), { text: 'たべま', caret: 3 });
  assert.deepEqual(applyKey('delete', 'たべます', 1, 1), { text: 'べます', caret: 0 });
  assert.deepEqual(applyKey('delete', 'たべます', 1, 3), { text: 'たす', caret: 1 });
  assert.deepEqual(applyKey('delete', 'a😀', 3, 3), { text: 'a', caret: 1 });
  assert.equal(applyKey('delete', 'たべます', 0, 0), null);
});
