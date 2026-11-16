// The card direction control: Japanese first or English first. One setting,
// remembered in localStorage, shown on the lesson list and on a lesson.

import { el } from './dom.js';

const DIRECTION_KEY = 'oboeru.direction';
const DIRECTIONS = [
  ['ja', 'Japanese first'],
  ['en', 'English first'],
];

function savedDirection() {
  try {
    return localStorage.getItem(DIRECTION_KEY) === 'en' ? 'en' : 'ja';
  } catch {
    return 'ja';
  }
}

function saveDirection(value) {
  try {
    localStorage.setItem(DIRECTION_KEY, value);
  } catch {
    // Private browsing can refuse storage; the choice then lasts for this visit only.
  }
}

/** Builds the control. Returns its element and `value()`, the direction now chosen. */
export function directionControl() {
  const group = el('fieldset', 'segmented');
  group.append(el('legend', 'visually-hidden', 'Card direction'));
  let current = savedDirection();
  for (const [value, label] of DIRECTIONS) {
    const option = el('label', 'segmented-option');
    const input = el('input');
    input.type = 'radio';
    input.name = 'direction';
    input.value = value;
    input.checked = value === current;
    input.addEventListener('change', () => {
      current = value;
      saveDirection(value);
    });
    option.append(input, el('span', '', label));
    group.append(option);
  }
  return { element: group, value: () => current };
}
