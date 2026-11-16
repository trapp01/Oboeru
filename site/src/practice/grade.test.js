import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestHearing, kanjiNumber, matchAnswer, normalize, shortestAnswer, shownAnswer } from './grade.js';

const matches = (text, answer) => matchAnswer(text, [answer]) === 0;

test('each kanji run matches as the kanji or its reading, run by run', () => {
  const answer = '図書館[としょかん]で雑誌[ざっし]を読[よ]みます。';
  assert.ok(matches('図書館で雑誌を読みます', answer));
  assert.ok(matches('としょかんでざっしをよみます', answer));
  assert.ok(matches('図書館でざっしを読みます', answer));
  assert.ok(!matches('図書かんで雑誌を読みます', answer));
  assert.ok(!matches('図書館で雑誌を読みません', answer));
});

test('spaces, punctuation, katakana and full-width forms do not matter', () => {
  const answer = 'カフェでコーヒーを飲[の]みます。';
  assert.ok(matches('かふぇで こーひーを のみます', answer));
  assert.ok(matches('カフェでコーヒーを飲みます！', answer));
  assert.ok(matches('ｶﾌｪでｺｰﾋｰを飲みます', answer));
  assert.ok(matches('５時です', '五時[ごじ]です。'));
  assert.equal(normalize('Ｔシャツ、です。'), 'tしゃつです');
});

test('kanji numerals also match as digits', () => {
  assert.ok(matches('5時です', '五時[ごじ]です。'));
  assert.ok(matches('ごじです', '五時[ごじ]です。'));
  assert.ok(matches('450円', '四百五十円[よんひゃくごじゅうえん]'));
  assert.ok(matches('よんひゃくごじゅうえん', '四百五十円[よんひゃくごじゅうえん]'));
  assert.ok(!matches('45円', '四百五十円[よんひゃくごじゅうえん]'));
  assert.equal(kanjiNumber('十'), 10);
  assert.equal(kanjiNumber('二千二十六'), 2026);
  assert.equal(kanjiNumber('三万五千'), 35000);
  assert.equal(kanjiNumber('二〇二六'), 2026);
});

test('a part in parentheses may be left out', () => {
  const answer = '(ケンさんは)カフェでコーヒーを飲[の]みます。';
  assert.ok(matches('ケンさんはカフェでコーヒーを飲みます', answer));
  assert.ok(matches('カフェでコーヒーを飲みます', answer));
  assert.ok(!matches('ケンさんカフェでコーヒーを飲みます', answer));
  assert.ok(matches('子供がいます', '(私[わたし]は)子供[こども]がいます。'));
  assert.ok(matches('わたしはこどもがいます', '(私[わたし]は)子供[こども]がいます。'));
});

test('a trailing n still in romaji counts as ん', () => {
  assert.ok(matches('ほn', '本[ほん]'));
  assert.ok(matches('にほn', '日本[にほん]'));
});

test('other spellings of the same words do not match', () => {
  assert.ok(!matches('家', 'うち'));
  assert.ok(!matches('見て下さい', '見[み]てください。'));
});

test('the index of the first matching answer, or -1', () => {
  assert.equal(matchAnswer('いえ', ['うち', 'いえ']), 1);
  assert.equal(matchAnswer('へや', ['うち', 'いえ']), -1);
  assert.equal(matchAnswer('', ['うち']), -1);
  assert.equal(matchAnswer(' 。', ['うち']), -1);
});

test('the shown and shortest forms of an answer', () => {
  assert.equal(shownAnswer('(私[わたし]は)学生[がくせい]です。'), '私[わたし]は学生[がくせい]です。');
  assert.equal(shortestAnswer('(私[わたし]は)学生[がくせい]です。'), '学生[がくせい]です。');
});

test('the hearing that is an accepted answer is preferred', () => {
  assert.equal(bestHearing(['うちに帰ります', '家に帰ります'], ['家[いえ]に帰[かえ]ります。']), '家に帰ります');
  assert.equal(bestHearing(['ねこ', 'ネコ'], ['いぬ']), 'ねこ');
  assert.equal(bestHearing([], ['いぬ']), '');
});
