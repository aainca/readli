import type { Level, SkillId, Word } from '../content/schema';
import { config } from './config';
import { dayKey } from './mastery';
import { shuffle } from './session';

/**
 * Spaced review queue and session mix. Pure.
 *
 * Review: a missed or skipped word enters at stage 0 (same session). Each
 * clean first-try read on a new day moves it to the next interval
 * (1, 3, 7 days). After 3 clean reads on separate days it retires. A miss
 * sends it back to stage 0 but keeps the days already earned.
 */
export interface ReviewItem {
  profileId: string;
  word: string;
  skillId: SkillId;
  level: Level;
  /** Index into config.review.intervalsDays. */
  stage: number;
  /** When it is next due. */
  dueAt: number;
  /** Day keys of clean first-try reads. */
  cleanDays: string[];
  addedAt: number;
  /** Set when retired. Kept for the dashboard. */
  retiredAt?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dueAfter(stage: number, now: number): number {
  const days = config.review.intervalsDays[Math.min(stage, config.review.intervalsDays.length - 1)] ?? 0;
  return now + days * DAY_MS;
}

export function enqueueReview(existing: ReviewItem | undefined, word: Word, profileId: string, now: number): ReviewItem {
  if (existing && !existing.retiredAt) {
    // Already waiting: a new miss or skip pulls it back to the same session.
    return { ...existing, stage: 0, dueAt: now };
  }
  return {
    profileId,
    word: word.text,
    skillId: word.skillId,
    level: word.level,
    stage: 0,
    dueAt: now,
    cleanDays: existing?.cleanDays ?? [],
    addedAt: now,
  };
}

/** Applies a read of a review word. Returns the updated item (retired when done). */
export function recordReviewRead(item: ReviewItem, read: { clean: boolean; timestamp: number }): ReviewItem {
  if (!read.clean) {
    return { ...item, stage: 0, dueAt: read.timestamp };
  }
  const day = dayKey(read.timestamp);
  // A second clean read on the same day changes nothing: intervals count days.
  if (item.cleanDays.includes(day)) return item;
  const cleanDays = [...item.cleanDays, day];
  if (cleanDays.length >= config.review.retireAfterCleanDays) {
    return { ...item, cleanDays, retiredAt: read.timestamp, dueAt: Number.MAX_SAFE_INTEGER };
  }
  const stage = Math.min(item.stage + 1, config.review.intervalsDays.length - 1);
  return { ...item, cleanDays, stage, dueAt: dueAfter(stage, read.timestamp) };
}

export function isDue(item: ReviewItem, now: number): boolean {
  return !item.retiredAt && item.dueAt <= now;
}

export function dueReviews(items: ReviewItem[], now: number): ReviewItem[] {
  return items.filter((i) => isDue(i, now)).sort((a, b) => a.dueAt - b.dueAt);
}

/* ---------- session mix ---------- */

export interface SessionPlanInput {
  /** Practice pool at the current level. */
  current: Word[];
  /** Practice pool one level below, used while stepping back. */
  below: Word[];
  /** Words whose review is due now. */
  review: Word[];
  /** Practice words from levels already mastered or placed out of. */
  mastered: Word[];
  stepBack: boolean;
  count?: number;
  rng?: () => number;
}

export interface SessionPlan {
  words: Word[];
  counts: { current: number; below: number; review: number; mastered: number };
}

/**
 * About 70% current-level words, 20% review, 10% older mastered words.
 * Short buckets give their slots back to the current level. Review and
 * mastered words are spread through the session rather than bunched.
 */
export function planSession(input: SessionPlanInput): SessionPlan {
  const count = input.count ?? config.session.wordsPerSession;
  const rng = input.rng ?? Math.random;
  const mix = config.session.mix;

  const reviewN = Math.min(input.review.length, Math.round(count * mix.review));
  const masteredN = Math.min(input.mastered.length, Math.round(count * mix.mastered));
  let currentN = count - reviewN - masteredN;
  let belowN = 0;
  if (input.stepBack && input.below.length > 0) {
    belowN = Math.min(input.below.length, Math.round(currentN * config.mastery.stepBackMix));
    currentN -= belowN;
  }

  const take = (pool: Word[], n: number) => shuffle(pool, rng).slice(0, Math.min(n, pool.length));
  const current = take(input.current, currentN);
  const below = take(input.below, belowN);
  const review = take(input.review, reviewN);
  const mastered = take(input.mastered, masteredN);

  // Main run: current and below shuffled together. Then spread the extras.
  const main = shuffle([...current, ...below], rng);
  const extras = shuffle([...review, ...mastered], rng);
  const words: Word[] = [];
  const gap = extras.length ? Math.max(1, Math.floor((main.length + extras.length) / (extras.length + 1))) : Infinity;
  let e = 0;
  for (let i = 0; i < main.length; i++) {
    words.push(main[i]!);
    if (e < extras.length && (i + 1) % gap === 0) words.push(extras[e++]!);
  }
  while (e < extras.length) words.push(extras[e++]!);

  return {
    words,
    counts: { current: current.length, below: below.length, review: review.length, mastered: mastered.length },
  };
}
