// The on-screen kana keyboard: its layout, and what a key does to the answer
// box's text and selection. The panel that draws it is kana-keyboard-view.js. No DOM.

// The gojūon grid is read by column, top to bottom; a space is a gap in the grid.
const COLUMNS = ['あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと', 'なにぬねの', 'はひふへほ', 'まみむめも', 'や ゆ よ', 'らりるれろ', 'わ を ん'];

/**
 * The keys, row by row, on a grid of ten columns. A key is a kana to insert,
 * or 'dakuten', 'handakuten' or 'delete'; null is an empty cell. A key takes
 * one column unless KEY_COLUMNS says more.
 */
export const KEY_ROWS = [
  ...[0, 1, 2, 3, 4].map((row) => COLUMNS.map((column) => (column[row] === ' ' ? null : column[row]))),
  ['ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'っ', 'ゃ', 'ゅ', 'ょ', 'ー'],
  ['dakuten', 'handakuten', null, null, null, null, 'delete'],
];

export const KEY_COLUMNS = { dakuten: 2, handakuten: 2, delete: 2 };

// The marks are drawn on a dotted circle; the spacing ゛ and ゜ sit in a corner of their cell.
const LABELS = { dakuten: '\u25CC\u3099', handakuten: '\u25CC\u309A', delete: '⌫' };
const NAMES = {
  ぁ: 'small a', ぃ: 'small i', ぅ: 'small u', ぇ: 'small e', ぉ: 'small o',
  っ: 'small tsu', ゃ: 'small ya', ゅ: 'small yu', ょ: 'small yo',
  ー: 'long vowel mark', dakuten: 'dakuten', handakuten: 'handakuten', delete: 'delete',
};

/** What the key shows. */
export const keyLabel = (key) => LABELS[key] ?? key;

/** The key's accessible name, or null when its label already says it. */
export const keyName = (key) => NAMES[key] ?? null;

// Each pair is a kana and its marked form; katakana pairs sit 0x60 above the hiragana ones.
const VOICED = 'かがきぎくぐけげこごさざしじすずせぜそぞただちぢつづてでとどはばひびふぶへべほぼうゔ';
const SEMI_VOICED = 'はぱひぴふぷへぺほぽ';

function pairs(text) {
  const map = new Map();
  for (let i = 0; i < text.length; i += 2) {
    for (const shift of [0, 0x60]) {
      const at = (j) => String.fromCharCode(text.charCodeAt(j) + shift);
      map.set(at(i), at(i + 1));
    }
  }
  return map;
}

const MARKED = { dakuten: pairs(VOICED), handakuten: pairs(SEMI_VOICED) };
const PLAIN = new Map([...MARKED.dakuten, ...MARKED.handakuten].map(([plain, marked]) => [marked, plain]));

// か with ゛ is が and が with ゛ is か again; ぱ with ゛ is ば. Null when the mark does not apply.
function withMark(char, mark) {
  const plain = PLAIN.get(char) ?? char;
  const marked = MARKED[mark].get(plain);
  if (!marked) return null;
  return char === marked ? plain : marked;
}

/**
 * Applies `key` to `text` with the selection from `start` to `end`. Returns
 * { text, caret }, or null when the key does nothing there. A kana replaces
 * the selection; delete removes the selection or the character before the
 * caret; dakuten and handakuten change the character before a collapsed caret.
 */
export function applyKey(key, text, start, end) {
  if (key === 'delete') {
    if (start !== end) return { text: text.slice(0, start) + text.slice(end), caret: start };
    if (start === 0) return null;
    const from = /[\uDC00-\uDFFF]/.test(text[start - 1]) && start > 1 ? start - 2 : start - 1;
    return { text: text.slice(0, from) + text.slice(start), caret: from };
  }
  if (key in MARKED) {
    if (start !== end || start === 0) return null;
    const marked = withMark(text[start - 1], key);
    if (!marked) return null;
    return { text: text.slice(0, start - 1) + marked + text.slice(start), caret: start };
  }
  return { text: text.slice(0, start) + key + text.slice(end), caret: start + key.length };
}
