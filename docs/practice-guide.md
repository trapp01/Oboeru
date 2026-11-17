# Writing practice files

A practice file holds one lesson's exercises as items the app can show one at a time and check. This guide is the brief for whoever writes one, person or model. `node scripts/validate-practice.mjs <lesson>` checks the mechanical rules; the rest is judgment.

The nouns (exercise, item, cue, answer, sample) are defined in [glossary.md](glossary.md).

## Where exercises come from

There are two kinds of practice file, and they follow the same format.

- **Written for a deck.** The starter deck's practice files were written for this project. Nothing in them comes from a textbook, a workbook or an app. Anything contributed to this repository is written the same way; see [The starter deck](#the-starter-deck).
- **Taken from a book you own, in your own copy.** An exercise can name its book and page, so a private copy can hold the drills of the textbook you are working through, checked against its answer key. Those exercises and answers belong to the publisher. Keep such a copy private and its site behind a login; see "Content and licences" in the README. [From a book](#from-a-book) has the rules for turning a printed exercise into items.

## The file

`site/data/practice/lesson-NN.json`:

```json
{
  "lesson": 6,
  "exercises": [
    {
      "ref": "1",
      "instruction": "Say what the person in the cue eats, drinks or makes, with the place when the cue gives one.",
      "kind": "typed",
      "example": { "cue": "Ken · eat · bread · home", "answer": "ケンさんはうちでパンを食[た]べます。" },
      "items": [
        {
          "id": "l06-p001",
          "cue": "Sakura · drink · green tea",
          "answers": ["さくらさんはお茶[ちゃ]を飲[の]みます。"],
          "en": "Sakura drinks green tea.",
          "breakdown": [
            { "text": "さくらさん", "en": "Sakura" },
            { "text": "は", "en": "topic marker" },
            { "text": "お茶", "en": "green tea" },
            { "text": "を", "en": "marks the object" },
            { "text": "飲みます", "en": "drinks", "base": "飲[の]む", "baseEn": "to drink" }
          ]
        }
      ]
    }
  ]
}
```

A practice file belongs to the lesson with the same number in `site/data/words/` and is listed under that lesson's title.

### Exercise

| Field | Meaning |
| --- | --- |
| `ref` | The exercise's label. For an exercise written for a deck: `"1"`, `"2"`, … in file order, shown as "Exercise 2". For one from a book: its number as printed, such as `"II-A"` or `"3-II"` |
| `book` | Optional. `"textbook"` or `"workbook"`, for an exercise from a book. The card then shows "Textbook II-A" |
| `page` | Optional. The printed page a book's exercise starts on |
| `title` | Optional. A heading for the exercise, in sentence markup when it is Japanese |
| `instruction` | One English sentence telling the learner what to produce from the cue. It stands alone on a card: no "look at the picture", "the following", "your partner", "above" |
| `kind` | `"typed"`: the app checks what is typed or spoken against `answers`. `"open"`: the learner's own answer; `answers` are samples to compare with |
| `example` | Optional. A worked example as `{ "cue", "answer" }`. The app does not show it. The example is never also an item |
| `items` | The prompts, in order |

### Item

| Field | Meaning |
| --- | --- |
| `id` | `l06-p001`, `l06-p002`, … numbered through the whole file in order. An id never changes once the file is in use, because progress is kept by id |
| `cue` | What the learner answers to. English, or Japanese in sentence markup. Parts of a cue are joined with ` · `. It must be enough to produce the answer with nothing else on screen |
| `context` | Optional. Facts the learner needs that are not the prompt itself: `"Ken: magazine, library, 2:00"`, `"Sakura says"`. Plain English, or Japanese in sentence markup |
| `cueEn` | For every cue that is a Japanese sentence, question or list of words: its English translation, shown after the answer. Not for a bare form to conjugate |
| `answers` | One or more accepted answers in sentence markup. The first is the model answer the card shows |
| `en` | Natural English for the model answer. For a bare form, the form's meaning: `"don't listen"` |
| `breakdown` | Required when the model answer is a sentence (it ends in 。 or ？). Same rules as the Breakdown section of `docs/notes-guide.md`. Not used for a bare form or phrase |

No other fields.

## Answers

- **Normal writing, with readings.** Write answers the way Japanese is normally written, every kanji run followed by its reading in hiragana: `図書館[としょかん]に行[い]きます。` The app accepts kanji or kana for each run, so `としょかんにいきます` also matches. Use the kanji `site/data/words/` gives a word (友達, 時々, 全然, 私); keep たいてい, うち (home), あまり, ください and other usually-kana words in kana. Family names are in kanji (田中[たなか]さん).
- **Numbers in kanji**: `五時[ごじ]`, `四百五十円[よんひゃくごじゅうえん]`. The app also accepts `5時` and `450円`.
- **A number read aloud is still kanji with its reading.** When the exercise asks the learner to say a number, write `四十五[よんじゅうご]`, not `よんじゅうご`, so that a spoken answer heard as `45` matches.
- **A full sentence ends in 。** A question ends in か。 A bare form or phrase (`聞[き]きます`, `私[わたし]の先生[せんせい]`) has no 。.
- **Optional parts go in ASCII parentheses**: `(私[わたし]は)子供[こども]がいます。` matches with or without 私は. Use them around the topic when the whole exercise is about one person the instruction names, or the cue's subject is "I" (`(ケンさんは)`, `(私[わたし]は)`). A named person in a sentence to translate is part of the translation and stays required. Parentheses do not nest and cannot split a kanji run from its reading. What is left with every optional part removed must still be an answer.
- **Alternatives are separate answers.** When two words or two readings are equally right (うち and 家[いえ], よん and し), give each as its own string. Do not try to list every possible word order or spelling; add a second answer only when the cue's own wording leads to it. The card's "I was right" button covers the rest.
- **Open items**: one or two samples that use only grammar and words the lesson has reached, and read like something a student would say about an ordinary life.
- No spaces, no romaji, no `{…}`.

The breakdown rules in `docs/notes-guide.md` apply here too.

## Cues

- An English cue is plain and short; a Japanese cue is written in sentence markup with readings.
- A cue names everything the answer needs: the action when the other parts are only nouns (`drink · coffee · cafe`), and the person when the sentence is about someone (`Sakura · come to my house`).
- A table row is `8:00 · eat breakfast`. Who the table is about goes in the instruction.
- For "answer the question" exercises the cue is the question, and the facts to answer from go in `context`.
- A cue leads to one answer. If two different sentences would both be natural replies, add what settles it to the cue or the context, or make the exercise `open`.

## The starter deck

The starter deck's practice files are original. When writing or adding to them:

- **Nothing is copied or adapted** from a textbook, workbook, app, test or website: no sentence, no cue, no exercise layout, no character.
- **The cast** of the practice files is four people: ケンさん (an exchange student from Canada), さくらさん (a university student, his friend), 田中[たなか]さん (an office worker) and 山田[やまだ]先生[せんせい] (their Japanese teacher). No other named people, and no real ones. In English they are Ken, Sakura, Tanaka-san and Yamada-sensei. The notes borrow the same names for whoever a sentence needs, so a 田中さん there is not this one.
- **Words** come mostly from the lesson's own word list and the lessons before it. A later word is fine when a sentence needs it, since every kanji carries its reading and every piece has a meaning.
- **Each lesson drills the grammar in its row below**, and may reuse any earlier row.
- **A lesson has four to six exercises and about thirty items.** Most exercises are `typed`; each lesson ends with one `open` exercise about the learner's own life.
- **Exercises are numbered** `"1"`, `"2"`, … in `ref`, with no `book` or `page`.

| Lesson | Practises |
| --- | --- |
| 1 Greetings and first words | Choosing the greeting or reply a situation calls for |
| 2 Numbers and time | Reading numbers, prices and clock times aloud; 今何時ですか |
| 3 People and family | XはYです, じゃないです, questions with か, の between nouns, ages, counting people |
| 4 School and work | ます and ません with を; 〜語を話します; で for where; も |
| 5 Things and shopping | これ／それ／あれ, この／その／あの, だれの, いくらですか, 〜をください |
| 6 Food and drink | を食べます／飲みます, frequency words with ます and ません, 〜ませんか |
| 7 Around town | に〜があります／います, location words with の, に／へ行きます |
| 8 Days and routines | Time with に, ました and ませんでした, から and まで, 〜ごろ |
| 9 Describing things | い- and な-adjectives: negative, past, in front of a noun; とても and あまり |
| 10 Free time | 〜が好きです／上手です, 〜ましょう, 〜たいです |
| 11 Travel and transport | で for means, から〜まで, かかります, て-form with ください |
| 12 Home and health | 〜てもいいですか, 〜ています, 〜ないでください, 〜が痛いです |

## From a book

For a private copy that holds a textbook's own exercises. The book's answer key decides what is correct; where it gives no answer, write one with the lesson's own grammar and vocabulary and check it twice.

| In the book | In the file |
| --- | --- |
| An exercise with answers in the key (conjugate, make a sentence from a cue, describe a schedule, translate, fill in a particle) | `typed` exercise, one item per numbered prompt |
| An exercise the learner answers about themselves, or with a sentence of their own | `open` exercise. The key's samples become the answers; with no key, write one natural sample per item |
| Pair work with a fixed script | `typed`, when one side has a determinate answer: that side is the item, and the other side's line goes in `cue` or `context` |
| A prompt that asks for several forms (〜ます and 〜ません) | One exercise per form, all with the same `ref` |
| A blank to fill in | `typed` when the key fixes the answer, `open` when it gives a sample. The cue is the sentence with `＿` where each blank is; the answer is the whole sentence |
| A word to classify or mark | `typed`: the cue is the word, the answer is what the learner should write for it |
| A picture that carries the information | The information goes into `cue` or `context` as words. Pictures are never copied |

Guessing games, class surveys, role plays with no script and listening exercises do not become items. Exercises appear in the book's order, with `book`, `ref` as printed and `page`. When the key looks wrong against the book's own cue, make the form the cue calls for the model answer and keep the key's as a second answer.

## Before handing a file in

1. Run `node scripts/validate-practice.mjs <lesson>` and fix every error. Read the warnings; fix the ones that are real.
2. Check every reading against its kanji, and every model answer against its cue.
3. Read each item as a card: instruction, context, cue. Could you produce the model answer from those alone? If not, the cue is missing something.
4. Run `node scripts/validate-practice.mjs --write-index` so `site/data/practice/index.json` carries the new counts.
