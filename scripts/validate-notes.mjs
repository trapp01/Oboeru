// Checks each lesson's notes file against its word list and the mechanical
// rules in docs/notes-guide.md. Usage: node scripts/validate-notes.mjs [lesson…]
// With no arguments it checks every lesson that has a notes file.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseSentence, plainText, targetText } from '../site/src/furigana/markup.js';
import { checkBreakdown } from './check-breakdown.mjs';

const DATA = fileURLToPath(new URL('../site/data/', import.meta.url));
const MAX_SENTENCE_CHARS = 30;
const MAX_STORY_WORDS = 45;
const NEEDS_SAY = /[()〜／/+A-Za-zＡ-Ｚ0-9０-９]/;
const KANA_ONLY = /^[ぁ-ゖァ-ヺー、。！？]+$/u;

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const pad = (n) => String(n).padStart(2, '0');

function checkNote(word, note, errors, warnings) {
  const at = `${word.id} ${word.kana}`;
  const fail = (msg) => errors.push(`${at}: ${msg}`);
  const warn = (msg) => warnings.push(`${at}: ${msg}`);

  const ja = note.sentence?.ja;
  if (typeof ja !== 'string' || !ja) return fail('sentence.ja is missing');
  try {
    const targets = parseSentence(ja).filter((s) => s.target);
    if (targets.length === 0) fail('sentence.ja has no {…} around the word');
    if ((ja.match(/\{/g) || []).length > 1) fail('sentence.ja has more than one {…}');
    const plain = plainText(ja);
    if (/[ 　]/.test(plain)) fail('sentence.ja contains spaces');
    if (/[A-Za-z*]/.test(plain) && !/[A-Za-zＡ-Ｚ]/.test(word.kana + word.kanji)) warn('sentence.ja contains Latin letters');
    if (!/[。？！」]$/.test(plain)) fail('sentence.ja does not end with 。？！ or 」');
    if ([...plain].length > MAX_SENTENCE_CHARS) warn(`sentence is ${[...plain].length} characters (limit ${MAX_SENTENCE_CHARS})`);
    for (const s of parseSentence(ja)) {
      if (s.reading && !/^[ぁ-ゖー]+$/u.test(s.reading)) fail(`reading "${s.reading}" is not hiragana`);
    }
    // A target that shares no character with the word usually means the braces are on the wrong word.
    const target = targetText(ja);
    const listed = (word.kanji + word.kana + (note.say || '')).replace(/[()〜／/。、]/g, '');
    if (target && ![...target].some((c) => listed.includes(c))) warn(`{${target}} shares no character with the listed word`);
    checkBreakdown(ja, note.sentence.breakdown, fail, warn);
  } catch (e) {
    fail(e.message);
  }
  if (typeof note.sentence?.en !== 'string' || !note.sentence.en.trim()) fail('sentence.en is missing');

  const { soundsLike, story } = note.mnemonic || {};
  if (typeof soundsLike !== 'string' || !soundsLike.trim()) fail('mnemonic.soundsLike is missing');
  if (typeof story !== 'string' || !story.trim()) {
    fail('mnemonic.story is missing');
  } else {
    if (!/\*\*[^*]+\*\*/.test(story)) fail('mnemonic.story has no **meaning**');
    if (!/(^|[^*])\*[^*]+\*([^*]|$)/.test(story)) warn('mnemonic.story has no *keyword*');
    if ((story.match(/\*/g) || []).length % 2) fail('mnemonic.story has an unmatched *');
    const words = story.trim().split(/\s+/).length;
    if (words > MAX_STORY_WORDS) warn(`story is ${words} words (limit ${MAX_STORY_WORDS})`);
  }

  if (NEEDS_SAY.test(word.kana) && !note.say) fail('listed form cannot be read aloud as written, so "say" is required');
  if (note.say !== undefined && !KANA_ONLY.test(note.say)) fail(`say "${note.say}" must be kana only`);
}

function checkLesson(n) {
  const errors = [];
  const warnings = [];
  const words = readJson(`${DATA}words/lesson-${pad(n)}.json`).sections.flatMap((s) => s.words);
  const notes = readJson(`${DATA}notes/lesson-${pad(n)}.json`);
  const ids = new Set(words.map((w) => w.id));
  for (const id of Object.keys(notes)) if (!ids.has(id)) errors.push(`${id}: not a word in lesson ${n}`);
  const keywords = new Map();
  for (const word of words) {
    const note = notes[word.id];
    if (!note) {
      errors.push(`${word.id} ${word.kana}: no note`);
      continue;
    }
    checkNote(word, note, errors, warnings);
    const key = note.mnemonic?.soundsLike?.trim().toLowerCase();
    if (key && keywords.has(key)) warnings.push(`${word.id} ${word.kana}: soundsLike "${key}" is also used by ${keywords.get(key)}`);
    else if (key) keywords.set(key, word.id);
  }
  return { n, count: words.length, errors, warnings };
}

const requested = process.argv.slice(2).map(Number);
const lessons = requested.length
  ? requested
  : readJson(`${DATA}lessons.json`).map((l) => l.lesson).filter((n) => existsSync(`${DATA}notes/lesson-${pad(n)}.json`));

let failed = false;
for (const n of lessons) {
  const { count, errors, warnings } = checkLesson(n);
  console.log(`Lesson ${n}: ${count} words, ${errors.length} errors, ${warnings.length} warnings`);
  for (const w of warnings) console.log(`  warning  ${w}`);
  for (const e of errors) console.log(`  ERROR    ${e}`);
  if (errors.length) failed = true;
}
process.exit(failed ? 1 : 0);
