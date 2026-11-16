// One lesson's words, grouped by section and category, with checkboxes that
// choose the deck and a control for the card direction.

import { alignReading } from '../furigana/align.js';
import { renderRuby } from '../furigana/ruby.js';
import { clipUrl, stop } from '../audio/player.js';
import { speakerButton } from '../audio/speaker.js';
import { groupByCategory, lessonTitle, wordCount } from './catalog.js';
import { loadLesson } from './data.js';
import { directionControl } from './direction.js';
import { el, showLoadError } from './dom.js';

function header(title, total) {
  const bar = el('header', 'screen-header');
  const back = el('a', 'back-link', 'All lessons');
  back.href = '#/';
  const heading = el('h1', 'screen-title', title);
  heading.tabIndex = -1;
  bar.append(back, heading, el('p', 'screen-subtitle', wordCount(total)));
  return { bar, heading };
}

function wordRow(word, notes, picks) {
  const row = el('li', 'word-row');
  const pick = el('label', 'word-pick');
  const box = el('input');
  box.type = 'checkbox';
  box.checked = true;
  picks.set(box, word);
  const japanese = el('span', 'word-ja');
  japanese.lang = 'ja';
  japanese.append(renderRuby(alignReading(word.kanji, word.kana)));
  const text = el('span', 'word-text');
  text.append(japanese, el('span', 'word-meaning', word.meaning));
  pick.append(box, text);
  const speaker = speakerButton({
    label: `Play ${word.kana}`,
    source: () => ({ url: clipUrl(word.lesson, word.id, 'w'), text: notes[word.id]?.say || word.kana }),
  });
  row.append(pick, speaker);
  return { row, box };
}

function sectionBlock(section, notes, picks, onChange) {
  const block = el('section', 'word-section');
  const head = el('h2', 'section-head');
  const pick = el('label', 'section-pick');
  const all = el('input');
  all.type = 'checkbox';
  all.checked = true;
  pick.append(all, el('span', 'section-title', section.title));
  head.append(pick, el('span', 'section-count', String(section.words.length)));
  block.append(head);

  const boxes = [];
  for (const group of groupByCategory(section.words)) {
    block.append(el('h3', 'category-title', group.category));
    const list = el('ul', 'word-list');
    for (const word of group.words) {
      const { row, box } = wordRow(word, notes, picks);
      boxes.push(box);
      list.append(row);
    }
    block.append(list);
  }

  const syncHeader = () => {
    const checked = boxes.filter((b) => b.checked).length;
    all.checked = checked === boxes.length;
    all.indeterminate = checked > 0 && checked < boxes.length;
  };
  all.addEventListener('change', () => {
    for (const box of boxes) box.checked = all.checked;
    onChange();
  });
  for (const box of boxes) box.addEventListener('change', () => {
    syncHeader();
    onChange();
  });
  return block;
}

export async function showLesson(root, { lesson, signal, onStudy }) {
  signal.addEventListener('abort', stop);
  const screen = el('div', 'screen lesson-screen');
  root.append(screen);

  let data;
  try {
    data = await loadLesson(lesson);
  } catch (error) {
    if (!signal.aborted) showLoadError(screen, `Lesson ${lesson} could not be loaded.`, error);
    return;
  }
  if (signal.aborted) return;

  const title = lessonTitle(data);
  document.title = `${title} – Oboeru`;
  const total = data.sections.reduce((sum, s) => sum + s.words.length, 0);
  const { bar, heading } = header(title, total);
  const direction = directionControl();
  const picks = new Map();
  const study = el('button', 'button button-primary study-button');
  study.type = 'button';

  const updateStudy = () => {
    const count = [...picks.keys()].filter((b) => b.checked).length;
    study.textContent = `Study ${wordCount(count)}`;
    study.disabled = count === 0;
  };
  const sections = data.sections.map((s) => sectionBlock(s, data.notes, picks, updateStudy));

  study.addEventListener('click', () => {
    const words = [...picks].filter(([box]) => box.checked).map(([, word]) => word);
    onStudy({
      key: lesson,
      title,
      // A title the word list gives is a name and keeps its capitals; "Lesson 3" reads as a common noun.
      backLabel: `Back to ${data.title || title.toLowerCase()}`,
      words,
      notes: data.notes,
      direction: direction.value(),
    });
  });
  updateStudy();

  const dock = el('div', 'dock');
  dock.append(study);
  screen.append(bar, direction.element, ...sections, dock);
  heading.focus({ preventScroll: true });
}
