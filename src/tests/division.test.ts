import { describe, expect, it } from 'vitest';
import { deriveDivision } from '../content/division';

describe('deriveDivision', () => {
  it('splits between two middle consonants', () => {
    expect(deriveDivision(['rab', 'bit'], ['closed', 'closed'])).toEqual(['VC/CV']);
    expect(deriveDivision(['nap', 'kin'], ['closed', 'closed'])).toEqual(['VC/CV']);
    expect(deriveDivision(['pan', 'cake'], ['closed', 'vce'])).toEqual(['VC/CV']);
  });
  it('splits before a single consonant when the first syllable is open', () => {
    expect(deriveDivision(['ro', 'bot'], ['open', 'closed'])).toEqual(['V/CV']);
    expect(deriveDivision(['ti', 'ger'], ['open', 'r'])).toEqual(['V/CV']);
    expect(deriveDivision(['ba', 'by'], ['open', 'open'])).toEqual(['V/CV']);
  });
  it('splits after a single consonant when the first syllable is closed', () => {
    expect(deriveDivision(['cab', 'in'], ['closed', 'closed'])).toEqual(['VC/V']);
    expect(deriveDivision(['lem', 'on'], ['closed', 'closed'])).toEqual(['VC/V']);
  });
  it('splits between two vowels that do not team up', () => {
    expect(deriveDivision(['li', 'on'], ['open', 'closed'])).toEqual(['V/V']);
    expect(deriveDivision(['po', 'em'], ['open', 'closed'])).toEqual(['V/V']);
  });
  it('marks consonant-le', () => {
    expect(deriveDivision(['ta', 'ble'], ['open', 'cle'])).toEqual(['C-le']);
    expect(deriveDivision(['can', 'dle'], ['closed', 'cle'])).toEqual(['C-le']);
  });
  it('marks prefixes and suffixes', () => {
    expect(deriveDivision(['un', 'lock'], ['closed', 'closed'])).toEqual(['affix']);
    expect(deriveDivision(['help', 'ful'], ['closed', 'closed'])).toEqual(['affix']);
    expect(deriveDivision(['in', 'vent', 'ed'], ['closed', 'closed', 'closed'])).toEqual(['VC/CV', 'affix']);
  });
  it('handles three-syllable words with mixed splits', () => {
    expect(deriveDivision(['ra', 'di', 'o'], ['open', 'open', 'open'])).toEqual(['V/CV', 'V/V']);
    expect(deriveDivision(['fan', 'tas', 'tic'], ['closed', 'closed', 'closed'])).toEqual(['VC/CV', 'VC/CV']);
  });
  it('treats w after a vowel as part of the vowel team', () => {
    expect(deriveDivision(['flow', 'er'], ['diphthong', 'r'])).toEqual(['V/V']);
    expect(deriveDivision(['pil', 'low'], ['closed', 'team'])).toEqual(['VC/CV']);
  });
  it('treats a leading y as a consonant', () => {
    expect(deriveDivision(['yes', 'ter', 'day'], ['closed', 'r', 'team'])).toEqual(['VC/CV', 'VC/CV']);
  });
});
