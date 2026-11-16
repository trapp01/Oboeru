// Checks a typed or spoken reply against an item's answers. An answer is
// sentence markup with optional parts in ( ); each kanji run matches as the
// kanji, as its reading, or with its numerals as digits. No DOM.

import { parseSentence } from '../furigana/markup.js';
import { finishKana } from './kana.js';

const PART = /\(([^()]*)\)|[^()]+/g;
const NUMERALS = /[〇一二三四五六七八九十百千万]+/g;
const DIGITS = '〇一二三四五六七八九';
const UNITS = { 十: 10, 百: 100, 千: 1000 };

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The answer with its optional parts kept and their parentheses removed: the form a card shows. */
export function shownAnswer(answer) {
  return answer.replace(/[()]/g, '');
}

/** The answer with every optional part removed. */
export function shortestAnswer(answer) {
  return answer.replace(/\([^()]*\)/g, '');
}

/** Text as it is compared: full-width forms plain, no spaces or punctuation, katakana folded to hiragana. */
export function normalize(text) {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/** 四百五十 → 450. Bare digits run on, so 二〇二六 is 2026. */
export function kanjiNumber(numerals) {
  let total = 0;
  let section = 0;
  let digits = 0;
  for (const c of numerals) {
    const digit = DIGITS.indexOf(c);
    if (digit >= 0) {
      digits = digits * 10 + digit;
      continue;
    }
    if (c === '万') {
      total += (section + digits || 1) * 10000;
      section = 0;
    } else {
      section += (digits || 1) * UNITS[c];
    }
    digits = 0;
  }
  return total + section + digits;
}

function runPattern({ text, reading }) {
  if (!reading) return escape(normalize(text));
  const forms = [text, reading, text.replace(NUMERALS, (n) => String(kanjiNumber(n)))];
  return `(?:${[...new Set(forms.map(normalize))].map(escape).join('|')})`;
}

function answerPattern(answer) {
  let pattern = '';
  for (const [part, optional] of answer.matchAll(PART)) {
    const body = parseSentence(optional ?? part).map(runPattern).join('');
    pattern += optional === undefined ? body : `(?:${body})?`;
  }
  return new RegExp(`^${pattern}$`, 'u');
}

/**
 * The index of the first of `answers` that `text` matches, or -1. A last `n`
 * still in romaji counts as ん. Throws when an answer is not valid markup.
 */
export function matchAnswer(text, answers) {
  const reply = normalize(finishKana(text));
  if (!reply) return -1;
  return answers.findIndex((answer) => answerPattern(answer).test(reply));
}

/** Of the recogniser's hearings, best first, the first one that is an accepted answer, else the first. */
export function bestHearing(hearings, answers) {
  return hearings.find((hearing) => matchAnswer(hearing, answers) >= 0) ?? hearings[0] ?? '';
}
