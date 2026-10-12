import { describe, expect, it } from 'vitest';
import { getWord } from '../content';
import {
  coachHelpStep, createCoach, decideCoach, reduceCoach, splitGaps, updateCoachCounts, vowelIndices,
  type CoachEvent, type CoachState,
} from '../engine/coach';
import { COACH_PROMPTS } from '../content/coach-prompts';

const run = (s: CoachState, events: CoachEvent[]) => events.reduce(reduceCoach, s);
const rabbit = getWord('rabbit')!;
const robot = getWord('robot')!;
const baby = getWord('baby')!;

describe('vowels and gaps', () => {
  it('finds vowel letters, treating y as a vowel where the data says so', () => {
    expect(vowelIndices(rabbit)).toEqual([1, 4]);
    expect(vowelIndices(baby)).toEqual([1, 3]);
    expect(vowelIndices(getWord('yesterday')!)).toEqual([1, 4, 7, 8]);
    expect(vowelIndices(getWord('pancake')!)).toEqual([1, 4, 6]);
  });
  it('computes split gaps', () => {
    expect(splitGaps(rabbit)).toEqual([3]);
    expect(splitGaps(getWord('fantastic')!)).toEqual([3, 6]);
  });
  it('lists the letters between the vowels around each split', () => {
    expect(createCoach(rabbit).between).toEqual([{ gap: 3, letters: [2, 3] }]);
    expect(createCoach(robot).between).toEqual([{ gap: 2, letters: [2] }]);
  });
});

describe('coach flow', () => {
  it('walks a correct run: vowels, between, split, read, blend, done with no help', () => {
    let s = createCoach(rabbit);
    s = run(s, [{ type: 'tapLetter', index: 1 }]);
    expect(s.step).toBe('vowels');
    s = run(s, [{ type: 'tapLetter', index: 4 }]);
    expect(s.step).toBe('between');
    expect(s.feedback).toBe('2 vowels.');
    s = run(s, [{ type: 'next' }]);
    expect(s.step).toBe('split');
    s = run(s, [{ type: 'tapGap', gap: 3 }]);
    expect(s.step).toBe('read');
    expect(s.feedback).toBe('Yes! Two consonants in the middle, split between them.');
    expect(s.revealed).toBe(false);
    s = run(s, [{ type: 'nextSyllable' }]);
    expect(s.readIndex).toBe(1);
    s = run(s, [{ type: 'nextSyllable' }]);
    expect(s.step).toBe('blend');
    s = run(s, [{ type: 'blendResult', correct: true }]);
    expect(s.step).toBe('done');
    expect(coachHelpStep(s)).toBe(0);
  });

  it('a consonant tap gives feedback and does not advance', () => {
    const s = run(createCoach(rabbit), [{ type: 'tapLetter', index: 0 }]);
    expect(s.step).toBe('vowels');
    expect(s.feedback).toBe(COACH_PROMPTS.consonantTap);
    expect(s.wrongTaps).toBe(1);
  });

  it('a wrong split reveals the right one with its reason and costs help step 1', () => {
    let s = run(createCoach(robot), [{ type: 'showVowels' }, { type: 'next' }]);
    expect(s.vowelsRevealed).toBe(true);
    s = run(s, [{ type: 'tapGap', gap: 3 }]);
    expect(s.step).toBe('read');
    expect(s.foundSplits).toEqual([2]);
    expect(s.revealed).toBe(true);
    expect(s.feedback).toBe('Not there. Here it is. One consonant in the middle. Try it with the second part first.');
    expect(coachHelpStep(s)).toBe(1);
  });

  it('handles words with two splits, one at a time', () => {
    const fantastic = getWord('fantastic')!;
    let s = run(createCoach(fantastic), [{ type: 'showVowels' }, { type: 'next' }]);
    s = run(s, [{ type: 'tapGap', gap: 6 }]);
    expect(s.step).toBe('split');
    expect(s.foundSplits).toEqual([6]);
    s = run(s, [{ type: 'tapGap', gap: 3 }]);
    expect(s.step).toBe('read');
    expect(s.revealed).toBe(false);
    // three syllables to read
    s = run(s, [{ type: 'nextSyllable' }, { type: 'nextSyllable' }]);
    expect(s.step).toBe('read');
    s = run(s, [{ type: 'nextSyllable' }]);
    expect(s.step).toBe('blend');
  });

  it('after a miss on blend asks prompt 6 and offers the other vowel sound', () => {
    let s = run(createCoach(robot), [{ type: 'showVowels' }, { type: 'next' }, { type: 'tapGap', gap: 2 }, { type: 'nextSyllable' }, { type: 'nextSyllable' }]);
    s = run(s, [{ type: 'blendResult', correct: false }]);
    expect(s.step).toBe('check');
    s = run(s, [{ type: 'checkAnswer', realWord: false }]);
    expect(s.step).toBe('blend');
    expect(s.feedback).toBe(COACH_PROMPTS.tryOther);
  });
});

describe('decideCoach', () => {
  it('is off unless guided', () => {
    expect(decideCoach('off', { seenAtLevel: 0, cleanStreak: 0 }, true)).toBe('none');
    expect(decideCoach('onRequest', { seenAtLevel: 0, cleanStreak: 0 }, true)).toBe('none');
  });
  it('runs on the first 5 words of a level and after a miss', () => {
    expect(decideCoach('guided', { seenAtLevel: 4, cleanStreak: 0 }, false)).toBe('full');
    expect(decideCoach('guided', { seenAtLevel: 5, cleanStreak: 0 }, false)).toBe('none');
    expect(decideCoach('guided', { seenAtLevel: 20, cleanStreak: 0 }, true)).toBe('full');
  });
  it('fades to a reminder after 5 clean reads, and a miss brings it back', () => {
    let c = { seenAtLevel: 0, cleanStreak: 0 };
    for (let i = 0; i < 5; i++) c = updateCoachCounts(c, { correct: true, usedCoach: false });
    expect(c.cleanStreak).toBe(5);
    expect(decideCoach('guided', { ...c, seenAtLevel: 2 }, false)).toBe('reminder');
    expect(decideCoach('guided', c, true)).toBe('full');
    c = updateCoachCounts(c, { correct: false, usedCoach: false });
    expect(c.cleanStreak).toBe(0);
    expect(decideCoach('guided', { ...c, seenAtLevel: 2 }, false)).toBe('full');
  });
  it('a coached read does not extend the clean streak', () => {
    const c = updateCoachCounts({ seenAtLevel: 0, cleanStreak: 3 }, { correct: true, usedCoach: true });
    expect(c.cleanStreak).toBe(0);
  });
});
