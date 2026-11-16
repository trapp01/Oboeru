// What the two tabs of the lesson list share: the masthead with the Vocabulary
// and Practice tabs above the list, and the footer under it with the voice credit and the sync line.

import { renderRuby } from '../furigana/ruby.js';
import { syncProgress } from '../study/mix-store.js';
import { el } from './dom.js';

const TABS = [
  ['vocabulary', 'Vocabulary', '#/'],
  ['practice', 'Practice', '#/practice'],
];

function masthead() {
  const title = el('h1', 'masthead');
  title.tabIndex = -1;
  const mark = el('span', 'masthead-mark');
  mark.lang = 'ja';
  mark.setAttribute('aria-hidden', 'true');
  mark.append(renderRuby([{ text: '覚', reading: 'おぼ' }, { text: 'える', reading: '' }]));
  title.append(mark, el('span', 'masthead-name', 'Oboeru'));
  return title;
}

/**
 * The masthead and the tabs, with `current` ('vocabulary' or 'practice')
 * marked. The tabs are links, so Back moves between them. Returns the header
 * and its title, which the screen focuses on arrival.
 */
export function listHeader(current) {
  const header = el('header', 'list-header');
  const title = masthead();
  const tabs = el('nav', 'list-tabs');
  tabs.setAttribute('aria-label', 'Lesson list');
  for (const [name, label, href] of TABS) {
    const tab = el('a', 'list-tab', label);
    tab.href = href;
    if (name === current) tab.setAttribute('aria-current', 'page');
    tabs.append(tab);
  }
  header.append(title, tabs);
  return { header, title };
}

/**
 * The line saying whether progress is shared. It syncs the mix state when it
 * is built and whenever the tab becomes visible again, and calls `onChange` when a sync
 * brought in ticked lessons or cleared ids from another device.
 */
function syncLine({ signal, onChange }) {
  const line = el('p', 'sync-status');
  const sync = async () => {
    const { shared, changed } = await syncProgress();
    if (signal.aborted) return;
    line.textContent = shared ? 'Progress is synced across your devices.' : 'Progress is saved on this device only.';
    if (changed) onChange();
  };
  sync();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sync();
  }, { signal });
  return line;
}

/** The footer under either list: the voice credit and the sync line. `onChange` is the sync line's. */
export function listFooter({ signal, onChange }) {
  const footer = el('footer', 'list-footer');
  // The voice's terms of use ask for this credit wherever the clips are played.
  footer.append(el('p', 'voice-credit', 'Voice: VOICEVOX:四国めたん'), syncLine({ signal, onChange }));
  return footer;
}
