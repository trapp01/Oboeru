// Naming for practice items: counts, where an item comes from, and whether a
// cue is Japanese. No DOM.

const JAPANESE = /[぀-ヿ㐀-鿿々〆]/u;
const BOOKS = { textbook: 'Textbook', workbook: 'Workbook' };

/** "1 item", "162 items". */
export function itemCount(n) {
  return n === 1 ? '1 item' : `${n} items`;
}

/**
 * Where an item comes from: "Food and drink · Exercise 2", or "Lesson 3 · Textbook II-A (b) · p. 95"
 * for an exercise that names its book and page. Takes an item that carries its lesson's title and its exercise.
 */
export function sourceLine({ lessonTitle, exercise }) {
  const parts = [lessonTitle, `${BOOKS[exercise.book] ?? 'Exercise'} ${exercise.ref}`];
  if (exercise.page) parts.push(`p. ${exercise.page}`);
  return parts.join(' · ');
}

/** True when `text` has kana or kanji in it, so it is drawn in the Japanese face. */
export function hasJapanese(text) {
  return JAPANESE.test(text);
}
