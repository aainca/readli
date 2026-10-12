# Vowel Mastery 2.0: Short Spec

## Goal
A home reading-practice app for a 3rd grader who is struggling with decoding. The child reads a word aloud, the app judges it, gives help when needed, and moves him up in difficulty only when he has reliably mastered each vowel pattern.

## Users
- Reader: a child, roughly ages 6 to 10.
- Parent: sets up profiles, can override the voice judgment, reviews progress.
- Second player: sibling or parent, on the same device.

## Platform
- Web app, Chrome on laptop or tablet, installable as a PWA.
- No accounts, no server in v1. All data stored locally on the device.

## Content model

Content is organized in two sets. Set 1 is the 7 vowel groups. Set 2 is every skill outside those 7. Every skill has an ID (1.1 to 1.7, 2.1 to 2.14) used in the data, the UI, and the dashboard.

### Set 1: Vowel Groups (the 7 syllable types), ships in v1
1. Closed (short vowel): cat, rab-bit
2. Open (long vowel): go, ro-bot
3. Silent e (VCe): cape, pan-cake
4. Vowel teams (ai, ay, ee, ea, oa, ow, etc.): rain, rain-bow
5. R-controlled (ar, or, er, ir, ur): car, gar-den
6. Consonant-le: ta-ble, can-dle (starts at Level 3, always 2+ syllables)
7. Diphthongs (oi, oy, ou, ow): coin, cow-boy

In the data these are 1.1 Closed, 1.2 Open, 1.3 Silent e, 1.4 Vowel teams, 1.5 R-controlled, 1.6 Consonant-le, 1.7 Diphthongs.

### Set 2: Word Skills (everything outside the 7), ships in V2
Listed in teaching order. Skill 2.1 already exists in the prototype, so it ships in v1 under its Set 2 label.

- 2.1 Soft c and g: cent, gem, page
- 2.2 Consonant teams: sh, ch, th, wh, ck, ph, tch, dge (ship, catch, bridge)
- 2.3 Syllable division patterns:
  - Two consonants between vowels, split between them: rab-bit, nap-kin
  - One consonant between vowels, try before it first: ro-bot, ti-ger
  - If that sounds wrong, split after it: cab-in, lem-on
  - Two vowels that do not team up: li-on, po-em
  - Consonant-le, count back three letters: ta-ble, can-dle
- 2.4 Glued sounds: ang, ing, ong, ank, ink, all (sang, pink, ball)
- 2.5 Closed-syllable exceptions: ild, ind, old, olt, ost (wild, find, cold, most)
- 2.6 Y as a vowel: fly, baby
- 2.7 Three sounds of -ed: jumped, played, wanted
- 2.8 Suffix spelling changes: doubling (hopping, hoping), drop e, y to i (cried)
- 2.9 Other vowel teams: oo (moon, book), au, aw, ew, ea as in bread, igh
- 2.10 Silent letter pairs: kn, wr, gn, mb (knee, write, sign, lamb)
- 2.11 Schwa: mel-on, a-bout
- 2.12 Prefixes and suffixes: un-, re-, dis-, -ing, -ful, -less
- 2.13 Stable endings: tion, sion, ture (nation, picture)
- 2.14 Heart words: said, was, of, does, could

### Levels within every Set 1 group
- Level 1: one syllable, simple (cat, cape, rain)
- Level 2: one syllable with blends and digraphs (stamp, stripe, street)
- Level 3: two syllables (rabbit, pancake, rainbow)
- Level 4: three or more syllables and mixed types (fantastic, lemonade, hamburger)

### Word record
Each word stores: text (lowercase), group, level, syllables, the type of each syllable, sound chunks (r-ai-n), accepted homophones, and confusable words (cap for cape).

Target: at least 25 words per group per level. A parent reviews the list before use.

## Level test (placement), ships in v1
Purpose: find the right starting level in each vowel group so the child is not bored or overwhelmed.

- When: offered at first launch for each profile. A parent can skip it (everything starts at Level 1) or rerun it at any time.
- Length: about 5 to 8 minutes, 40 words at most. It can be paused and resumed.
- Format: the child reads words aloud, the same as practice, but with no stars, no help ladder, and no right or wrong signal. Every word gets a neutral "Got it, next one."
- A parent should sit in for the test. The "I heard it right" and "Not quite" buttons matter most here, because one wrong judgment by the recognizer can shift a level.
- Adaptive per group, for each of the 7 groups:
  - Start with 4 words at Level 2.
  - 3 or 4 correct: move up a level and test 4 more.
  - 2 or fewer correct: move down a level and test 4 more.
  - Stop when the highest passed level is found.
- Placement: the child starts each group at the first level he did not pass. Levels below that are marked as "placed out" and feed the 10% older-words mix.
- Early stop: if the child misses 6 words in a row, the test ends kindly and the remaining groups start at Level 1.
- Result screen for the parent: starting level per group, words missed, and a one-line read on where he is strongest and weakest.
- Fast adjust: placement is provisional. In the first 10 practice attempts at a placed level, 9 or more first-try correct moves him up right away, and 4 or fewer moves him down.
- Retest: the dashboard suggests a retest every 6 weeks and shows the change from the previous test.
- Test words are held out from the practice lists so the test measures decoding, not memory.

## Practice flow
1. Word appears in lowercase. The app listens.
2. Correct: stars, short praise, next word.
3. Wrong: the app does not say the word. It gives a targeted hint if it recognized a confusable ("That was a short a. Look at the e at the end.") and offers help.
4. After 3 misses: the app models the word, the child repeats it, and the word goes into the review queue.

## Help ladder (child or parent can tap "Help")
1. Show the syllable split, with the vowel pattern in each syllable color coded and labeled.
2. Tap a syllable to hear it.
3. Hear the whole word.

Each step used reduces the stars earned for that word.

## Scoring
- First try, no help: 10 stars
- Second try or help step 1: 6 stars
- Help step 2: 4 stars
- Help step 3 or third try: 2 stars
- Streak bonus: +5 at every 5 in a row. A miss resets the streak.
- Every attempt is logged: word, result, tries, help used, date.

## Mastery and progression
- Mastered level: 85% or higher first-try accuracy over the last 20 attempts in that group and level, across at least 2 different days.
- On mastery: next level unlocks with a celebration.
- Step back: if accuracy over the last 20 attempts falls under 60%, the session mixes in more words from the level below.
- Review queue: missed and skipped words come back on a spaced schedule (same session, next day, 3 days, 7 days) until read correctly first try on 3 separate days.
- Each session mixes about 70% current-level words, 20% review words, 10% older mastered words.

## Voice recognition
- Recognizer is a swappable module with one interface.
- v1 engine: browser Web Speech API with a strict matcher:
  - Request multiple alternatives and accept if any matches.
  - Whole-word match only, no substring matches.
  - Accept listed homophones.
  - Detect listed confusables for targeted hints.
- Parent override: "I heard it right" and "Not quite" buttons, always available.
- Optional v2 engine: a cloud service that scores pronunciation at the sound level. Requires parent opt-in because audio leaves the device.
- Fallback when no speech support: parent-judged mode with the two override buttons.

## Multiplayer (same device)
- Up to 4 local profiles, each with its own levels and history.
- Co-op mode (default): players take turns and fill a shared star goal together.
- Friendly race mode: players take turns, each gets words at his or her own level, first to a star target wins.
- The screen clearly shows whose turn it is. Mic input counts only for the active player.

## Parent dashboard
- Per group and level: accuracy, attempts, mastery status.
- Trickiest words list.
- Practice days and minutes per week.
- Reset or adjust a level manually. Export data as a file.

## V2: Set 2 Word Skills

### How Set 2 appears
- The home screen shows two tabs: "Vowel Groups" (Set 1) and "Word Skills" (Set 2).
- Set 2 skills unlock in order. A skill opens when the one before it is mastered, and Set 2 as a whole opens once Set 1 groups 1.1 to 1.3 are mastered at Level 2.
- A parent can unlock any skill manually from the dashboard.

### Levels in Set 2
- Level A: one-syllable words, where the skill allows it.
- Level B: multi-syllable words.
- Skills that are multi-syllable by nature (2.3, 2.11, 2.12, 2.13) have Level B only.
- Mastery, scoring, and the review queue work the same as in Set 1.

### Extra activity types
Most Set 2 skills use the normal read-aloud flow. Three need their own activity:
- 2.3 Syllable division: the child taps where the word splits, then reads it aloud. Both steps count.
- 2.7 Three sounds of -ed: the child reads the word, then sorts it into the /t/, /d/, or /ed/ bucket.
- 2.14 Heart words: flash mode. No syllable help ladder, since these cannot be decoded. Help is "hear it, say it, spell it" with the irregular letters marked with a heart.

### Level test, Set 2 extension
- The v1 level test gains a second part for Set 2: 4 words per skill, in teaching order, stopping after two skills in a row are missed.
- Skills passed are marked as known. The first skill missed becomes the starting point in Set 2.

### Dashboard
- Progress is shown by set and skill ID, so it can be lined up with a school or tutor sequence.

## Out of scope for v1
- Set 2 skills other than 2.1, the extra activity types, and the Set 2 part of the level test (all V2).
- Online multiplayer, accounts, cloud sync.
- Sentence or passage reading.
- Working mic and speaker device pickers (the browser speech engine uses the system default; show a short note instead).

## Success criteria
- Child completes a 10-minute session without adult help beyond the override buttons.
- Fewer than 1 in 10 correct readings are rejected by the matcher in parent testing.
- Progress survives closing and reopening the app.
