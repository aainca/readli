import { describe, expect, it } from 'vitest';
import type { Word } from '../content/schema';
import { dueReviews, enqueueReview, isDue, planSession, recordReviewRead, type ReviewItem } from '../engine/scheduler';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date(2026, 9, 12, 10, 0, 0).getTime();
const w = (text: string, level: 1 | 2 = 1): Word => ({ text, set: 1, skillId: '1.1', level, syllables: [text], syllableTypes: ['closed'], chunks: [...text] });
const words = (prefix: string, n: number, level: 1 | 2 = 1) => Array.from({ length: n }, (_, i) => w(`${prefix}${i}`, level));
const seq = () => { let i = 0; return () => ((i += 0.37) % 1); };

describe('review queue', () => {
  it('enqueues a missed word for the same session', () => {
    const item = enqueueReview(undefined, w('cat'), 'p', now);
    expect(item).toMatchObject({ word: 'cat', stage: 0, dueAt: now, cleanDays: [] });
    expect(isDue(item, now)).toBe(true);
  });
  it('a skipped word stays in the queue', () => {
    const item = enqueueReview(undefined, w('cat'), 'p', now);
    const again = enqueueReview(item, w('cat'), 'p', now + 1000);
    expect(again.stage).toBe(0);
    expect(isDue(again, now + 1000)).toBe(true);
    expect(dueReviews([again], now + 1000)).toHaveLength(1);
  });
  it('moves through 1, 3, 7 days on clean reads and retires after 3 separate days', () => {
    let item: ReviewItem = enqueueReview(undefined, w('cat'), 'p', now);
    item = recordReviewRead(item, { clean: true, timestamp: now });
    expect(item.stage).toBe(1);
    expect(item.dueAt).toBe(now + 1 * DAY);
    expect(isDue(item, now + 1000)).toBe(false);
    // a second clean read the same day does not add a day
    item = recordReviewRead(item, { clean: true, timestamp: now + 2000 });
    expect(item.cleanDays).toHaveLength(1);
    item = recordReviewRead(item, { clean: true, timestamp: now + 1 * DAY });
    expect(item.stage).toBe(2);
    expect(item.dueAt).toBe(now + 1 * DAY + 3 * DAY);
    expect(item.cleanDays).toHaveLength(2);
    item = recordReviewRead(item, { clean: true, timestamp: now + 4 * DAY });
    expect(item.retiredAt).toBe(now + 4 * DAY);
    expect(isDue(item, now + 100 * DAY)).toBe(false);
  });
  it('a miss returns the word to the same session but keeps earned days', () => {
    let item = enqueueReview(undefined, w('cat'), 'p', now);
    item = recordReviewRead(item, { clean: true, timestamp: now });
    item = recordReviewRead(item, { clean: false, timestamp: now + DAY });
    expect(item.stage).toBe(0);
    expect(item.dueAt).toBe(now + DAY);
    expect(item.cleanDays).toHaveLength(1);
  });
  it('a retired word re-enters fresh when missed again', () => {
    let item = enqueueReview(undefined, w('cat'), 'p', now);
    for (let d = 0; d < 3; d++) item = recordReviewRead(item, { clean: true, timestamp: now + d * 10 * DAY });
    expect(item.retiredAt).toBeDefined();
    const again = enqueueReview(item, w('cat'), 'p', now + 40 * DAY);
    expect(again.retiredAt).toBeUndefined();
    expect(again.stage).toBe(0);
  });
});

describe('planSession', () => {
  it('mixes about 70/20/10 when every bucket has enough words', () => {
    const plan = planSession({ current: words('c', 40), below: [], review: words('r', 10), mastered: words('m', 10), stepBack: false, count: 20, rng: seq() });
    expect(plan.counts).toEqual({ current: 14, below: 0, review: 4, mastered: 2 });
    expect(plan.words).toHaveLength(20);
    expect(new Set(plan.words.map((x) => x.text)).size).toBe(20);
  });
  it('gives unused review and mastered slots back to the current level', () => {
    const plan = planSession({ current: words('c', 40), below: [], review: [w('r0')], mastered: [], stepBack: false, count: 20, rng: seq() });
    expect(plan.counts).toEqual({ current: 19, below: 0, review: 1, mastered: 0 });
  });
  it('mixes in the level below when stepping back', () => {
    const plan = planSession({ current: words('c', 40), below: words('b', 40, 2), review: [], mastered: [], stepBack: true, count: 20, rng: seq() });
    expect(plan.counts.below).toBe(8);
    expect(plan.counts.current).toBe(12);
  });
  it('spreads review words through the session instead of bunching them', () => {
    const plan = planSession({ current: words('c', 40), below: [], review: words('r', 10), mastered: [], stepBack: false, count: 20, rng: seq() });
    const positions = plan.words.map((x, i) => (x.text.startsWith('r') ? i : -1)).filter((i) => i >= 0);
    expect(positions.length).toBe(4);
    expect(positions[0]).toBeGreaterThan(0);
    expect(positions[positions.length - 1]! - positions[0]!).toBeGreaterThan(6);
  });
  it('handles a tiny pool', () => {
    const plan = planSession({ current: words('c', 3), below: [], review: [], mastered: [], stepBack: false, count: 20, rng: seq() });
    expect(plan.words).toHaveLength(3);
  });
});
