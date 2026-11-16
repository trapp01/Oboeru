// The study screen: runs a session over the deck one card at a time, with the
// progress bar, the bottom actions and the keyboard map, then the end view.

import { stop } from '../audio/player.js';
import { buildCard } from './card-view.js';
import { button, el, keyHint } from './dom.js';
import { buildEnd } from './end-screen.js';
import { createSession } from './session.js';

const isControl = (target) => target instanceof Element && target.closest('button, a, input, [role="tab"]');

/** The bar over a session: close, and progress as "12 / 56" with a thin bar. Returns { bar, update(progress) }. */
export function topBar(onClose) {
  const bar = el('header', 'study-bar');
  const close = el('button', 'close-button');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.append(el('span', 'close-mark', '×'), keyHint('Esc'));
  close.addEventListener('click', onClose);
  const progress = el('div', 'progress');
  const text = el('span', 'progress-text');
  const track = el('div', 'progress-track');
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-label', 'Cards finished');
  const fill = el('div', 'progress-fill');
  track.append(fill);
  progress.append(text, track);
  bar.append(close, progress);

  const update = ({ finished, total }) => {
    text.textContent = `${finished} / ${total}`;
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(total));
    track.setAttribute('aria-valuenow', String(finished));
    fill.style.transform = `scaleX(${total ? finished / total : 0})`;
  };
  return { bar, update };
}

export function showStudy(root, { deck, signal }) {
  document.title = `${deck.title} – Oboeru`;
  signal.addEventListener('abort', stop);

  // The study screen is only reached from the screen that built the deck, so the previous history entry is that screen.
  const close = () => history.back();
  const screen = el('div', 'screen study-screen');
  const { bar, update } = topBar(close);
  const stage = el('div', 'card-stage');
  const actions = el('div', 'actions');
  const showAnswer = button('button button-primary', 'Show answer', 'Space');
  const again = button('button button-again', 'Again', '1');
  const gotIt = button('button button-primary', 'Got it', '2');
  actions.append(showAnswer, again, gotIt);
  screen.append(bar, stage, actions);
  root.append(screen);

  let session;
  let card = null;
  // A rerun of the missed words is practice only; it does not count toward deck.onCleared.
  let rerun = false;

  function setActions(revealed) {
    showAnswer.hidden = revealed;
    again.hidden = !revealed;
    gotIt.hidden = !revealed;
  }

  function start(words) {
    session = createSession(words);
    screen.classList.remove('is-ended');
    showCard();
  }

  function showCard() {
    stop();
    update(session.progress);
    if (session.done) return showEnd();
    const word = session.current;
    card = buildCard({ word, note: deck.notes[word.id], direction: deck.direction });
    card.element.addEventListener('click', () => reveal());
    stage.replaceChildren(card.element);
    setActions(false);
    card.element.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function reveal() {
    if (!card || card.revealed) return;
    card.reveal();
    setActions(true);
    // "Show answer" is now hidden, so focus moves to the card instead of falling back to the page.
    card.element.focus({ preventScroll: true });
  }

  function answer(gotItCard) {
    if (!card?.revealed) return;
    if (gotItCard) {
      const word = session.current;
      if (session.gotIt() && !rerun) deck.onCleared?.(word);
    } else {
      session.again();
    }
    showCard();
  }

  function showEnd() {
    card = null;
    screen.classList.add('is-ended');
    const missed = session.missed;
    const end = buildEnd({
      studied: session.progress.total,
      missed,
      backLabel: deck.backLabel,
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

  showAnswer.addEventListener('click', reveal);
  again.addEventListener('click', () => answer(false));
  gotIt.addEventListener('click', () => answer(true));

  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      return close();
    }
    if (!card) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key === ' ' || key === 'Enter') {
      // A focused control keeps its own Space and Enter.
      if (card.revealed || isControl(event.target)) return;
      event.preventDefault();
      reveal();
    } else if ((key === 'ArrowLeft' || key === 'ArrowRight') && card.revealed) {
      event.preventDefault();
      card.step(key === 'ArrowLeft' ? -1 : 1);
    } else if (key === '1') {
      answer(false);
    } else if (key === '2') {
      answer(true);
    } else if (key === 'p') {
      card.wordSpeaker?.click();
    } else if (key === 's') {
      card.sentenceSpeaker?.click();
    }
  }, { signal });

  start(deck.words);
}
