import { describe, expect, it } from 'vitest';
import { matchWord, normalize, tokenize } from '../engine/matcher';

const cat = { text: 'cat' };
const me = { text: 'me' };
const so = { text: 'so', homophones: ['sew', 'sow'] };
const cape = { text: 'cape', confusables: [{ heard: 'cap', hint: 'That was a short a. Look at the e at the end.' }] };

describe('normalize', () => {
  it('lowercases, strips punctuation and trims', () => {
    expect(normalize('  Cat! ')).toBe('cat');
    expect(normalize("Don't")).toBe('dont');
    expect(tokenize('The  cat, sat.')).toEqual(['the', 'cat', 'sat']);
  });
});

describe('matchWord', () => {
  it('"catalog" does not match "cat"', () => {
    expect(matchWord(['catalog'], cat).outcome).toBe('wrong');
  });
  it('"home" does not match "me"', () => {
    expect(matchWord(['home'], me).outcome).toBe('wrong');
  });
  it('"sew" matches "so"', () => {
    expect(matchWord(['sew'], so)).toMatchObject({ outcome: 'correct', matched: 'sew' });
  });
  it('"cap" for "cape" returns the hint', () => {
    expect(matchWord(['cap'], cape)).toMatchObject({ outcome: 'confusable', hint: cape.confusables[0]!.hint });
  });
  it('accepts when any alternative or token matches', () => {
    expect(matchWord(['cab', 'cap', 'cape'], cape).outcome).toBe('correct');
    expect(matchWord(['the cat'], cat).outcome).toBe('correct');
  });
  it('prefers correct over a confusable in another alternative', () => {
    expect(matchWord(['cap', 'Cape.'], cape).outcome).toBe('correct');
  });
  it('is case and punctuation insensitive', () => {
    expect(matchWord(['CAT.'], cat).outcome).toBe('correct');
  });
  it('reports empty input', () => {
    expect(matchWord(['', '  '], cat).outcome).toBe('empty');
  });
});
