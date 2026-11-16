// The Practice tab of the lesson list: one row per lesson that has a practice
// file, each the label of its checkbox. The ticked lessons are the pool a
// practice batch is drawn from, kept apart from the vocabulary mix.

import { el, showLoadError } from '../lessons/dom.js';
import { listHeader, listFooter } from '../lessons/list-frame.js';
import { drawBatch } from '../study/mix.js';
import { mixDock } from '../study/mix-dock.js';
import { mixStore } from '../study/mix-store.js';
import { itemCount } from './catalog.js';
import { loadPracticeIndex, loadPracticeItems } from './data.js';

const store = mixStore('practice');

function lessonRow(entry, checked, onPick) {
  const { lesson, title, items } = entry;
  const row = el('label', 'practice-row');
  const number = el('span', 'lesson-number', String(lesson));
  number.setAttribute('aria-hidden', 'true');
  const text = el('span', 'lesson-text');
  text.append(el('span', 'lesson-title', title), el('span', 'lesson-count', itemCount(items)));
  const box = el('input');
  box.type = 'checkbox';
  box.checked = checked;
  box.addEventListener('change', () => onPick(lesson, box.checked));
  row.append(number, text, box);
  const item = el('li', 'lesson-item practice-item');
  item.append(row);
  return item;
}

/** Loads the picked lessons and draws the deck for a practice session. */
async function buildDeck(picked) {
  const lessons = await Promise.all(picked.map(loadPracticeItems));
  const pool = lessons.flat();
  const { batch, restarted } = drawBatch(pool, store.clearedIds(picked), store.savedBatchSize());
  if (restarted) store.restartPass(picked);
  return { key: 'practice', title: 'Practice', items: batch, onCleared: store.markCleared };
}

export async function showPracticeList(root, { signal, onPractice }) {
  document.title = 'Practice – Oboeru';
  const screen = el('div', 'screen list-screen');
  const { header, title } = listHeader('practice');
  screen.append(header);
  root.append(screen);
  title.focus({ preventScroll: true });

  let index;
  try {
    index = await loadPracticeIndex();
  } catch (error) {
    if (!signal.aborted) showLoadError(screen, 'The practice list could not be loaded.', error);
    return;
  }
  if (signal.aborted) return;
  if (!index?.length) {
    screen.append(el('p', 'practice-none', 'No practice files yet.'));
    return;
  }

  const totals = index.map((entry) => ({ lesson: entry.lesson, total: entry.items }));
  const body = el('div');
  // Drawn again whenever a sync brings in ticked lessons or cleared items from another device.
  const draw = () => {
    const dock = mixDock({
      store,
      lessons: totals,
      wording: { count: itemCount, action: 'Practice', perSession: 'Items per session' },
      buildDeck,
      onStart: onPractice,
      signal,
    });
    const list = el('ol', 'lesson-list');
    list.append(...index.map((entry) => lessonRow(entry, dock.isPicked(entry.lesson), dock.pick)));
    body.replaceChildren(list, dock.element);
  };
  draw();

  screen.append(body, listFooter({ signal, onChange: draw }));
}
