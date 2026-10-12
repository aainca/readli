import type { Word } from '../content/schema';

/**
 * Phase 2 word order: shuffle the practice pool and serve it in order.
 * Words that need review (modeled or skipped) come back later in the same
 * session. The full 70/20/10 scheduler replaces this in Phase 4.
 */
export interface SessionState {
  queue: Word[];
  review: Word[];
  served: number;
}

export function createSession(words: Word[], rng: () => number = Math.random): SessionState {
  return { queue: shuffle(words, rng), review: [], served: 0 };
}

/** A session from an already planned order (see scheduler.planSession). */
export function createSessionFromPlan(words: Word[]): SessionState {
  return { queue: [...words], review: [], served: 0 };
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Every 4th word is a review word when one is waiting. */
const REVIEW_EVERY = 4;

export function nextWord(s: SessionState): { word: Word | null; state: SessionState } {
  const useReview = s.review.length > 0 && (s.served + 1) % REVIEW_EVERY === 0;
  if (useReview || s.queue.length === 0) {
    const [word, ...rest] = s.review;
    if (word) return { word, state: { ...s, review: rest, served: s.served + 1 } };
  }
  const [word, ...rest] = s.queue;
  if (!word) return { word: null, state: s };
  return { word, state: { ...s, queue: rest, served: s.served + 1 } };
}

/** Skipping or missing a word keeps it in the session: it goes to the back of the review list. */
export function requeue(s: SessionState, word: Word): SessionState {
  if (s.review.some((w) => w.text === word.text)) return s;
  return { ...s, review: [...s.review, word] };
}
