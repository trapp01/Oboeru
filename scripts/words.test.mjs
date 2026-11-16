import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkWordsFile, lessonListEntry, parseDelimited, sectionsFromRows } from './words.mjs';

test('cells split on the delimiter and rows on line breaks', () => {
  assert.deepEqual(parseDelimited('kana,meaning\nねこ,cat\r\nいぬ,dog\n'), [['kana', 'meaning'], ['ねこ', 'cat'], ['いぬ', 'dog']]);
  assert.deepEqual(parseDelimited('kana\tmeaning\nねこ\tcat', '\t'), [['kana', 'meaning'], ['ねこ', 'cat']]);
});

test('a quoted cell keeps commas, line breaks and doubled quotes', () => {
  assert.deepEqual(parseDelimited('kana,meaning\nいい,"good, fine"\nええ,"yes (""softer"")"'), [
    ['kana', 'meaning'],
    ['いい', 'good, fine'],
    ['ええ', 'yes ("softer")'],
  ]);
  assert.deepEqual(parseDelimited('a,"two\nlines"'), [['a', 'two\nlines']]);
  assert.throws(() => parseDelimited('a,"never closed'), /never closed/);
});

test('a lone carriage return ends a row', () => {
  assert.deepEqual(parseDelimited('kana,meaning\rねこ,cat\rいぬ,dog\r'), [['kana', 'meaning'], ['ねこ', 'cat'], ['いぬ', 'dog']]);
});

test('blank lines and a byte order mark are dropped', () => {
  assert.deepEqual(parseDelimited('﻿kana,meaning\n\n,\nねこ,cat\n\n'), [['kana', 'meaning'], ['ねこ', 'cat']]);
});

test('rows become numbered words in the default section and category', () => {
  const sections = sectionsFromRows([['Meaning', 'Kana'], ['cat', 'ねこ'], ['dog', 'いぬ']], 3);
  assert.deepEqual(sections, [
    {
      id: 'vocabulary',
      title: 'Vocabulary',
      words: [
        { id: 'l03-001', kana: 'ねこ', kanji: '', meaning: 'cat', category: 'Words' },
        { id: 'l03-002', kana: 'いぬ', kanji: '', meaning: 'dog', category: 'Words' },
      ],
    },
  ]);
});

test('a new section starts when the section column changes, and ids run through the lesson', () => {
  const rows = [
    ['kana', 'kanji', 'meaning', 'category', 'section'],
    ['えき', '駅', 'station', 'Nouns', 'At the station'],
    ['のる', '乗る', 'to ride', 'Verbs', 'At the station'],
    ['きた', '北', 'north', 'Nouns', '方角'],
  ];
  const sections = sectionsFromRows(rows, 11);
  assert.deepEqual(sections.map((s) => [s.id, s.title, s.words.map((w) => w.id)]), [
    ['at-the-station', 'At the station', ['l11-001', 'l11-002']],
    ['section-2', '方角', ['l11-003']],
  ]);
  assert.equal(sections[0].words[1].kanji, '乗る');
});

test('an empty header cell is skipped and section ids stay unique', () => {
  const rows = [['kana', 'meaning', 'section', ''], ['よむ', 'to read', 'Verbs 1', 'x'], ['かく', 'to write', 'Verbs (1)', '']];
  const sections = sectionsFromRows(rows, 2);
  assert.deepEqual(sections.map((s) => s.id), ['verbs-1', 'verbs-1-2']);
  assert.deepEqual(checkWordsFile({ lesson: 2, sections }, 2), []);
});

test('a spreadsheet that cannot become a lesson says why', () => {
  assert.throws(() => sectionsFromRows([], 1), /empty/);
  assert.throws(() => sectionsFromRows([['kana']], 1), /"meaning" column/);
  assert.throws(() => sectionsFromRows([['kana', 'meaning', 'reading']], 1), /Unknown column "reading"/);
  assert.throws(() => sectionsFromRows([['kana', 'meaning']], 1), /no words/);
  assert.throws(() => sectionsFromRows([['kana', 'meaning'], ['', 'cat']], 1), /Word 1 has no kana/);
  const split = [['kana', 'meaning', 'section'], ['ねこ', 'cat', 'A'], ['いぬ', 'dog', 'B'], ['とり', 'bird', 'A']];
  assert.throws(() => sectionsFromRows(split, 1), /Word 3: section "A" appears in two places/);
});

test('a sound word-list file has no errors', () => {
  const file = { lesson: 3, title: 'Animals', sections: sectionsFromRows([['kana', 'meaning'], ['ねこ', 'cat']], 3) };
  assert.deepEqual(checkWordsFile(file, 3), []);
  assert.deepEqual(lessonListEntry(file), { lesson: 3, title: 'Animals', sections: [{ id: 'vocabulary', title: 'Vocabulary', count: 1 }] });
  assert.deepEqual(lessonListEntry({ ...file, title: undefined }), { lesson: 3, sections: [{ id: 'vocabulary', title: 'Vocabulary', count: 1 }] });
});

test('a word-list file is checked for its lesson number, ids and fields', () => {
  const word = { id: 'l03-001', kana: 'ねこ', kanji: '', meaning: 'cat', category: 'Nouns' };
  const file = (words, lesson = 3) => ({ lesson, sections: [{ id: 'vocabulary', title: 'Vocabulary', words }] });
  assert.match(checkWordsFile(file([word], 4), 3)[0], /"lesson" is 4, expected 3/);
  assert.match(checkWordsFile(file([word, word]), 3)[0], /id is used twice/);
  assert.match(checkWordsFile(file([{ ...word, id: 'l04-001' }]), 3)[0], /id must look like l03-001/);
  assert.match(checkWordsFile(file([{ ...word, meaning: '' }]), 3)[0], /meaning is missing/);
  assert.match(checkWordsFile(file([{ ...word, note: 'x' }]), 3)[0], /unknown key "note"/);
  assert.match(checkWordsFile({ lesson: 3, sections: [] }, 3)[0], /sections is missing/);
});
