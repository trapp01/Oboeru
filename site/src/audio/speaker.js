// The small speaker button used wherever a clip can be played.

import { play } from './player.js';

const SVG = 'http://www.w3.org/2000/svg';

function speakerIcon() {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('speaker-icon');
  const shapes = [
    ['path', { d: 'M4 9.5h3.2L12 5.5v13l-4.8-4H4z', class: 'speaker-body' }],
    ['path', { d: 'M15.5 9a4 4 0 0 1 0 6' }],
    ['path', { d: 'M18 6.5a7.5 7.5 0 0 1 0 11' }],
  ];
  for (const [tag, attrs] of shapes) {
    const el = document.createElementNS(SVG, tag);
    for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
    svg.append(el);
  }
  return svg;
}

/**
 * A button that plays `source()` → { url, text } when pressed, and shakes once
 * when nothing could be played. Pressing it is the only way audio starts.
 */
export function speakerButton({ label, source }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'speaker';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.append(speakerIcon());
  button.addEventListener('click', async (event) => {
    event.stopPropagation();
    if (await play(source())) return;
    button.classList.remove('is-failed');
    void button.offsetWidth; // restarts the animation when it is already showing
    button.classList.add('is-failed');
  });
  button.addEventListener('animationend', () => button.classList.remove('is-failed'));
  return button;
}
