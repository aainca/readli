/**
 * Every tunable threshold lives here. Nothing else in the app hardcodes
 * these numbers.
 */
export const config = {
  stars: {
    /** First try, no help. */
    firstTry: 10,
    /** Second try, or help step 1. */
    secondTryOrHelp1: 6,
    /** Help step 2. */
    help2: 4,
    /** Help step 3, or third try. */
    help3OrThirdTry: 2,
    /** Bonus awarded at every `streakEvery` correct reads in a row. */
    streakBonus: 5,
    streakEvery: 5,
  },
  attempt: {
    /** After this many misses the app models the word and queues it for review. */
    maxTries: 3,
  },
  mastery: {
    /** Rolling window of attempts per skill and level. */
    windowSize: 20,
    /** First-try, no-help accuracy needed to master a level. */
    masteryAccuracy: 0.85,
    /** Attempts in the window must span at least this many distinct calendar days. */
    minDistinctDays: 2,
    /** Below this accuracy the session mixes in words from the level below. */
    stepBackAccuracy: 0.6,
    /** Step back only once this many attempts exist at the level. */
    minAttemptsForStepBack: 10,
    /** Share of the current-level slots given to the level below while stepping back. */
    stepBackMix: 0.4,
  },
  session: {
    /** Mix of words per session. Must sum to 1. */
    mix: { current: 0.7, review: 0.2, mastered: 0.1 },
    /** Words served per session before the summary screen. */
    wordsPerSession: 20,
  },
  review: {
    /** Spaced schedule in days. Index 0 is the same session. */
    intervalsDays: [0, 1, 3, 7],
    /** Retire after this many clean first-try reads on separate days. */
    retireAfterCleanDays: 3,
  },
  placement: {
    /** Each Set 1 group starts its probe at this level. */
    startLevel: 2,
    /** Words per probe at a level. */
    wordsPerProbe: 4,
    /** Correct answers out of wordsPerProbe needed to pass a level. */
    passCount: 3,
    /** Misses in a row that end the test early. */
    maxMissStreak: 6,
    /** Hard cap on words in one test. */
    maxWords: 40,
    /** Held-out test words reserved per Set 1 group per level. */
    heldOutPerLevel: 6,
    /** Provisional placement: first N practice attempts at a placed level. */
    fastAdjust: { window: 10, moveUpAt: 9, moveDownAt: 4 },
    /** The dashboard suggests a retest after this many weeks. */
    retestWeeks: 6,
  },
  coach: {
    /** Guided mode runs the coach on the first N multi-syllable words of a new level. */
    guidedFirstWords: 5,
    /** After N multi-syllable words in a row read correctly without the coach, it shrinks to a reminder. */
    fadeAfterCleanReads: 5,
    /** Help step charged when the app has to reveal the split at prompt 3. */
    revealHelpStep: 1,
  },
  set2: {
    /** Set 2 opens once these Set 1 skills are mastered at this level. */
    unlockAfterSkills: ['1.1', '1.2', '1.3'],
    unlockAtLevel: 2,
  },
  content: {
    /** Target minimum practice words (not held out) per skill per level. */
    minWordsPerLevel: 25,
  },
  parentGate: {
    holdMs: 3000,
  },
  profiles: {
    max: 4,
  },
} as const;

export type Config = typeof config;
