// DOM helpers for the practice screens. The study screens' el() and button() are used as they are.

import { parseSentence } from '../furigana/markup.js';
import { renderRuby } from '../furigana/ruby.js';
import { el } from '../study/dom.js';
import { hasJapanese } from './catalog.js';

/**
 * A `tag` element drawing sentence markup with furigana, in the Japanese face
 * when it has kana or kanji. English goes through unchanged; markup that does not parse is drawn as plain text.
 */
export function markupText(tag, className, markup) {
  const node = el(tag, className);
  if (hasJapanese(markup)) node.lang = 'ja';
  try {
    node.append(renderRuby(parseSentence(markup)));
  } catch (error) {
    console.warn(error.message);
    node.textContent = markup;
  }
  return node;
}
