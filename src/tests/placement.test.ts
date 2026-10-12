import { describe, expect, it } from 'vitest';
import { wordsFor } from '../content';
import { SET1_SKILL_IDS, type Set1SkillId } from '../content/schema';
import type { AttemptLike } from '../engine/mastery';
import { fastAdjust, groupStatus, placementStep, probeWords, type PlacementEntry } from '../engine/placement';

/** Runs the whole test with an oracle that decides each word. */
function runTest(decide: (skillId: Set1SkillId, level: number | string, i: number) => boolean) {
  const entries: PlacementEntry[] = [];
  for (let guard = 0; guard < 200; guard++) {
    const step = placementStep(entries);
    if (step.kind === 'done') return { step, entries };
    entries.push({ skillId: step.skillId, level: step.level, word: `${step.skillId}-${step.level}-${step.index}`, correct: decide(step.skillId, step.level, entries.length) });
  }
  throw new Error('did not finish');
}

describe('placementStep', () => {
  it('starts every group at Level 2 (or its lowest level)', () => {
    const first = placementStep([]);
    expect(first).toMatchObject({ kind: 'probe', skillId: '1.1', level: 2, index: 0 });
  });

  it('all correct places at Level 4 everywhere and places out the levels below', () => {
    const { step, entries } = runTest(() => true);
    for (const id of SET1_SKILL_IDS) expect(step.levels[id], id).toBe(4);
    expect(step.placedOut['1.1']).toEqual([1, 2, 3]);
    expect(step.placedOut['1.6']).toEqual([3]);
    // Three groups take 12 words each; the cap of 40 leaves the rest estimated from them.
    expect(entries.length).toBe(40);
    expect(step.wordsTested).toBe(40);
    expect(step.endedEarly).toBe(false);
    expect(step.estimated).toEqual(['1.4', '1.5', '1.6', '1.7']);
    expect(step.untested).toEqual(['1.5', '1.6', '1.7']);
  });

  it('all wrong places at Level 1 and ends early after 6 misses in a row', () => {
    const { step } = runTest(() => false);
    expect(step.endedEarly).toBe(true);
    expect(step.wordsTested).toBe(6);
    for (const id of SET1_SKILL_IDS) expect(step.levels[id]).toBe(id === '1.6' ? 3 : 1);
    expect(step.untested).toEqual(['1.2', '1.3', '1.4', '1.5', '1.6', '1.7']);
    expect(step.estimated).toEqual([]);
    expect(step.placedOut['1.1']).toEqual([]);
  });

  it('pass Level 2 then fail Level 3 starts at Level 3', () => {
    const entries: PlacementEntry[] = [];
    for (let i = 0; i < 4; i++) entries.push({ skillId: '1.1', level: 2, word: `a${i}`, correct: i < 3 });
    expect(placementStep(entries)).toMatchObject({ kind: 'probe', skillId: '1.1', level: 3, index: 0 });
    for (let i = 0; i < 4; i++) entries.push({ skillId: '1.1', level: 3, word: `b${i}`, correct: i < 2 });
    expect(groupStatus('1.1', entries)).toMatchObject({ passed: [2], failed: [3], settled: true });
    expect(placementStep(entries)).toMatchObject({ kind: 'probe', skillId: '1.2', level: 2 });
  });

  it('fail Level 2 then pass Level 1 starts at Level 2', () => {
    const entries: PlacementEntry[] = [];
    for (let i = 0; i < 4; i++) entries.push({ skillId: '1.1', level: 2, word: `a${i}`, correct: i < 1 });
    expect(placementStep(entries)).toMatchObject({ kind: 'probe', skillId: '1.1', level: 1 });
    for (let i = 0; i < 4; i++) entries.push({ skillId: '1.1', level: 1, word: `b${i}`, correct: true });
    const status = groupStatus('1.1', entries);
    expect(status.settled).toBe(true);
    // finish the rest quickly by failing everything else without 6 in a row
    const { step } = runTest((id, level, n) => (id === '1.1' ? (level === 2 ? n % 4 === 0 : true) : n % 2 === 0));
    expect(step.levels['1.1']).toBe(2);
    expect(step.placedOut['1.1']).toEqual([1]);
  });

  it('fail Level 2 then fail Level 1 starts at Level 1', () => {
    // two of four right at each probe: fails without six misses in a row
    const { step } = runTest((id, _level, n) => (id === '1.1' ? n % 2 === 0 : n % 4 !== 3));
    expect(step.levels['1.1']).toBe(1);
    expect(step.placedOut['1.1']).toEqual([]);
    expect(step.endedEarly).toBe(false);
  });

  it('a mixed path across groups reports strongest and weakest and estimates the rest', () => {
    const { step } = runTest((id, level, n) => {
      if (id === '1.1') return n % 2 === 0; // fails L2, fails L1 -> L1
      if (id === '1.3' || id === '1.4') return true; // L4
      return level === 2 ? n % 4 !== 3 : n % 2 === 0; // pass L2, fail L3 -> L3
    });
    expect(step.levels['1.1']).toBe(1);
    expect(step.levels['1.2']).toBe(3);
    expect(step.levels['1.3']).toBe(4);
    expect(step.levels['1.4']).toBe(4);
    expect(step.strongest).toBe('1.3');
    expect(step.weakest).toBe('1.1');
    expect(step.wordsTested).toBe(40);
    expect(step.estimated).toEqual(['1.5', '1.6', '1.7']);
    // typical of (L1, L3, L4, L4) from the top: median rounds toward the lower level -> one below the top
    expect(step.levels['1.5']).toBe(3);
    expect(step.levels['1.6']).toBe(3);
  });

  it('caps the test at 40 words', () => {
    const { step } = runTest((_id, _l, n) => n % 3 !== 2);
    expect(step.wordsTested).toBeLessThanOrEqual(40);
  });
});

describe('probeWords', () => {
  it('draws 4 held-out words deterministically for a seed', () => {
    const pool = wordsFor('1.3', 2, { pool: 'test' });
    const a = probeWords(pool, 42);
    const b = probeWords(pool, 42);
    expect(a).toHaveLength(4);
    expect(a.map((w) => w.text)).toEqual(b.map((w) => w.text));
    expect(a.every((w) => w.heldOut)).toBe(true);
    expect(probeWords(pool, 7).map((w) => w.text)).not.toEqual(a.map((w) => w.text));
  });
  it('copes with the short open-syllable pools', () => {
    expect(probeWords(wordsFor('1.2', 1, { pool: 'test' }), 1)).toHaveLength(4);
  });
});

describe('fastAdjust', () => {
  const a = (clean: boolean): AttemptLike => ({ timestamp: 0, tries: clean ? 1 : 2, helpStep: 0, result: 'correct', mode: 'practice' });
  it('waits for 10 attempts', () => {
    expect(fastAdjust(Array.from({ length: 9 }, () => a(true)))).toBe('pending');
  });
  it('moves up at 9 of 10 clean and down at 4 or fewer', () => {
    expect(fastAdjust([...Array.from({ length: 9 }, () => a(true)), a(false)])).toBe('up');
    expect(fastAdjust([...Array.from({ length: 4 }, () => a(true)), ...Array.from({ length: 6 }, () => a(false))])).toBe('down');
    expect(fastAdjust([...Array.from({ length: 6 }, () => a(true)), ...Array.from({ length: 4 }, () => a(false))])).toBe('stay');
  });
  it('ignores placement attempts and only looks at the first 10', () => {
    const list = [...Array.from({ length: 10 }, () => ({ ...a(true), mode: 'placement' as const })), ...Array.from({ length: 10 }, () => a(false))];
    expect(fastAdjust(list)).toBe('down');
  });
});
