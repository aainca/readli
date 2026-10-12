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

### Core groups (the 7 syllable types)
1. Closed (short vowel): cat, rab-bit
2. Open (long vowel): go, ro-bot
3. Silent e (VCe): cape, pan-cake
4. Vowel teams (ai, ay, ee, ea, oa, ow, etc.): rain, rain-bow
5. R-controlled (ar, or, er, ir, ur): car, gar-den
6. Consonant-le: ta-ble, can-dle (starts at Level 3, always 2+ syllables)
7. Diphthongs (oi, oy, ou, ow): coin, cow-boy

### Bonus units (unlock after core progress)
- Soft c and g: cent, gem, page
- Y as a vowel: fly, baby
- Schwa: mel-on, a-bout
- Prefixes and suffixes: un-, re-, -ing, -ed, -ful

### Levels within every group
- Level 1: one syllable, simple (cat, cape, rain)
- Level 2: one syllable with blends and digraphs (stamp, stripe, street)
- Level 3: two syllables (rabbit, pancake, rainbow)
- Level 4: three or more syllables and mixed types (fantastic, lemonade, hamburger)

### Word record
Each word stores: text (lowercase), group, level, syllables, the type of each syllable, sound chunks (r-ai-n), accepted homophones, and confusable words (cap for cape).

Target: at least 25 words per group per level. A parent reviews the list before use.

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

## Out of scope for v1
- Online multiplayer, accounts, cloud sync.
- Sentence or passage reading.
- Working mic and speaker device pickers (the browser speech engine uses the system default; show a short note instead).

## Success criteria
- Child completes a 10-minute session without adult help beyond the override buttons.
- Fewer than 1 in 10 correct readings are rejected by the matcher in parent testing.
- Progress survives closing and reopening the app.
