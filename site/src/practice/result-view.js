// What a practice card shows after the check: the verdict, what was typed when
// it missed, the model answer with its breakdown popups, English and speaker,
// and the other answers.

import { readingText } from '../furigana/markup.js';
import { clipUrl } from '../audio/player.js';
import { speakerButton } from '../audio/speaker.js';
import { el, keyHint } from '../study/dom.js';
import { buildSentenceLine } from '../study/sentence-view.js';
import { markupText } from './dom.js';
import { shownAnswer } from './grade.js';

const VERDICTS = {
  correct: ['verdict verdict-correct', 'Correct'],
  miss: ['verdict verdict-miss', 'Not in the answer key'],
};

// Plays the item's answer clip; the reading is what the browser's voice says when the clip is missing.
function answerSpeaker(item, markup) {
  let spoken = markup;
  try {
    spoken = readingText(markup);
  } catch {
    // modelLine() reports markup that does not parse; the speaker then reads the raw text.
  }
  const speaker = speakerButton({ label: 'Play answer', source: () => ({ url: clipUrl(item.lesson, item.id, 'a'), text: spoken }) });
  speaker.append(keyHint('S'));
  return speaker;
}

function modelLine(item, markup) {
  try {
    return buildSentenceLine(markup, item.breakdown);
  } catch (error) {
    console.warn(`${item.id}: ${error.message}`);
    const line = el('p', 'sentence', markup);
    line.lang = 'ja';
    return line;
  }
}

/**
 * Builds the result for `item`. `outcome` is 'correct', 'miss', 'empty' (the
 * box was empty) or 'sample' (an open exercise); `typed` is the box's text.
 * Returns the element and the answer's speaker.
 */
export function buildResult(item, { outcome, typed }) {
  const result = el('section', 'practice-result');
  result.setAttribute('aria-live', 'polite');
  if (VERDICTS[outcome]) {
    const [className, label] = VERDICTS[outcome];
    result.append(el('p', className, label));
  }
  if (outcome === 'miss') {
    const mine = el('p', 'result-typed', typed);
    mine.lang = 'ja';
    result.append(mine);
  }
  const heading = outcome === 'sample' ? 'Sample answer' : 'Also accepted';
  if (outcome === 'sample') result.append(el('h2', 'result-heading', heading));

  const model = shownAnswer(item.answers[0]);
  const speaker = answerSpeaker(item, model);
  const foot = el('div', 'sentence-foot');
  foot.append(el('p', 'translation', item.en || ''), speaker);
  result.append(modelLine(item, model), foot);

  const others = item.answers.slice(1);
  if (others.length) {
    const list = el('ul', 'result-others');
    list.append(...others.map((answer) => markupText('li', 'result-other', shownAnswer(answer))));
    result.append(el('h2', 'result-heading', heading), list);
  }
  return { element: result, speaker };
}
