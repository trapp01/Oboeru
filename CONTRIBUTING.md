# Contributing

Thanks for wanting to help.

## Where to start

- A wrong reading, an unnatural sentence, a mnemonic whose keyword does not
  sound like the word, a clip that says the wrong thing: open an
  [issue](https://github.com/trapp01/Oboeru/issues) with the word or item id
  (`l06-012`, `l06-p009`), or fix the data file and send a pull request.
- For anything larger than a small fix, open an issue before writing code so
  the approach is agreed first.

## Set up

Needs Node 22. There is nothing to install.

```sh
npm run serve        # http://localhost:4321
npm test
npm run validate
```

Read [docs/glossary.md](docs/glossary.md) first; its words are the ones the
folders, the data and the interface use. [docs/design.md](docs/design.md) says
what each screen does.

## Rules

The project's rules are in [CLAUDE.md](CLAUDE.md), each with its reason. They
apply to people and to coding agents alike. The ones that matter most:

- **Nothing copied from a textbook, a workbook, an app or a dictionary.** No
  chapter word list, no sentence, no exercise, no answer key, no character, no
  audio. Write the content yourself, the way
  [docs/notes-guide.md](docs/notes-guide.md) and
  [docs/practice-guide.md](docs/practice-guide.md) describe. A pull request
  that mirrors a book's chapter will be closed.
- **No build step and no dependencies.** The app is the files in `site/`.
- **Logic that can be tested without a browser** lives in a module with no DOM
  access and has a test beside it.

## Pull requests

- One concern per pull request. A rename or a move goes in its own.
- `npm test` and `npm run validate` pass.
- A change to what a screen does comes with the matching change to
  `docs/design.md`.

## Licence

Code is under the [MIT licence](LICENSE); the starter deck's content is under
CC BY 4.0 ([ATTRIBUTION.md](ATTRIBUTION.md)). By contributing you agree that
your contribution is licensed the same way.
