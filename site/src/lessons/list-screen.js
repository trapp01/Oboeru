// The Vocabulary tab of the lesson list: one row per lesson with its word
// count and section names. Each row has a checkbox; the checked lessons are
// the pool a mix is drawn from.

import { drawBatch } from '../study/mix.js';
import { mixDock } from '../study/mix-dock.js';
import { mixStore } from '../study/mix-store.js';
import { lessonTitle, wordCount } from './catalog.js';
import { loadLesson, loadLessons } from './data.js';
import { directionControl } from './direction.js';
import { el, showLoadError } from './dom.js';
import { listHeader, listFooter } from './list-frame.js';

const store = mixStore('vocabulary');
const totalWords = (entry) => entry.sections.reduce((sum, s) => sum + s.count, 0);

function lessonRow(entry, checked, onPick) {
  const { lesson, sections } = entry;
  const title = lessonTitle(entry);
  const link = el('a', 'lesson-row');
  link.href = `#/lesson/${lesson}`;
  const number = el('span', 'lesson-number', String(lesson));
  number.setAttribute('aria-hidden', 'true');
  const text = el('span', 'lesson-text');
  text.append(el('span', 'lesson-title', title), el('span', 'lesson-count', wordCount(totalWords(entry))));
  if (sections.length > 1) text.append(el('span', 'lesson-sections', sections.map((s) => s.title).join(', ')));
  link.append(number, text);

  const pick = el('label', 'lesson-pick');
  const box = el('input');
  box.type = 'checkbox';
  box.checked = checked;
  box.addEventListener('change', () => onPick(lesson, box.checked));
  pick.append(box, el('span', 'visually-hidden', `Add ${title} to the mix`));

  const item = el('li', 'lesson-item');
  item.append(link, pick);
  return item;
}

/** Loads the picked lessons and draws the deck for a mixed session. */
async function buildMix(picked, direction) {
  const lessons = await Promise.all(picked.map(loadLesson));
  const pool = lessons.flatMap((data) => data.sections.flatMap((s) => s.words));
  const { batch, restarted } = drawBatch(pool, store.progress(picked), store.savedBatchSize());
  if (restarted) store.restartPass(picked);
  return {
    key: 'mix',
    title: 'Mixed lessons',
    words: batch,
    notes: Object.assign({}, ...lessons.map((data) => data.notes)),
    direction,
    onCleared: store.markCleared,
    onMissed: store.markMissed,
  };
}

export async function showLessonList(root, { signal, onStudy }) {
  document.title = 'Oboeru';
  const screen = el('div', 'screen list-screen');
  const { header, title } = listHeader('vocabulary');
  screen.append(header);
  root.append(screen);
  title.focus({ preventScroll: true });

  let lessons;
  try {
    lessons = await loadLessons();
  } catch (error) {
    if (!signal.aborted) showLoadError(screen, 'The lesson list could not be loaded.', error);
    return;
  }
  if (signal.aborted) return;

  const direction = directionControl();
  const hint = el('p', 'mix-hint', 'Open a lesson to study it, or tick several to study them mixed together.');
  const totals = lessons.map((entry) => ({ lesson: entry.lesson, total: totalWords(entry) }));
  const body = el('div');

  // Drawn again whenever a sync brings in ticked lessons or cleared words from another device.
  const draw = () => {
    const dock = mixDock({
      store,
      lessons: totals,
      wording: { count: wordCount, action: 'Study', perSession: 'Words per session' },
      buildDeck: (picked) => buildMix(picked, direction.value()),
      onStart: onStudy,
      signal,
    });
    const list = el('ol', 'lesson-list');
    list.append(...lessons.map((entry) => lessonRow(entry, dock.isPicked(entry.lesson), dock.pick)));
    body.replaceChildren(list, dock.element);
  };
  draw();

  screen.append(direction.element, hint, body, listFooter({ signal, onChange: draw }));
}
