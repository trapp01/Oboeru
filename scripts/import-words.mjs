// Turns a spreadsheet export into one lesson's word list and adds the lesson to the lesson list.
// Usage: node scripts/import-words.mjs <lesson> <file.csv> [--title "Chapter 3"] [--force]
// The file's first row names its columns: kana and meaning, and optionally
// kanji, category and section. A .tsv or .txt file is read as tab-separated.
// A word's id is its place in the lesson, and notes, clips and progress are
// keyed by id, so an existing lesson is only replaced with --force. Replacing
// keeps the lesson's title unless --title gives a new one.

import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lessonListText, parseDelimited, sectionsFromRows, wordsFileName, wordsFileText } from './words.mjs';

const SITE = fileURLToPath(new URL('../site/', import.meta.url));
const DATA = `${SITE}data/`;
const USAGE = 'Usage: node scripts/import-words.mjs <lesson> <file.csv> [--title "Chapter 3"] [--force]';

function fail(message) {
  console.error(message);
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const titleAt = args.indexOf('--title');
const title = titleAt >= 0 ? args[titleAt + 1] : undefined;
if (titleAt >= 0 && !title?.trim()) fail(`--title needs a title.\n${USAGE}`);
const [lessonArg, source] = args.filter((arg, i) => arg !== '--force' && i !== titleAt && (titleAt < 0 || i !== titleAt + 1));
const lesson = Number(lessonArg);
if (!source || !Number.isInteger(lesson) || lesson < 0 || lesson > 99) fail(`The lesson is a number from 0 to 99.\n${USAGE}`);

const target = `${DATA}words/${wordsFileName(lesson)}`;
const replaced = existsSync(target) ? JSON.parse(readFileSync(target, 'utf8')) : null;
if (replaced && !force) {
  fail(`${wordsFileName(lesson)} exists. Ids follow the order of the words, so replacing it hands each old word's notes, clips and progress to whatever word now sits in its place.\nRun again with --force to replace it, or pick a lesson number that is free.`);
}

let sections;
try {
  const delimiter = /\.(tsv|txt)$/i.test(source) ? '\t' : ',';
  sections = sectionsFromRows(parseDelimited(readFileSync(source, 'utf8'), delimiter), lesson);
} catch (e) {
  fail(`${source}: ${e.message}`);
}

mkdirSync(`${DATA}words/`, { recursive: true });
writeFileSync(target, wordsFileText({ lesson, title: title?.trim() || replaced?.title, sections }));
const files = readdirSync(`${DATA}words/`)
  .filter((name) => /^lesson-\d{2}\.json$/.test(name))
  .map((name) => JSON.parse(readFileSync(`${DATA}words/${name}`, 'utf8')));
writeFileSync(`${DATA}lessons.json`, lessonListText(files));

const count = sections.reduce((sum, section) => sum + section.words.length, 0);
console.log(`Lesson ${lesson}: ${count} words in ${sections.length === 1 ? '1 section' : `${sections.length} sections`}, written to site/data/words/${wordsFileName(lesson)}`);
// What the replaced lesson's words left behind is keyed by id, so it would show on the new words' cards.
const stem = wordsFileName(lesson).replace('.json', '');
const leftovers = [`data/notes/${stem}.json`, `data/practice/${stem}.json`, `audio/${stem}`].filter((path) => existsSync(SITE + path));
if (leftovers.length) {
  console.log('This lesson still has the files below from the words it had before. Delete them, or the new cards show the old words\' notes and play their clips:');
  for (const path of leftovers) console.log(`  site/${path}`);
} else {
  console.log('The cards work now. Notes are in docs/notes-guide.md, clips in the README.');
}
