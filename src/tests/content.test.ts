import { describe, expect, it } from 'vitest';
import { chunkSyllable, chunkWord } from '../content/chunk';
import { parseSource } from '../content/source';
import { validateContent, validateWord } from '../content/validate';
import { allSkillFiles, allWords, getWord, wordsFor } from '../content';
import { config } from '../engine/config';
import { SET1_SKILL_IDS, SKILLS, type Word } from '../content/schema';

const options = { minWordsPerLevel: config.content.minWordsPerLevel, heldOutPerLevel: config.placement.heldOutPerLevel };

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
  it('parses levels, defaults, held-out marks and all fields', () => {
    const words = parseSource(
      '1.3',
      `# comment\n## 1\ncape | | | | cap=That was a short a.\n* bike\n## 3\npan-cake | c v | p-a-n-c-a-k-e | | \nso-lo | o o | | sew`,
    );
    expect(words).toHaveLength(4);
    expect(words[0]).toMatchObject({
      text: 'cape', set: 1, skillId: '1.3', level: 1, syllables: ['cape'], syllableTypes: ['vce'],
      chunks: ['c', 'a', 'p', 'e'], confusables: [{ heard: 'cap', hint: 'That was a short a.' }],
    });
    expect(words[0]!.heldOut).toBeUndefined();
    expect(words[1]).toMatchObject({ text: 'bike', heldOut: true });
    expect(words[2]).toMatchObject({ text: 'pancake', level: 3, syllableTypes: ['closed', 'vce'] });
    expect(words[3]).toMatchObject({ homophones: ['sew'] });
  });
  it('parses Set 2 levels A and B and the skill activity', () => {
    const words = parseSource('2.14', `## A\nsaid\n## B\na-bout | o c`);
    expect(words[0]).toMatchObject({ set: 2, skillId: '2.14', level: 'A', activity: 'heart' });
    expect(words[1]).toMatchObject({ level: 'B' });
  });
  it('rejects words before a level header', () => {
    expect(() => parseSource('1.1', 'cat')).toThrow(/header/);
  });
});

describe('validateWord', () => {
  const good: Word = {
    text: 'pancake', set: 1, skillId: '1.3', level: 3, syllables: ['pan', 'cake'],
    syllableTypes: ['closed', 'vce'], chunks: ['p', 'a', 'n', 'c', 'a', 'k', 'e'], division: ['VC/CV'],
  };
  it('accepts a good word', () => {
    expect(validateWord(good, '1.3')).toEqual([]);
  });
  it('catches syllables that do not join to the text', () => {
    expect(validateWord({ ...good, syllables: ['pan', 'cak'] }, '1.3').map((i) => i.message)).toEqual(
      expect.arrayContaining([expect.stringMatching(/do not join/)]),
    );
  });
  it('catches a type count mismatch', () => {
    expect(validateWord({ ...good, syllableTypes: ['closed'] }, '1.3').some((i) => /syllableTypes length/.test(i.message))).toBe(true);
  });
  it('catches uppercase text', () => {
    expect(validateWord({ ...good, text: 'Pancake' }, '1.3').some((i) => /lowercase/.test(i.message))).toBe(true);
  });
  it('catches a hint that reveals the word', () => {
    const w = { ...good, confusables: [{ heard: 'pancak', hint: 'Say pancake with a long a.' }] };
    expect(validateWord(w, '1.3').some((i) => /reveals/.test(i.message))).toBe(true);
  });
  it('catches a Set 1 level on a Set 2 word and the reverse', () => {
    const w: Word = { ...good, set: 2, skillId: '2.1', level: 3 };
    expect(validateWord(w, '2.1').some((i) => /not valid for set 2/.test(i.message))).toBe(true);
    expect(validateWord({ ...good, level: 'B' as never }, '1.3').some((i) => /not valid for set 1/.test(i.message))).toBe(true);
  });
  it('requires a division per split and rejects a bad one', () => {
    expect(validateWord({ ...good, division: undefined }, '1.3').some((i) => /needs a division/.test(i.message))).toBe(true);
    expect(validateWord({ ...good, division: ['VC/CV', 'V/CV'] }, '1.3').some((i) => /splits/.test(i.message))).toBe(true);
    expect(validateWord({ ...good, division: ['C-le'] }, '1.3').some((i) => /not cle/.test(i.message))).toBe(true);
  });
  it('catches a consonant-le word below level 3', () => {
    const w: Word = { text: 'table', set: 1, skillId: '1.6', level: 1, syllables: ['table'], syllableTypes: ['cle'], chunks: ['t', 'a', 'b', 'le'] };
    expect(validateWord(w, '1.6').some((i) => /not offered by skill/.test(i.message))).toBe(true);
  });
});

describe('validateContent', () => {
  it('flags duplicates across skills', () => {
    const w: Word = { text: 'cat', set: 1, skillId: '1.1', level: 1, syllables: ['cat'], syllableTypes: ['closed'], chunks: ['c', 'a', 't'] };
    const r = validateContent(
      [{ skillId: '1.1', words: [w] }, { skillId: '1.2', words: [{ ...w, skillId: '1.2' }] }],
      options,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => /duplicate/.test(e.message))).toBe(true);
  });
});

describe('shipped content', () => {
  it('passes the validator with no errors', () => {
    const r = validateContent(allSkillFiles, options);
    expect(r.errors).toEqual([]);
  });
  it('has 25+ practice words per level in Set 1, except open syllables at levels 1 and 2', () => {
    const r = validateContent(allSkillFiles, options);
    const short = r.warnings.filter((w) => /practice words, target/.test(w.message)).map((w) => `${w.skillId}: ${w.message}`);
    expect(short).toEqual([
      '1.2: level 1 has 6 practice words, target is 25',
      '1.2: level 2 has 12 practice words, target is 25',
    ]);
  });
  it('holds out test words per Set 1 level, fewer only where open syllables run short', () => {
    for (const id of SET1_SKILL_IDS) {
      for (const level of SKILLS[id].levels) {
        const expected = id === '1.2' && (level === 1 || level === 2) ? 4 : config.placement.heldOutPerLevel;
        expect(wordsFor(id, level, { pool: 'test' }).length, `${id} level ${level}`).toBe(expected);
      }
    }
  });
  it('excludes held-out words from the practice pool', () => {
    const practice = wordsFor('1.1', 1);
    expect(practice.some((w) => w.heldOut)).toBe(false);
    expect(practice.length + wordsFor('1.1', 1, { pool: 'test' }).length).toBe(wordsFor('1.1', 1, { pool: 'all' }).length);
  });
  it('ships 2.1 as Set 2 with levels A and B', () => {
    expect(wordsFor('2.1', 'A').length).toBeGreaterThan(25);
    expect(wordsFor('2.1', 'B').length).toBeGreaterThan(25);
    expect(getWord('cent')).toMatchObject({ set: 2, skillId: '2.1', level: 'A', homophones: ['sent', 'scent'] });
  });
  it('looks up words by text', () => {
    expect(getWord('pancake')?.syllables).toEqual(['pan', 'cake']);
    expect(getWord('pancake')?.division).toEqual(['VC/CV']);
    expect(getWord('under')?.division).toEqual(['VC/CV']);
    expect(getWord('cat')?.division).toBeUndefined();
    expect(getWord('so')?.homophones).toContain('sew');
    expect(getWord('cape')?.confusables?.[0]?.heard).toBe('cap');
    expect(allWords.length).toBeGreaterThan(1500);
  });
});
