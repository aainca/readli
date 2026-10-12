# Claude Code Instructions: Vowel Mastery 2.0

## Kickoff prompt (paste this into Claude Code)

> Read SPEC.md, CLAUDE_CODE_INSTRUCTIONS.md, and vowel_mastery_app_final.html in this folder. The HTML file is the working prototype. Rebuild it as described, following the phases in CLAUDE_CODE_INSTRUCTIONS.md in order. Start with Phase 0 and Phase 1 only. Show me the plan before writing code, and stop at the end of each phase so I can test with my son.

## Context
- The user is a parent building this for a 3rd grader who struggles with reading. Clarity and reliability matter more than features.
- The child reads words aloud. Wrong judgments by the app are the biggest risk to his motivation, so the matcher and the parent override are the most important parts.

## Stack
- Vite, React, TypeScript.
- Tailwind for styling. Keep the prototype's friendly look (Fredoka and Nunito fonts, rounded cards, star confetti).
- State and history in IndexedDB (use a small wrapper such as idb). No backend.
- Vitest for unit tests.
- PWA manifest and service worker so it installs on a tablet.

## Project layout
```
src/
  content/      word lists as JSON, one file per group, plus schema and validator
  engine/       pure logic, no React: matcher, scoring, mastery, scheduler
  speech/       Recognizer interface, WebSpeechRecognizer, ManualRecognizer, TTS
  store/        profiles, attempt log, persistence
  ui/           screens and components
  tests/
```

## Rules for the code
- Keep everything in engine/ pure and unit tested. No DOM or speech calls there.
- Words are stored and displayed in lowercase.
- Never speak or reveal the target word after a wrong answer until the help ladder or the third miss calls for it.
- Never block on the recognizer. The parent override buttons must always work.
- All thresholds (85%, 60%, 20 attempts, star values) live in one config file.

## Phases

### Phase 0: Setup
- Scaffold the project. Port the prototype's visual style.
- Add the word schema:
  ```ts
  type SyllableType = 'closed' | 'open' | 'vce' | 'team' | 'r' | 'cle' | 'diphthong' | 'schwa';
  interface Word {
    text: string;            // "pancake"
    group: GroupId;
    level: 1 | 2 | 3 | 4;
    syllables: string[];     // ["pan", "cake"]
    syllableTypes: SyllableType[];
    chunks: string[];        // ["p","a","n","c","a","k","e"] or grapheme chunks like "ai"
    homophones?: string[];   // ["sew"] for "so"
    confusables?: { heard: string; hint: string }[];
  }
  ```
- Write a validator script that checks every word: syllables join to the text, types length matches syllables, no duplicates, lowercase only.

### Phase 1: Content
- Create the 7 core groups from SPEC.md with 4 levels each, at least 25 words per level (Consonant-le starts at Level 3).
- Carry over the prototype's words where they fit. Move multi-syllable words (city, giant) to the right level.
- Add the Soft c and g bonus unit. Stub the other bonus units.
- Use common, decodable, age-appropriate words. Avoid irregular words (said, have, give, done) and words whose pattern breaks the group's rule.
- Fill in homophones and confusables wherever they exist (cap/cape, pin/pine, hop/hope, so/sew, no/know, cent/sent/scent).
- Output a plain-text review sheet of all words by group and level for the parent to check.

### Phase 2: Core practice loop
- Word card, listening state, feedback, next word.
- Matcher (engine/matcher.ts):
  - Normalize: lowercase, strip punctuation, trim.
  - Input is a list of alternatives. Split each into tokens.
  - Correct if any token equals the target or a listed homophone.
  - No substring matching.
  - If not correct and a token equals a confusable, return the hint.
  - Tests: "catalog" does not match "cat"; "home" does not match "me"; "sew" matches "so"; "cap" for "cape" returns the hint.
- WebSpeechRecognizer:
  - maxAlternatives 5, lang en-US, interim results only for the "heard" display.
  - Start only after a user tap. No auto start on page load.
  - Pause while TTS speaks.
  - On not-allowed or service errors, stop retrying and switch to ManualRecognizer with a clear message.
- ManualRecognizer: parent taps "I heard it right" or "Not quite".
- Show both override buttons in every mode, small and out of the child's way.
- Remove the mic and speaker pickers. Add a one-line note that the app uses the system default devices.
- Wrong-answer flow and 3-miss flow exactly as in SPEC.md.

### Phase 3: Help ladder
- Step 1: show syllables separated by dots, color each syllable by type, show a small label ("silent e", "bossy r").
- Step 2: tap a syllable to hear it. Browser TTS mispronounces isolated syllables, so add a per-syllable "say as" field where needed and test by ear. Flag this to the user as a known weak spot.
- Step 3: speak the whole word.
- Track the highest step used per attempt.

### Phase 4: Scoring, mastery, persistence
- Attempt log record: profile, word, timestamp, tries, help step, result, override used.
- Scoring per SPEC.md.
- Mastery (engine/mastery.ts): rolling window of last 20 attempts per group and level, 85% first-try and no-help, at least 2 distinct calendar days. Step-back rule under 60%.
- Scheduler (engine/scheduler.ts): 70/20/10 session mix, spaced review queue (same session, 1 day, 3 days, 7 days), retire after 3 clean first-try reads on separate days.
- Fix from prototype: skipping a word in review must keep it in the queue.
- Unit tests for scoring, mastery thresholds, day counting, and scheduling.
- Level-up celebration screen.

### Phase 5: Profiles and multiplayer
- Up to 4 local profiles with name and avatar color.
- Turn manager: co-op mode (shared star goal) and friendly race mode (first to target), each player served from his or her own level.
- Large "whose turn" banner. Ignore speech results that arrive during the turn handoff.

### Phase 6: Parent dashboard
- Behind a simple gate (hold a button for 3 seconds).
- Views and actions per SPEC.md, including JSON export and import.

### Phase 7 (optional, ask first): Cloud pronunciation engine
- Research current options for child speech and phoneme-level pronunciation scoring (for example Azure Speech pronunciation assessment). Verify current pricing, browser support, and data handling before proposing one.
- Implement as another Recognizer behind an opt-in setting. Keys must not ship in client code, so propose a minimal proxy.
- Do not start this phase without the user's approval.

## Testing with the child
At the end of each phase from 2 onward, give the user a short test script, for example:
- Read 10 words correctly. Count how many the app rejected.
- Misread 5 words on purpose (cap for cape). Count how many the app accepted.
- Close and reopen the app. Confirm stars and levels are still there.

## Definition of done for v1
- Phases 0 to 6 complete, all engine tests passing.
- Validator passes on all content.
- Works in Chrome on desktop and on a tablet, installed as a PWA.
- A 10-minute session runs with no console errors and no stuck listening state.
