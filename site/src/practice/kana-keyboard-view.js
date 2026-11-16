// The on-screen kana keyboard of a practice card: the button that opens and
// closes it, and the panel of keys under the answer row. Keys never take focus,
// so the box keeps its caret; open or closed is remembered on the device.

import { el } from '../study/dom.js';
import { applyKey, KEY_COLUMNS, KEY_ROWS, keyLabel, keyName } from './kana-keyboard.js';
import { finishKana } from './kana.js';

const SVG = 'http://www.w3.org/2000/svg';
const OPEN_KEY = 'oboeru.practice.keyboard';
const LABEL = 'Kana keyboard';
let panels = 0;

function savedOpen() {
  try {
    return localStorage.getItem(OPEN_KEY) === 'open';
  } catch {
    return false;
  }
}

function saveOpen(open) {
  try {
    localStorage.setItem(OPEN_KEY, open ? 'open' : 'closed');
  } catch {
    // Private browsing can refuse storage; the choice then lasts for this visit only.
  }
}

function keyboardIcon() {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('speaker-icon');
  for (const d of ['M3.5 6.5h17v11h-17z', 'M7 10h.01M10.5 10h.01M14 10h.01M17.5 10h.01M7 13.5h.01M17.5 13.5h.01M10 14h4']) {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

// A press keeps focus where it is, so the box keeps its caret and a phone's own keyboard stays down.
const keepFocus = (node) => {
  for (const type of ['pointerdown', 'mousedown']) node.addEventListener(type, (event) => event.preventDefault());
};

/**
 * The keyboard for `box`; `onInput()` runs after a key changes the text.
 * Returns the toggle button, the panel, and disable() for after the check.
 */
export function kanaKeyboard(box, onInput) {
  const toggle = el('button', 'speaker keyboard-button');
  toggle.type = 'button';
  toggle.title = LABEL;
  toggle.setAttribute('aria-label', LABEL);
  toggle.append(keyboardIcon());
  keepFocus(toggle);

  const panel = el('div', 'kana-keyboard');
  panel.id = `kana-keyboard-${++panels}`;
  panel.lang = 'ja';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', LABEL);
  toggle.setAttribute('aria-controls', panel.id);
  const keys = [];
  for (const row of KEY_ROWS) {
    for (const key of row) {
      if (!key) {
        panel.append(el('span', 'kana-gap'));
        continue;
      }
      const node = el('button', `kana-key${key.length > 1 ? ` kana-key-${key}` : ''}`, keyLabel(key));
      node.type = 'button';
      node.tabIndex = -1;
      const name = keyName(key);
      if (name) node.setAttribute('aria-label', name);
      if (KEY_COLUMNS[key]) node.style.gridColumn = `span ${KEY_COLUMNS[key]}`;
      keepFocus(node);
      node.addEventListener('click', () => press(key));
      keys.push(node);
      panel.append(node);
    }
  }

  function press(key) {
    if (box.readOnly) return;
    const typedStart = box.selectionStart ?? box.value.length;
    const typedEnd = box.selectionEnd ?? typedStart;
    // A romaji n still waiting before the caret becomes ん first, as it would on the next letter.
    const before = finishKana(box.value.slice(0, typedStart));
    const start = before.length;
    const end = start + (typedEnd - typedStart);
    const change = applyKey(key, before + box.value.slice(typedStart), start, end);
    if (!change) return;
    box.value = change.text;
    box.setSelectionRange(change.caret, change.caret);
    if (document.activeElement !== box) box.focus({ preventScroll: true });
    onInput();
  }

  function show(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.classList.toggle('is-open', open);
    // inputmode none keeps a phone's own keyboard down while the panel is open.
    if (open) box.inputMode = 'none';
    else box.removeAttribute('inputmode');
  }

  toggle.addEventListener('click', () => {
    const open = panel.hidden;
    show(open);
    saveOpen(open);
    if (box.readOnly) return;
    // A phone reads inputmode only when the box gains focus, so the box is focused again.
    const { selectionStart, selectionEnd } = box;
    box.blur();
    box.focus({ preventScroll: true });
    box.setSelectionRange(selectionStart, selectionEnd);
  });

  show(savedOpen());
  return {
    toggle,
    panel,
    disable() {
      for (const node of keys) node.disabled = true;
    },
  };
}
