// Sentence markup: 漢字[かんじ] puts a reading over the kanji run before it,
// and {…} wraps the word being studied. This module turns that text into
// segments and refuses text that would render a kanji without a reading.

const KANJI = '\\u3400-\\u9FFF々〆';
const TOKEN = new RegExp(`([${KANJI}]+)\\[([^\\[\\]{}]+)\\]|([{}])|([\\s\\S])`, 'gu');
const KANJI_CHAR = new RegExp(`[${KANJI}]`, 'u');

/**
 * Parses sentence markup into segments in reading order.
 * Each segment is { text, reading, target }: `reading` is '' for kana and
 * punctuation, and `target` is true inside the {…} group.
 */
export function parseSentence(markup) {
  const segments = [];
  let target = false;
  for (const [, kanji, reading, brace, char] of markup.matchAll(TOKEN)) {
    if (kanji) {
      segments.push({ text: kanji, reading, target });
    } else if (brace) {
      if ((brace === '{') === target) throw new Error(`Unbalanced "${brace}" in: ${markup}`);
      target = brace === '{';
    } else {
      if (KANJI_CHAR.test(char)) throw new Error(`Kanji "${char}" has no [reading] in: ${markup}`);
      if (char === '[' || char === ']') throw new Error(`Stray "${char}" in: ${markup}`);
      const last = segments[segments.length - 1];
      if (last && !last.reading && last.target === target) last.text += char;
      else segments.push({ text: char, reading: '', target });
    }
  }
  if (target) throw new Error(`Unclosed "{" in: ${markup}`);
  return segments;
}

/** The sentence as it is normally written: kanji kept, readings and braces removed. */
export function plainText(markup) {
  return parseSentence(markup).map((s) => s.text).join('');
}

/** The sentence as it is read aloud: every kanji run replaced by its reading. */
export function readingText(markup) {
  return parseSentence(markup).map((s) => s.reading || s.text).join('');
}

/** The written form of the {…} group, or '' when the sentence has none. */
export function targetText(markup) {
  return parseSentence(markup).filter((s) => s.target).map((s) => s.text).join('');
}
