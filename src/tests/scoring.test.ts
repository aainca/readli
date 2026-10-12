import { describe, expect, it } from 'vitest';
import { isCleanRead, starsFor, streakBonus } from '../engine/scoring';

describe('starsFor', () => {
  it('follows the spec table', () => {
    expect(starsFor({ tries: 1, helpStep: 0 })).toBe(10);
    expect(starsFor({ tries: 2, helpStep: 0 })).toBe(6);
    expect(starsFor({ tries: 1, helpStep: 1 })).toBe(6);
    expect(starsFor({ tries: 1, helpStep: 2 })).toBe(4);
    expect(starsFor({ tries: 1, helpStep: 3 })).toBe(2);
    expect(starsFor({ tries: 3, helpStep: 0 })).toBe(2);
    expect(starsFor({ tries: 2, helpStep: 2 })).toBe(4);
  });
});

describe('streakBonus', () => {
  it('awards +5 at every 5 in a row', () => {
    expect(streakBonus(4)).toBe(0);
    expect(streakBonus(5)).toBe(5);
    expect(streakBonus(10)).toBe(5);
    expect(streakBonus(0)).toBe(0);
  });
});

describe('isCleanRead', () => {
  it('is first try with no help', () => {
    expect(isCleanRead({ tries: 1, helpStep: 0 })).toBe(true);
    expect(isCleanRead({ tries: 2, helpStep: 0 })).toBe(false);
    expect(isCleanRead({ tries: 1, helpStep: 1 })).toBe(false);
  });
});
