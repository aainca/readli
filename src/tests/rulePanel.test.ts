import { describe, expect, it } from 'vitest';
import { getWord } from '../content';
import { describeSyllable, rulePanelFor } from '../engine/rulePanel';

describe('describeSyllable', () => {
  it('describes each type', () => {
    expect(describeSyllable('pan', 'closed', 0)).toMatchObject({ text: 'pan: short vowel, short a', ruleLetters: [1] });
    expect(describeSyllable('cake', 'vce', 3)).toMatchObject({ text: 'cake: silent e, long a, silent e', ruleLetters: [4, 6] });
    expect(describeSyllable('ro', 'open', 0)).toMatchObject({ sound: 'long o', ruleLetters: [1] });
    expect(describeSyllable('rain', 'team', 0)).toMatchObject({ sound: 'ai team', ruleLetters: [1, 2] });
    expect(describeSyllable('gar', 'r', 0)).toMatchObject({ sound: 'bossy r, ar', ruleLetters: [1, 2] });
    expect(describeSyllable('ble', 'cle', 2)).toMatchObject({ sound: 'ble ending', ruleLetters: [2, 3, 4] });
    expect(describeSyllable('coin', 'diphthong', 0)).toMatchObject({ sound: 'oi glide', ruleLetters: [1, 2] });
    expect(describeSyllable('fly', 'open', 0)).toMatchObject({ sound: 'long i (y)', ruleLetters: [2] });
    expect(describeSyllable('night', 'team', 0)).toMatchObject({ sound: 'igh team', ruleLetters: [1, 2, 3] });
  });
});

describe('rulePanelFor', () => {
  it('builds the panel for pancake', () => {
    const p = rulePanelFor(getWord('pancake')!);
    expect(p.skillId).toBe('1.3');
    expect(p.skillName).toBe('Silent e');
    expect(p.lines.map((l) => l.text)).toEqual(['pan: short vowel, short a', 'cake: silent e, long a, silent e']);
    expect(p.ruleLetters).toEqual([1, 4, 6]);
  });
  it('builds the panel for a one-syllable word', () => {
    const p = rulePanelFor(getWord('rain')!);
    expect(p.lines).toHaveLength(1);
    expect(p.ruleLetters).toEqual([1, 2]);
  });
});
