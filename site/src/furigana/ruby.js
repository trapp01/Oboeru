// Draws { text, reading, target } segments (from markup.js or align.js) as
// <ruby> DOM. Consecutive target segments share one <mark class="target">.

function segmentNode({ text, reading }) {
  if (!reading) return document.createTextNode(text);
  const ruby = document.createElement('ruby');
  const rt = document.createElement('rt');
  rt.textContent = reading;
  ruby.append(text, rt);
  return ruby;
}

/** Returns a DocumentFragment ready to append. */
export function renderRuby(segments) {
  const fragment = document.createDocumentFragment();
  let mark = null;
  for (const segment of segments) {
    if (!segment.target) {
      mark = null;
      fragment.append(segmentNode(segment));
      continue;
    }
    if (!mark) {
      mark = document.createElement('mark');
      mark.className = 'target';
      fragment.append(mark);
    }
    mark.append(segmentNode(segment));
  }
  return fragment;
}
