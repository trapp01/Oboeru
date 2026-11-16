// Checks each lesson's practice file against the mechanical rules in
// docs/practice-guide.md. Usage: node scripts/validate-practice.mjs [--write-index] [lesson…]
// With no lesson it checks every practice file and that the index is current.
// The index lists each lesson's item count for the Practice tab; --write-index rewrites it.

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseSentence, plainText, readingText } from '../site/src/furigana/markup.js';
import { matchAnswer, shortestAnswer, shownAnswer } from '../site/src/practice/grade.js';
import { checkBreakdown } from './check-breakdown.mjs';

const DIR = fileURLToPath(new URL('../site/data/practice/', import.meta.url));
const INDEX = `${DIR}index.json`;
const EXERCISE_KEYS = ['book', 'ref', 'page', 'title', 'instruction', 'kind', 'example', 'items'];
const ITEM_KEYS = ['id', 'cue', 'context', 'cueEn', 'answers', 'en', 'breakdown'];
const HIRAGANA = /^[ぁ-ゖー]+$/u;
const JAPANESE = /[ぁ-ゖァ-ヺ㐀-鿿]/u;
const ENDS_SENTENCE = /[。？！]$/u;

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const pad = (n) => String(n).padStart(2, '0');
const isText = (value) => typeof value === 'string' && value.trim() !== '';
const exerciseName = (exercise) => [exercise?.book, exercise?.ref].filter(Boolean).join(' ') || '(no ref)';

// Sentence markup with readings in hiragana and no {…}; `what` names the field in messages.
function checkMarkup(markup, what, fail) {
  try {
    for (const s of parseSentence(markup)) {
      if (s.target) fail(`${what} must not use {…}`);
      if (s.reading && !HIRAGANA.test(s.reading)) fail(`${what}: reading "${s.reading}" is not hiragana`);
    }
  } catch (e) {
    fail(`${what}: ${e.message}`);
  }
}

function checkAnswer(answer, what, fail, warn) {
  if (!isText(answer)) return fail(`${what} is empty`);
  if (/\([^()]*\(|\)[^()]*\)|\([^)]*$|^[^(]*\)/.test(answer)) return fail(`${what} has unbalanced or nested parentheses: ${answer}`);
  if (/[（）]/.test(answer)) fail(`${what} uses full-width parentheses; optional parts take ( and )`);
  if (/[ 　]/.test(answer)) fail(`${what} contains spaces`);
  if (/[A-Za-zＡ-Ｚａ-ｚ]/.test(answer)) warn(`${what} contains Latin letters: ${answer}`);
  if (!JAPANESE.test(shortestAnswer(answer))) fail(`${what} has nothing left once its optional parts are removed: ${answer}`);
  // Both forms must parse as markup. That alone does not catch ( ) cutting a kanji run from its reading; checkAcceptsItself does.
  checkMarkup(shownAnswer(answer), what, fail);
  checkMarkup(shortestAnswer(answer), `${what} without its optional parts`, fail);
  checkAcceptsItself(answer, what, fail);
}

// The card grades with matchAnswer, which parses each optional part on its own, so the answer
// must match its own written and read forms, with and without its optional parts, without a throw.
function checkAcceptsItself(answer, what, fail) {
  const forms = [['', shownAnswer(answer)], [' without its optional parts', shortestAnswer(answer)]];
  for (const [label, form] of forms) {
    let texts;
    try {
      texts = [['written', plainText(form)], ['read', readingText(form)]];
    } catch {
      continue; // Already reported by checkMarkup.
    }
    for (const [how, text] of texts) {
      try {
        if (matchAnswer(text, [answer]) < 0) fail(`${what} does not accept itself ${how}${label} ("${text}"): ${answer}`);
      } catch (e) {
        return fail(`${what} cannot be graded: ${e.message}`);
      }
    }
  }
}

function checkItem(item, lesson, exercise, seen, errors, warnings) {
  const at = `${item?.id ?? '(no id)'} [${exerciseName(exercise)}]`;
  const fail = (msg) => errors.push(`${at}: ${msg}`);
  const warn = (msg) => warnings.push(`${at}: ${msg}`);

  for (const key of Object.keys(item)) if (!ITEM_KEYS.includes(key)) fail(`unknown key "${key}"`);
  const expected = `l${pad(lesson)}-p${String(seen.size + 1).padStart(3, '0')}`;
  if (!new RegExp(`^l${pad(lesson)}-p\\d{3}$`).test(item.id ?? '')) fail(`id must look like ${expected}`);
  else if (seen.has(item.id)) fail('id is used twice');
  else if (item.id !== expected) warn(`id is out of sequence (expected ${expected})`);
  seen.add(item.id);

  if (!isText(item.cue)) fail('cue is missing');
  else checkMarkup(item.cue, 'cue', fail);
  if (item.context !== undefined) {
    if (!isText(item.context)) fail('context is empty');
    else checkMarkup(item.context, 'context', fail);
  }
  const japaneseCue = isText(item.cue) && JAPANESE.test(item.cue) && !/[A-Za-z]{3}/.test(item.cue);
  if (item.cueEn !== undefined && !isText(item.cueEn)) fail('cueEn is empty');
  if (japaneseCue && plainText(item.cue).length > 6 && !item.cueEn) warn('cue is Japanese but has no cueEn');
  if (!isText(item.en)) fail('en is missing');

  if (!Array.isArray(item.answers) || item.answers.length === 0) return fail('answers is missing');
  item.answers.forEach((answer, i) => checkAnswer(answer, `answers[${i}]`, fail, warn));
  if (new Set(item.answers).size !== item.answers.length) warn('the same answer is listed twice');

  const model = isText(item.answers[0]) ? shownAnswer(item.answers[0]) : '';
  let sentence = false;
  try {
    sentence = ENDS_SENTENCE.test(plainText(model));
  } catch {
    // Already reported by checkAnswer.
  }
  if (sentence && item.breakdown === undefined) fail('the model answer is a sentence, so it needs a breakdown');
  if (item.breakdown !== undefined) checkBreakdown(model, item.breakdown, fail, warn);
}

function checkExercise(exercise, lesson, seen, errors, warnings) {
  const at = `[${exerciseName(exercise)}]`;
  const fail = (msg) => errors.push(`${at}: ${msg}`);
  for (const key of Object.keys(exercise)) if (!EXERCISE_KEYS.includes(key)) fail(`unknown key "${key}"`);
  if (exercise.book !== undefined && !['textbook', 'workbook'].includes(exercise.book)) fail('book must be "textbook" or "workbook"');
  if (!isText(exercise.ref)) fail('ref is missing');
  if (exercise.page !== undefined && (!Number.isInteger(exercise.page) || exercise.page < 1)) fail('page must be the printed page number');
  if (exercise.title !== undefined) {
    if (!isText(exercise.title)) fail('title is empty');
    else checkMarkup(exercise.title, 'title', fail);
  }
  if (!isText(exercise.instruction)) fail('instruction is missing');
  else if (/\b(picture|following|partner|above|below)\b/i.test(exercise.instruction)) {
    warnings.push(`${at}: instruction may not stand alone on a card: "${exercise.instruction}"`);
  }
  if (!['typed', 'open'].includes(exercise.kind)) fail('kind must be "typed" or "open"');
  if (exercise.example !== undefined) {
    if (!isText(exercise.example?.cue)) fail('example.cue is missing');
    else checkMarkup(exercise.example.cue, 'example.cue', fail);
    if (!isText(exercise.example?.answer)) fail('example.answer is missing');
    else checkMarkup(shownAnswer(exercise.example.answer), 'example.answer', fail);
  }
  if (!Array.isArray(exercise.items) || exercise.items.length === 0) return fail('items is missing');
  const cues = new Set();
  for (const item of exercise.items) {
    checkItem(item ?? {}, lesson, exercise, seen, errors, warnings);
    const key = `${item?.context ?? ''}|${item?.cue}`;
    if (cues.has(key)) warnings.push(`${item?.id} ${at}: same cue as an earlier item in this exercise`);
    cues.add(key);
  }
}

function checkLesson(n) {
  const errors = [];
  const warnings = [];
  const file = readJson(`${DIR}lesson-${pad(n)}.json`);
  if (file.lesson !== n) errors.push(`"lesson" is ${file.lesson}, expected ${n}`);
  const exercises = Array.isArray(file.exercises) ? file.exercises : [];
  if (exercises.length === 0) errors.push('exercises is missing');
  const seen = new Set();
  for (const exercise of exercises) checkExercise(exercise ?? {}, n, seen, errors, warnings);
  return { n, exercises: exercises.length, items: seen.size, errors, warnings };
}

const args = process.argv.slice(2);
const writeIndex = args.includes('--write-index');
const requested = args.filter((a) => a !== '--write-index').map(Number);
const onDisk = existsSync(DIR)
  ? readdirSync(DIR).map((name) => name.match(/^lesson-(\d{2})\.json$/)).filter(Boolean).map((m) => Number(m[1])).sort((a, b) => a - b)
  : [];

let failed = false;
const results = new Map();
for (const n of requested.length ? requested : onDisk) {
  const result = checkLesson(n);
  results.set(n, result);
  console.log(`Lesson ${n}: ${result.exercises} exercises, ${result.items} items, ${result.errors.length} errors, ${result.warnings.length} warnings`);
  for (const w of result.warnings) console.log(`  warning  ${w}`);
  for (const e of result.errors) console.log(`  ERROR    ${e}`);
  if (result.errors.length) failed = true;
}

// The index covers every file on disk, so it is only read or written on a full run or on request.
if (writeIndex || !requested.length) {
  const index = onDisk.map((n) => {
    const { exercises, items } = results.get(n) ?? checkLesson(n);
    return { lesson: n, exercises, items };
  });
  const indexText = `${JSON.stringify(index, null, 1)}\n`;
  if (writeIndex) {
    writeFileSync(INDEX, indexText);
    console.log(`Wrote index.json for ${index.length} lessons`);
  } else if (onDisk.length && (!existsSync(INDEX) || readFileSync(INDEX, 'utf8') !== indexText)) {
    console.log('  ERROR    index.json is out of date; run node scripts/validate-practice.mjs --write-index');
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
