import { describe, expect, it } from 'vitest';
import { levelStats, retestDue, sittings, trickiestWords, weeklyPractice, weekKey, type DashAttempt } from '../engine/dashboard';

const DAY = 24 * 3600 * 1000;
const MIN = 60 * 1000;
const base = new Date(2026, 10, 18, 10, 0, 0).getTime(); // Wed Nov 18 2026
const a = (over: Partial<DashAttempt>): DashAttempt => ({ word: 'cat', skillId: '1.1', level: 1, timestamp: base, tries: 1, helpStep: 0, result: 'correct', mode: 'practice', panelOn: true, ...over });

describe('levelStats', () => {
  it('computes accuracy, status and panel split per level', () => {
    const attempts = [
      a({}), a({ tries: 2 }), a({ panelOn: false }), a({ panelOn: false, tries: 2 }),
      a({ level: 2 }), a({ mode: 'placement', level: 3 }),
    ];
    const stats = levelStats(attempts, { '1.1': 2 }, { '1.1': [1] }, {});
    const l1 = stats.find((s) => s.skillId === '1.1' && s.level === 1)!;
    expect(l1).toMatchObject({ attempts: 4, cleanReads: 2, accuracy: 0.5, status: 'mastered', panelOnAccuracy: 0.5, panelOffAccuracy: 0.5 });
    expect(stats.find((s) => s.skillId === '1.1' && s.level === 2)!.status).toBe('current');
    expect(stats.find((s) => s.skillId === '1.1' && s.level === 3)!).toMatchObject({ status: 'locked', attempts: 0 });
    expect(stats.find((s) => s.skillId === '1.6' && s.level === 3)!.status).toBe('current');
    expect(stats.some((s) => s.skillId === '2.2')).toBe(false);
  });
  it('marks placed-out levels', () => {
    const stats = levelStats([], { '1.3': 3 }, {}, { '1.3': [1, 2] });
    expect(stats.find((s) => s.skillId === '1.3' && s.level === 1)!.status).toBe('placed-out');
  });
});

describe('trickiestWords', () => {
  it('ranks by misses with a minimum number of tries', () => {
    const attempts = [
      a({ word: 'cape', tries: 2 }), a({ word: 'cape', result: 'modeled', tries: 3 }), a({ word: 'cape' }),
      a({ word: 'pine', tries: 2 }), a({ word: 'pine', tries: 2 }),
      a({ word: 'hope', tries: 2 }), // only one try
      a({ word: 'cat' }), a({ word: 'cat' }),
    ];
    const t = trickiestWords(attempts);
    expect(t.map((x) => x.word)).toEqual(['pine', 'cape']); // equal misses, higher miss rate first
    expect(t[0]).toMatchObject({ attempts: 2, misses: 2, missRate: 1 });
    expect(t[1]).toMatchObject({ attempts: 3, misses: 2 });
  });
});

describe('practice time', () => {
  it('groups attempts into sittings with a 10 minute gap', () => {
    const s = sittings([a({}), a({ timestamp: base + 3 * MIN }), a({ timestamp: base + 30 * MIN }), a({ timestamp: base + 31 * MIN })]);
    expect(s).toHaveLength(2);
    expect(s[0]!.attempts).toBe(2);
    expect(s[0]!.minutes).toBeCloseTo(3);
    expect(s[1]!.minutes).toBeCloseTo(1); // one minute minimum
  });
  it('keys weeks by their Monday', () => {
    expect(weekKey(base)).toBe('2026-11-16');
    expect(weekKey(base - 3 * DAY)).toBe('2026-11-09');
  });
  it('reports days and minutes per week, newest first', () => {
    const attempts = [a({}), a({ timestamp: base + 5 * MIN }), a({ timestamp: base + DAY }), a({ timestamp: base - 7 * DAY })];
    const w = weeklyPractice(attempts, 3, base + 2 * DAY);
    expect(w[0]).toMatchObject({ week: '2026-11-16', days: 2, minutes: 6, attempts: 3 });
    expect(w[1]).toMatchObject({ week: '2026-11-09', days: 1, minutes: 1, attempts: 1 });
    expect(w[2]!.attempts).toBe(0);
  });
});

describe('retestDue', () => {
  it('suggests a retest after 6 weeks', () => {
    expect(retestDue(undefined, base)).toBe(false);
    expect(retestDue(base - 41 * DAY, base)).toBe(false);
    expect(retestDue(base - 43 * DAY, base)).toBe(true);
  });
});
