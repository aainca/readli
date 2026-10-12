import { describe, expect, it } from 'vitest';
import { getWord } from '../content';
import { sayAsFor, syllableSpeech } from '../speech/sayAs';

describe('sayAsFor', () => {
  it('respells consonant-le endings', () => {
    expect(sayAsFor('ble', 'cle')).toBe('bul');
    expect(sayAsFor('tle', 'cle')).toBe('tul');
    expect(sayAsFor('ckle', 'cle')).toBe('kul');
    expect(sayAsFor('zle', 'cle')).toBe('zul');
  });
  it('respells open syllables so the vowel says its name', () => {
    expect(sayAsFor('ta', 'open')).toBe('tay');
    expect(sayAsFor('ro', 'open')).toBe('roh');
    expect(sayAsFor('ti', 'open')).toBe('tye');
    expect(sayAsFor('e', 'open')).toBe('ee');
    expect(sayAsFor('be', 'open')).toBe('bee');
    expect(sayAsFor('mu', 'open')).toBe('myoo');
    expect(sayAsFor('ru', 'open')).toBe('roo');
    expect(sayAsFor('by', 'open')).toBe('bye');
  });
  it('leaves closed, team, r and silent-e syllables alone', () => {
    expect(sayAsFor('pan', 'closed')).toBe('pan');
    expect(sayAsFor('cake', 'vce')).toBe('cake');
    expect(sayAsFor('rain', 'team')).toBe('rain');
  });
  it('applies a word override per syllable', () => {
    const w = { ...getWord('table')!, sayAs: ['tah', null] };
    expect(syllableSpeech(w)).toEqual(['tah', 'bul']);
    expect(syllableSpeech(getWord('table')!)).toEqual(['tay', 'bul']);
  });
});
