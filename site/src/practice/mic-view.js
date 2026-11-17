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
// The line under the answer box for each failure reason of record() and listen().
const MESSAGES = {
  blocked: () => 'Microphone blocked. Allow it for this site, or for this browser in Settings.',
  'no-mic': () => 'No microphone found.',
  quiet: () => 'Didn’t catch anything.',
  unreadable: (detail) => `This browser’s recording couldn’t be read (${detail}).`,
  'no-server': () => (canListen ? 'This site can’t transcribe. Tap again to use the browser’s own recognition.' : 'This site can’t transcribe.'),
  offline: () => 'Couldn’t reach the server.',
  server: (detail) => `Couldn’t transcribe (server said ${detail}).`,
  failed: (detail) => `The microphone didn’t work${detail ? ` (${detail})` : ''}.`,
};

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
 * runs; nothing is checked. A failed try shakes the button once and says why
 * in `message`, a line for the card to place under the answer box; the next
 * tap or keystroke clears it. Returns { element, message, disable(), dispose() }:
 * disable() for after the check, dispose() for when the card goes.
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
  const message = el('p', 'mic-message');
  message.setAttribute('role', 'status');
  message.hidden = true;
  // The recording or listening under way, and whether its text is being fetched.
  let active = null;
  let busy = false;

  const say = (text) => {
    message.textContent = text;
    message.hidden = !text;
  };
  const fail = ({ reason, detail }) => {
    mic.classList.remove('is-failed');
    void mic.offsetWidth; // restarts the animation when it is already showing
    mic.classList.add('is-failed');
    say((MESSAGES[reason] ?? MESSAGES.failed)(detail));
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
  const ended = (failure) => {
    reset();
    if (failure) fail(failure);
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
    say('');
    if (canRecord && hasTranscriber()) {
      // The pulse starts with the recording, not the tap, so nobody speaks into a microphone that is still opening.
      active = record({ onStart: () => setListening(true), onBusy: () => setBusy(true), onHeard: fill, onEnd: ended });
    } else if (canListen) {
      active = listen({ onHeard: heard, onEnd: ended });
      setListening(true);
    } else {
      // The button only shows when one of the two works, so here the host has no transcription and the browser cannot listen.
      fail({ reason: 'no-server' });
    }
  });
  mic.addEventListener('animationend', () => mic.classList.remove('is-failed'));
  box.addEventListener('input', () => say(''));
  return {
    element: mic,
    message,
    disable() {
      quit();
      say('');
      mic.disabled = true;
    },
    dispose: quit,
  };
}
