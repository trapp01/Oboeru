# Design

What the app does, screen by screen. [glossary.md](glossary.md) defines the nouns used here.

## Shape

A static single-page app. Its screens are switched by the URL hash so the browser's back button works:

| Hash | Screen |
| --- | --- |
| `#/` | Lesson list |
| `#/lesson/3` | The words of lesson 3 |
| `#/study/3` | A session over the deck chosen from lesson 3 |
| `#/study/mix` | A session over a mix drawn from several lessons |
| `#/practice` | The Practice tab of the lesson list |
| `#/practice/run` | A session over practice items |

Data is fetched on demand: `data/lessons.json` (the lesson list) for the list, then `data/words/lesson-NN.json` and `data/notes/lesson-NN.json` when a lesson is opened. A lesson whose notes file does not exist yet still works; its cards show "No sentence yet" and "No mnemonic yet" on the pages.

It is used on a phone held in one hand and on a laptop with a keyboard. Both are first-class.

## Lesson list

- One row per lesson: its number, its title, the word count, and the section names when there is more than one.
- A lesson goes by the title its word list gives it ("Food and drink"), or by "Lesson 3" when the list gives none.
- Tapping a lesson opens it.
- The card direction control sits above the list: **Japanese first** (default) or **English first**. It is the same setting the lesson screen shows.
- Each row has a checkbox. The checked lessons are remembered in localStorage and are the pool for a **mix**.

### Mix

A mix is a deck drawn from all the words of the checked lessons, for a short daily session over old and new words together.

- While at least one lesson is checked, a dock is fixed at the bottom: a batch size control (10, 20, 30, All; 20 at first, remembered), a status line "3 lessons · 264 of 283 left in this pass", and the button "Study 20 words".
- A word answered "Got it" without an "Again" in a mixed session is **cleared**. A batch is drawn at random from the words not yet cleared, so every word in the pool comes up before any repeats. A word marked "Again" is **missed**: it stays uncleared, and every later batch deals missed words first, before the rest, until the word is answered "Got it" without an "Again" in a later session. Closing a session part way through keeps what was missed.
- When fewer uncleared words are left than the batch size, the **pass** restarts: the leftovers go into the batch, cleared words fill the rest, and the pool's cleared record is emptied. Missed words stay missed. "All" deals the whole pool.
- Cleared words are stored per lesson, so checking or unchecking a lesson keeps the progress of the others. Sessions started from a lesson screen and reruns of missed words do not clear anything.

### Sync

The ticked lessons and the cleared and missed words (the **mix state**) follow the user between devices. Batch size and card direction do not.

- Each device keeps the mix state in localStorage and works from that copy, so the app is usable offline and on a host without the endpoint.
- The lesson list fetches the shared copy from `/api/progress` when it opens and when the tab becomes visible again, merges it with the device's copy, and redraws if anything changed. A change on the device is sent about 1.5 seconds later, or at once when the page is hidden.
- Copies are merged, never overwritten. Each lesson has a pass number that goes up when its pass restarts: the later pass wins, and two copies of the same pass pool their cleared words. Missed words are pooled from both copies, less any the winning pass has cleared. The ticked lessons come from the device that changed them last.
- A line under the list says "Progress is synced across your devices." or, when the shared copy cannot be reached, "Progress is saved on this device only."
- There is one shared copy and no accounts: a deployment is one person's, and its login is whatever sits in front of the site (the README names Cloudflare Access).
- The mixed deck goes to the study screen in memory; reloading `#/study/mix` goes to the lesson list.

## Lesson screen

- Header: back to the list, the lesson's title, word count.
- The words, grouped by section and then by category, in the word list's order. Each row shows the kana, the kanji when there is one, and the meaning. Each row has a checkbox; all are checked on arrival. Each section header has a checkbox that checks or clears its words.
- Each row has a small speaker button that plays the word's clip.
- A control for the card direction: **Japanese first** (default) or **English first**. The choice is remembered in localStorage.
- A primary button fixed at the bottom: "Study 56 words". It carries the count of checked words and is disabled at zero.

The checked words become the deck. The deck is handed to the study screen in memory; reloading `#/study/3` with no deck in memory goes to `#/lesson/3`.

## Study screen

A session shuffles the deck and shows one card at a time.

### Front

- Top bar: close (back to the lesson, or to the lesson list for a mix), and progress as "12 / 56" with a thin bar. Progress counts cards finished, so it only moves forward.
- **Japanese first:** the word, large. A word with kanji is drawn as kanji with its kana above it as furigana; a word without kanji is drawn in kana. A speaker button plays the word clip.
- **English first:** the meaning, large. No Japanese and no speaker until the reveal, because either would give the answer away.
- A card never shows the word's category or lesson; either would hint at the answer.
- One action: "Show answer". Tapping the card does the same.

### Answer

The reveal keeps the front where it is and adds to it, so the eye does not have to find the word again.

- The other side appears next to the front: the meaning under the Japanese word, or the Japanese word (with speaker) above the meaning.
- Below that, the **pages**: Sentence and Mnemonic.
  - A two-tab control names them and shows which is open. Tapping a tab switches. On touch screens the page area also swipes sideways and snaps.
  - Every card opens on Sentence. Switching to Mnemonic lasts for that card only.
  - **Sentence page:** the sentence drawn with furigana, the studied word highlighted, a speaker button that plays the sentence clip, and the English translation underneath in quieter type.
  - Each word and particle of the sentence (a **piece** of its breakdown) shows its meaning in a small popup above it: on hover with a mouse, on tap on a touch screen, and on keyboard focus. A tap or click keeps the popup open until the next tap anywhere else or on the same piece. A conjugated verb or adjective also shows its dictionary form with furigana and that form's meaning. Punctuation has no popup. A sentence with no breakdown is drawn the same way without popups.
  - **Mnemonic page:** a "Sounds like" line showing the word's kana and the `soundsLike` text, then the story. In the story, `*keyword*` and `**meaning**` are drawn in two different highlight styles and the asterisks are not shown.
- Two actions replace "Show answer": **Again** and **Got it**.
  - Got it: the card is finished.
  - Again: the card goes back into the queue, three cards later, or at the end when fewer than three remain. It is remembered as missed.

### End of session

- "Done", the number of words studied, and how many needed another look.
- The missed words, listed with kana, kanji and meaning.
- Actions: "Study the 9 again" (a new session over the missed words; hidden when none were missed), "Back to Food and drink", or "Back to lesson 3" for a lesson with no title (not shown after a mix), "All lessons".

### Keyboard

| Key | Does |
| --- | --- |
| Space or Enter | Show answer |
| ← → | Switch page (after the reveal) |
| 1 | Again |
| 2 | Got it |
| P | Play the word |
| S | Play the sentence (after the reveal) |
| Esc | Close the session |

The study screen shows these keys as small hints on the buttons and the page tabs when the device has a fine pointer.

## Practice

A lesson's exercises, one item at a time, typed or spoken and checked against the answers its practice file accepts. [glossary.md](glossary.md) defines exercise, item, cue, answer and sample; `docs/practice-guide.md` says how the files are written.

### Tabs

The lesson list has two tabs under the masthead: **Vocabulary** (`#/`) and **Practice** (`#/practice`). They are links, so Back moves between them.

### Practice list

- One row per lesson in `data/practice/index.json`: the lesson's title and "31 items". The whole row is the label of its checkbox; a row does not open anything.
- While at least one lesson is ticked, the same dock as the mix: batch size (10, 20, 30, All; 20 at first), a status line "2 lessons · 140 of 310 left in this pass", and the button "Practice 20 items".
- Passes work as they do for a mix: an item answered right without a miss is cleared, an item sent back with Again is missed and dealt first in later batches, a batch is drawn from the items not yet cleared, and the pass restarts when too few are left.
- The ticked lessons, the cleared items and the batch size are separate from the vocabulary mix. The ticked lessons and cleared items sync through the same `/api/progress`, as the `practice` part of the mix state, and merge by the same rules. The same sync line sits under the list.
- When there is no index, the tab says "No practice files yet." and nothing else.
- The deck goes to the session in memory; reloading `#/practice/run` goes to `#/practice`.

### Practice session

The top bar, the progress count and the end of a session are the study screen's. A card shows, top to bottom:

- The source in quiet type: "Food and drink · Exercise 2", or "Lesson 3 · Textbook II-A (b) · p. 95" for an exercise that names its book and page.
- The instruction. The exercise's worked example is not shown.
- The context when the item has one, then the cue, large. Japanese is drawn with furigana.
- The answer box and, beside it, the kana keyboard button and the microphone button. The kana keyboard opens under them.
- After the check, the result.

**Answer box.** One line. Romaji turns into hiragana as it is typed (`tabemasu` → たべます), so no keyboard switching is needed; text from a Japanese keyboard, kanji included, goes in unchanged. The box is focused when the card appears and is read-only after the check.

**Microphone.** Shown when the browser can record or has speech recognition. A tap opens the microphone, and the button pulses from the moment it is recording; a second tap, or 15 seconds, stops it. The button then reads "Transcribing…" while the recording goes to `/api/transcribe`, which runs Workers AI's whisper model in Japanese and answers with the text, in about a second. The page sends the recording as 16 kHz mono WAV, whatever format the browser recorded in. The item's answers are not sent, so the model cannot hear what it expects. The text replaces what is in the box and stays editable; nothing is checked until the user checks it. No speech, an empty transcript, a refused microphone, a recording the browser cannot decode or a failed request: the button shakes once, stays usable, and a line under the answer box says why ("Microphone blocked. Allow it for this site, or for this browser in Settings.", "Didn’t catch anything.", "Couldn’t transcribe (server said 502)."). The next tap, a keystroke or the check clears the line. The microphone is released as soon as recording ends or the card goes away. It never starts on its own, and once the card is checked or its sample is shown, the button is disabled.

On a host without `/api/transcribe` (a static host, or `npm run serve`, which has no Workers AI), the first try shakes and says "This site can’t transcribe. Tap again to use the browser’s own recognition.", and from then on, for the rest of the page's life, the button listens through the browser's own speech recognition when the browser has one. When the recogniser offers several hearings and one of them is an accepted answer, that one goes in the box. With neither, a tap shakes the button and says "This site can’t transcribe."

**Kana keyboard.** The keyboard button beside the box opens and closes a panel of keys under the answer row. It is closed at first; open or closed is remembered on the device. The 46 kana fill ten columns, one per row of the gojūon table read top to bottom (あいうえお, かきくけこ, … わ を ん, with the gaps of the や and わ rows). Under them is a row of ぁ ぃ ぅ ぇ ぉ っ ゃ ゅ ょ ー, then ゛ and ゜ on the left and ⌫ on the right.

- A kana key goes in at the caret and replaces any selection. ー puts in the long vowel mark. ⌫ deletes the selection or the character before the caret.
- ゛ and ゜ change the character before the caret: か to が and back, は to ば or ぱ, う to ゔ. Where they cannot apply, nothing happens.
- Keys never take focus, so the box keeps its caret and the Check label follows the text as it does for typing. Romaji typed on a keyboard still converts. While the panel is open, a phone's own keyboard stays down.
- After the check the keys are disabled with the box.
- A key's spoken name is its kana, or "small a" to "small o", "small tsu", "small ya", "small yu", "small yo", "long vowel mark", "dakuten", "handakuten" and "delete".

**A typed exercise** has one action, "Check", which reads "Show answer" while the box is empty (nothing in it but spaces or punctuation).

- The text matches an accepted answer: "Correct". The item is finished. The action becomes "Next".
- It does not, or the box was empty: "Not in the answer key" (nothing, for an empty box), with what was typed shown above the model answer. Two actions: **Again**, which sends the item back three cards later as a miss, and **I was right**, which finishes it as if it had matched. An empty box offers only Again.

**An open exercise** has no check. The action is "Show a sample"; then **Again** and **Got it**, as on a vocabulary card. Enter does not pick between them.

**The result** shows the model answer with furigana and a speaker, and its English. The pieces of the answer show their meanings in popups, exactly as a vocabulary sentence does. Other accepted answers are listed under "Also accepted". A sample is headed "Sample answer", and so is the list of any further samples. When the cue was Japanese, its English appears under the cue after the check.

**Clearing.** An item finished without a miss is cleared for the pass. A rerun of missed items clears nothing.

**End of session.** The study screen's end view, counting items: "12 items studied", "Practise the 4 again", and "All lessons", which goes back to the Practice tab. The missed items are listed as cue and model answer.

### Checking an answer

- Both sides are compared without spaces or punctuation, with katakana folded to hiragana and full-width characters to their plain forms.
- Each kanji run of an answer matches as the kanji or as its reading, run by run: 食べます, たべます.
- Kanji numerals in a run also match as digits: 五時 as 5時, 四百五十円 as 450円.
- A part in parentheses may be left out.
- A trailing `n` still waiting to become ん counts as ん.
- Other spellings of the same words (家 for うち, 下さい for ください) do not match, nor does a digit followed by kana (5じ for 五時), nor a particle typed as it sounds (`wa` for は). That is what "I was right" is for.

### Romaji

Hepburn and the common variants (`shi`/`si`, `chi`/`ti`, `tsu`/`tu`, `fu`/`hu`, `ji`/`zi`, `sha`/`sya`, `cha`/`tya`, `ja`/`jya`), a doubled consonant for っ, `nn`, `n'` or `n` before a consonant for ん (`nn` turns into ん as soon as it is typed, so みんな is `minnna`), `-` for ー, and `x` or `l` before a kana for its small form. Only ASCII letters are converted, capitals included, because phones capitalise the first letter. Nothing is converted while a Japanese keyboard is composing.

### Keyboard

| Key | Does |
| --- | --- |
| Enter | Check, Show answer, Show a sample; after the check, Next, or Again when the answer did not match |
| 1 | Again (after the check) |
| 2 | I was right, Got it (after the check) |
| S | Play the answer (after the check) |
| Esc | Close the session |

### Answer audio

Each item has a clip of its model answer, `audio/lesson-03/l03-p031.a.mp3`, made with the other clips. When the clip is missing, the speaker uses the browser's Japanese voice on the answer's reading, as a vocabulary card does. An answer with a ○○ placeholder for a name has no clip.

## Audio

- Clips are files: `audio/lesson-03/l03-012.w.mp3` (the word), `audio/lesson-03/l03-012.s.mp3` (the sentence) and `audio/lesson-03/l03-p031.a.mp3` (a practice item's model answer).
- Only one clip plays at a time; starting one stops the other.
- When a clip file is missing or fails to load, the app speaks the text with the browser's Japanese voice (`speechSynthesis`, `ja-JP`) so lessons without generated clips still talk. The text spoken for a word is the note's `say`, else the kana. The text spoken for a sentence is its plain text with readings and braces removed.
- When neither works, the speaker button shakes once and stays usable. Nothing is thrown at the user.
- Audio never plays on its own. Phones get used in quiet places.

## Furigana

- Sentences use the markup in `site/src/furigana/markup.js`; the screen draws each segment with `<ruby>`.
- A word on a card front or in the lesson list has only a kana string and a kanji string. `site/src/furigana/` aligns them so kana that appears in both is not repeated above itself: 食べる with たべる gives 食 with た above it, then べる. お酒 with おさけ gives お, then 酒 with さけ. シャワーを浴びる with シャワーをあびる gives the reading only over 浴. When the two cannot be aligned (the listed form has parentheses or slashes, say), the kanji is drawn with the whole kana above it.

## Look

A quiet study desk, not a game.

- Warm paper background, dark indigo ink, one accent colour (vermilion, the red of a name seal) for the primary action and the studied word. A second, cooler highlight for the mnemonic keyword.
- Japanese text in a Mincho (serif) face from the system stack for the large word and the sentence: `"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif`. Interface text in the system sans. No web fonts; Japanese font files are megabytes.
- The large word is very large. Furigana is big enough to read at arm's length on a phone.
- Light and dark, following `prefers-color-scheme`.
- One column, 16px gutters, comfortable at 360px wide. On wide screens the card sits in a centred column of about 640px; it does not stretch.
- The Again and Got it buttons sit at the bottom edge within thumb reach, respect the safe-area inset, and are at least 48px tall.
- Motion is small and fast: a short fade or slide on reveal and on card change. `prefers-reduced-motion` turns it off.

## Not in the prototype

Spaced repetition and scheduling, accounts, offline install, editing notes in the app, images, listening exercises, picking single exercises inside a lesson, a model that grades free answers.
