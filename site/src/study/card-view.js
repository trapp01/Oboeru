// One card: the front, plus the answer that is already in place but hidden so
// the reveal adds to the card without moving the front.

import { clipUrl } from '../audio/player.js';
import { speakerButton } from '../audio/speaker.js';
import { el, japaneseWord, keyHint } from './dom.js';
import { buildPages } from './pages.js';

// The large word steps down in size as it gets longer, so phrases still fit a phone.
function sizeClass(word) {
  const length = [...(word.kanji || word.kana)].length;
  if (length <= 4) return 'size-xl';
  if (length <= 7) return 'size-l';
  if (length <= 12) return 'size-m';
  return 'size-s';
}

function wordSpeakerButton(word, note) {
  const speaker = speakerButton({
    label: 'Play word',
    source: () => ({ url: clipUrl(word.lesson, word.id, 'w'), text: note?.say || word.kana }),
  });
  speaker.append(keyHint('P'));
  return speaker;
}

/**
 * Builds the card for `word`. direction is 'ja' (Japanese first) or 'en'.
 * Returns the element, reveal(), and the speakers the keyboard can press.
 */
export function buildCard({ word, note, direction }) {
  const card = el('article', `card direction-${direction}`);
  card.tabIndex = -1;
  const pages = buildPages(word, note);
  pages.element.classList.add('answer', 'answer-below');
  const japanese = japaneseWord(word, `card-word ${sizeClass(word)}`);
  const wordSpeaker = wordSpeakerButton(word, note);

  if (direction === 'en') {
    // English first keeps the Japanese out of view until the reveal; its space is reserved above the meaning.
    const above = el('div', 'card-front-ja answer answer-above');
    above.append(japanese, wordSpeaker);
    card.append(above, el('p', 'card-meaning card-meaning-front', word.meaning), pages.element);
  } else {
    const speakerRow = el('div', 'card-speaker-row');
    speakerRow.append(wordSpeaker);
    const meaning = el('p', 'card-meaning answer answer-below', word.meaning);
    card.append(japanese, speakerRow, meaning, pages.element);
  }

  let revealed = false;
  return {
    element: card,
    get revealed() {
      return revealed;
    },
    reveal() {
      if (revealed) return;
      revealed = true;
      card.classList.add('is-revealed');
      pages.show();
    },
    step: (delta) => pages.step(delta),
    /** The word speaker, or null while English first hides it. */
    get wordSpeaker() {
      return direction === 'en' && !revealed ? null : wordSpeaker;
    },
    get sentenceSpeaker() {
      return revealed ? pages.sentenceSpeaker : null;
    },
  };
}
