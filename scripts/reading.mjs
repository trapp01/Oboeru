// Compares the reading a sentence should have with the reading a speech
// engine reports for it. Both sides are reduced to the same loose katakana
// form first, because an engine spells sounds, not kana: は as ワ, おう as オオ.

const VOWEL_ROWS = {
  ア: 'アカサタナハマヤラワガザダバパァャヮ',
  イ: 'イキシチニヒミリギジヂビピィ',
  ウ: 'ウクスツヌフムユルグズヅブプゥュヴ',
  エ: 'エケセテネヘメレゲゼデベペェ',
  オ: 'オコソトノホモヨロヲゴゾドボポォョ',
};
const VOWEL_OF = new Map(Object.entries(VOWEL_ROWS).flatMap(([vowel, row]) => [...row].map((kana) => [kana, vowel])));
// Pairs that sound alike, or that only a particle reading tells apart.
const SAME_SOUND = { ヲ: 'オ', ヂ: 'ジ', ヅ: 'ズ', ハ: 'ワ', ヘ: 'エ' };

const LATIN = /[A-Za-zＡ-Ｚａ-ｚ0-9０-９]/;

/** Hiragana turned into katakana; everything else is left as it is. */
export function toKatakana(text) {
  return text.replace(/[\u3041-\u3096]/g, (char) => String.fromCodePoint(char.codePointAt(0) + 0x60));
}

/**
 * Kana text as loose katakana: no punctuation, long vowels spelled out,
 * sound-alike kana merged. A run of Latin letters or digits becomes one "*",
 * because how it is spelled out in kana is the engine's choice.
 */
export function soundKey(text) {
  let key = '';
  let vowel = '';
  for (let kana of toKatakana(text)) {
    if (LATIN.test(kana)) {
      if (!key.endsWith('*')) key += '*';
      vowel = '';
      continue;
    }
    if (kana === 'ー') kana = vowel;
    else if (!VOWEL_OF.has(kana) && kana !== 'ン' && kana !== 'ッ') continue;
    if ((kana === 'ウ' && vowel === 'オ') || (kana === 'イ' && vowel === 'エ')) kana = vowel;
    vowel = VOWEL_OF.get(kana) ?? '';
    key += SAME_SOUND[kana] ?? kana;
  }
  return key;
}

/** True when `spoken`, the engine's kana, is the reading `expected`. Latin runs in `expected` match any kana. */
export function sameReading(expected, spoken) {
  const want = soundKey(expected);
  const got = soundKey(spoken);
  if (!want.includes('*')) return want === got;
  return new RegExp(`^${want.split('*').join('.+')}$`, 'u').test(got);
}
