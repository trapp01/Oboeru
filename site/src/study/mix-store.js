// What a mix remembers. The mix state (ticked lessons, cleared and missed ids, for the
// vocabulary and the practice pool) is kept in localStorage and synced with
// the shared copy, so it follows the user between devices. Each pool's batch
// size stays on the device.

import {
  checkPool, cleanState, clearedIds, mergeStates, missedIds, sameState, tickedLessons, withCleared, withLessons, withMissed,
  withRestart,
} from './mix-state.js';
import { fetchShared, sendShared } from './mix-sync.js';

const STATE_KEY = 'oboeru.mix.state';
const DEFAULT_SIZE = 20;
// Long enough that a run of quick answers goes up as one request.
const PUSH_DELAY_MS = 1500;

function read(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing can refuse storage; the mix then lasts for this visit only.
  }
}

const readState = () => cleanState(read(STATE_KEY, null));

let pushTimer = null;

/** Sends the device's state to the shared copy and takes in whatever another device added meanwhile. */
async function push({ keepalive = false } = {}) {
  clearTimeout(pushTimer);
  pushTimer = null;
  const merged = await sendShared(readState(), { keepalive });
  if (merged) write(STATE_KEY, mergeStates(readState(), cleanState(merged)));
  return merged !== null;
}

function change(state) {
  write(STATE_KEY, state);
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, PUSH_DELAY_MS);
}

// A change still waiting for its timer goes out when the page is hidden or closed.
globalThis.addEventListener?.('pagehide', () => {
  if (pushTimer) push({ keepalive: true });
});

/**
 * Brings the device and the shared copy level. Returns { shared, changed }:
 * `shared` is false when the shared copy could not be reached, `changed` is
 * true when the device's state is different from before the call.
 */
export async function syncProgress() {
  const before = readState();
  const remote = await fetchShared();
  if (remote === null) return { shared: false, changed: false };
  const merged = mergeStates(readState(), cleanState(remote));
  write(STATE_KEY, merged);
  const shared = sameState(merged, remote) || (await push());
  return { shared, changed: !sameState(before, readState()) };
}

/**
 * The store for one pool, 'vocabulary' or 'practice'. Every pool shares the
 * one mix state and syncProgress(); the batch size is kept per pool.
 */
export function mixStore(kind) {
  checkPool(kind);
  const sizeKey = kind === 'practice' ? 'oboeru.practice.size' : 'oboeru.mix.size';
  return {
    /** Lesson numbers ticked on the list. */
    savedLessons: () => tickedLessons(readState(), kind),
    saveLessons: (lessons) => change(withLessons(readState(), lessons, Date.now(), kind)),
    /** Cleared ids across `lessons`. */
    clearedIds: (lessons) => clearedIds(readState(), lessons, kind),
    /** The draw's { cleared, missed } ids across `lessons`. */
    progress: (lessons) => ({ cleared: clearedIds(readState(), lessons, kind), missed: missedIds(readState(), lessons, kind) }),
    /** Records a word or item as cleared for this pass. It carries its lesson number. */
    markCleared: (word) => change(withCleared(readState(), word, kind)),
    /** Records a word or item as missed, so the next draw deals it first. It carries its lesson number. */
    markMissed: (word) => change(withMissed(readState(), word, kind)),
    /** Starts a new pass for `lessons`, with nothing in them cleared and the missed ids kept. */
    restartPass: (lessons) => change(withRestart(readState(), lessons, kind)),
    /** The batch size, a number or Infinity for "All". Stored as a number or the string "all". */
    savedBatchSize() {
      const size = read(sizeKey, DEFAULT_SIZE);
      if (size === 'all') return Infinity;
      return Number.isInteger(size) && size > 0 ? size : DEFAULT_SIZE;
    },
    saveBatchSize: (size) => write(sizeKey, size === Infinity ? 'all' : size),
  };
}
