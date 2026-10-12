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
    /** Rolling window of attempts per group and level. */
    windowSize: 20,
    /** First-try, no-help accuracy needed to master a level. */
    masteryAccuracy: 0.85,
    /** Attempts in the window must span at least this many distinct calendar days. */
    minDistinctDays: 2,
    /** Below this accuracy the session mixes in words from the level below. */
    stepBackAccuracy: 0.6,
  },
  session: {
    /** Mix of words per session. Must sum to 1. */
    mix: { current: 0.7, review: 0.2, mastered: 0.1 },
  },
  review: {
    /** Spaced schedule in days. Index 0 is the same session. */
    intervalsDays: [0, 1, 3, 7],
    /** Retire after this many clean first-try reads on separate days. */
    retireAfterCleanDays: 3,
  },
  content: {
    /** Target minimum words per group per level. */
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
