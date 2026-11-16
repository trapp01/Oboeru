// The microphone button of a practice card. A tap records and the Worker
// transcribes; on a host without /api/transcribe it listens through the
// browser's speech recognition instead, when the browser has one.

import { el } from '../study/dom.js';
import { bestHearing } from './grade.js';
import { canListen, listen } from './speech.js';
import { canRecord, hasTranscriber, record } from './transcribe.js';

const SVG = 'http://www.w3.org/2000/svg';
const LABEL = 'Speak your answer';
const BUSY_LABEL = 'Transcribing…';

/** True when the browser can record or listen, so the button is worth showing. */
export const canUseMic = canRecord || canListen;

function micIcon() {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('speaker-icon');
  for (const [d, className] of [
    ['M12 3.5a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-5 0V6A2.5 2.5 0 0 1 12 3.5z', 'speaker-body'],
    ['M6.5 11a5.5 5.5 0 0 0 11 0', ''],
    ['M12 16.5V20', ''],
  ]) {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', d);
    if (className) path.setAttribute('class', className);
    svg.append(path);
  }
  return svg;
}

/**
 * The button for `box`. What is heard replaces the box's text and `onInput()`
 * runs; nothing is checked. A failed try shakes the button once. Returns its
 * element, disable() for after the check, and dispose() for when the card goes.
 */
export function micButton(box, answers, onInput) {
  const mic = el('button', 'speaker mic-button');
  mic.type = 'button';
  mic.setAttribute('aria-label', LABEL);
  mic.setAttribute('aria-pressed', 'false');
  mic.title = LABEL;
  const label = el('span', 'mic-label', BUSY_LABEL);
  label.setAttribute('aria-hidden', 'true');
  mic.append(micIcon(), label);
  // The recording or listening under way, and whether its text is being fetched.
  let active = null;
  let busy = false;

  const shake = () => {
    mic.classList.remove('is-failed');
    void mic.offsetWidth; // restarts the animation when it is already showing
    mic.classList.add('is-failed');
  };
  const setListening = (value) => {
    mic.classList.toggle('is-listening', value);
    mic.setAttribute('aria-pressed', String(value));
  };
  const setBusy = (value) => {
    busy = value;
    if (value) setListening(false);
    mic.classList.toggle('is-busy', value);
    mic.setAttribute('aria-label', value ? BUSY_LABEL : LABEL);
    mic.setAttribute('aria-busy', String(value));
  };
  const reset = () => {
    active = null;
    setBusy(false);
    setListening(false);
  };
  const fill = (text) => {
    // A stop() keeps what was already said, which can arrive after the check.
    if (box.readOnly) return;
    box.value = text;
    onInput();
  };
  const heard = (hearings) => {
    try {
      fill(bestHearing(hearings, answers));
    } catch (error) {
      console.error(error);
      fill(hearings[0]);
    }
  };
  const ended = (failed) => {
    reset();
    if (failed) shake();
  };
  // Ends what is under way without waiting for its text.
  const quit = () => {
    if (active?.cancel) active.cancel();
    else active?.stop();
    reset();
  };

  mic.addEventListener('click', () => {
    if (busy) return;
    if (active) return active.stop();
    if (canRecord && hasTranscriber()) {
      // The pulse starts with the recording, not the tap, so nobody speaks into a microphone that is still opening.
      active = record({ onStart: () => setListening(true), onBusy: () => setBusy(true), onHeard: fill, onEnd: ended });
    } else if (canListen) {
      active = listen({ onHeard: heard, onEnd: ended });
      setListening(true);
    } else {
      shake();
    }
  });
  mic.addEventListener('animationend', () => mic.classList.remove('is-failed'));
  return {
    element: mic,
    disable() {
      quit();
      mic.disabled = true;
    },
    dispose: quit,
  };
}
