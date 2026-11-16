// Plays one clip at a time. A clip that is missing or fails to load falls back
// to the browser's Japanese voice; play() resolves false only when neither works.

const pad = (n) => String(n).padStart(2, '0');

// Clips that failed once are skipped for the rest of the page's life, so later
// taps reach speechSynthesis while still inside the tap's user gesture.
const missingClips = new Set();
let generation = 0;
let audio = null;
let utterance = null;
let speechUnlocked = false;

/** "audio/lesson-03/l03-012.w.mp3"; kind is 'w' for a word, 's' for its sentence, 'a' for a practice item's answer. */
export function clipUrl(lesson, id, kind) {
  return `audio/lesson-${pad(lesson)}/${id}.${kind}.mp3`;
}

/** Stops whatever is playing, clip or speech. */
export function stop() {
  generation++;
  if (audio) {
    audio.pause();
    audio = null;
  }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

/**
 * Plays the clip at `url`, or speaks `text` when the clip cannot play.
 * Resolves true once something is playing (or this call was cut off by a newer one).
 */
export async function play({ url, text }) {
  stop();
  const mine = generation;
  unlockSpeech();
  if (url && !missingClips.has(url)) {
    if (await playClip(url)) return true;
    if (mine !== generation) return true;
    missingClips.add(url);
  }
  return speak(text, mine);
}

function playClip(url) {
  const element = new Audio(url);
  audio = element;
  return new Promise((resolve) => {
    element.addEventListener('playing', () => resolve(true), { once: true });
    element.addEventListener('error', () => resolve(false), { once: true });
    element.play().catch(() => resolve(false));
  });
}

function speak(text, mine) {
  if (!text || !('speechSynthesis' in window)) return Promise.resolve(false);
  const voices = speechSynthesis.getVoices();
  const japanese = voices.find((v) => /^ja\b/i.test(v.lang.replace('_', '-')));
  // An empty voice list means the list is still loading; ja-JP may still work.
  if (voices.length && !japanese) return Promise.resolve(false);

  // The module holds the utterance because some browsers drop events of one that was garbage collected.
  utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  if (japanese) utterance.voice = japanese;
  return new Promise((resolve) => {
    utterance.onstart = () => resolve(true);
    utterance.onend = () => resolve(true);
    utterance.onerror = (event) => resolve(mine !== generation || event.error === 'interrupted' || event.error === 'canceled');
    speechSynthesis.speak(utterance);
  });
}

// iOS only lets speech start from a user gesture until the first utterance has
// played; a silent one during the tap allows the fallback after an async clip failure.
function unlockSpeech() {
  if (speechUnlocked || !('speechSynthesis' in window)) return;
  speechUnlocked = true;
  const silent = new SpeechSynthesisUtterance(' ');
  silent.volume = 0;
  speechSynthesis.speak(silent);
}
