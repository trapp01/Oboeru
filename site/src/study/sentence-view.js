// The example sentence of a card: furigana, the studied word marked, and a
// popup that gives a breakdown piece's meaning when it is pointed at, tapped
// or focused.

import { alignBreakdown } from '../furigana/breakdown.js';
import { parseSentence } from '../furigana/markup.js';
import { renderRuby } from '../furigana/ruby.js';
import { el } from './dom.js';

const GAP = 6;
const EDGE = 8;
const HAS_POPOVER = typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
let nextId = 0;

function popupContent(piece) {
  const nodes = [el('span', 'piece-en', piece.en)];
  if (piece.base) {
    const base = el('span', 'piece-base');
    const ja = el('span', 'piece-base-ja');
    ja.lang = 'ja';
    ja.append(renderRuby(parseSentence(piece.base)));
    base.append(ja, el('span', 'piece-base-en', piece.baseEn || ''));
    nodes.push(base);
  }
  return nodes;
}

// Centres the popup over the first line of the piece, above its furigana, and
// drops it below when there is no room above.
function place(popup, node) {
  const anchor = node.getClientRects()[0] ?? node.getBoundingClientRect();
  let top = anchor.top;
  for (const rt of node.querySelectorAll('rt')) {
    const rect = rt.getBoundingClientRect();
    if (rect.bottom <= anchor.bottom && rect.top >= anchor.top - anchor.height) top = Math.min(top, rect.top);
  }
  const { offsetWidth: width, offsetHeight: height } = popup;
  const left = anchor.left + anchor.width / 2 - width / 2;
  const above = top - height - GAP;
  popup.style.left = `${Math.max(EDGE, Math.min(left, window.innerWidth - width - EDGE))}px`;
  popup.style.top = `${above >= EDGE ? above : anchor.bottom + GAP}px`;
}

function attachPopup(line, pieces) {
  const popup = el('span', 'piece-popup');
  popup.id = `piece-popup-${nextId++}`;
  popup.lang = 'en';
  popup.hidden = true;
  popup.setAttribute('role', 'tooltip');
  // The top layer keeps the popup clear of the page track, which clips its overflow.
  if (HAS_POPOVER) popup.popover = 'manual';
  line.append(popup);

  let current = null;
  // A tapped or clicked piece stays open until the next tap; a hovered one closes when the pointer leaves.
  let pinned = false;
  let closer = null;

  function hide() {
    if (!current) return;
    current.classList.remove('is-open');
    current.removeAttribute('aria-describedby');
    current = null;
    pinned = false;
    closer.abort();
    if (HAS_POPOVER && popup.isConnected && popup.matches(':popover-open')) popup.hidePopover();
    popup.hidden = true;
  }

  function show(node, pin) {
    if (current !== node) {
      current?.classList.remove('is-open');
      current?.removeAttribute('aria-describedby');
      popup.replaceChildren(...popupContent(pieces.get(node)));
    }
    if (!current) {
      closer = new AbortController();
      const { signal } = closer;
      document.addEventListener('pointerdown', (event) => {
        const onPiece = event.target instanceof Element && event.target.closest('.piece');
        if (!onPiece || !line.contains(onPiece)) hide();
      }, { signal });
      // The popup is fixed to the viewport, so it would drift off its word when anything scrolls.
      document.addEventListener('scroll', hide, { signal, capture: true });
      window.addEventListener('resize', hide, { signal });
    }
    current = node;
    pinned = pin;
    node.classList.add('is-open');
    node.setAttribute('aria-describedby', popup.id);
    popup.hidden = false;
    if (HAS_POPOVER && !popup.matches(':popover-open')) popup.showPopover();
    place(popup, node);
  }

  const pieceOf = (event) => (event.target instanceof Element ? event.target.closest('.piece') : null);

  line.addEventListener('pointerover', (event) => {
    const node = pieceOf(event);
    if (event.pointerType === 'mouse' && node && !pinned) show(node, false);
  });
  line.addEventListener('pointerout', (event) => {
    if (event.pointerType !== 'mouse' || pinned || !current) return;
    if (!(event.relatedTarget instanceof Node) || !current.contains(event.relatedTarget)) hide();
  });
  line.addEventListener('click', (event) => {
    const node = pieceOf(event);
    if (!node) return;
    if (pinned && current === node) hide();
    else show(node, true);
  });
  line.addEventListener('focusin', (event) => {
    const node = pieceOf(event);
    if (node?.matches(':focus-visible')) show(node, false);
  });
  line.addEventListener('focusout', () => {
    if (!pinned) hide();
  });
}

/**
 * Builds the sentence line from sentence markup. With a breakdown, each piece
 * shows its meaning in a popup; without one, or with one that does not fit the
 * sentence, the line is drawn plain. Throws when the markup itself is invalid.
 */
export function buildSentenceLine(ja, breakdown) {
  const line = el('p', 'sentence');
  line.lang = 'ja';
  const segments = parseSentence(ja);
  let groups = null;
  if (Array.isArray(breakdown) && breakdown.length) {
    try {
      groups = alignBreakdown(segments, breakdown);
    } catch (error) {
      console.warn(`Breakdown ignored: ${error.message}`);
    }
  }
  if (!groups) {
    line.append(renderRuby(segments));
    return line;
  }
  const pieces = new Map();
  for (const group of groups) {
    if (!group.piece) {
      line.append(renderRuby(group.segments));
      continue;
    }
    const node = el('span', 'piece');
    node.tabIndex = 0;
    node.append(renderRuby(group.segments));
    pieces.set(node, group.piece);
    line.append(node);
  }
  attachPopup(line, pieces);
  return line;
}
