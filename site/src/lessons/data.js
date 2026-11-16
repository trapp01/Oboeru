// Fetches lesson data on demand and keeps it for the life of the page.
// Paths are relative to index.html.

const pad = (n) => String(n).padStart(2, '0');
const cache = new Map();

/** Fetches and parses `path`. With `missingOk`, a 404 resolves to null. */
export async function fetchJson(path, { missingOk = false } = {}) {
  const response = await fetch(path);
  if (missingOk && response.status === 404) return null;
  if (!response.ok) throw new Error(`Could not load ${path}: HTTP ${response.status}`);
  return response.json();
}

/** Runs `load` once per `key` for the life of the page and shares its promise. */
export function once(key, load) {
  if (!cache.has(key)) {
    // A failed load is dropped from the cache so the next visit retries.
    const pending = load().catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, pending);
  }
  return cache.get(key);
}

/** [{ lesson, title, sections: [{ id, title, count }] }] from data/lessons.json. A lesson's title is optional. */
export function loadLessons() {
  return once('lessons', () => fetchJson('data/lessons.json'));
}

/**
 * One lesson's word list and notes: { lesson, title, sections, notes }.
 * Each word is given its lesson number, which a mixed deck needs to find the word's clips.
 * A lesson with no notes file yet gets an empty notes object.
 */
export function loadLesson(lesson) {
  return once(`lesson-${lesson}`, async () => {
    const [words, notes] = await Promise.all([
      fetchJson(`data/words/lesson-${pad(lesson)}.json`),
      fetchJson(`data/notes/lesson-${pad(lesson)}.json`, { missingOk: true }),
    ]);
    const sections = words.sections.map((section) => ({
      ...section,
      words: section.words.map((word) => ({ ...word, lesson: words.lesson })),
    }));
    return { lesson: words.lesson, title: words.title, sections, notes: notes ?? {} };
  });
}
