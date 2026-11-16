// The Sentence and Mnemonic pages of a revealed card: a two-tab control over a
// sideways-scrolling track that snaps, so touch screens can swipe between them.

import { plainText } from '../furigana/markup.js';
import { clipUrl } from '../audio/player.js';
import { speakerButton } from '../audio/speaker.js';
import { el, keyHint } from './dom.js';
import { buildSentenceLine } from './sentence-view.js';
import { parseStory } from './story.js';

// Each page: name, tab label, and the arrow key that opens it.
const PAGES = [
  ['sentence', 'Sentence', '←'],
  ['mnemonic', 'Mnemonic', '→'],
];
let nextId = 0;

function sentencePage(word, note) {
  const page = el('div', 'page-body');
  const ja = note?.sentence?.ja;
  if (!ja) {
    page.append(el('p', 'page-empty', 'No sentence yet'));
    return { page, speaker: null };
  }
  let line;
  let spoken = ja;
  try {
    line = buildSentenceLine(ja, note.sentence.breakdown);
    spoken = plainText(ja);
  } catch (error) {
    console.warn(`${word.id}: ${error.message}`);
    line = el('p', 'sentence', ja);
    line.lang = 'ja';
  }
  const speaker = speakerButton({
    label: 'Play sentence',
    source: () => ({ url: clipUrl(word.lesson, word.id, 's'), text: spoken }),
  });
  speaker.append(keyHint('S'));
  // The speaker sits beside the translation so the sentence keeps the full width.
  const foot = el('div', 'sentence-foot');
  foot.append(el('p', 'translation', note.sentence.en || ''), speaker);
  page.append(line, foot);
  return { page, speaker };
}

function mnemonicPage(word, note) {
  const page = el('div', 'page-body');
  const { soundsLike, story } = note?.mnemonic ?? {};
  if (!soundsLike && !story) {
    page.append(el('p', 'page-empty', 'No mnemonic yet'));
    return page;
  }
  if (soundsLike) {
    const line = el('p', 'sounds-like');
    const kana = el('span', 'sounds-like-kana', word.kana);
    kana.lang = 'ja';
    line.append(el('span', 'sounds-like-label', 'Sounds like'), kana, el('span', 'sounds-like-text', soundsLike));
    page.append(line);
  }
  if (story) {
    const text = el('p', 'story');
    for (const { text: part, kind } of parseStory(story)) {
      if (kind === 'keyword') text.append(el('mark', 'keyword', part));
      else if (kind === 'meaning') text.append(el('strong', 'meaning', part));
      else text.append(part);
    }
    page.append(text);
  }
  return page;
}

/**
 * Builds the pages for one card. show() must be called once the pages are
 * visible, because the track has no width while hidden.
 */
export function buildPages(word, note) {
  const id = `pages-${nextId++}`;
  const element = el('div', 'pages');
  const tabs = el('div', 'page-tabs');
  tabs.setAttribute('role', 'tablist');
  const track = el('div', 'page-track');
  const sentence = sentencePage(word, note);
  const bodies = [sentence.page, mnemonicPage(word, note)];
  // Every card opens on Sentence, whichever page the previous card was left on.
  let current = 0;

  const tabButtons = PAGES.map(([name, label, key], index) => {
    const tab = el('button', 'page-tab', label);
    tab.type = 'button';
    tab.append(keyHint(key));
    tab.id = `${id}-tab-${name}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `${id}-${name}`);
    tab.addEventListener('click', () => show(index));
    const panel = el('section', 'page');
    panel.id = `${id}-${name}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.append(bodies[index]);
    track.append(panel);
    return tab;
  });
  tabs.append(...tabButtons);
  element.append(tabs, track);

  function mark(index) {
    current = index;
    tabButtons.forEach((tab, i) => tab.setAttribute('aria-selected', String(i === index)));
  }

  function show(index, { smooth = true } = {}) {
    const target = Math.min(PAGES.length - 1, Math.max(0, index));
    mark(target);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left: target * track.clientWidth, behavior: smooth && !reduce ? 'smooth' : 'auto' });
  }

  // A swipe settles on a snap point; the tabs follow whichever page is mostly in view.
  track.addEventListener('scroll', () => {
    const index = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    if (index !== current) mark(index);
  });
  mark(current);

  return {
    element,
    sentenceSpeaker: sentence.speaker,
    show: () => show(current, { smooth: false }),
    step: (delta) => show(current + delta),
  };
}
