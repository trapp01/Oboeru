// Generates the clips under site/audio/ with a local VOICEVOX engine.
// Usage: node scripts/generate-audio.mjs [lesson…] [--force]
// A lesson's clips are its words, its notes' sentences and its practice items'
// model answers. A clip is rebuilt when its source text or the voice differs from
// what the lesson's manifest.json records, so editing a file and re-running is enough.
// The engine can misread kanji (日本 as ニッポン). Each clip's reading is checked
// against the kana the data gives, and a misread kanji run is sent as kana.
// Kana can lose a word's accent or phrasing, so a word that is always misread
// goes in voicevox-dict.json instead; run with --force after changing that file.

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseSentence } from '../site/src/furigana/markup.js';
import { shownAnswer } from '../site/src/practice/grade.js';
import { sameReading, soundKey, toKatakana } from './reading.mjs';
import { VOICE_CREDIT, audioQuery, ensureDictionary, requireEngine, spokenKana, synthesize } from './voicevox.mjs';

const SITE = fileURLToPath(new URL('../site/', import.meta.url));
const PARALLEL = 3;
// A listed form with these characters cannot be read aloud as written; the note's `say` replaces it.
const UNSPEAKABLE = /[()〜／/+A-Za-zＡ-Ｚ0-9０-９]/;
// A sample answer can hold a placeholder for a name the learner fills in.
const PLACEHOLDER = /[○×]/;

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const pad = (n) => String(n).padStart(2, '0');

/**
 * The clips a lesson should have. Each is { file, source, segments }: `source`
 * is what the manifest records, `segments` are { text, reading } runs where
 * `reading` is '' for text that is spoken as written.
 */
function clipsFor(n) {
  const words = readJson(`${SITE}data/words/lesson-${pad(n)}.json`).sections.flatMap((s) => s.words);
  const notesPath = `${SITE}data/notes/lesson-${pad(n)}.json`;
  const notes = existsSync(notesPath) ? readJson(notesPath) : {};
  const clips = [];
  for (const word of words) {
    const note = notes[word.id];
    const file = `${word.id}.w.mp3`;
    if (note?.say) {
      clips.push({ file, source: note.say, segments: [{ text: note.say, reading: '' }] });
    } else if (UNSPEAKABLE.test(word.kana)) {
      console.warn(`  skipped ${word.id} ${word.kana}: needs "say" in its note`);
    } else if (word.kanji && !UNSPEAKABLE.test(word.kanji)) {
      // The kanji form gets the engine's dictionary accent; the kana is the reading to hold it to.
      clips.push({ file, source: `${word.kanji}[${word.kana}]`, segments: [{ text: word.kanji, reading: word.kana }] });
    } else {
      clips.push({ file, source: word.kana, segments: [{ text: word.kana, reading: '' }] });
    }
    const ja = note?.sentence?.ja;
    if (ja) clips.push({ file: `${word.id}.s.mp3`, source: ja, segments: parseSentence(ja) });
  }
  const practicePath = `${SITE}data/practice/lesson-${pad(n)}.json`;
  const items = existsSync(practicePath) ? readJson(practicePath).exercises.flatMap((e) => e.items) : [];
  for (const item of items) {
    const model = shownAnswer(item.answers[0]);
    if (PLACEHOLDER.test(model)) console.warn(`  skipped ${item.id}: its answer has a placeholder`);
    else clips.push({ file: `${item.id}.a.mp3`, source: model, segments: parseSentence(model) });
  }
  return clips;
}

/** The text to send: every segment as written, except those in `asKana`, which go as their reading. */
function textWith(segments, asKana, kana = (reading) => reading) {
  return segments.map((s, i) => (asKana.has(i) ? kana(s.reading) : s.text)).join('');
}

/**
 * Finds a text the engine reads as the segments' readings. Returns
 * { query, text, fixed, verified }: `fixed` lists the kanji runs sent as kana,
 * and `verified` is false when no variant gave the right reading.
 */
async function planClip(segments) {
  const written = textWith(segments, new Set());
  const expected = segments.map((s) => s.reading || s.text).join('');
  const first = await audioQuery(written);
  if (sameReading(expected, spokenKana(first))) return { query: first, text: written, fixed: [], verified: true };

  const heard = soundKey(spokenKana(first));
  const changed = new Set();
  let fallback = null;
  /** Tries the runs in `asKana` as hiragana, then katakana. Returns a plan only when it also keeps the phrasing. */
  const attempt = async (asKana) => {
    for (const kana of [(reading) => reading, toKatakana]) {
      const text = textWith(segments, asKana, kana);
      const query = await audioQuery(text);
      const spoken = spokenKana(query);
      if (asKana.size === 1 && soundKey(spoken) !== heard) changed.add([...asKana][0]);
      if (!sameReading(expected, spoken)) continue;
      const fixed = [...asKana].map((i) => `${segments[i].text}→${segments[i].reading}`);
      const plan = { query, text, fixed, verified: true };
      // The same number of accent phrases as the kanji text means the kana did not split or join words.
      if (query.accent_phrases.length === first.accent_phrases.length) return plan;
      fallback ??= plan;
    }
    return null;
  };

  // One misread run is the usual case. Failing that, every run whose kana changes what the engine says, then every run.
  const runs = segments.flatMap((s, i) => (s.reading ? [i] : []));
  for (const i of runs) {
    const plan = await attempt(new Set([i]));
    if (plan) return plan;
  }
  for (const asKana of [changed, new Set(runs)]) {
    const plan = asKana.size > 1 && (await attempt(asKana));
    if (plan) return plan;
  }
  return fallback ?? { query: first, text: written, fixed: [], verified: false };
}

/** Encodes WAV bytes to a mono mp3 file with ffmpeg. */
function writeMp3(wav, outFile) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-i', 'pipe:0', '-ac', '1', '-b:a', '48k', outFile], {
      stdio: ['pipe', 'ignore', 'inherit'],
    });
    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code} writing ${outFile}`))));
    ffmpeg.stdin.end(wav);
  });
}

async function generateLesson(n, force) {
  const dir = `${SITE}audio/lesson-${pad(n)}/`;
  mkdirSync(dir, { recursive: true });
  const manifestPath = `${dir}manifest.json`;
  const saved = existsSync(manifestPath) ? readJson(manifestPath) : {};
  // Clips made with another voice are all stale.
  const clipsMade = saved.voice === VOICE_CREDIT ? saved.clips : {};
  const clips = clipsFor(n);
  const stale = clips.filter((c) => force || clipsMade[c.file] !== c.source || !existsSync(dir + c.file));

  let next = 0;
  const worker = async () => {
    while (next < stale.length) {
      const clip = stale[next++];
      const plan = await planClip(clip.segments);
      await writeMp3(await synthesize(plan.query), dir + clip.file);
      clipsMade[clip.file] = clip.source;
      if (!plan.verified) console.warn(`  CHECK ${clip.file}: reads "${plan.text}" as ${plan.query.kana}`);
      else if (plan.fixed.length) console.log(`  fixed ${clip.file}: ${plan.fixed.join(', ')} | ${plan.text} | ${plan.query.kana}`);
    }
  };
  try {
    await Promise.all(Array.from({ length: PARALLEL }, worker));
  } finally {
    // Written even after a failure so finished clips are not rebuilt on the next run.
    writeFileSync(manifestPath, JSON.stringify({ voice: VOICE_CREDIT, clips: clipsMade }, null, 1) + '\n');
  }
  console.log(`Lesson ${n}: ${clips.length} clips, ${stale.length} generated`);
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const requested = args.filter((a) => a !== '--force').map(Number);
const lessons = requested.length ? requested : readJson(`${SITE}data/lessons.json`).map((l) => l.lesson);

await requireEngine();
await ensureDictionary(readJson(new URL('./voicevox-dict.json', import.meta.url)));
for (const n of lessons) await generateLesson(n, force);
