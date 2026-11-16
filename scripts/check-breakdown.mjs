// The breakdown rules that a notes sentence and a practice answer share:
// every piece has a meaning, a base form is sentence markup with its own
// meaning, and the pieces spell the sentence in order.

import { alignBreakdown } from '../site/src/furigana/breakdown.js';
import { parseSentence, plainText } from '../site/src/furigana/markup.js';

const MAX_PIECE_EN_CHARS = 40;
const PIECE_KEYS = ['text', 'en', 'base', 'baseEn'];

/** Checks `breakdown` against the sentence markup `ja`, reporting through fail(message) and warn(message). */
export function checkBreakdown(ja, breakdown, fail, warn) {
  if (!Array.isArray(breakdown) || breakdown.length === 0) return fail('breakdown is missing');
  for (const piece of breakdown) {
    const at = `breakdown piece "${piece?.text}"`;
    if (typeof piece?.text !== 'string' || !piece.text) return fail('a breakdown piece has no text');
    if (typeof piece.en !== 'string' || !piece.en.trim()) fail(`${at} has no en`);
    else if (piece.en.length > MAX_PIECE_EN_CHARS) warn(`${at}: en is ${piece.en.length} characters (limit ${MAX_PIECE_EN_CHARS})`);
    for (const key of Object.keys(piece)) if (!PIECE_KEYS.includes(key)) fail(`${at} has an unknown key "${key}"`);
    if ((piece.base === undefined) !== (piece.baseEn === undefined)) fail(`${at} needs base and baseEn together`);
    if (piece.base !== undefined) {
      if (typeof piece.baseEn !== 'string' || !piece.baseEn.trim()) fail(`${at} has an empty baseEn`);
      try {
        const segments = parseSentence(String(piece.base));
        if (segments.length === 0) fail(`${at} has an empty base`);
        if (segments.some((s) => s.target)) fail(`${at}: base must not use {…}`);
        for (const s of segments) if (s.reading && !/^[ぁ-ゖー]+$/u.test(s.reading)) fail(`${at}: base reading "${s.reading}" is not hiragana`);
        if (plainText(piece.base) === piece.text) warn(`${at}: base is the same as the piece, so it can be dropped`);
      } catch (e) {
        fail(`${at}: base: ${e.message}`);
      }
    }
  }
  try {
    alignBreakdown(parseSentence(ja), breakdown);
  } catch (e) {
    fail(`breakdown: ${e.message}`);
  }
}
