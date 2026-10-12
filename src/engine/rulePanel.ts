import { chunkSyllable } from '../content/chunk';
import { SKILLS, SYLLABLE_LABELS, type SyllableType, type Word } from '../content/schema';

/**
 * Data for the rule panel at the bottom of the word card. Pure.
 *
 * - One line per syllable for multi-syllable words: "pan: closed, short a".
 * - Indices of the letters that carry the rule, to highlight in the word.
 */
export interface SyllableLine {
  syllable: string;
  type: SyllableType;
  label: string;
  /** "short a", "long a, silent e", "ai team", ... */
  sound: string;
  text: string;
  /** Letter indices (in the whole word) that carry the rule for this syllable. */
  ruleLetters: number[];
}

export interface RulePanelData {
  skillId: string;
  skillName: string;
  explanation: string;
  lines: SyllableLine[];
  /** All rule-carrying letter indices in the word. */
  ruleLetters: number[];
}

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

function lastVowelIndex(s: string, before = s.length): number {
  for (let i = before - 1; i >= 0; i--) if (VOWELS.has(s[i]!) && s[i] !== 'y') return i;
  for (let i = before - 1; i >= 0; i--) if (s[i] === 'y') return i;
  return -1;
}

/** Index in the syllable of the chunk that holds the vowel pattern for its type. */
function patternChunk(syllable: string, type: SyllableType): { start: number; text: string } | null {
  const chunks = chunkSyllable(syllable, type);
  let pos = 0;
  const wanted =
    type === 'team' || type === 'diphthong'
      ? (c: string) => c.length >= 2 && [...c].every((ch) => VOWELS.has(ch) || ch === 'w' || ch === 'g' || ch === 'h')
      : type === 'r'
        ? (c: string) => c.includes('r') && c.length >= 2
        : type === 'cle'
          ? (c: string) => c === 'le'
          : () => false;
  for (const c of chunks) {
    if (wanted(c)) return { start: pos, text: c };
    pos += c.length;
  }
  return null;
}

export function describeSyllable(syllable: string, type: SyllableType, offset: number): SyllableLine {
  const label = SYLLABLE_LABELS[type];
  let sound = label;
  let letters: number[] = [];

  switch (type) {
    case 'closed': {
      const v = lastVowelIndex(syllable);
      if (v >= 0) { sound = `short ${syllable[v]}`; letters = [v]; }
      break;
    }
    case 'open': {
      const v = lastVowelIndex(syllable);
      if (v >= 0) { sound = `long ${syllable[v] === 'y' ? 'i (y)' : syllable[v]}`; letters = [v]; }
      break;
    }
    case 'vce': {
      const e = syllable.length - 1;
      const v = lastVowelIndex(syllable, e);
      if (v >= 0) { sound = `long ${syllable[v]}, silent e`; letters = [v, e]; }
      break;
    }
    case 'team':
    case 'diphthong': {
      const p = patternChunk(syllable, type);
      if (p) { sound = `${p.text} ${type === 'team' ? 'team' : 'glide'}`; letters = range(p.start, p.text.length); }
      break;
    }
    case 'r': {
      const p = patternChunk(syllable, type);
      if (p) { sound = `bossy r, ${p.text}`; letters = range(p.start, p.text.length); }
      break;
    }
    case 'cle': {
      const p = patternChunk(syllable, type);
      if (p) { sound = `${syllable.slice(p.start - 1, p.start)}le ending`; letters = range(Math.max(0, p.start - 1), p.text.length + 1); }
      break;
    }
    case 'schwa': {
      const v = lastVowelIndex(syllable);
      if (v >= 0) { sound = `lazy ${syllable[v]}, says uh`; letters = [v]; }
      break;
    }
  }

  return {
    syllable,
    type,
    label,
    sound,
    text: `${syllable}: ${label}, ${sound}`,
    ruleLetters: letters.map((i) => i + offset),
  };
}

function range(start: number, len: number): number[] {
  return Array.from({ length: len }, (_, i) => start + i);
}

export function rulePanelFor(word: Word): RulePanelData {
  const meta = SKILLS[word.skillId];
  const lines: SyllableLine[] = [];
  let offset = 0;
  word.syllables.forEach((syl, i) => {
    lines.push(describeSyllable(syl, word.syllableTypes[i] ?? 'closed', offset));
    offset += syl.length;
  });
  // For single-syllable words in a Set 1 skill, highlight only that skill's pattern.
  const ruleLetters = lines.flatMap((l) => l.ruleLetters);
  return {
    skillId: word.skillId,
    skillName: meta.name,
    explanation: meta.explanation,
    lines,
    ruleLetters: [...new Set(ruleLetters)].sort((a, b) => a - b),
  };
}
