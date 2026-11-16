// The part of a mix that follows the user between devices: for each pool, the
// ticked lessons and, per lesson, its pass number and the ids cleared in that
// pass. The vocabulary pool sits at the top level and the practice pool under
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
    const cleared = Array.isArray(entry?.cleared) ? entry.cleared.filter((id) => typeof id === 'string' && idPattern.test(id)) : [];
    if (pass || cleared.length) pool.passes[lesson] = { pass, cleared: [...new Set(cleared)].sort() };
  }
  return pool;
}

function mergePools(a, b) {
  const merged = { lessons: b.lessons.at > a.lessons.at ? b.lessons : a.lessons, passes: {} };
  for (const lesson of new Set([...Object.keys(a.passes), ...Object.keys(b.passes)])) {
    const [x, y] = [a.passes[lesson], b.passes[lesson]];
    if (!x || !y) merged.passes[lesson] = x ?? y;
    else if (x.pass !== y.pass) merged.passes[lesson] = x.pass > y.pass ? x : y;
    else merged.passes[lesson] = { pass: x.pass, cleared: [...x.cleared, ...y.cleared] };
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

/** { lessons: { list, at }, passes: { [lesson]: { pass, cleared } }, practice: { lessons, passes } } with nothing ticked or cleared. */
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
 * wins, and two copies of the same pass pool their cleared ids.
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

/** The state with `word` (or practice item) cleared in its lesson's current pass. It carries its lesson number. */
export function withCleared(state, word, kind = 'vocabulary') {
  const pool = poolOf(state, kind);
  const entry = pool.passes[word.lesson] ?? { pass: 0, cleared: [] };
  return withPool(state, kind, { ...pool, passes: { ...pool.passes, [word.lesson]: { ...entry, cleared: [...entry.cleared, word.id] } } });
}

/** The state with a new, empty pass for each of `lessons`. */
export function withRestart(state, lessons, kind = 'vocabulary') {
  const pool = poolOf(state, kind);
  const passes = { ...pool.passes };
  for (const lesson of lessons) passes[lesson] = { pass: (passes[lesson]?.pass ?? 0) + 1, cleared: [] };
  return withPool(state, kind, { ...pool, passes });
}

/** The state with `list` as the ticked lessons, changed at time `now` (milliseconds). */
export function withLessons(state, list, now, kind = 'vocabulary') {
  return withPool(state, kind, { ...poolOf(state, kind), lessons: { list, at: now } });
}
