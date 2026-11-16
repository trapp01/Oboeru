import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav, isWav, toMono } from './wav.js';

test('the header describes 16 kHz mono 16-bit PCM', () => {
  const wav = encodeWav(new Float32Array(10), 16_000);
  const view = new DataView(wav.buffer);
  const tag = (at) => String.fromCharCode(...wav.subarray(at, at + 4));
  assert.equal(wav.length, 44 + 20);
  assert.equal(tag(0), 'RIFF');
  assert.equal(view.getUint32(4, true), wav.length - 8);
  assert.equal(tag(8), 'WAVE');
  assert.equal(tag(12), 'fmt ');
  assert.equal(view.getUint16(20, true), 1);
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(24, true), 16_000);
  assert.equal(view.getUint32(28, true), 32_000);
  assert.equal(view.getUint16(32, true), 2);
  assert.equal(view.getUint16(34, true), 16);
  assert.equal(tag(36), 'data');
  assert.equal(view.getUint32(40, true), 20);
  assert.ok(isWav(wav));
});

test('samples are clamped and written little-endian', () => {
  const wav = encodeWav(Float32Array.from([0, 1, -1, 0.5, 2, -3]));
  const view = new DataView(wav.buffer);
  const sample = (i) => view.getInt16(44 + i * 2, true);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(sample), [0, 32767, -32768, 16383, 32767, -32768]);
});

test('channels are averaged into one', () => {
  const mono = toMono([Float32Array.from([1, 0.5]), Float32Array.from([0, -0.5])], 16_000);
  assert.deepEqual([...mono], [0.5, 0]);
});

test('48 kHz goes down to 16 kHz by averaging each group of three', () => {
  const mono = toMono([Float32Array.from([0.3, 0.3, 0.3, 0.6, 0.6, 0.6, 0.9])], 48_000);
  assert.equal(mono.length, 2);
  assert.ok(Math.abs(mono[0] - 0.3) < 1e-6 && Math.abs(mono[1] - 0.6) < 1e-6);
});

test('44.1 kHz gives the right length and keeps a steady level', () => {
  const second = new Float32Array(44_100).fill(0.25);
  const mono = toMono([second], 44_100);
  assert.equal(mono.length, 16_000);
  assert.ok(mono.every((s) => Math.abs(s - 0.25) < 1e-6));
});

test('a lower rate is interpolated up', () => {
  const mono = toMono([Float32Array.from([0, 1])], 8_000);
  assert.deepEqual([...mono].map((s) => Math.round(s * 10) / 10), [0, 0.5, 1, 1]);
});

test('anything that is not a WAV file is refused', () => {
  assert.equal(isWav(new Uint8Array(100)), false);
  assert.equal(isWav(new TextEncoder().encode('RIFF')), false);
});
