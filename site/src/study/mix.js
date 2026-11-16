// A mix is a deck drawn from the words of several lessons, the pool. A word
// got without a miss is cleared and sits out until every word in the pool is
// cleared; that is one pass. No DOM and no storage; mix-store.js keeps the ids.

import { shuffle } from './session.js';

/** Batch sizes on offer. Infinity is "All": every word in the pool. */
export const BATCH_SIZES = [10, 20, 30, Infinity];

/**
 * Draws up to `size` words from `pool`, taking words whose id is not in
 * `clearedIds` first. When too few of those are left the pass restarts: the
 * leftovers are kept and cleared words fill the rest of the batch.
 * Returns { batch, restarted }; on a restart the caller forgets the pool's cleared ids.
 */
export function drawBatch(pool, clearedIds, size, random = Math.random) {
  const cleared = new Set(clearedIds);
  const fresh = pool.filter((word) => !cleared.has(word.id));
  if (fresh.length >= size) {
    return { batch: shuffle(fresh, random).slice(0, size), restarted: false };
  }
  const again = shuffle(pool.filter((word) => cleared.has(word.id)), random);
  const room = Math.min(size, pool.length) - fresh.length;
  return { batch: [...fresh, ...again.slice(0, room)], restarted: again.length > 0 };
}

/** Words still to come in this pass. A finished pass counts as a full one, because the next draw restarts it. */
export function leftInPass(total, clearedCount) {
  const left = total - clearedCount;
  return left > 0 ? left : total;
}
