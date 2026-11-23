import { describe, expect, it } from 'vitest';
import { getWord, wordsFor } from '../content';
import { grammarFor } from '../engine/grammar';

describe('grammarFor', () => {
  it('includes the target, homophones, confusables and distractors from the pool', () => {
    const cape = getWord('cape')!;
    const g = grammarFor(cape, wordsFor('1.3', 1), 5, () => 0.5);
    expect(g).toContain('cape');
    expect(g).toContain('cap');
    expect(g.length).toBeGreaterThanOrEqual(7);
    expect(new Set(g).size).toBe(g.length);
  });
  it('includes homophones', () => {
    expect(grammarFor(getWord('so')!, [], 0)).toEqual(['so', 'sew', 'sow']);
  });
});
