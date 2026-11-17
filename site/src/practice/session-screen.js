// The practice session: runs a session over practice items one card at a time
// with the study screen's top bar and end view, the bottom actions for a
// typed or open exercise, and the keyboard map.

import { stop } from '../audio/player.js';
import { button, el } from '../study/dom.js';
import { buildEnd } from '../study/end-screen.js';
import { createSession } from '../study/session.js';
import { topBar } from '../study/study-screen.js';
import { buildPracticeCard } from './card-view.js';
import { itemCount } from './catalog.js';
import { markupText } from './dom.js';
import { shownAnswer } from './grade.js';

const WORDING = {
  count: itemCount,
  again: (n) => `Practise the ${n} again`,
  home: '#/practice',
};

const isControl = (target) => target instanceof Element && target.closest('button, a');
const setLabel = (node, text) => {
  node.querySelector('.button-label').textContent = text;
};

function missedRow(item) {
  const row = el('li', 'missed-row');
  // Items of one exercise can share a cue and differ only in their context.
  const cue = item.context ? `${item.context} · ${item.cue}` : item.cue;
  row.append(markupText('span', 'missed-cue', cue), markupText('span', 'missed-ja', shownAnswer(item.answers[0])));
  return row;
}

export function showPracticeSession(root, { deck, signal }) {
  document.title = `${deck.title} – Oboeru`;

  // The session is only reached from the practice list, so the previous history entry is that list.
  const close = () => history.back();
  const screen = el('div', 'screen study-screen practice-screen');
  const { bar, update } = topBar(close);
  const stage = el('div', 'card-stage');
  const actions = el('div', 'actions');
  const check = button('button button-primary', 'Check', 'Enter');
  const next = button('button button-primary', 'Next', 'Enter');
  const again = button('button button-again', 'Again', '1');
  const right = button('button button-primary', 'I was right', '2');
  actions.append(check, next, again, right);
  screen.append(bar, stage, actions);
  root.append(screen);

  let session;
  let card = null;
  // A rerun of the missed items is practice only; it does not count toward deck.onCleared.
  let rerun = false;
  signal.addEventListener('abort', () => {
    stop();
    card?.dispose();
  });

  function setActions() {
    const outcome = card?.outcome;
    check.hidden = Boolean(outcome);
    next.hidden = outcome !== 'correct';
    again.hidden = !outcome || outcome === 'correct';
    right.hidden = outcome !== 'miss' && outcome !== 'sample';
    if (!outcome) setLabel(check, card.kind === 'open' ? 'Show a sample' : card.isEmpty ? 'Show answer' : 'Check');
    setLabel(right, outcome === 'sample' ? 'Got it' : 'I was right');
  }

  function start(items) {
    session = createSession(items);
    screen.classList.remove('is-ended');
    showCard();
  }

  function showCard() {
    stop();
    card?.dispose();
    update(session.progress);
    if (session.done) return showEnd();
    card = buildPracticeCard(session.current, { onInput: setActions });
    stage.replaceChildren(card.element);
    setActions();
    window.scrollTo(0, 0);
    card.focusBox();
  }

  function runCheck() {
    if (!card || card.outcome) return;
    card.check();
    setActions();
    // Focus leaves the read-only box, which also puts a phone's keyboard away so the result shows.
    card.element.focus({ preventScroll: true });
    card.element.querySelector('.practice-result')?.scrollIntoView({ block: 'nearest' });
  }

  // `finished` is true for Next, I was right and Got it; false sends the item back as a miss.
  function answer(finished) {
    if (!card?.outcome) return;
    if (finished) {
      const item = session.current;
      if (session.gotIt() && !rerun) deck.onCleared?.(item);
    } else {
      deck.onMissed?.(session.current);
      session.again();
    }
    showCard();
  }

  // Enter checks; after the check it moves on, or sends back an answer that did not match.
  function enter() {
    const outcome = card.outcome;
    if (!outcome) runCheck();
    else if (outcome === 'correct') answer(true);
    else if (outcome === 'miss' || outcome === 'empty') answer(false);
  }

  function showEnd() {
    card = null;
    screen.classList.add('is-ended');
    const missed = session.missed;
    const end = buildEnd({
      studied: session.progress.total,
      missed,
      wording: WORDING,
      missedRow,
      onAgain: () => {
        rerun = true;
        start(missed);
      },
      onBack: close,
    });
    stage.replaceChildren(end.element);
    end.heading.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  check.addEventListener('click', runCheck);
  next.addEventListener('click', () => answer(true));
  again.addEventListener('click', () => answer(false));
  right.addEventListener('click', () => answer(true));

  document.addEventListener('keydown', (event) => {
    // A Japanese keyboard's Enter confirms its text; it is not a check.
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      return close();
    }
    if (!card || event.repeat) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key === 'Enter') {
      // A focused button or link keeps its own Enter.
      if (isControl(event.target)) return;
      event.preventDefault();
      enter();
    } else if (!card.outcome) {
      // Before the check, every other key is typing.
    } else if (key === '1' && !again.hidden) {
      // Without this the digit is also typed into the next card's box, which takes focus during the keydown.
      event.preventDefault();
      answer(false);
    } else if (key === '2' && !right.hidden) {
      event.preventDefault();
      answer(true);
    } else if (key === 's') {
      card.answerSpeaker?.click();
    }
  }, { signal });

  start(deck.items);
}
