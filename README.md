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
src/content/   word lists (source/<skill>.txt -> skills/<skill>.json), schema, chunker, validator
src/engine/    pure logic, no React: config now; matcher, scoring, mastery, scheduler later
src/speech/    Recognizer interface; WebSpeech, Manual and TTS in Phase 2
src/store/     IndexedDB schema (profiles, attempts)
src/ui/        screens and components
src/tests/     unit tests
scripts/       content build, validate, review-sheet scripts
docs/          generated word review sheet
```

## Content model

Two sets, every skill with an ID used in the data, UI and dashboard:

- Set 1, Vowel Groups (v1): 1.1 Closed, 1.2 Open, 1.3 Silent e, 1.4 Vowel teams,
  1.5 R-controlled, 1.6 Consonant-le (Level 3 up), 1.7 Diphthongs. Levels 1 to 4.
- Set 2, Word Skills: 2.1 Soft c and g ships in v1. 2.2 to 2.14 are registered in
  `src/content/schema.ts` with empty stub files so the UI, store and validator already
  handle them. Levels A (one syllable) and B (multi-syllable).

Every multi-syllable word carries a `division` pattern per split (VC/CV, V/CV, VC/V, V/V,
C-le, affix), derived from its syllables by `src/content/division.ts` and overridable in the
source file. Parent teaching notes live in `src/content/teaching-notes/`, one Markdown file
per skill plus one on syllable splitting, six sections each, under 150 words.

Each Set 1 level reserves 6 held-out words for the placement test (flagged `heldOut`,
marked `*` in the source and on the review sheet). The practice pool never serves them.

## Editing words

Word lists are authored in `src/content/source/<skill>.txt`, one file per skill:

```
## 1                     level header: 1-4 for Set 1, A or B for Set 2
cat                      one syllable, type defaults to the skill's type, chunks auto
* dog                    leading * = held out for the placement test
rab-bit | c c            syllables and types (c o v t r l d s = closed open vce team r cle diphthong schwa)
so | | | sew, sow        homophones that count as correct
cape | | | | cap=That was a short a. Look at the e at the end.     confusable = hint
un-der | c r | | | | VC/CV    6th field overrides the derived division pattern
```

Then run `npm run content`. It regenerates `src/content/skills/*.json`, fails on any
validation error (syllables must join to the word, one type per syllable, lowercase only,
no duplicates, hints must not reveal the word, level shape rules per set) and rewrites
`docs/word-review-sheet.txt` and `docs/teaching-notes-review.md` for the parent to check.

## Phase status

- [x] Phase 0: scaffold, visual style, word schema, validator, PWA
- [x] Phase 1: content for skills 1.1 to 1.7 and 2.1; 2.2 to 2.14 stubbed; held-out test words reserved; division patterns; parent teaching notes
- [x] Phase 2: core practice loop, matcher, recognizers, rule panel
- [x] Phase 3: help ladder and Break It Down coach
- [ ] Phase 4: scoring, mastery, persistence
- [ ] Phase 4b: level test (placement)
- [ ] Phase 5: profiles and multiplayer
- [ ] Phase 6: parent dashboard
- [ ] Phase 7 (optional, needs approval): cloud pronunciation engine

## Phase 2 notes

- `src/engine/matcher.ts` is the strict matcher (whole-word, homophones, confusable hints).
- `src/engine/attempt.ts` is the per-word state machine: ready, listening, wrong, modeling,
  repeating, done. Overrides work in every live phase. Three misses model the word and send
  it to review. `src/engine/session.ts` shuffles the practice pool and brings review words
  back every 4th word; Phase 4 replaces it with the 70/20/10 scheduler.
- `src/speech/WebSpeechRecognizer.ts` starts only on a tap, pauses while TTS speaks, restarts
  itself after silence while wanted, and on not-allowed, audio-capture or repeated network
  errors switches once to `ManualRecognizer` with a message. The parent buttons bypass the
  recognizer entirely.
- The "Help" button is help step 1 only (syllable split with colors). Steps 2 and 3 and the
  Break It Down coach come in Phase 3.
- Attempts are already written to IndexedDB with `panelOn`. Stars and streak are per session
  until Phase 4 reads them back from the log.

## Phase 3 notes

- Help ladder on the word card: step 1 shows syllables with dots, colors and labels; step 2
  makes each syllable a tap target that speaks it; step 3 speaks the whole word. The highest
  step used is tracked per attempt and lowers the stars per the spec.
- Known weak spot: browser TTS mispronounces isolated syllables. `src/speech/sayAs.ts`
  respells common shapes (ta -> tay, ble -> bul) and a word's `sayAs` field overrides it
  (source field 8, syllables separated by /: `ta-ble | o l | | | | | | tay/bul`). Test by ear
  on the tablet and add overrides where a part sounds wrong.
- Break It Down coach: `src/engine/coach.ts` (pure, tested) with the six prompts in
  `src/content/coach-prompts.ts` so a parent can edit the wording. Guided mode runs it on
  the first 5 multi-syllable words of a level and after a miss, fades to a one-line reminder
  after 5 clean reads, and comes back after a miss. Modes: Guided, On request only, Off
  (set on the skill screen until the dashboard exists). A revealed split costs help step 1;
  completing it himself keeps the full 10 stars. Counts are in the config file.

## Assumptions made in Phases 0 and 1

- The prototype is kept at `prototype/vowel_mastery_app_final.html` for reference. All of
  its words are in the lists at the right level (city and giant moved to Level B of 2.1).
  Its gradient background, header with star and streak counters, card shadow, rule hints
  and the 7 Rules Guide were ported. Its mic and speaker pickers were dropped on purpose
  (out of scope per the spec); a one-line note says the app uses the system defaults.
  The prototype counted soft c/g as one of its 7 rules and had no consonant-le group; the
  spec's list of 7 wins.
- Open-syllable Levels 1 and 2 fall short of 25 words (10 and 16 in total, with 4 of each
  held out for the test instead of 6). English has very few one-syllable open words.
  Words ending in y that says long i (fly, sky) are included there because y is acting
  as the vowel in an open syllable. Skill 2.6 (Y as a vowel) is left for words where y
  says long e (baby, happy).
- Held-out test words were picked evenly through each level, skipping words that carry
  a homophone or confusable so those hints stay in practice. Swap any by moving the `*`.
- Diphthongs use oi, oy, ou and ow (as in cow). aw and au (saw, haul) are filed under
  vowel teams. ow as in snow is a vowel team.
- Level 4 words have 3 or more syllables, except a few 2-syllable words in groups where
  decodable 3-syllable words are scarce (the validator allows 2+ at Level 4).
- Sound chunks are generated per syllable from its type (consonant digraphs always kept
  together; vowel teams, r-combos, diphthongs and "le" only in syllables of that type).
  Every chunk is printed on the review sheet so mistakes are easy to spot and override
  with the third field in the source file.
