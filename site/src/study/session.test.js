import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, shuffle } from './session.js';

const words = (n) => Array.from({ length: n }, (_, i) => ({ id: `w${i + 1}` }));
// Math.random returning just under 1 makes the shuffle keep the input order.
const keepOrder = () => 0.999999;

test('shuffle keeps every item and does not touch the input', () => {
  const input = words(10);
  const copy = [...input];
  const out = shuffle(input);
  assert.deepEqual(input, copy);
  assert.equal(out.length, 10);
  assert.deepEqual(new Set(out), new Set(input));
});

test('shuffle uses the random source', () => {
  assert.deepEqual(shuffle([1, 2, 3], () => 0), [2, 3, 1]);
  assert.deepEqual(shuffle([1, 2, 3], keepOrder), [1, 2, 3]);
});

test('Got it walks through the deck and finishes it', () => {
  const s = createSession(words(3), { random: keepOrder });
  assert.deepEqual(s.progress, { finished: 0, total: 3 });
  assert.equal(s.current.id, 'w1');
  s.gotIt();
  assert.equal(s.current.id, 'w2');
  assert.deepEqual(s.progress, { finished: 1, total: 3 });
  s.gotIt();
  s.gotIt();
  assert.equal(s.done, true);
  assert.equal(s.current, null);
  assert.deepEqual(s.progress, { finished: 3, total: 3 });
  assert.deepEqual(s.missed, []);
});

test('Again puts the card back three cards later', () => {
  const s = createSession(words(6), { random: keepOrder });
  s.again();
  assert.deepEqual(drain(s), ['w2', 'w3', 'w4', 'w1', 'w5', 'w6']);
});

test('Again with exactly three cards behind it goes after all three', () => {
  const s = createSession(words(4), { random: keepOrder });
  s.again();
  assert.deepEqual(drain(s), ['w2', 'w3', 'w4', 'w1']);
});

test('Again with fewer than three cards left goes to the end', () => {
  const s = createSession(words(3), { random: keepOrder });
  s.again();
  assert.deepEqual(drain(s), ['w2', 'w3', 'w1']);
});

test('Again on the last card brings it straight back', () => {
  const s = createSession(words(2), { random: keepOrder });
  s.gotIt();
  s.again();
  assert.equal(s.current.id, 'w2');
  assert.equal(s.done, false);
});

test('a deck of one: Again repeats it, Got it ends the session', () => {
  const s = createSession(words(1));
  s.again();
  s.again();
  assert.equal(s.current.id, 'w1');
  assert.deepEqual(s.progress, { finished: 0, total: 1 });
  s.gotIt();
  assert.equal(s.done, true);
  assert.deepEqual(s.progress, { finished: 1, total: 1 });
  assert.deepEqual(s.missed.map((w) => w.id), ['w1']);
});

test('progress does not move on Again', () => {
  const s = createSession(words(5), { random: keepOrder });
  s.gotIt();
  s.again();
  s.again();
  assert.deepEqual(s.progress, { finished: 1, total: 5 });
});

test('a word missed twice is listed once, in first-missed order', () => {
  const s = createSession(words(5), { random: keepOrder });
  s.again(); // w1 -> queue w2 w3 w4 w1 w5
  s.again(); // w2 -> queue w3 w4 w1 w2 w5
  s.gotIt(); // w3
  s.gotIt(); // w4
  s.again(); // w1 again
  assert.deepEqual(s.missed.map((w) => w.id), ['w1', 'w2']);
  assert.equal(drain(s).length, 3);
  assert.deepEqual(s.progress, { finished: 5, total: 5 });
});

test('Got it says whether the card got through the session without an Again', () => {
  const s = createSession(words(3), { random: keepOrder });
  s.again(); // w1 -> queue w2 w3 w1
  assert.equal(s.gotIt(), true); // w2
  assert.equal(s.gotIt(), true); // w3
  assert.equal(s.current.id, 'w1');
  assert.equal(s.gotIt(), false);
});

test('an empty deck is done at once and ignores actions', () => {
  const s = createSession([]);
  assert.equal(s.done, true);
  s.again();
  assert.equal(s.gotIt(), false);
  assert.deepEqual(s.progress, { finished: 0, total: 0 });
  assert.deepEqual(s.missed, []);
});

test('missed returns a copy', () => {
  const s = createSession(words(2), { random: keepOrder });
  s.again();
  s.missed.pop();
  assert.equal(s.missed.length, 1);
});

function drain(session) {
  const order = [];
  while (!session.done) {
    order.push(session.current.id);
    session.gotIt();
  }
  return order;
}
