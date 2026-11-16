import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkPool, cleanState, clearedIds, emptyState, mergeStates, sameState, tickedLessons, withCleared, withLessons, withRestart,
} from './mix-state.js';

const pad = (n, width) => String(n).padStart(width, '0');
const word = (lesson, n) => ({ lesson, id: `l${pad(lesson, 2)}-${pad(n, 3)}` });
const item = (lesson, n) => ({ lesson, id: `l${pad(lesson, 2)}-p${pad(n, 3)}` });

test('clearing a word records it under its lesson', () => {
  const state = withCleared(withCleared(emptyState(), word(3, 12)), word(1, 5));
  assert.deepEqual(clearedIds(state, [3]), ['l03-012']);
  assert.deepEqual(clearedIds(state, [1, 3]), ['l01-005', 'l03-012']);
  assert.deepEqual(clearedIds(state, [2]), []);
});

test('clearing the same word twice keeps one copy', () => {
  const state = withCleared(withCleared(emptyState(), word(3, 12)), word(3, 12));
  assert.deepEqual(clearedIds(state, [3]), ['l03-012']);
});

test('a restart empties the lesson and moves it to the next pass', () => {
  const state = withRestart(withCleared(withCleared(emptyState(), word(3, 1)), word(4, 1)), [3]);
  assert.deepEqual(clearedIds(state, [3]), []);
  assert.equal(state.passes[3].pass, 1);
  assert.deepEqual(clearedIds(state, [4]), ['l04-001']);
});

test('two copies of the same pass pool their cleared words', () => {
  const phone = withCleared(emptyState(), word(3, 1));
  const laptop = withCleared(emptyState(), word(3, 2));
  assert.deepEqual(clearedIds(mergeStates(phone, laptop), [3]), ['l03-001', 'l03-002']);
});

test('a later pass wins over an earlier one, so a restart is not undone', () => {
  const stale = withCleared(withCleared(emptyState(), word(3, 1)), word(3, 2));
  const restarted = withCleared(withRestart(stale, [3]), word(3, 7));
  assert.deepEqual(clearedIds(mergeStates(stale, restarted), [3]), ['l03-007']);
  assert.deepEqual(clearedIds(mergeStates(restarted, stale), [3]), ['l03-007']);
});

test('the ticked lessons come from the copy that changed them last', () => {
  const older = withLessons(emptyState(), [1, 2], 1000);
  const newer = withLessons(emptyState(), [3], 2000);
  assert.deepEqual(mergeStates(older, newer).lessons.list, [3]);
  assert.deepEqual(mergeStates(newer, older).lessons.list, [3]);
  assert.deepEqual(mergeStates(emptyState(), older).lessons.list, [1, 2]);
});

test('merging is the same in either order and stable when repeated', () => {
  const a = withLessons(withCleared(withRestart(emptyState(), [2]), word(2, 3)), [2, 5], 50);
  const b = withCleared(withCleared(emptyState(), word(5, 1)), word(2, 9));
  assert.ok(sameState(mergeStates(a, b), mergeStates(b, a)));
  assert.ok(sameState(mergeStates(mergeStates(a, b), b), mergeStates(a, b)));
});

test('malformed input is reduced to what is well formed', () => {
  const state = cleanState({
    lessons: { list: [3, 'x', 3, -1, 1], at: 'soon' },
    passes: { 3: { pass: 2, cleared: ['l03-001', 7, 'DROP TABLE', 'l03-001'] }, nope: { pass: 1 }, 4: 'junk' },
  });
  assert.deepEqual(state, {
    lessons: { list: [1, 3], at: 0 },
    passes: { 3: { pass: 2, cleared: ['l03-001'] } },
    practice: { lessons: { list: [], at: 0 }, passes: {} },
  });
  assert.deepEqual(cleanState(null), emptyState());
  assert.deepEqual(cleanState('text'), emptyState());
});

test('a state stored before the practice pool existed is still valid', () => {
  const old = { lessons: { list: [3], at: 10 }, passes: { 3: { pass: 1, cleared: ['l03-002'] } } };
  const state = cleanState(old);
  assert.deepEqual(clearedIds(state, [3]), ['l03-002']);
  assert.deepEqual(tickedLessons(state, 'practice'), []);
  assert.deepEqual(clearedIds(mergeStates(state, withCleared(emptyState(), item(3, 1), 'practice')), [3], 'practice'), ['l03-p001']);
});

test('the practice pool is kept apart from the vocabulary pool', () => {
  let state = withCleared(emptyState(), word(3, 1));
  state = withCleared(state, item(3, 31), 'practice');
  state = withLessons(withLessons(state, [1, 2], 100), [3], 200, 'practice');
  assert.deepEqual(clearedIds(state, [3]), ['l03-001']);
  assert.deepEqual(clearedIds(state, [3], 'practice'), ['l03-p031']);
  assert.deepEqual(tickedLessons(state), [1, 2]);
  assert.deepEqual(tickedLessons(state, 'practice'), [3]);
  state = withRestart(state, [3], 'practice');
  assert.deepEqual(clearedIds(state, [3], 'practice'), []);
  assert.deepEqual(clearedIds(state, [3]), ['l03-001']);
});

test('each pool only keeps ids of its own kind', () => {
  const state = cleanState({
    passes: { 3: { pass: 0, cleared: ['l03-001', 'l03-p001'] } },
    practice: { passes: { 3: { pass: 0, cleared: ['l03-001', 'l03-p001'] } } },
  });
  assert.deepEqual(clearedIds(state, [3]), ['l03-001']);
  assert.deepEqual(clearedIds(state, [3], 'practice'), ['l03-p001']);
});

test('the practice pool merges by the same rules', () => {
  const stale = withCleared(withCleared(emptyState(), item(3, 1), 'practice'), item(3, 2), 'practice');
  const restarted = withCleared(withRestart(stale, [3], 'practice'), item(3, 7), 'practice');
  const other = withLessons(withCleared(emptyState(), item(3, 8), 'practice'), [3, 4], 500, 'practice');
  assert.deepEqual(clearedIds(mergeStates(stale, restarted), [3], 'practice'), ['l03-p007']);
  assert.deepEqual(clearedIds(mergeStates(stale, other), [3], 'practice'), ['l03-p001', 'l03-p002', 'l03-p008']);
  assert.deepEqual(tickedLessons(mergeStates(other, emptyState()), 'practice'), [3, 4]);
  assert.ok(sameState(mergeStates(restarted, other), mergeStates(other, restarted)));
});

test('an unknown pool is refused', () => {
  assert.throws(() => clearedIds(emptyState(), [3], 'kanji'), /Unknown pool "kanji"/);
  assert.throws(() => checkPool('toString'), /Unknown pool "toString"/);
  checkPool('vocabulary');
  checkPool('practice');
});
