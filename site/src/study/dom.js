// Small DOM helpers for the study screens. Text always goes in through textContent.

import { alignReading } from '../furigana/align.js';
import { renderRuby } from '../furigana/ruby.js';

/** Creates an element with an optional class name and text. */
export function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** A button with an optional key hint, shown only on devices with a fine pointer. */
export function button(className, label, key = '') {
  const node = el('button', className);
  node.type = 'button';
  node.append(el('span', 'button-label', label));
  if (key) node.append(keyHint(key));
  return node;
}

export function keyHint(key) {
  const hint = el('kbd', 'key-hint', key);
  hint.setAttribute('aria-hidden', 'true');
  return hint;
}

/** The word's Japanese form: kanji with furigana when it has kanji, else kana. */
export function japaneseWord(word, className) {
  const node = el('span', className);
  node.lang = 'ja';
  node.append(renderRuby(alignReading(word.kanji, word.kana)));
  return node;
}
