// The bar fixed to the bottom of a list while lessons are ticked: batch size,
// what is left in the pass, and the button that starts a session. The
// Vocabulary and Practice tabs each show one over their own pool.

import { el } from './dom.js';
import { BATCH_SIZES, leftInPass } from './mix.js';

function batchSizeControl(store, perSession, onChange) {
  const group = el('fieldset', 'segmented segmented-compact');
  group.append(el('legend', 'visually-hidden', perSession));
  const current = store.savedBatchSize();
  for (const size of BATCH_SIZES) {
    const option = el('label', 'segmented-option');
    const input = el('input');
    input.type = 'radio';
    input.name = 'batch-size';
    input.checked = size === current;
    input.addEventListener('change', () => {
      store.saveBatchSize(size);
      onChange();
    });
    option.append(input, el('span', '', size === Infinity ? 'All' : String(size)));
    group.append(option);
  }
  return group;
}

/**
 * Builds the dock. `store` is a mixStore(); `lessons` is [{ lesson, total }]
 * for every lesson on the list. `wording` gives `count(n)` ("20 words"),
 * `action` ("Study") and `perSession`, the batch size control's label.
 * `buildDeck(picked)` resolves to the deck for the ticked lesson numbers, which `onStart` receives.
 * Returns the element, isPicked(lesson) and pick(lesson, checked) for the list's checkboxes.
 */
export function mixDock({ store, lessons, wording, buildDeck, onStart, signal }) {
  const picked = new Set(store.savedLessons().filter((n) => lessons.some((entry) => entry.lesson === n)));
  const dock = el('div', 'dock mix-dock');
  const status = el('p', 'mix-status');
  status.setAttribute('role', 'status');
  const start = el('button', 'button button-primary study-button');
  start.type = 'button';

  const update = () => {
    const chosen = lessons.filter((entry) => picked.has(entry.lesson));
    dock.hidden = chosen.length === 0;
    if (dock.hidden) return;
    const total = chosen.reduce((sum, entry) => sum + entry.total, 0);
    const left = leftInPass(total, store.clearedIds(chosen.map((entry) => entry.lesson)).length);
    status.textContent = `${chosen.length === 1 ? '1 lesson' : `${chosen.length} lessons`} · ${left} of ${total} left in this pass`;
    start.textContent = `${wording.action} ${wording.count(Math.min(store.savedBatchSize(), total))}`;
  };

  start.addEventListener('click', async () => {
    start.disabled = true;
    try {
      const deck = await buildDeck([...picked].sort((a, b) => a - b));
      if (!signal.aborted) onStart(deck);
    } catch (error) {
      console.error(error);
      status.textContent = 'Those lessons could not be loaded. Try again.';
      start.disabled = false;
    }
  });

  dock.append(batchSizeControl(store, wording.perSession, update), status, start);
  update();
  return {
    element: dock,
    isPicked: (lesson) => picked.has(lesson),
    pick(lesson, checked) {
      if (checked) picked.add(lesson);
      else picked.delete(lesson);
      store.saveLessons([...picked]);
      update();
    },
  };
}
