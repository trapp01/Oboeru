// Hash router: #/ is the lesson list, #/lesson/N one lesson, #/study/N a
// session over that lesson and #/study/mix a session over a mix; #/practice is
// the Practice tab and #/practice/run a session over practice items. It holds
// the deck between the screen that built it and the session screen.

import { showLessonList } from './lessons/list-screen.js';
import { showLesson } from './lessons/lesson-screen.js';
import { showPracticeList } from './practice/list-screen.js';
import { showPracticeSession } from './practice/session-screen.js';
import { showStudy } from './study/study-screen.js';

const root = document.getElementById('app');
let pendingDeck = null;
let leaving = null;

function startStudy(deck) {
  pendingDeck = deck;
  location.hash = `#/study/${deck.key}`;
}

function startPractice(deck) {
  pendingDeck = deck;
  location.hash = '#/practice/run';
}

function route() {
  leaving?.abort();
  leaving = new AbortController();
  const { signal } = leaving;
  root.replaceChildren();
  window.scrollTo(0, 0);

  const hash = location.hash || '#/';
  const lesson = hash.match(/^#\/lesson\/(\d+)$/);
  const study = hash.match(/^#\/study\/(\d+|mix)$/);

  if (lesson) {
    showLesson(root, { lesson: Number(lesson[1]), signal, onStudy: startStudy });
  } else if (study) {
    const key = study[1];
    // The deck lives only in memory, so a reload or a Back into a finished session returns to where the deck was built.
    if (!pendingDeck || String(pendingDeck.key) !== key) {
      location.replace(key === 'mix' ? '#/' : `#/lesson/${key}`);
      return;
    }
    const deck = pendingDeck;
    pendingDeck = null;
    showStudy(root, { deck, signal });
  } else if (hash === '#/practice/run') {
    if (pendingDeck?.key !== 'practice') {
      location.replace('#/practice');
      return;
    }
    const deck = pendingDeck;
    pendingDeck = null;
    showPracticeSession(root, { deck, signal });
  } else if (hash === '#/practice') {
    showPracticeList(root, { signal, onPractice: startPractice });
  } else if (hash === '#/') {
    showLessonList(root, { signal, onStudy: startStudy });
  } else {
    location.replace('#/');
  }
}

window.addEventListener('hashchange', route);
route();
