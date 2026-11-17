// The part of a mix that follows the user between devices: for each pool, the
// ticked lessons and, per lesson, its pass number, the ids cleared in that
// pass, and the missed ids still waiting to be got right. The vocabulary pool sits at the top level and the practice pool under
// `practice`, with the same shape. No DOM and no storage: mix-store.js keeps
// the device's copy and worker/ keeps the shared one, and both merge copies with mergeStates().

const IDS = { vocabulary: /^l\d{2}-\d{3}$/, practice: /^l\d{2}-p\d{3}$/ };
const isLesson = (n) => Number.isInteger(n) && n >= 0 && n < 100;
const byNumber = (a, b) => a - b;

const emptyPool = () => ({ lessons: { list: [], at: 0 }, passes: {} });

function cleanPool(value, idPattern) {
  const pool = emptyPool();
  const list = value?.lessons?.list;
  if (Array.isArray(list)) pool.lessons.list = [...new Set(list.filter(isLesson))].sort(byNumber);
  if (Number.isFinite(value?.lessons?.at) && value.lessons.at > 0) pool.lessons.at = value.lessons.at;
  const passes = value?.passes && typeof value.passes === 'object' ? value.passes : {};
  for (const lesson of Object.keys(passes).map(Number).filter(isLesson).sort(byNumber)) {
    const entry = passes[lesson];
    const pass = Number.isInteger(entry?.pass) && entry.pass > 0 ? entry.pass : 0;
    const ids = (list) => (Array.isArray(list) ? [...new Set(list.filter((id) => typeof id === 'string' && idPattern.test(id)))].sort() : []);
    const cleared = ids(entry?.cleared);
    // A cleared id is no longer missed, so clearing it anywhere takes it off every copy's missed list.
    const missed = ids(entry?.missed).filter((id) => !cleared.includes(id));
    if (!pass && !cleared.length && !missed.length) continue;
    pool.passes[lesson] = { pass, cleared };
    if (missed.length) pool.passes[lesson].missed = missed;
  }
  return pool;
}

function mergePools(a, b) {
  const merged = { lessons: b.lessons.at > a.lessons.at ? b.lessons : a.lessons, passes: {} };
  for (const lesson of new Set([...Object.keys(a.passes), ...Object.keys(b.passes)])) {
    const [x, y] = [a.passes[lesson], b.passes[lesson]];
    if (!x || !y) {
      merged.passes[lesson] = x ?? y;
      continue;
    }
    const missed = [...(x.missed ?? []), ...(y.missed ?? [])];
    if (x.pass !== y.pass) merged.passes[lesson] = { ...(x.pass > y.pass ? x : y), missed };
    else merged.passes[lesson] = { pass: x.pass, cleared: [...x.cleared, ...y.cleared], missed };
  }
  return merged;
}

/** Throws unless `kind` names a pool: 'vocabulary' or 'practice'. */
export function checkPool(kind) {
  if (!Object.hasOwn(IDS, kind)) throw new Error(`Unknown pool "${kind}"; expected ${Object.keys(IDS).join(' or ')}`);
}

function poolOf(state, kind) {
  checkPool(kind);
  return kind === 'practice' ? state.practice : state;
}

function withPool(state, kind, pool) {
  return cleanState(kind === 'practice' ? { ...state, practice: pool } : { ...state, ...pool });
}

/**
 * { lessons: { list, at }, passes: { [lesson]: { pass, cleared, missed? } }, practice: { lessons, passes } }
 * with nothing ticked or cleared. `missed` is left out when empty.
 */
export function emptyState() {
  return { ...emptyPool(), practice: emptyPool() };
}

/**
 * Any parsed JSON as a well-formed state in one canonical order, so two
 * states with the same content serialize to the same text. Malformed parts are dropped.
 */
export function cleanState(value) {
  return { ...cleanPool(value, IDS.vocabulary), practice: cleanPool(value?.practice, IDS.practice) };
}

/**
 * Combines two clean copies of the state, pool by pool. The ticked lessons
 * come from whichever copy changed them last. For each lesson the later pass
 * wins, and two copies of the same pass pool their cleared ids. Missed ids are
 * pooled across passes, less those the winning pass has cleared.
 */
export function mergeStates(a, b) {
  return cleanState({ ...mergePools(a, b), practice: mergePools(a.practice, b.practice) });
}

/** True when the two states hold the same content. */
export function sameState(a, b) {
  return JSON.stringify(cleanState(a)) === JSON.stringify(cleanState(b));
}

// Each function below acts on one pool: `kind` is 'vocabulary' or 'practice'.

/** Lesson numbers ticked in the pool. */
export function tickedLessons(state, kind = 'vocabulary') {
  return poolOf(state, kind).lessons.list;
}

/** Cleared ids across `lessons`. */
export function clearedIds(state, lessons, kind = 'vocabulary') {
  const pool = poolOf(state, kind);
  return lessons.flatMap((lesson) => pool.passes[lesson]?.cleared ?? []);
}

/** Missed ids across `lessons`: marked Again and not got right without a miss since. */
export function missedIds(state, lessons, kind = 'vocabulary') {
  const pool = poolOf(state, kind);
  return lessons.flatMap((lesson) => pool.passes[lesson]?.missed ?? []);
}

function withEntry(state, kind, lesson, change) {
  const pool = poolOf(state, kind);
  const entry = pool.passes[lesson] ?? { pass: 0, cleared: [] };
  return withPool(state, kind, { ...pool, passes: { ...pool.passes, [lesson]: change({ missed: [], ...entry }) } });
}

/** The state with `word` (or practice item) cleared in its lesson's current pass, and no longer missed. It carries its lesson number. */
export function withCleared(state, word, kind = 'vocabulary') {
  return withEntry(state, kind, word.lesson, (entry) => ({ ...entry, cleared: [...entry.cleared, word.id] }));
}

/** The state with `word` (or practice item) missed, and no longer cleared in this pass. It carries its lesson number. */
export function withMissed(state, word, kind = 'vocabulary') {
  return withEntry(state, kind, word.lesson, (entry) => ({
    ...entry,
    cleared: entry.cleared.filter((id) => id !== word.id),
    missed: [...entry.missed, word.id],
  }));
}

/** The state with a new pass for each of `lessons`: nothing cleared, the missed ids kept. */
export function withRestart(state, lessons, kind = 'vocabulary') {
  const pool = poolOf(state, kind);
  const passes = { ...pool.passes };
  for (const lesson of lessons) passes[lesson] = { pass: (passes[lesson]?.pass ?? 0) + 1, cleared: [], missed: passes[lesson]?.missed ?? [] };
  return withPool(state, kind, { ...pool, passes });
}

/** The state with `list` as the ticked lessons, changed at time `now` (milliseconds). */
export function withLessons(state, list, now, kind = 'vocabulary') {
  return withPool(state, kind, { ...poolOf(state, kind), lessons: { list, at: now } });
}
