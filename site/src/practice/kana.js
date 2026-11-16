// Romaji to hiragana for the answer box, so no keyboard switching is needed.
// Hepburn and the common variants; `-` is ー, `x` or `l` makes the next kana
// small. Only ASCII letters are converted. No DOM.

const VOWELS = 'aiueo';
const ROWS = {
  '': 'あいうえお', k: 'かきくけこ', s: 'さしすせそ', t: 'たちつてと', n: 'なにぬねの',
  h: 'はひふへほ', m: 'まみむめも', r: 'らりるれろ', g: 'がぎぐげご', z: 'ざじずぜぞ',
  d: 'だぢづでど', b: 'ばびぶべぼ', p: 'ぱぴぷぺぽ',
};
// The kana each y-sound starts from: kya is き plus a small ゃ.
const Y_STARTS = {
  ky: 'き', sh: 'し', sy: 'し', ch: 'ち', ty: 'ち', cy: 'ち', ny: 'に', hy: 'ひ', my: 'み',
  ry: 'り', gy: 'ぎ', j: 'じ', jy: 'じ', zy: 'じ', dy: 'ぢ', by: 'び', py: 'ぴ',
};
const SMALL_Y = { a: 'ゃ', u: 'ゅ', o: 'ょ' };
const SMALL = { a: 'ぁ', i: 'ぃ', u: 'ぅ', e: 'ぇ', o: 'ぉ', ya: 'ゃ', yu: 'ゅ', yo: 'ょ', tu: 'っ', tsu: 'っ', wa: 'ゎ' };
const EXTRA = {
  ya: 'や', yu: 'ゆ', yo: 'よ', wa: 'わ', wo: 'を', ye: 'いぇ', wi: 'うぃ', we: 'うぇ',
  shi: 'し', chi: 'ち', tsu: 'つ', fu: 'ふ', ji: 'じ', she: 'しぇ', che: 'ちぇ', je: 'じぇ',
  fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ', thi: 'てぃ', dhi: 'でぃ',
  va: 'ゔぁ', vi: 'ゔぃ', vu: 'ゔ', ve: 'ゔぇ', vo: 'ゔぉ',
};

const TABLE = new Map();
for (const [consonant, row] of Object.entries(ROWS)) [...VOWELS].forEach((v, i) => TABLE.set(consonant + v, row[i]));
for (const [start, kana] of Object.entries(Y_STARTS)) for (const [v, small] of Object.entries(SMALL_Y)) TABLE.set(start + v, kana + small);
for (const [romaji, kana] of Object.entries(EXTRA)) TABLE.set(romaji, kana);
for (const [romaji, kana] of Object.entries(SMALL)) TABLE.set(`x${romaji}`, kana).set(`l${romaji}`, kana);
const LONGEST = Math.max(...[...TABLE.keys()].map((key) => key.length));

const isLetter = (c) => c >= 'a' && c <= 'z';
const startsSyllable = (c) => c !== undefined && (VOWELS.includes(c) || c === 'y');

// How many letters from the `n` at `i` make ん: 0 when the n begins な or にゃ,
// or is the last thing typed and may still become one of those.
function nasalLength(s, i, finish) {
  const next = s[i + 1];
  if (next === undefined) return finish ? 1 : 0;
  // "nn" is ん as soon as it is typed, so みんな takes a third n: minnna.
  if (next === "'" || next === 'n') return 2;
  return startsSyllable(next) ? 0 : 1;
}

function convert(text, finish) {
  const s = text.replace(/[A-Z]/g, (c) => c.toLowerCase());
  let out = '';
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '-') {
      out += 'ー';
      i++;
      continue;
    }
    if (!isLetter(c)) {
      out += text[i++];
      continue;
    }
    if (c === 'n') {
      const length = nasalLength(s, i, finish);
      if (length) {
        out += 'ん';
        i += length;
        continue;
      }
    } else if (!VOWELS.includes(c) && (s[i + 1] === c || (c === 't' && s[i + 1] === 'c'))) {
      // A doubled consonant, or the t of "matcha", is a small っ.
      out += 'っ';
      i++;
      continue;
    }
    let length = Math.min(LONGEST, s.length - i);
    while (length > 0 && !TABLE.has(s.slice(i, i + length))) length--;
    if (length) {
      out += TABLE.get(s.slice(i, i + length));
      i += length;
    } else {
      // A letter that does not spell a kana yet stays as typed until the next keystroke completes it.
      out += text[i++];
    }
  }
  return out;
}

/** Converts the romaji in `text` to hiragana, leaving an unfinished syllable and a last `n` as typed. */
export function romajiToKana(text) {
  return convert(text, false);
}

/** As romajiToKana(), but a last `n` becomes ん: the text is complete. */
export function finishKana(text) {
  return convert(text, true);
}
