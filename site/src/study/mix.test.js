import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawBatch, leftInPass } from './mix.js';

const words = (n) => Array.from({ length: n }, (_, i) => ({ id: `w${i + 1}` }));
const ids = (list) => list.map((w) => w.id).sort();
// With random() fixed at 0.999 the shuffle leaves the order alone.
const keepOrder = () => 0.999;

test('a batch is drawn from words that are not cleared', () => {
  const { batch, restarted } = drawBatch(words(6), { cleared: ['w1', 'w2'] }, 3, keepOrder);
  assert.deepEqual(ids(batch), ['w3', 'w4', 'w5']);
  assert.equal(restarted, false);
});

test('a batch that takes the last uncleared words does not restart the pass', () => {
  const { batch, restarted } = drawBatch(words(4), { cleared: ['w1', 'w2'] }, 2, keepOrder);
  assert.deepEqual(ids(batch), ['w3', 'w4']);
  assert.equal(restarted, false);
});

test('too few uncleared words restarts the pass and fills from cleared ones', () => {
  const { batch, restarted } = drawBatch(words(5), { cleared: ['w1', 'w2', 'w3', 'w4'] }, 3, keepOrder);
  assert.equal(batch.length, 3);
  assert.equal(batch[0].id, 'w5');
  assert.equal(restarted, true);
});

test('a fully cleared pool restarts and deals from all of it', () => {
  const { batch, restarted } = drawBatch(words(3), { cleared: ['w1', 'w2', 'w3'] }, 2, keepOrder);
  assert.equal(batch.length, 2);
  assert.equal(restarted, true);
});

test('All deals the whole pool', () => {
  const untouched = drawBatch(words(4), { cleared: [] }, Infinity, keepOrder);
  assert.deepEqual(ids(untouched.batch), ['w1', 'w2', 'w3', 'w4']);
  assert.equal(untouched.restarted, false);
  const midPass = drawBatch(words(4), { cleared: ['w2'] }, Infinity, keepOrder);
  assert.deepEqual(ids(midPass.batch), ['w1', 'w2', 'w3', 'w4']);
  assert.equal(midPass.restarted, true);
});

test('a pool smaller than the batch is dealt whole', () => {
  const { batch, restarted } = drawBatch(words(3), { cleared: [] }, 10, keepOrder);
  assert.equal(batch.length, 3);
  assert.equal(restarted, false);
});

test('cleared ids from lessons outside the pool are ignored', () => {
  const { batch } = drawBatch(words(3), { cleared: ['other-1', 'w1'] }, 2, keepOrder);
  assert.deepEqual(ids(batch), ['w2', 'w3']);
});

test('no word is dealt twice in one batch', () => {
  const { batch } = drawBatch(words(8), { cleared: ['w1', 'w2', 'w3', 'w4', 'w5'] }, 6);
  assert.equal(new Set(batch.map((w) => w.id)).size, 6);
});

test('missed words are dealt before the rest', () => {
  const { batch, restarted } = drawBatch(words(10), { cleared: ['w1'], missed: ['w9', 'w7'] }, 3, keepOrder);
  assert.deepEqual(batch.slice(0, 2).map((w) => w.id).sort(), ['w7', 'w9']);
  assert.equal(batch.length, 3);
  assert.equal(restarted, false);
});

test('more missed words than the batch fills it with missed words only', () => {
  const { batch } = drawBatch(words(10), { cleared: [], missed: ['w2', 'w4', 'w6', 'w8'] }, 3, keepOrder);
  assert.ok(batch.every((w) => ['w2', 'w4', 'w6', 'w8'].includes(w.id)));
});

test('missed ids from lessons outside the pool are ignored', () => {
  const { batch } = drawBatch(words(3), { cleared: ['w1'], missed: ['other-1'] }, 2, keepOrder);
  assert.deepEqual(ids(batch), ['w2', 'w3']);
});

test('words left in the pass', () => {
  assert.equal(leftInPass(168, 0), 168);
  assert.equal(leftInPass(168, 43), 125);
  assert.equal(leftInPass(168, 168), 168);
});
