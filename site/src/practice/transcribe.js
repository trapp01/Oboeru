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
// A recording at least this long that cannot be decoded means the browser's format is unreadable, not a slip of the finger.
const REAL_RECORDING_MS = 1000;

/** True when the browser can record from the microphone. */
export const canRecord = Boolean(globalThis.navigator?.mediaDevices?.getUserMedia) && typeof globalThis.MediaRecorder === 'function';

let unavailable = false;

/**
 * False once transcription has shown it cannot work here: the host has no
 * /api/transcribe, or the browser cannot decode its own recording. It stays false for the page's life.
 */
export const hasTranscriber = () => !unavailable;

async function toWav(blob) {
  const context = new OfflineAudioContext(1, 1, DECODE_RATE);
  const audio = await context.decodeAudioData(await blob.arrayBuffer());
  const channels = Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i));
  return encodeWav(toMono(channels, audio.sampleRate));
}

async function send(wav, signal) {
  const response = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'audio/wav' }, body: wav, signal });
  if (MISSING.has(response.status)) {
    unavailable = true;
    throw new Error(`this host has no transcription (${response.status})`);
  }
  if (!response.ok) throw new Error(`the server answered ${response.status}`);
  const { text } = await response.json();
  return typeof text === 'string' ? text.trim() : '';
}

/**
 * Starts recording; `onStart()` runs once the microphone is recording. stop(),
 * or 15 seconds, ends it; then `onBusy()` runs while the text is fetched, `onHeard(text)` gets it, and `onEnd(failed)` runs once.
 * `failed` is true for a refused microphone, no speech or a failed request.
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
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    const startedAt = Date.now();
    onStart();
    timer = setTimeout(stop, MAX_MS);
    if (stopAsked) stop();
    await stopped;
    const lasted = Date.now() - startedAt;
    release();
    if (abort.signal.aborted) return;
    if (!chunks.length) return onEnd(true);
    onBusy();
    let wav;
    try {
      wav = await toWav(new Blob(chunks, { type: recorder.mimeType }));
    } catch (error) {
      if (lasted >= REAL_RECORDING_MS) unavailable = true;
      throw new Error(`the recording could not be decoded (${error.message})`);
    }
    const text = await send(wav, abort.signal);
    if (abort.signal.aborted) return;
    if (text) onHeard(text);
    onEnd(!text);
  }

  run().catch((error) => {
    release();
    if (abort.signal.aborted) return;
    console.warn(`Transcription did not work: ${error.message}`);
    onEnd(true);
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
