// Records one spoken answer in the page and has the Worker's /api/transcribe
// turn it into text. The recording goes up as 16 kHz mono WAV whatever the
// browser recorded in. Recording starts only from a tap.

import { encodeWav, toMono } from './wav.js';

const ENDPOINT = 'api/transcribe';
const MAX_MS = 15_000;
// decodeAudioData resamples to its context's rate; every browser supports 48 kHz.
const DECODE_RATE = 48_000;
// What a static host or the local server answers for an endpoint it does not have.
const MISSING = new Set([404, 405, 501]);
// getUserMedia errors that mean the browser or the system refused the microphone.
const REFUSED = new Set(['NotAllowedError', 'SecurityError']);

/** True when the browser can record from the microphone. */
export const canRecord = Boolean(globalThis.navigator?.mediaDevices?.getUserMedia) && typeof globalThis.MediaRecorder === 'function';

let unavailable = false;

/** False once the host has answered that it has no /api/transcribe. It stays false for the page's life. */
export const hasTranscriber = () => !unavailable;

async function toWav(blob) {
  const context = new OfflineAudioContext(1, 1, DECODE_RATE);
  const audio = await context.decodeAudioData(await blob.arrayBuffer());
  const channels = Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i));
  return encodeWav(toMono(channels, audio.sampleRate));
}

// A failed step, carrying the reason the microphone button shows.
class Failure extends Error {
  constructor(reason, detail) {
    super(`${reason}${detail ? ` (${detail})` : ''}`);
    this.failure = { reason, detail };
  }
}

async function send(wav, signal) {
  let response;
  try {
    response = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'audio/wav' }, body: wav, signal });
  } catch (error) {
    throw new Failure('offline', error.message);
  }
  if (MISSING.has(response.status)) {
    unavailable = true;
    throw new Failure('no-server', String(response.status));
  }
  if (!response.ok) throw new Failure('server', String(response.status));
  const { text } = await response.json().catch(() => ({}));
  return typeof text === 'string' ? text.trim() : '';
}

async function openMicrophone() {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    if (REFUSED.has(error.name)) throw new Failure('blocked', error.name);
    if (error.name === 'NotFoundError') throw new Failure('no-mic', error.name);
    throw new Failure('failed', error.name || error.message);
  }
}

/**
 * Starts recording; `onStart()` runs once the microphone is recording. stop(),
 * or 15 seconds, ends it; then `onBusy()` runs while the text is fetched, `onHeard(text)` gets it, and `onEnd(failure)` runs once.
 * `failure` is null on success, else { reason, detail }: reason is 'blocked',
 * 'no-mic', 'quiet' (nothing heard), 'unreadable' (the recording could not be
 * decoded), 'no-server' (this host has no /api/transcribe), 'offline',
 * 'server' (detail is the status) or 'failed'.
 * cancel() drops the recording and calls nothing more. The microphone is
 * released as soon as recording ends either way.
 */
export function record({ onStart, onBusy, onHeard, onEnd }) {
  const abort = new AbortController();
  let stream = null;
  let recorder = null;
  let timer = 0;
  let stopAsked = false;

  const release = () => {
    clearTimeout(timer);
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  };
  const stop = () => {
    stopAsked = true;
    if (recorder?.state === 'recording') recorder.stop();
  };

  async function run() {
    stream = await openMicrophone();
    if (abort.signal.aborted) return release();
    recorder = new MediaRecorder(stream);
    const chunks = [];
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size) chunks.push(event.data);
    });
    const stopped = new Promise((resolve, reject) => {
      recorder.addEventListener('stop', resolve);
      recorder.addEventListener('error', (event) => reject(event.error ?? new Error('recording failed')));
    });
    recorder.start();
    onStart();
    timer = setTimeout(stop, MAX_MS);
    if (stopAsked) stop();
    await stopped;
    release();
    if (abort.signal.aborted) return;
    if (!chunks.length) return onEnd({ reason: 'quiet' });
    onBusy();
    let wav;
    try {
      wav = await toWav(new Blob(chunks, { type: recorder.mimeType }));
    } catch (error) {
      throw new Failure('unreadable', `${recorder.mimeType || 'no type'}: ${error.message}`);
    }
    const text = await send(wav, abort.signal);
    if (abort.signal.aborted) return;
    if (text) onHeard(text);
    onEnd(text ? null : { reason: 'quiet' });
  }

  run().catch((error) => {
    release();
    if (abort.signal.aborted) return;
    console.warn(`Transcription did not work: ${error.message}`);
    onEnd(error.failure ?? { reason: 'failed', detail: error.message });
  });
  return {
    stop,
    cancel() {
      abort.abort();
      if (recorder?.state === 'recording') recorder.stop();
      release();
    },
  };
}
