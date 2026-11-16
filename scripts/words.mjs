// Word lists as files: reading a spreadsheet export into a lesson's sections,
// checking a word-list file, and building the lesson list from the files.
// No file access here; import-words.mjs and validate-words.mjs do the reading and writing.

const WORD_KEYS = ['id', 'kana', 'kanji', 'meaning', 'category'];
const COLUMNS = ['kana', 'kanji', 'meaning', 'category', 'section'];
const DEFAULT_SECTION = 'Vocabulary';
const DEFAULT_CATEGORY = 'Words';

const pad = (n) => String(n).padStart(2, '0');
const isText = (value) => typeof value === 'string' && value.trim() !== '';

/** The file name of a lesson's word list: "lesson-03.json". */
export const wordsFileName = (lesson) => `lesson-${pad(lesson)}.json`;

/**
 * Splits delimited text into rows of cells. A cell in double quotes may hold
 * the delimiter, line breaks and doubled quotes (""). Blank lines are dropped.
 */
export function parseDelimited(text, delimiter = ',') {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const endRow = () => {
    row.push(cell);
    if (row.some((value) => value.trim() !== '')) rows.push(row);
    row = [];
    cell = '';
  };
  // A byte order mark from a spreadsheet export is not part of the first cell.
  const source = text.replace(/^﻿/, '');
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = '';
    } else if (c === '\n') endRow();
    // A lone CR ends a row too; some spreadsheet exports use it instead of LF.
    else if (c === '\r') {
      if (source[i + 1] !== '\n') endRow();
    } else cell += c;
  }
  if (quoted) throw new Error('A quoted cell is never closed.');
  if (cell !== '' || row.length) endRow();
  return rows;
}

// "At the station" becomes "at-the-station"; a title with no Latin letters or digits is numbered instead.
// `taken` holds the lesson's ids so far: a second title that reduces to the same id gets "-2".
function sectionId(title, position, taken) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `section-${position}`;
  let id = slug;
  for (let n = 2; taken.includes(id); n++) id = `${slug}-${n}`;
  return id;
}

/**
 * Builds a lesson's sections from rows whose first row names the columns:
 * kana and meaning are required, kanji, category and section are optional.
 * Words keep their order and are numbered l03-001, l03-002, … through the
 * lesson, so a word's id is its place in the list. A new section starts whenever the section column changes.
 * Errors name a word by that place ("Word 3"), which is its row only when the sheet has no blank rows.
 */
export function sectionsFromRows(rows, lesson) {
  const [head, ...body] = rows;
  if (!head) throw new Error('The file is empty.');
  const names = head.map((name) => name.trim().toLowerCase());
  // A header cell left empty, as after a trailing comma, is a column to skip.
  for (const name of names) if (name && !COLUMNS.includes(name)) throw new Error(`Unknown column "${name}". Columns: ${COLUMNS.join(', ')}.`);
  for (const name of ['kana', 'meaning']) if (!names.includes(name)) throw new Error(`The header row needs a "${name}" column.`);
  if (body.length === 0) throw new Error('The file has a header row and no words.');

  const sections = [];
  body.forEach((cells, i) => {
    const at = `Word ${i + 1}`;
    const value = (name) => (cells[names.indexOf(name)] ?? '').trim();
    if (!value('kana')) throw new Error(`${at} has no kana.`);
    if (!value('meaning')) throw new Error(`${at} has no meaning.`);
    const title = value('section') || DEFAULT_SECTION;
    let section = sections[sections.length - 1];
    if (!section || section.title !== title) {
      if (sections.some((s) => s.title === title)) throw new Error(`${at}: section "${title}" appears in two places; keep its rows together.`);
      section = { id: sectionId(title, sections.length + 1, sections.map((s) => s.id)), title, words: [] };
      sections.push(section);
    }
    section.words.push({
      id: `l${pad(lesson)}-${String(i + 1).padStart(3, '0')}`,
      kana: value('kana'),
      kanji: value('kanji'),
      meaning: value('meaning'),
      category: value('category') || DEFAULT_CATEGORY,
    });
  });
  return sections;
}

/** The mistakes in a parsed word-list file for lesson `lesson`, as messages. Empty when the file is sound. */
export function checkWordsFile(file, lesson) {
  const errors = [];
  if (file?.lesson !== lesson) errors.push(`"lesson" is ${file?.lesson}, expected ${lesson}`);
  if (file?.title !== undefined && !isText(file.title)) errors.push('title is empty');
  const sections = Array.isArray(file?.sections) ? file.sections : [];
  if (sections.length === 0) errors.push('sections is missing');
  const sectionIds = new Set();
  const wordIds = new Set();
  for (const section of sections) {
    const at = `section "${section?.id}"`;
    if (!isText(section?.id)) errors.push('a section has no id');
    else if (sectionIds.has(section.id)) errors.push(`${at}: id is used twice`);
    sectionIds.add(section?.id);
    if (!isText(section?.title)) errors.push(`${at}: title is missing`);
    if (!Array.isArray(section?.words) || section.words.length === 0) {
      errors.push(`${at}: words is missing`);
      continue;
    }
    for (const word of section.words) {
      const name = `${word?.id ?? '(no id)'} ${word?.kana ?? ''}`.trim();
      for (const key of Object.keys(word ?? {})) if (!WORD_KEYS.includes(key)) errors.push(`${name}: unknown key "${key}"`);
      if (!new RegExp(`^l${pad(lesson)}-\\d{3}$`).test(word?.id ?? '')) errors.push(`${name}: id must look like l${pad(lesson)}-001`);
      else if (wordIds.has(word.id)) errors.push(`${name}: id is used twice`);
      wordIds.add(word?.id);
      for (const key of ['kana', 'meaning', 'category']) if (!isText(word?.[key])) errors.push(`${name}: ${key} is missing`);
      if (typeof word?.kanji !== 'string') errors.push(`${name}: kanji must be a string, empty when the word has none`);
    }
  }
  return errors;
}

/** A lesson's entry in the lesson list: { lesson, title, sections: [{ id, title, count }] }, title only when the file has one. */
export function lessonListEntry(file) {
  return {
    lesson: file.lesson,
    ...(file.title ? { title: file.title } : {}),
    sections: file.sections.map((section) => ({ id: section.id, title: section.title, count: section.words.length })),
  };
}

/** The text of data/lessons.json for the given word-list files. */
export function lessonListText(files) {
  const entries = [...files].sort((a, b) => a.lesson - b.lesson).map(lessonListEntry);
  return `${JSON.stringify(entries, null, 1)}\n`;
}

/** The text of a word-list file. */
export function wordsFileText({ lesson, title, sections }) {
  return `${JSON.stringify({ lesson, ...(title ? { title } : {}), sections }, null, 1)}\n`;
}
