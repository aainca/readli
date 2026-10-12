import type { SyllableType } from './schema';

/**
 * Syllable division patterns, one per split between syllables.
 * These drive the Break It Down coach's prompt 3 reasons.
 */
export type DivisionPattern = 'VC/CV' | 'V/CV' | 'VC/V' | 'V/V' | 'C-le' | 'affix';

export const DIVISION_PATTERNS: readonly DivisionPattern[] = ['VC/CV', 'V/CV', 'VC/V', 'V/V', 'C-le', 'affix'];

/** Split reasons in the child's words, shown at coach prompt 3. */
export const DIVISION_REASONS: Record<DivisionPattern, string> = {
  'VC/CV': 'Two consonants in the middle, split between them.',
  'V/CV': 'One consonant in the middle. Try it with the second part first.',
  'VC/V': 'One consonant in the middle. That one sounded wrong, so split after it.',
  'V/V': 'Two vowels that do not team up, split between them.',
  'C-le': 'Consonant-le at the end: count back three letters.',
  affix: 'A prefix or suffix: split it off first.',
};

/** Prefixes and suffixes that are split off first when they form a whole syllable. */
export const PREFIXES = ['un', 're', 'dis', 'mis', 'pre', 'sub'];
export const SUFFIXES = ['ing', 'ed', 'ful', 'less', 'ness', 'ly', 'ment', 'est'];

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

/**
 * y counts as a vowel unless it starts the syllable (yes, yard).
 * w counts as part of a vowel team when it follows a vowel (snow, flow-er, saw).
 */
export function isVowelAt(syllable: string, i: number): boolean {
  const ch = syllable[i]!;
  if (VOWELS.has(ch)) return true;
  if (ch === 'y' && i > 0) return true;
  if (ch === 'w' && i > 0 && VOWELS.has(syllable[i - 1]!)) return true;
  return false;
}

function trailingConsonants(syllable: string): number {
  let n = 0;
  for (let i = syllable.length - 1; i >= 0 && !isVowelAt(syllable, i); i--) n++;
  return n;
}

function leadingConsonants(syllable: string): number {
  let n = 0;
  for (let i = 0; i < syllable.length && !isVowelAt(syllable, i); i++) n++;
  return n;
}

/**
 * Derives the division pattern for every split in a word from its syllables
 * and syllable types. Authors can override the result in the source file.
 */
export function deriveDivision(syllables: string[], types: SyllableType[]): DivisionPattern[] {
  const out: DivisionPattern[] = [];
  for (let i = 0; i < syllables.length - 1; i++) {
    const left = syllables[i]!;
    const right = syllables[i + 1]!;
    const isLast = i + 1 === syllables.length - 1;

    if (types[i + 1] === 'cle') {
      out.push('C-le');
      continue;
    }
    if ((i === 0 && PREFIXES.includes(left)) || (isLast && SUFFIXES.includes(right))) {
      out.push('affix');
      continue;
    }
    const l = trailingConsonants(left);
    const r = leadingConsonants(right);
    if (l === 0 && r === 0) out.push('V/V');
    else if (l === 0) out.push('V/CV');
    else if (r === 0) out.push('VC/V');
    else out.push('VC/CV');
  }
  return out;
}
