# Writing notes

A note is what this project writes for one word: an example sentence and a mnemonic. This guide is the brief for whoever writes them, person or model. `node scripts/validate-notes.mjs <lesson>` checks the mechanical rules; the rest is judgment.

## What the research says

The mnemonic format follows the **keyword method** (Atkinson & Raugh, 1975). It has two links:

1. **Sound link.** Find an English word or phrase that sounds like the Japanese word (しゅうまつ → "shoe mats").
2. **Image link.** Put that keyword and the meaning into one picture where they *interact* (every weekend you beat the shoe mats).

What the studies found, and what it means here:

| Finding | Consequence for this project |
| --- | --- |
| The keyword method beats rote and context learning by a wide margin on immediate tests (Atkinson & Raugh 1975; Raugh & Atkinson 1975). | Every word gets a mnemonic. |
| The image must show the keyword and the meaning doing something to each other. Two things side by side do little. | One scene, one interaction. |
| The advantage fades within about a week unless the word is also retrieved from memory (McDaniel et al. 1987; Wang & Thomas 1995). | The app is flashcards: recall first, mnemonic second. A mnemonic is a bridge that gets dropped once the word is automatic. |
| Hints that reveal the answer during a recall attempt reduce later recall; shown after the attempt they do not (van den Broek et al.). | Sentence and mnemonic appear only after the reveal. |
| Concrete, easily pictured keywords work better than abstract ones, and one focused scene works better than a detailed story (Tofugu's keyword-method guide, summarising classroom practice). | Short stories, concrete nouns, sensory detail. |
| The method helps going from the foreign word to the meaning more than the other way round. | The story replays the sound in order, so it also helps when starting from English. |
| Mnemonics a learner invents hold longer than supplied ones (Wang & Thomas 1995; Corona 2005). | Supplied mnemonics are the starting point, not the last word. |

Sources: Atkinson & Raugh, "An application of the mnemonic keyword method to the acquisition of a Russian vocabulary" (1975); McDaniel, Pressley & Dunay (1987); Wang & Thomas (1995); van den Broek, van Gog, Jansen et al. on images during retrieval practice; https://www.tofugu.com/japanese/keyword-mnemonic-method/.

## The file

One file per lesson, `site/data/notes/lesson-NN.json`: an object keyed by word id, covering every word in every section of `site/data/words/lesson-NN.json`. A lesson with no notes file still works as plain flashcards, so a new word list can be studied before its notes are written.

```json
{
  "l08-008": {
    "sentence": {
      "ja": "{週末[しゅうまつ]}はよくカフェへ行[い]きます。",
      "en": "I often go to cafes on weekends."
    },
    "mnemonic": {
      "soundsLike": "shoe mats",
      "story": "Every **weekend** you drag the *shoe mats* out to the balcony and beat them, thwack, thwack, a week of dust in the air. Shūmatsu: weekend."
    }
  }
}
```

A word whose listed form cannot be read aloud as written also gets `"say"`: the plain kana a speaker would say. This applies whenever the kana contains `(`, `)`, `〜`, `／`, `/`, `+`, a digit or a Latin letter.

| Listed kana | `say` |
| --- | --- |
| `〜さん` | `さん` |
| `よん／し／(よ)` | `よん、し、よ` |
| `どっち／どちら` | `どっち、どちら` |
| `Tシャツ` | `ティーシャツ` |

## Mnemonic rules

**`soundsLike`** is the English keyword or phrase on its own: `"shoe mats"`, `"Thai tea"`, `"gnome"`. Judge the match by Japanese pronunciation, not English spelling: a = ah, i = ee, u = oo, e = eh, o = oh. "Take" is a bad keyword for たけ, which is "tah-keh", and "table" is a bad keyword for たべ, which is "tah-beh". An honest loose match beats a forced one; when nothing in English comes close, a sound effect or exclamation ("ee-yeh", a door creak, for いえ) is fair.

**`story`** is one or two sentences, 45 words at most.

- Write the keyword inside `*single asterisks*` and the English meaning inside `**double asterisks**`. The app highlights them in two colours.
- Second person, present tense: "You open the door and…".
- One scene in which the keyword and the meaning interact. Concrete, physical, a little absurd. Add one sensory detail (a sound, a smell, a texture) when it fits.
- Cover the whole word's sound, in order, or at least its first half. A two-part word can use two keywords.
- For a verb or adjective, hook the part that never changes (たべ in たべる, たか in たかい) and name the dictionary form at the end.
- End with the romanised word and meaning: "Shūmatsu: weekend." Hepburn romanisation with macrons for long vowels, and a hyphen between a verb or adjective stem and its ending (tabe-ru, taka-i) or between the parts of a compound (mai-nichi).
- No real people, nothing crude, violent or demeaning.
- Two words in one lesson never have the same `soundsLike`. A sound that recurs inside different words (がく in 音楽 and 学校) keeps its keyword and gets a new scene each time.
- Words that are easy to confuse (ここ, そこ, あそこ) get stories that also tell them apart.
- Vary how stories open. Not every one starts with "You".
- A word with two meanings (聞く: to listen, to ask) builds the scene on the first one and names the other in the closing line.

Not every word wants a sound-alike. Pick the kind that fits:

| Kind of word | What to write |
| --- | --- |
| Native or Sino-Japanese word with no English echo | The keyword method above. This is most words. |
| Loanword (most katakana) | `soundsLike` is the source word. The story says in one sentence how Japanese reshapes it, beat by beat (te-re-bi), or warns when the meaning shifted (マンション is an apartment, not a mansion). The source word is the `*keyword*`; the meaning still gets `**…**` even when it is the same word. |
| Compound of parts already taught (高校生, 朝ご飯, 日本語) | Say how the parts add up, and give a sound hook only for a part that is new. `soundsLike` holds the breakdown: `"kōkō (high school) + sei (student)"`. A new part that several words in the lesson share (ご飯 in 朝ご飯, 昼ご飯, 晩ご飯) is hooked in the first of them; the others name it and hook their own part. |
| Member of a series (numbers, hours, minutes, days, months, counters) | State the pattern, then hook the irregular bit if this member has one (よじ, not よんじ). `soundsLike` holds the pattern: `"yo + ji"`. |
| Set phrase or greeting | Give the literal meaning piece by piece, then a hook for the whole phrase. |

Use these keywords for sounds that keep coming back, when they fit, so the same picture returns across lessons:

| Sound | Keyword | Sound | Keyword |
| --- | --- | --- | --- |
| がく | gawk | せい | say |
| こう | coat | しょう | show |
| きょう | Kyoto | じん | jeans |
| だい | dye | でん | den |
| かい | kite | しゃ | shah |
| いん | inn | ちゅう | chew |
| せん | cent | ほん | hone |
| にち | niche | ご | go |

## Sentence rules

- One sentence, original to this project. A word that only makes sense as a reply (でも, ええ, そうですね) may use a two-line exchange instead, written `「…」「…」`, up to 40 characters. Never copy or adapt a sentence from a textbook, workbook, app, or dictionary, and do not use a textbook's characters. The starter deck uses 田中さん, 山田さん, さくらさん, ケンさん, or no name at all.
- It uses the word in the first meaning the word list gives, and shows the particle the gloss mentions (`to use (〜を)` → a sentence with を).
- Polite style (です／ます) unless the word itself is casual.
- Short: 30 characters or fewer, not counting markup.
- Grammar a beginner can follow. When a deck's lessons follow a course, a sentence uses nothing the course teaches after its word's lesson, and the other words come mostly from the same or earlier lessons; the word's own plainest use is always allowed (`いいですね` for いい). The starter deck is grouped by topic, so its sentences only keep to short, common patterns. A harder word is fine when the sentence needs it, since every kanji carries its reading and every piece has a meaning.
- Written the way Japanese is normally written: kanji where a newspaper would use kanji, no spaces between words, numbers in kanji.
- The sentence should be something a person would say, and concrete enough to picture.
- `en` is a natural English translation, not a word-for-word gloss.

### Sentence markup

- Every run of kanji is followed by its reading in square brackets, in hiragana: `映画[えいが]`, `食[た]べます`, `お酒[さけ]`. The reading covers exactly the kanji before it, never the kana after.
- The word being studied, in the form it takes in the sentence, sits in one pair of braces: `{食[た]べます}`, `{静[しず]かな}`. Exactly one pair per sentence. The braces wrap the whole inflected word, readings included, and stop before a sentence-final particle: `{話[はな]しません}か`.
- Nothing else is markup. No spaces, no romaji, no asterisks.

### Breakdown

`sentence.breakdown` lists the sentence's words and particles in order, each with what it means here. The app shows a piece's meaning when the reader points at it or taps it.

```json
"sentence": {
  "ja": "土曜日[どようび]に{映画[えいが]}を見[み]ませんか。",
  "en": "Do you want to see a movie on Saturday?",
  "breakdown": [
    { "text": "土曜日", "en": "Saturday" },
    { "text": "に", "en": "on (a day or time)" },
    { "text": "映画", "en": "movie" },
    { "text": "を", "en": "marks the object" },
    { "text": "見ません", "en": "don't watch", "base": "見[み]る", "baseEn": "to see, to watch" },
    { "text": "か", "en": "question marker" }
  ]
}
```

- `text` is the piece as written in the sentence: kanji kept, no readings, no braces. The pieces in order spell the whole sentence; only punctuation and quotation marks are left out.
- `en` is the meaning in this sentence, short enough to read at a glance: 40 characters at most, lower case unless it is a name. A content word gets its meaning ("movie"). A particle gets its job in this sentence in plain words: は "topic marker", を "marks the object", に "at (a time)" or "to (a place)", で "at (where it happens)" or "by (means)", の "'s / of", も "also", と "and" or "with". The same particle reads differently in different sentences; write the reading that fits.
- A verb or adjective with all its endings is one piece: 食べました, 見てください, 行きたいです, 高くないです, 読んでいます. Its `en` translates the whole form ("ate", "please look", "want to go"). A sentence-final か, ね or よ is its own piece.
- A verb, adjective or copula that is not in its dictionary form also gets `base` and `baseEn`: the dictionary form in sentence markup (`見[み]る`, `高[たか]い`, `静[しず]か`) and its meaning ("to see, to watch"). です and じゃないです need no base, and でした takes です as its base. ください and お願いします take くださる and お願いする. A piece already in dictionary form has none.
- A name with its title is one piece (田中さん "Mr./Ms. Tanaka"). A number with its counter is one piece (三時 "three o'clock"). A set phrase that is not built from its parts (おはようございます, いただきます) is one piece.
- A noun compound the word list gives as one word stays one piece (日本語 "Japanese language"). A piece cannot cut a kanji run away from part of its reading; when two words share one bracket (`今日朝[きょうあさ]`), split the bracket in `ja` (`今日[きょう]朝[あさ]`) without changing a character of the sentence or its reading.
- The piece for the word being studied carries the word list's meaning, adjusted to the form in the sentence.

## Before handing a file in

1. Run `node scripts/validate-notes.mjs <lesson>` and fix every error. Read the warnings; fix the ones that are real.
2. Read each mnemonic aloud. If the keyword does not sound like the word when said the Japanese way, replace it.
3. Check each reading in brackets against the kanji it follows.
4. Read each breakdown from left to right against the translation. Every piece should make sense on its own, and together they should add up to `en`.
