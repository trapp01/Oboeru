// The Cloudflare Worker in front of the site. It serves the files in site/,
// keeps the shared copy of the mix state at /api/progress in one KV entry, and
// turns a spoken answer into text at /api/transcribe with Workers AI.
// One person uses the site, so there is one copy and no notion of a user.

import { cleanState, mergeStates } from '../site/src/study/mix-state.js';
import { isWav } from '../site/src/practice/wav.js';

const KEY = 'progress';
// A full state, every word and practice item of every lesson cleared, is under 80 KB; anything far larger is not one.
const MAX_BODY_BYTES = 200_000;
const MODEL = '@cf/openai/whisper-large-v3-turbo';
// 20 seconds of 16 kHz mono 16-bit WAV; the page stops recording at 15.
const MAX_AUDIO_BYTES = 640_044;

const json = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

async function progress(request, env) {
  const stored = cleanState(await env.PROGRESS.get(KEY, 'json'));
  if (request.method === 'GET') return json(stored);
  if (request.method !== 'PUT') return json({ error: 'Use GET or PUT.' }, 405);

  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return json({ error: 'State is too large.' }, 413);
  let sent;
  try {
    sent = JSON.parse(body);
  } catch {
    return json({ error: 'Body is not JSON.' }, 400);
  }
  // Merged, not replaced, so a device that was offline cannot erase what another device cleared.
  const merged = mergeStates(stored, cleanState(sent));
  await env.PROGRESS.put(KEY, JSON.stringify(merged));
  return json(merged);
}

// A 15 second recording must encode well inside the 10 ms of CPU a request gets on the free plan.
function base64(bytes) {
  if (typeof bytes.toBase64 === 'function') return bytes.toBase64();
  let binary = '';
  // In slices, because a whole recording in one call overflows the argument limit.
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

// The page reads 404, 405 and 501 as "no transcription here" and falls back to the browser's recognition.
async function transcribe(request, env) {
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  if (!env.AI) return json({ error: 'This server has no Workers AI binding.' }, 501);

  // Refused from the header first, so an oversized body is never read.
  if (Number(request.headers.get('content-length')) > MAX_AUDIO_BYTES) return json({ error: 'Recording is too long.' }, 413);
  const audio = new Uint8Array(await request.arrayBuffer());
  if (audio.length > MAX_AUDIO_BYTES) return json({ error: 'Recording is too long.' }, 413);
  if (!isWav(audio)) return json({ error: 'Body is not a WAV file.' }, 400);
  // No initial_prompt: giving the model the expected answer would make it hear that answer.
  let result;
  try {
    result = await env.AI.run(MODEL, { audio: base64(audio), language: 'ja', vad_filter: true });
  } catch (error) {
    console.error(`Transcription failed: ${error.message}`);
    return json({ error: 'Transcription failed.' }, 502);
  }
  return json({ text: typeof result?.text === 'string' ? result.text.trim() : '' });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/progress') return progress(request, env);
    if (pathname === '/api/transcribe') return transcribe(request, env);
    return env.ASSETS.fetch(request);
  },
};
