// Checks every word-list file in site/data/words/ and that the lesson list is current.
// Usage: node scripts/validate-words.mjs [--write-index]
// The lesson list, site/data/lessons.json, gives the app each lesson's title,
// sections and word counts without loading the word lists; --write-index rewrites it.

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkWordsFile, lessonListText } from './words.mjs';

const DATA = fileURLToPath(new URL('../site/data/', import.meta.url));
const INDEX = `${DATA}lessons.json`;

const writeIndex = process.argv.includes('--write-index');
const names = existsSync(`${DATA}words/`) ? readdirSync(`${DATA}words/`).filter((name) => /^lesson-\d{2}\.json$/.test(name)).sort() : [];

let failed = false;
const files = [];
for (const name of names) {
  const lesson = Number(name.slice(7, 9));
  let file;
  let errors;
  try {
    file = JSON.parse(readFileSync(`${DATA}words/${name}`, 'utf8'));
    errors = checkWordsFile(file, lesson);
  } catch (e) {
    errors = [`not valid JSON: ${e.message}`];
  }
  const count = errors.length ? 0 : file.sections.reduce((sum, section) => sum + section.words.length, 0);
  console.log(`Lesson ${lesson}: ${errors.length ? `${errors.length} errors` : `${count} words`}`);
  for (const e of errors) console.log(`  ERROR    ${e}`);
  if (errors.length) failed = true;
  else files.push(file);
}

if (!failed) {
  const text = lessonListText(files);
  if (writeIndex) {
    writeFileSync(INDEX, text);
    console.log(`Wrote lessons.json for ${files.length} lessons`);
  } else if (!existsSync(INDEX) || readFileSync(INDEX, 'utf8') !== text) {
    console.log('  ERROR    lessons.json is out of date; run node scripts/validate-words.mjs --write-index');
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
