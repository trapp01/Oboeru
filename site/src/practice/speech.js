// Listens for one spoken answer in Japanese through the browser's speech
// recognition, which only some browsers have. The microphone uses it on a host
// without /api/transcribe. Listening starts only from a tap.

const Recognition = globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition;
const HEARINGS = 5;

/** True when the browser can listen. */
export const canListen = typeof Recognition === 'function';

// The recognition's error codes, as the reasons transcribe.js gives for a recording.
const REASONS = {
  'not-allowed': 'blocked',
  'service-not-allowed': 'blocked',
  'audio-capture': 'no-mic',
  network: 'offline',
};

/**
 * Starts listening. `onHeard(hearings)` receives what was heard, best first.
 * `onEnd(failure)` runs once when listening ends; `failure` is null when
 * something was heard or stop() ended a quiet try, else { reason, detail }
 * with the reasons transcribe.js record() uses. Returns stop(), which ends
 * listening and keeps what was already said.
 */
export function listen({ onHeard, onEnd }) {
  const recognition = new Recognition();
  recognition.lang = 'ja-JP';
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.maxAlternatives = HEARINGS;
  let heard = false;
  let stopped = false;
  let error = '';

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    const hearings = Array.from(result, (alternative) => alternative.transcript.trim()).filter(Boolean);
    if (!hearings.length) return;
    heard = true;
    onHeard(hearings);
  };
  recognition.onerror = (event) => {
    error = event.error;
  };
  recognition.onend = () => {
    const quiet = !error || error === 'no-speech' || error === 'aborted';
    if (heard || (stopped && quiet)) return onEnd(null);
    onEnd(quiet ? { reason: 'quiet' } : { reason: REASONS[error] ?? 'failed', detail: error });
  };
  try {
    recognition.start();
  } catch (failure) {
    console.warn(`Speech recognition did not start: ${failure.message}`);
    queueMicrotask(() => onEnd({ reason: 'failed', detail: failure.name || failure.message }));
  }
  return {
    stop() {
      stopped = true;
      recognition.stop();
    },
  };
}
