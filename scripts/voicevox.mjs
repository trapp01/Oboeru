// Client for a VOICEVOX engine running on this machine. The engine turns text
// into a query (how it will read and accent the text), then a query into audio.
// Its user dictionary overrides how it reads a given kanji word.

const ENGINE = 'http://127.0.0.1:50021';
// Style id of 四国めたん, ノーマル. GET /speakers on the engine lists the others.
const SPEAKER = 2;

/** The credit the voice's terms of use ask for wherever the clips are used. The lesson list shows the same text. */
export const VOICE_CREDIT = 'VOICEVOX:四国めたん';

async function post(path, body) {
  const response = await fetch(`${ENGINE}${path}`, {
    method: 'POST',
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`VOICEVOX ${path.split('?')[0]} failed: HTTP ${response.status} ${await response.text()}`);
  return response;
}

/** Throws with start instructions when no engine is answering. */
export async function requireEngine() {
  try {
    const response = await fetch(`${ENGINE}/version`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    throw new Error(`No VOICEVOX engine at ${ENGINE} (${error.message}). Start it with: <engine folder>/run --host 127.0.0.1 --port 50021`);
  }
}

/**
 * Makes the engine's user dictionary hold every word in `words`, each
 * { surface, pronunciation, accent, type }: a kanji word, its katakana reading,
 * the mora the pitch falls after (0 for none), and PROPER_NOUN or COMMON_NOUN.
 * The engine keeps the dictionary between runs, so this adds or corrects only what differs.
 */
export async function ensureDictionary(words) {
  const current = Object.entries(await (await fetch(`${ENGINE}/user_dict`)).json());
  for (const word of words) {
    const params = new URLSearchParams({
      surface: word.surface,
      pronunciation: word.pronunciation,
      accent_type: word.accent,
      word_type: word.type,
      // The highest priority, so the word beats the engine's own reading of the same kanji.
      priority: 10,
    });
    const [id, held] = current.find(([, entry]) => entry.surface === word.surface) ?? [];
    if (!id) await post(`/user_dict_word?${params}`);
    else if (held.pronunciation !== word.pronunciation || held.accent_type !== word.accent || held.priority !== 10) {
      const response = await fetch(`${ENGINE}/user_dict_word/${id}?${params}`, { method: 'PUT' });
      if (!response.ok) throw new Error(`VOICEVOX could not update "${word.surface}": HTTP ${response.status}`);
    }
  }
}

/** The engine's plan for reading `text` aloud. */
export async function audioQuery(text) {
  const response = await post(`/audio_query?speaker=${SPEAKER}&text=${encodeURIComponent(text)}`);
  return response.json();
}

/** The kana a query will be spoken as, without accent marks or pauses. */
export function spokenKana(query) {
  return query.accent_phrases.flatMap((phrase) => phrase.moras.map((mora) => mora.text)).join('');
}

/** WAV audio for a query, as a Buffer. */
export async function synthesize(query) {
  const response = await post(`/synthesis?speaker=${SPEAKER}`, query);
  return Buffer.from(await response.arrayBuffer());
}
