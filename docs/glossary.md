# Glossary

These words mean one thing each, in the code, the data, and the docs.

| Word | Meaning | Lives in |
| --- | --- | --- |
| Lesson | One numbered word list, 0 to 99, with an optional title. It can follow a textbook chapter or a topic. | `site/data/words/lesson-NN.json` |
| Lesson list | Every lesson's number, title, sections and word counts, in one file the list screen loads. Written by `scripts/validate-words.mjs --write-index`, never by hand. | `site/data/lessons.json` |
| Section | A named group of words inside a lesson, such as "Drinks" or "Counting people". | `site/data/words/` |
| Word | One vocabulary entry: kana, optional kanji, English meaning, category. Has a stable id such as `l03-012`. | `site/data/words/lesson-NN.json` |
| Category | The group a word is filed under inside its section, usually its part of speech ("Nouns", "Godan verbs"). | field on a word |
| Note | What is written for a word beyond the list: one example sentence with its breakdown and one mnemonic, plus an optional spoken form. | `site/data/notes/lesson-NN.json` |
| Sentence markup | The text format for example sentences: `漢字[かんじ]` for furigana, `{…}` around the word being studied. | `site/src/furigana/` |
| Breakdown | A sentence split into pieces: each word or particle with its meaning in that sentence, plus the dictionary form of a conjugated word. Part of a note. | `site/src/furigana/breakdown.js` |
| Clip | A generated audio file: `.w.mp3` says the word, `.s.mp3` says the sentence, `.a.mp3` says a practice item's model answer. | `site/audio/lesson-NN/` |
| Starter deck | The lessons this repository ships with: lessons 1 to 12, with their notes, practice files and clips. | `site/data/`, `site/audio/` |
| Deck | The words chosen for one session: checked words of one lesson, or a mix. | `site/src/study/` |
| Mix | A deck drawn from the words of several lessons checked on the lesson list. | `site/src/study/mix.js` |
| Pass | One trip through every word of the checked lessons. A word got without a miss in a mix is cleared and sits out for the rest of the pass. | `site/src/study/mix.js` |
| Mix state | The ticked lessons plus each lesson's pass number and cleared words, once for vocabulary and once for practice: the part that is synced between devices. | `site/src/study/mix-state.js` |
| Card | A word while it is being studied. It has a front, and after the reveal an answer with pages. | `site/src/study/` |
| Page | One panel of a revealed card: Sentence or Mnemonic. | `site/src/study/` |
| Session | One run through a deck. A card marked "Again" comes back later in the same session. | `site/src/study/` |
| Practice | The second tab: a lesson's exercises, run one item at a time. | `site/src/practice/` |
| Exercise | One numbered activity in a lesson's practice file, with its instruction. It may name the book and page it comes from. | `site/data/practice/lesson-NN.json` |
| Item | One prompt of an exercise with its answers. Has a stable id such as `l03-p031`. The practice counterpart of a word: decks, passes and clearing treat it the same way. | `site/data/practice/lesson-NN.json` |
| Cue | What an item shows the learner to answer to: English words, a Japanese question, a row of a schedule. | field on an item |
| Answer | A reply the app accepts for an item, in sentence markup, with optional parts in parentheses. The first is the model answer the card shows. | `site/src/practice/` |
| Sample | An answer of an open exercise, where the learner answers for themselves: something to compare with, not the one right reply. | field on an item |
