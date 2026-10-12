import { describe, expect, it } from 'vitest';
import { chunkSyllable, chunkWord } from '../content/chunk';
import { parseSource } from '../content/source';
import { validateContent, validateWord } from '../content/validate';
import { allGroupFiles, allWords, getWord } from '../content';
import { config } from '../engine/config';
import type { Word } from '../content/schema';

describe('chunkSyllable', () => {
  it('keeps consonant digraphs together', () => {
    expect(chunkSyllable('shack', 'closed')).toEqual(['sh', 'a', 'ck']);
    expect(chunkSyllable('think', 'closed')).toEqual(['th', 'i', 'nk']);
  });
  it('treats ng before e as n plus soft g', () => {
    expect(chunkSyllable('change', 'vce')).toEqual(['ch', 'a', 'n', 'g', 'e']);
    expect(chunkSyllable('hinge', 'closed')).toEqual(['h', 'i', 'n', 'g', 'e']);
    expect(chunkSyllable('sing', 'closed')).toEqual(['s', 'i', 'ng']);
  });
  it('keeps vowel teams together only in team syllables', () => {
    expect(chunkSyllable('rain', 'team')).toEqual(['r', 'ai', 'n']);
    expect(chunkSyllable('night', 'team')).toEqual(['n', 'igh', 't']);
  });
  it('does not merge r-combos in a silent e syllable', () => {
    expect(chunkSyllable('here', 'vce')).toEqual(['h', 'e', 'r', 'e']);
    expect(chunkSyllable('her', 'r')).toEqual(['h', 'er']);
  });
  it('splits diphthongs and cle', () => {
    expect(chunkSyllable('coin', 'diphthong')).toEqual(['c', 'oi', 'n']);
    expect(chunkSyllable('dle', 'cle')).toEqual(['d', 'le']);
  });
  it('chunks a whole word by syllable', () => {
    expect(chunkWord(['pan', 'cake'], ['closed', 'vce'])).toEqual(['p', 'a', 'n', 'c', 'a', 'k', 'e']);
  });
});

describe('parseSource', () => {
  it('parses levels, defaults and all fields', () => {
    const words = parseSource(
      'vce',
      `# comment\n## 1\ncape | | | | cap=That was a short a.\n## 3\npan-cake | c v | p-a-n-c-a-k-e | | \nso-lo | o o | | sew`,
    );
    expect(words).toHaveLength(3);
    expect(words[0]).toMatchObject({
      text: 'cape', level: 1, syllables: ['cape'], syllableTypes: ['vce'],
      chunks: ['c', 'a', 'p', 'e'], confusables: [{ heard: 'cap', hint: 'That was a short a.' }],
    });
    expect(words[1]).toMatchObject({ text: 'pancake', level: 3, syllableTypes: ['closed', 'vce'] });
    expect(words[2]).toMatchObject({ homophones: ['sew'] });
  });
  it('rejects words before a level header', () => {
    expect(() => parseSource('closed', 'cat')).toThrow(/header/);
  });
});

describe('validateWord', () => {
  const good: Word = {
    text: 'pancake', group: 'vce', level: 3, syllables: ['pan', 'cake'],
    syllableTypes: ['closed', 'vce'], chunks: ['p', 'a', 'n', 'c', 'a', 'k', 'e'],
  };
  it('accepts a good word', () => {
    expect(validateWord(good, 'vce')).toEqual([]);
  });
  it('catches syllables that do not join to the text', () => {
    expect(validateWord({ ...good, syllables: ['pan', 'cak'] }, 'vce').map((i) => i.message)).toEqual(
      expect.arrayContaining([expect.stringMatching(/do not join/)]),
    );
  });
  it('catches a type count mismatch', () => {
    expect(validateWord({ ...good, syllableTypes: ['closed'] }, 'vce').some((i) => /syllableTypes length/.test(i.message))).toBe(true);
  });
  it('catches uppercase text', () => {
    expect(validateWord({ ...good, text: 'Pancake' }, 'vce').some((i) => /lowercase/.test(i.message))).toBe(true);
  });
  it('catches a hint that reveals the word', () => {
    const w = { ...good, confusables: [{ heard: 'pancak', hint: 'Say pancake with a long a.' }] };
    expect(validateWord(w, 'vce').some((i) => /reveals/.test(i.message))).toBe(true);
  });
  it('catches a consonant-le word below level 3', () => {
    const w: Word = { text: 'table', group: 'cle', level: 1, syllables: ['table'], syllableTypes: ['cle'], chunks: ['t', 'a', 'b', 'le'] };
    expect(validateWord(w, 'cle').some((i) => /minimum level/.test(i.message))).toBe(true);
  });
});

describe('validateContent', () => {
  it('flags duplicates across groups', () => {
    const w: Word = { text: 'cat', group: 'closed', level: 1, syllables: ['cat'], syllableTypes: ['closed'], chunks: ['c', 'a', 't'] };
    const r = validateContent(
      [{ group: 'closed', words: [w] }, { group: 'open', words: [{ ...w, group: 'open' }] }],
      1,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /duplicate/.test(e.message))).toBe(true);
  });
});

describe('shipped content', () => {
  it('passes the validator with no errors', () => {
    const r = validateContent(allGroupFiles, config.content.minWordsPerLevel);
    expect(r.errors).toEqual([]);
  });
  it('has every core group at 25+ words per level, except open syllables at levels 1 and 2', () => {
    const r = validateContent(allGroupFiles, config.content.minWordsPerLevel);
    const short = r.warnings.filter((w) => /target is/.test(w.message)).map((w) => `${w.group}: ${w.message}`);
    expect(short).toEqual([
      'open: level 1 has 10 words, target is 25',
      'open: level 2 has 16 words, target is 25',
    ]);
  });
  it('looks up words by text', () => {
    expect(getWord('pancake')?.syllables).toEqual(['pan', 'cake']);
    expect(getWord('so')?.homophones).toContain('sew');
    expect(getWord('cape')?.confusables?.[0]?.heard).toBe('cap');
    expect(allWords.length).toBeGreaterThan(1500);
  });
});
