// Fetches the practice index and lesson files on demand, kept for the life of
// the page alongside the lesson data. Paths are relative to index.html.

import { lessonTitle } from '../lessons/catalog.js';
import { fetchJson, loadLessons, once } from '../lessons/data.js';

const pad = (n) => String(n).padStart(2, '0');

// A practice file is named by its lesson's title in the lesson list; a lesson with no word list is "Lesson N".
async function titleOf(lesson) {
  const lessons = await loadLessons();
  return lessonTitle(lessons.find((entry) => entry.lesson === lesson) ?? { lesson });
}

/** [{ lesson, title, exercises, items }] from data/practice/index.json, or null when there is no index. */
export function loadPracticeIndex() {
  return once('practice-index', async () => {
    const index = await fetchJson('data/practice/index.json', { missingOk: true });
    return index && Promise.all(index.map(async (entry) => ({ ...entry, title: await titleOf(entry.lesson) })));
  });
}

/**
 * One lesson's items in file order. Each item is given its lesson number,
 * which clearing needs, its lesson's title, and its exercise without the exercise's items.
 */
export function loadPracticeItems(lesson) {
  return once(`practice-${lesson}`, async () => {
    const [file, title] = await Promise.all([fetchJson(`data/practice/lesson-${pad(lesson)}.json`), titleOf(lesson)]);
    return file.exercises.flatMap(({ items, ...exercise }) =>
      items.map((item) => ({ ...item, lesson: file.lesson, lessonTitle: title, exercise })));
  });
}
