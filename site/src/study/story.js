// Mnemonic story markup: *keyword* is the English sound-alike and **meaning**
// is the word's meaning. Parsing to segments lets the screen draw them with
// textContent instead of handing note text to innerHTML.

// A keyword may not start or end with a space, so "5 * 3 *" stays plain text.
const TOKEN = /\*\*([^*]+)\*\*|\*([^*\s](?:[^*]*[^*\s])?)\*(?!\*)/g;

/**
 * Splits a story into segments { text, kind } where kind is 'plain',
 * 'keyword' or 'meaning'. An asterisk with no partner stays as plain text.
 */
export function parseStory(story) {
  const segments = [];
  const push = (text, kind) => {
    if (!text) return;
    const last = segments[segments.length - 1];
    if (last && last.kind === 'plain' && kind === 'plain') last.text += text;
    else segments.push({ text, kind });
  };
  let at = 0;
  for (const match of story.matchAll(TOKEN)) {
    push(story.slice(at, match.index), 'plain');
    if (match[1]) push(match[1], 'meaning');
    else push(match[2], 'keyword');
    at = match.index + match[0].length;
  }
  push(story.slice(at), 'plain');
  return segments;
}
