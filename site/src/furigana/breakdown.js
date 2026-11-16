// A breakdown splits a sentence into its words and particles, each with an
// English meaning. This module lines a breakdown up with the segments that
// markup.js parses out of the same sentence.

const WORD_CHAR = /[\p{L}\p{N}]/u;

function sliceSegments(segments, start, end, label) {
  const out = [];
  let offset = 0;
  for (const segment of segments) {
    const from = Math.max(offset, start);
    const to = Math.min(offset + segment.text.length, end);
    if (from < to) {
      const whole = to - from === segment.text.length;
      if (!whole && segment.reading) {
        throw new Error(`"${label}" cuts through ${segment.text}[${segment.reading}]`);
      }
      out.push(whole ? segment : { ...segment, text: segment.text.slice(from - offset, to - offset) });
    }
    offset += segment.text.length;
  }
  return out;
}

/**
 * Lines up breakdown pieces with sentence segments. Returns groups in reading
 * order, each { piece, segments }; `piece` is null for the punctuation between
 * pieces. Throws when the pieces do not spell the sentence in order, leave a
 * word uncovered, or cut a kanji run away from part of its reading.
 */
export function alignBreakdown(segments, breakdown) {
  const plain = segments.map((s) => s.text).join('');
  const groups = [];
  let pos = 0;
  const gap = (end) => {
    const text = plain.slice(pos, end);
    if (WORD_CHAR.test(text)) throw new Error(`"${text}" is not covered by the breakdown`);
    if (text) groups.push({ piece: null, segments: sliceSegments(segments, pos, end, text) });
  };
  for (const piece of breakdown) {
    const start = piece.text ? plain.indexOf(piece.text, pos) : -1;
    if (start < 0) throw new Error(`"${piece.text}" does not come next in the sentence after "${plain.slice(0, pos)}"`);
    gap(start);
    pos = start + piece.text.length;
    groups.push({ piece, segments: sliceSegments(segments, start, pos, piece.text) });
  }
  gap(plain.length);
  return groups;
}
