// One practice card: where the item comes from, the instruction and example,
// the context and cue, the answer box with its romaji input, kana keyboard
// and microphone, and after the check the result.

import { el } from '../study/dom.js';
import { sourceLine } from './catalog.js';
import { markupText } from './dom.js';
import { matchAnswer, normalize, shownAnswer } from './grade.js';
import { finishKana, romajiToKana } from './kana.js';
import { kanaKeyboard } from './kana-keyboard-view.js';
import { canUseMic, micButton } from './mic-view.js';
import { buildResult } from './result-view.js';

const LONG_CUE = 14;

function exampleLine({ cue, answer }) {
  const line = el('p', 'practice-example');
  line.append('e.g. ', markupText('span', '', cue), ' → ', markupText('span', '', shownAnswer(answer)));
  return line;
}

// Romaji before the caret becomes kana as it is typed; the caret stays after the converted text.
function convertBox(box) {
  const caret = box.selectionStart ?? box.value.length;
  const before = box.value.slice(0, caret);
  const kana = romajiToKana(before);
  if (kana === before) return;
  box.value = kana + box.value.slice(caret);
  box.setSelectionRange(kana.length, kana.length);
}

/**
 * Builds the card for `item`; `onInput` runs whenever the box's text changes.
 * check() shows the result and returns the outcome: 'correct', 'miss',
 * 'empty' or 'sample' (an open exercise). Before the check `outcome` is null.
 */
export function buildPracticeCard(item, { onInput }) {
  const { exercise } = item;
  const card = el('article', 'practice-card');
  card.tabIndex = -1;
  card.append(el('p', 'practice-source', sourceLine(item)), el('p', 'practice-instruction', exercise.instruction));
  if (exercise.example) card.append(exampleLine(exercise.example));
  if (item.context) card.append(markupText('p', 'practice-context', item.context));
  const cue = markupText('p', 'practice-cue', item.cue);
  if (item.cue.length > LONG_CUE) cue.classList.add('is-long');
  card.append(cue);
  // The cue's English shows under the cue once the item is checked.
  if (item.cueEn) card.append(el('p', 'practice-cue-en', item.cueEn));

  const box = el('input', 'answer-box');
  box.type = 'text';
  box.lang = 'ja';
  box.autocomplete = 'off';
  box.spellcheck = false;
  box.enterKeyHint = 'done';
  box.setAttribute('autocapitalize', 'none');
  box.setAttribute('autocorrect', 'off');
  box.setAttribute('aria-label', 'Your answer');
  // Nothing is converted while a Japanese keyboard is composing; its finished text goes in as it is.
  box.addEventListener('input', (event) => {
    if (!event.isComposing) convertBox(box);
    onInput();
  });
  box.addEventListener('compositionend', () => {
    convertBox(box);
    onInput();
  });
  const keyboard = kanaKeyboard(box, onInput);
  const row = el('div', 'answer-row');
  row.append(box, keyboard.toggle);
  const mic = canUseMic ? micButton(box, item.answers, onInput) : null;
  if (mic) row.append(mic.element);
  const slot = el('div', 'practice-result-slot');
  card.append(row, keyboard.panel, slot);

  let outcome = null;
  let speaker = null;

  // Empty means nothing is left once the text is normalised for grading, so "？" alone is empty.
  const isBlank = (text) => !normalize(finishKana(text));

  function grade(typed) {
    if (exercise.kind === 'open') return 'sample';
    if (isBlank(typed)) return 'empty';
    try {
      return matchAnswer(typed, item.answers) >= 0 ? 'correct' : 'miss';
    } catch (error) {
      console.error(`${item.id}: ${error.message}`);
      return 'miss';
    }
  }

  return {
    element: card,
    kind: exercise.kind,
    get outcome() {
      return outcome;
    },
    /** True while the box holds nothing that grading would read: only spaces or punctuation. */
    get isEmpty() {
      return isBlank(box.value);
    },
    /** The answer's speaker, or null before the check. */
    get answerSpeaker() {
      return speaker;
    },
    focusBox: () => box.focus({ preventScroll: true }),
    check() {
      if (outcome) return outcome;
      mic?.disable();
      keyboard.disable();
      const typed = finishKana(box.value).trim();
      box.value = typed;
      box.readOnly = true;
      outcome = grade(typed);
      const result = buildResult(item, { outcome, typed });
      speaker = result.speaker;
      slot.replaceChildren(result.element);
      card.classList.add('is-checked');
      return outcome;
    },
    /** Stops the microphone and lets it go; called when the card leaves the screen. */
    dispose: () => mic?.dispose(),
  };
}
