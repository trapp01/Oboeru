// A session is one run through a deck: the deck is shuffled into a queue, the
// card at the front is the current one, "Again" sends it back three places,
// and "Got it" finishes it. No DOM; the study screen drives it.

const AGAIN_GAP = 3;

/** Fisher–Yates shuffle into a new array. `random` returns a number in [0, 1). */
export function shuffle(items, random = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Starts a session over `words`. Each word needs a unique `id`.
 * The returned object is mutated by again() and gotIt().
 */
export function createSession(words, { random = Math.random } = {}) {
  const queue = shuffle(words, random);
  const missed = [];
  const total = words.length;
  let finished = 0;

  return {
    /** The card being shown, or null once every card is finished. */
    get current() {
      return queue[0] ?? null;
    },
    get done() {
      return queue.length === 0;
    },
    /** Cards finished so far and the deck size; finished only goes up. */
    get progress() {
      return { finished, total };
    },
    /** Words marked Again at least once, in the order they were first missed. */
    get missed() {
      return [...missed];
    },
    again() {
      const card = queue.shift();
      if (!card) return;
      if (!missed.includes(card)) missed.push(card);
      if (queue.length < AGAIN_GAP) queue.push(card);
      else queue.splice(AGAIN_GAP, 0, card);
    },
    /** Finishes the current card. Returns true when it was never marked Again in this session. */
    gotIt() {
      const card = queue.shift();
      if (!card) return false;
      finished++;
      return !missed.includes(card);
    },
  };
}
