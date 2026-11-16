// Naming and grouping for lessons and their word lists. No DOM.

/** The title a lesson's word list gives it, or "Lesson 3" when it gives none. Takes { lesson, title }. */
export function lessonTitle({ lesson, title }) {
  return title || `Lesson ${lesson}`;
}

/** "1 word", "56 words". */
export function wordCount(n) {
  return n === 1 ? '1 word' : `${n} words`;
}

/**
 * Groups a section's words by category, keeping the list's order: a new group
 * starts whenever the category changes. Returns [{ category, words }].
 */
export function groupByCategory(words) {
  const groups = [];
  for (const word of words) {
    const last = groups[groups.length - 1];
    if (last && last.category === word.category) last.words.push(word);
    else groups.push({ category: word.category, words: [word] });
  }
  return groups;
}
