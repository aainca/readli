import { describe, expect, it } from 'vitest';
import { countDistinctDays, dayKey, evaluateMastery, isCleanRead, type AttemptLike } from '../engine/mastery';

const DAY = 24 * 60 * 60 * 1000;
const base = new Date(2026, 9, 12, 10, 0, 0).getTime(); // local noon-ish, avoids midnight edges

function attempt(over: Partial<AttemptLike> = {}): AttemptLike {
  return { timestamp: base, tries: 1, helpStep: 0, result: 'correct', mode: 'practice', ...over };
}
function series(n: number, clean: number, days = 1): AttemptLike[] {
  return Array.from({ length: n }, (_, i) => attempt({
    timestamp: base + Math.floor((i * days) / n) * DAY + i * 1000,
    tries: i < clean ? 1 : 2,
  }));
}

describe('isCleanRead', () => {
  it('is correct, first try, no help', () => {
    expect(isCleanRead(attempt())).toBe(true);
    expect(isCleanRead(attempt({ tries: 2 }))).toBe(false);
    expect(isCleanRead(attempt({ helpStep: 1 }))).toBe(false);
    expect(isCleanRead(attempt({ result: 'modeled' }))).toBe(false);
  });
});

describe('day counting', () => {
  it('keys by local calendar day', () => {
    expect(dayKey(base)).toBe('2026-10-12');
    expect(countDistinctDays([base, base + 1000, base + DAY, base + 2 * DAY])).toBe(3);
    expect(countDistinctDays([])).toBe(0);
  });
});

describe('evaluateMastery', () => {
  it('needs a full window of 20', () => {
    const r = evaluateMastery(series(19, 19, 2));
    expect(r.mastered).toBe(false);
    expect(r.needs.attempts).toBe(1);
  });
  it('masters at 85% over 2 days', () => {
    const r = evaluateMastery(series(20, 17, 2));
    expect(r.accuracy).toBeCloseTo(0.85);
    expect(r.distinctDays).toBe(2);
    expect(r.mastered).toBe(true);
  });
  it('does not master at 80% or on a single day', () => {
    expect(evaluateMastery(series(20, 16, 2)).mastered).toBe(false);
    const oneDay = evaluateMastery(series(20, 20, 1));
    expect(oneDay.mastered).toBe(false);
    expect(oneDay.needs.days).toBe(1);
  });
  it('uses only the last 20 attempts', () => {
    const old = series(20, 0, 1).map((a) => ({ ...a, timestamp: a.timestamp - 30 * DAY }));
    const r = evaluateMastery([...old, ...series(20, 18, 2)]);
    expect(r.attemptsInWindow).toBe(20);
    expect(r.mastered).toBe(true);
  });
  it('steps back under 60% once 10 attempts exist', () => {
    expect(evaluateMastery(series(9, 0)).stepBack).toBe(false);
    expect(evaluateMastery(series(10, 5)).stepBack).toBe(true);
    expect(evaluateMastery(series(10, 6)).stepBack).toBe(false);
  });
  it('ignores placement attempts', () => {
    const r = evaluateMastery(series(20, 20, 2).map((a) => ({ ...a, mode: 'placement' as const })));
    expect(r.attemptsInWindow).toBe(0);
  });
});
