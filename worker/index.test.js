import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';
import { encodeWav } from '../site/src/practice/wav.js';

function fakeEnv() {
  const store = new Map();
  return {
    store,
    PROGRESS: {
      get: async (key) => (store.has(key) ? JSON.parse(store.get(key)) : null),
      put: async (key, value) => void store.set(key, value),
    },
    ASSETS: { fetch: async () => new Response('a file') },
  };
}

const call = (env, method, body) =>
  worker.fetch(new Request('https://example.test/api/progress', { method, body: body && JSON.stringify(body) }), env);

test('an empty store answers with the empty state', async () => {
  const response = await call(fakeEnv(), 'GET');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    lessons: { list: [], at: 0 },
    passes: {},
    practice: { lessons: { list: [], at: 0 }, passes: {} },
  });
});

test('a PUT is merged into what is stored and the merged state comes back', async () => {
  const env = fakeEnv();
  await call(env, 'PUT', { lessons: { list: [1, 2], at: 10 }, passes: { 1: { pass: 0, cleared: ['l01-001'] } } });
  const response = await call(env, 'PUT', { passes: { 1: { pass: 0, cleared: ['l01-002'] } } });
  const merged = await response.json();
  assert.deepEqual(merged.passes[1].cleared, ['l01-001', 'l01-002']);
  assert.deepEqual(merged.lessons.list, [1, 2]);
  assert.deepEqual(await (await call(env, 'GET')).json(), merged);
});

test('a stale device cannot undo a restarted pass', async () => {
  const env = fakeEnv();
  await call(env, 'PUT', { passes: { 3: { pass: 1, cleared: ['l03-009'] } } });
  const merged = await (await call(env, 'PUT', { passes: { 3: { pass: 0, cleared: ['l03-001', 'l03-002'] } } })).json();
  assert.deepEqual(merged.passes[3], { pass: 1, cleared: ['l03-009'] });
});

test('the practice pool round-trips and merges apart from the vocabulary pool', async () => {
  const env = fakeEnv();
  await call(env, 'PUT', {
    passes: { 3: { pass: 0, cleared: ['l03-001'] } },
    practice: { lessons: { list: [3], at: 10 }, passes: { 3: { pass: 0, cleared: ['l03-p001'] } } },
  });
  const merged = await (await call(env, 'PUT', { practice: { passes: { 3: { pass: 0, cleared: ['l03-p002'] } } } })).json();
  assert.deepEqual(merged.practice, { lessons: { list: [3], at: 10 }, passes: { 3: { pass: 0, cleared: ['l03-p001', 'l03-p002'] } } });
  assert.deepEqual(merged.passes[3].cleared, ['l03-001']);
  assert.deepEqual(await (await call(env, 'GET')).json(), merged);
});

test('a device that sends no practice pool leaves the stored one alone', async () => {
  const env = fakeEnv();
  await call(env, 'PUT', { practice: { passes: { 3: { pass: 2, cleared: ['l03-p009'] } } } });
  const merged = await (await call(env, 'PUT', { lessons: { list: [1], at: 5 }, passes: {} })).json();
  assert.deepEqual(merged.practice.passes[3], { pass: 2, cleared: ['l03-p009'] });
  assert.deepEqual(merged.lessons.list, [1]);
});

test('bad requests are refused and leave the store alone', async () => {
  const env = fakeEnv();
  const notJson = await worker.fetch(new Request('https://example.test/api/progress', { method: 'PUT', body: '{oops' }), env);
  assert.equal(notJson.status, 400);
  assert.equal((await call(env, 'DELETE')).status, 405);
  const huge = await call(env, 'PUT', { junk: 'x'.repeat(250_000) });
  assert.equal(huge.status, 413);
  assert.equal(env.store.size, 0);
});

function fakeAi(answer = { text: ' 食べます。 ' }) {
  const calls = [];
  return {
    calls,
    run: async (model, input) => {
      calls.push({ model, input });
      if (answer instanceof Error) throw answer;
      return answer;
    },
  };
}

const transcribe = (env, body, method = 'POST') =>
  worker.fetch(new Request('https://example.test/api/transcribe', { method, body }), env);

test('a recording is sent to whisper in Japanese and its text comes back', async () => {
  const AI = fakeAi();
  const wav = encodeWav(new Float32Array(1600));
  const response = await transcribe({ ...fakeEnv(), AI }, wav);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { text: '食べます。' });
  assert.equal(AI.calls.length, 1);
  const { model, input } = AI.calls[0];
  assert.equal(model, '@cf/openai/whisper-large-v3-turbo');
  assert.equal(input.language, 'ja');
  assert.equal(input.vad_filter, true);
  assert.equal(input.initial_prompt, undefined);
  assert.deepEqual(new Uint8Array(Buffer.from(input.audio, 'base64')), wav);
});

test('a model that hears nothing gives empty text', async () => {
  const response = await transcribe({ ...fakeEnv(), AI: fakeAi({}) }, encodeWav(new Float32Array(16)));
  assert.deepEqual(await response.json(), { text: '' });
});

test('without the AI binding the endpoint says so with a 501', async () => {
  const response = await transcribe(fakeEnv(), encodeWav(new Float32Array(16)));
  assert.equal(response.status, 501);
  assert.match((await response.json()).error, /binding/);
});

test('bad recordings and methods are refused before the model runs', async () => {
  const AI = fakeAi();
  const env = { ...fakeEnv(), AI };
  assert.equal((await transcribe(env, undefined, 'GET')).status, 405);
  assert.equal((await transcribe(env, encodeWav(new Float32Array(16)), 'PUT')).status, 405);
  assert.equal((await transcribe(env, encodeWav(new Float32Array(16_000 * 25)))).status, 413);
  assert.equal((await transcribe(env, new Uint8Array(1000))).status, 400);
  assert.equal(AI.calls.length, 0);
});

test('a failing model answers 502', async () => {
  const response = await transcribe({ ...fakeEnv(), AI: fakeAi(new Error('overloaded')) }, encodeWav(new Float32Array(16)));
  assert.equal(response.status, 502);
});

test('every other path is served from the site files', async () => {
  const response = await worker.fetch(new Request('https://example.test/index.html'), fakeEnv());
  assert.equal(await response.text(), 'a file');
});
