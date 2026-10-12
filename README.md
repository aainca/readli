# Vowel Mastery 2.0 (readli)

Home reading-practice app for a child who is learning to decode. The child reads a
word aloud, the app judges it, helps when needed, and moves up in difficulty only
after each vowel pattern is mastered. See `SPEC.md` and `CLAUDE_CODE_INSTRUCTIONS.md`.

## Stack

Vite, React, TypeScript, Tailwind 4, IndexedDB via `idb`, Vitest, PWA via `vite-plugin-pwa`.

## Commands

```
npm install
npm run dev              # dev server
npm run build            # typecheck + production build (dist/)
npm run preview          # serve dist/
npm test                 # unit tests
npm run content          # rebuild word JSON, validate it, write the review sheet
```

## Layout

```
src/content/   word lists (source/*.txt -> groups/*.json), schema, chunker, validator
src/engine/    pure logic, no React: config now; matcher, scoring, mastery, scheduler later
src/speech/    Recognizer interface; WebSpeech, Manual and TTS in Phase 2
src/store/     IndexedDB schema (profiles, attempts)
src/ui/        screens and components
src/tests/     unit tests
scripts/       content build, validate, review-sheet scripts
docs/          generated word review sheet
```

## Editing words

Word lists are authored in `src/content/source/<group>.txt`, one file per group:

```
## 1                     level header
cat                      one syllable, type defaults to the group's type, chunks auto
rab-bit | c c            syllables and types (c o v t r l d s = closed open vce team r cle diphthong schwa)
so | | | sew, sow        homophones that count as correct
cape | | | | cap=That was a short a. Look at the e at the end.     confusable = hint
```

Then run `npm run content`. It regenerates `src/content/groups/*.json`, fails on any
validation error (syllables must join to the word, one type per syllable, lowercase only,
no duplicates, hints must not reveal the word, level shape rules) and rewrites
`docs/word-review-sheet.txt` for the parent to check.

## Phase status

- [x] Phase 0: scaffold, visual style, word schema, validator, PWA
- [x] Phase 1: content for 7 core groups and the Soft c and g bonus; other bonus units stubbed
- [ ] Phase 2: core practice loop, matcher, recognizers
- [ ] Phase 3: help ladder
- [ ] Phase 4: scoring, mastery, persistence
- [ ] Phase 5: profiles and multiplayer
- [ ] Phase 6: parent dashboard
- [ ] Phase 7 (optional, needs approval): cloud pronunciation engine

## Assumptions made in Phases 0 and 1

- The prototype `vowel_mastery_app_final.html` was not available in this session, so its
  words could not be carried over. The look was rebuilt from the description: Fredoka and
  Nunito, cream background, rounded cards with a soft drop edge, star confetti.
- Open-syllable Levels 1 and 2 fall short of 25 words (10 and 16). English has very few
  one-syllable open words. Words ending in y that says long i (fly, sky) are included
  there because y is acting as the vowel in an open syllable. The Y-as-a-vowel bonus
  unit is left for words where y says long e (baby, happy).
- Diphthongs use oi, oy, ou and ow (as in cow). aw and au (saw, haul) are filed under
  vowel teams. ow as in snow is a vowel team.
- Level 4 words have 3 or more syllables, except a few 2-syllable words in groups where
  decodable 3-syllable words are scarce (the validator allows 2+ at Level 4).
- Sound chunks are generated per syllable from its type (consonant digraphs always kept
  together; vowel teams, r-combos, diphthongs and "le" only in syllables of that type).
  Every chunk is printed on the review sheet so mistakes are easy to spot and override
  with the third field in the source file.
