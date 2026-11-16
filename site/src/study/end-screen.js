// The end of a session: how it went, the missed words or items, and where to go next.

import { button, el, japaneseWord } from './dom.js';

const WORDS = {
  count: (n) => (n === 1 ? '1 word' : `${n} words`),
  again: (n) => `Study the ${n} again`,
  home: '#/',
};

function wordRow(word) {
  const row = el('li', 'missed-row');
  row.append(japaneseWord(word, 'missed-ja'), el('span', 'missed-meaning', word.meaning));
  return row;
}

/**
 * Builds the end-of-session view. `onAgain` starts a session over the missed
 * cards. `onBack` returns to the lesson the deck came from and is labelled
 * `backLabel`; a mix has no such lesson and passes no label. A session over
 * something other than words passes `wording` ({ count(n), again(n), home },
 * home being where "All lessons" leads) and `missedRow(card)`, which returns an <li>.
 */
export function buildEnd({ studied, missed, backLabel, onAgain, onBack, wording = WORDS, missedRow = wordRow }) {
  const view = el('div', 'end');
  const heading = el('h1', 'end-title', 'Done');
  heading.tabIndex = -1;
  // 済 ("finished") in a name-seal frame; decorative, the heading carries the meaning.
  const seal = el('span', 'end-seal', '済');
  seal.lang = 'ja';
  seal.setAttribute('aria-hidden', 'true');
  const head = el('div', 'end-head');
  head.append(seal, heading);
  const summary = el('div', 'end-summary');
  summary.append(
    el('p', 'end-stat', `${wording.count(studied)} studied`),
    el('p', 'end-stat', missed.length ? `${missed.length} needed another look` : 'None needed another look'),
  );
  view.append(head, summary);

  if (missed.length) {
    const list = el('ul', 'missed-list');
    list.append(...missed.map(missedRow));
    view.append(list);
  }

  const actions = el('div', 'end-actions');
  if (missed.length) {
    const again = button('button button-primary', wording.again(missed.length));
    again.addEventListener('click', onAgain);
    actions.append(again);
  }
  if (backLabel) {
    const back = button('button button-quiet', backLabel);
    back.addEventListener('click', onBack);
    actions.append(back);
  }
  const all = el('a', 'button button-quiet', 'All lessons');
  all.href = wording.home;
  actions.append(all);
  view.append(actions);
  return { element: view, heading };
}
