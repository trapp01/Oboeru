// Aligns a listed word's kanji form with its kana so that kana written in both
// is not repeated as furigana: 食べる + たべる gives 食[た] then べる.
// Segments have the same { text, reading } shape that markup.js produces.

const KANJI = '\\u3400-\\u9FFF々〆';
const KANJI_RUN = new RegExp(`([${KANJI}]+)|([^${KANJI}]+)`, 'gu');
const UNALIGNABLE = /[()（）／/]/;

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Returns segments for drawing `kanji` with `kana` as furigana. A word with
 * no kanji form is one plain kana segment; a pair that cannot be matched
 * piece by piece is the whole kanji form with the whole kana above it.
 */
export function alignReading(kanji, kana) {
  if (!kanji) return [{ text: kana, reading: '' }];
  const whole = [{ text: kanji, reading: kana }];
  if (UNALIGNABLE.test(kanji) || UNALIGNABLE.test(kana)) return whole;

  const parts = [...kanji.matchAll(KANJI_RUN)].map(([, run, kanaRun]) => ({ run: run || kanaRun, isKanji: Boolean(run) }));
  if (!parts.some((p) => p.isKanji)) return whole;

  // Each kanji run takes the shortest reading that lets the kana runs between them match literally.
  const pattern = new RegExp(`^${parts.map((p) => (p.isKanji ? '(.+?)' : escape(p.run))).join('')}$`, 'u');
  const match = kana.match(pattern);
  if (!match) return whole;

  let group = 1;
  return parts.map((p) => (p.isKanji ? { text: p.run, reading: match[group++] } : { text: p.run, reading: '' }));
}
