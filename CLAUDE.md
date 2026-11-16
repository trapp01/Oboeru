# Oboeru

Static flashcard site for Japanese vocabulary. The README says what it is and how to run and deploy it. `docs/glossary.md` defines the nouns; use its words. `docs/design.md` says what each screen does. `docs/notes-guide.md` says how sentences and mnemonics are written. `docs/practice-guide.md` says how practice files are written.

## Rules

- **No build step, no dependencies.** Browser code is plain ES modules under `site/src/`. Scripts and `worker/` use only Node built-ins and web APIs. A bundler or framework would make "copy `site/` to a server" stop being a working deploy; the app must keep working on a host with no `/api/progress`.
- **Nothing copied from a textbook goes into this repository.** Not a chapter's word list, a sentence, an exercise, an answer key, a character or audio. The starter deck in `site/data/` is written for this project, which is what lets the repository be public. A copy that holds a book's content is someone's private copy. See "Content and licences" in the README.
- **Each kind of data has a validator, and ids do not change.** `validate-words.mjs` checks the word lists and writes the lesson list, `site/data/lessons.json`, which is never edited by hand. `validate-notes.mjs` checks notes against their words. `validate-practice.mjs` checks practice files and writes `site/data/practice/index.json`. Notes, clips and progress are keyed by word and item id, so an id in use is never renumbered.
- **Logic that can be tested without a browser lives in a module with no DOM access** and has a `*.test.js` beside it. Screens import those modules; they do not re-implement them.
- **Import order:** `furigana/` and `audio/` import nothing from other folders. `lessons/` and `study/` may import from them. `lessons/` may import from `study/`, because its screens build the deck a session runs; `study/` imports nothing from `lessons/`. `practice/` may import from all four, and only `app.js` imports from `practice/`. `app.js` imports the screens. `worker/` imports only DOM-free modules from `site/src/`, so the device and the server merge mix state with the same code. Prose until a lint rule exists; a violation is a review finding.
- **Ask before a source file passes 300 lines.** Data files are exempt. A screen that long is doing a second job that belongs in its own module.

## Commands

    npm run serve                      # serve site/ through worker/ on http://localhost:4321
    npm test                           # node --test
    npm run validate                   # word lists, then notes, then practice files
    node scripts/import-words.mjs 13 words.csv --title "Chapter 1"  # a spreadsheet export becomes lesson 13
    node scripts/validate-words.mjs --write-index     # rewrite site/data/lessons.json
    node scripts/validate-notes.mjs 3  # one lesson's notes
    node scripts/validate-practice.mjs 3              # one lesson's practice file
    node scripts/validate-practice.mjs --write-index  # rewrite site/data/practice/index.json
    node scripts/generate-audio.mjs 3  # clips for one lesson; needs ffmpeg and a running VOICEVOX engine (README, "Clips")
