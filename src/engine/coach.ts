import { DIVISION_REASONS, isVowelAt, type DivisionPattern } from '../content/division';
import type { Word } from '../content/schema';
import { COACH_PROMPTS } from '../content/coach-prompts';
import { config } from './config';

/**
 * Break It Down coach: a pure state machine for one multi-syllable word.
 *
 * Steps follow the six prompts:
 *   vowels   tap each vowel
 *   between  see the consonants between the vowels
 *   split    tap the gap where the word splits (one gap per split)
 *   read     each syllable lights up in turn
 *   blend    the child reads the whole word (handled by the normal listener)
 *   check    after a miss: "Does it sound like a real word?"
 *   done
 */
export type CoachStep = 'vowels' | 'between' | 'split' | 'read' | 'blend' | 'check' | 'done';

export interface CoachState {
  step: CoachStep;
  text: string;
  syllables: string[];
  division: DivisionPattern[];
  /** Letter indices that are vowels (y where the data treats it as one). */
  vowelIndices: number[];
  tappedVowels: number[];
  /** Gap g sits between letter g-1 and letter g. */
  splitGaps: number[];
  foundSplits: number[];
  /** The app had to show a split. Costs help step 1. */
  revealed: boolean;
  /** Vowels were shown rather than found. Free, but noted. */
  vowelsRevealed: boolean;
  wrongTaps: number;
  /** Prompt 4: which syllable is lit. */
  readIndex: number;
  /** Last feedback line to show and speak. */
  feedback: string | null;
  /** Letters between the vowels around each split, for prompt 2. */
  between: { gap: number; letters: number[] }[];
}

export type CoachEvent =
  | { type: 'tapLetter'; index: number }
  | { type: 'showVowels' }
  | { type: 'next' }
  | { type: 'tapGap'; gap: number }
  | { type: 'nextSyllable' }
  | { type: 'blendResult'; correct: boolean }
  | { type: 'checkAnswer'; realWord: boolean };

export function vowelIndices(word: Pick<Word, 'syllables'>): number[] {
  const out: number[] = [];
  let offset = 0;
  for (const syl of word.syllables) {
    for (let i = 0; i < syl.length; i++) if (isVowelAt(syl, i)) out.push(offset + i);
    offset += syl.length;
  }
  return out;
}

export function splitGaps(word: Pick<Word, 'syllables'>): number[] {
  const gaps: number[] = [];
  let pos = 0;
  for (let i = 0; i < word.syllables.length - 1; i++) {
    pos += word.syllables[i]!.length;
    gaps.push(pos);
  }
  return gaps;
}

/** Consonant letters between the last vowel before a gap and the first vowel after it. */
function betweenLetters(text: string, vowels: number[], gap: number): number[] {
  const before = Math.max(...vowels.filter((v) => v < gap), -1);
  const after = Math.min(...vowels.filter((v) => v >= gap), text.length);
  const out: number[] = [];
  for (let i = before + 1; i < after; i++) out.push(i);
  return out;
}

export function createCoach(word: Pick<Word, 'text' | 'syllables' | 'division'>): CoachState {
  const vowels = vowelIndices(word);
  const gaps = splitGaps(word);
  return {
    step: 'vowels',
    text: word.text,
    syllables: word.syllables,
    division: word.division ?? [],
    vowelIndices: vowels,
    tappedVowels: [],
    splitGaps: gaps,
    foundSplits: [],
    revealed: false,
    vowelsRevealed: false,
    wrongTaps: 0,
    readIndex: 0,
    feedback: null,
    between: gaps.map((gap) => ({ gap, letters: betweenLetters(word.text, vowels, gap) })),
  };
}

export function promptFor(step: CoachStep): string {
  switch (step) {
    case 'vowels': return COACH_PROMPTS.vowels;
    case 'between': return COACH_PROMPTS.between;
    case 'split': return COACH_PROMPTS.split;
    case 'read': return COACH_PROMPTS.read;
    case 'blend': return COACH_PROMPTS.blend;
    case 'check': return COACH_PROMPTS.check;
    case 'done': return '';
  }
}

export function reasonFor(s: CoachState, gap: number): string {
  const i = s.splitGaps.indexOf(gap);
  const pattern = s.division[i];
  return pattern ? DIVISION_REASONS[pattern] : '';
}

export function reduceCoach(s: CoachState, e: CoachEvent): CoachState {
  switch (s.step) {
    case 'vowels': {
      if (e.type === 'showVowels') {
        return { ...s, tappedVowels: [...s.vowelIndices], vowelsRevealed: true, step: 'between', feedback: COACH_PROMPTS.vowelsFound(s.vowelIndices.length) };
      }
      if (e.type !== 'tapLetter') return s;
      if (!s.vowelIndices.includes(e.index)) return { ...s, wrongTaps: s.wrongTaps + 1, feedback: COACH_PROMPTS.consonantTap };
      if (s.tappedVowels.includes(e.index)) return s;
      const tapped = [...s.tappedVowels, e.index];
      if (tapped.length === s.vowelIndices.length) {
        return { ...s, tappedVowels: tapped, step: 'between', feedback: COACH_PROMPTS.vowelsFound(tapped.length) };
      }
      return { ...s, tappedVowels: tapped, feedback: null };
    }

    case 'between': {
      if (e.type !== 'next') return s;
      return { ...s, step: 'split', feedback: null };
    }

    case 'split': {
      if (e.type !== 'tapGap') return s;
      const missing = s.splitGaps.filter((g) => !s.foundSplits.includes(g));
      if (missing.length === 0) return s;
      if (s.foundSplits.includes(e.gap)) return s;
      let found: number[];
      let feedback: string;
      let revealed = s.revealed;
      let wrongTaps = s.wrongTaps;
      if (s.splitGaps.includes(e.gap)) {
        found = [...s.foundSplits, e.gap];
        feedback = `${COACH_PROMPTS.splitRight} ${reasonFor(s, e.gap)}`;
      } else {
        // Wrong: show the next missing split and its reason.
        const reveal = missing[0]!;
        found = [...s.foundSplits, reveal];
        feedback = `${COACH_PROMPTS.splitWrong} ${reasonFor(s, reveal)}`;
        revealed = true;
        wrongTaps += 1;
      }
      const done = found.length === s.splitGaps.length;
      return { ...s, foundSplits: found, revealed, wrongTaps, feedback, step: done ? 'read' : 'split', readIndex: 0 };
    }

    case 'read': {
      if (e.type !== 'nextSyllable') return s;
      const next = s.readIndex + 1;
      if (next >= s.syllables.length) return { ...s, step: 'blend', feedback: null };
      return { ...s, readIndex: next };
    }

    case 'blend': {
      if (e.type !== 'blendResult') return s;
      if (e.correct) return { ...s, step: 'done', feedback: null };
      return { ...s, step: 'check', feedback: null };
    }

    case 'check': {
      if (e.type !== 'checkAnswer') return s;
      return { ...s, step: 'blend', feedback: e.realWord ? null : COACH_PROMPTS.tryOther };
    }

    case 'done':
      return s;
  }
}

/** Help step to charge for a finished coach run. */
export function coachHelpStep(s: CoachState): 0 | 1 {
  return s.revealed ? (config.coach.revealHelpStep as 1) : 0;
}

/* ---------- When the coach appears ---------- */

export type CoachMode = 'guided' | 'onRequest' | 'off';
export type CoachAppearance = 'full' | 'reminder' | 'none';

export interface CoachCounts {
  /** Multi-syllable words already seen at this skill and level. */
  seenAtLevel: number;
  /** Multi-syllable words in a row read correctly without the coach. */
  cleanStreak: number;
}

/**
 * Guided: full coach on the first N multi-syllable words of a new level and
 * after a miss. Once the clean streak reaches the fade count, the coach
 * shrinks to a one-line reminder until the next miss resets the streak.
 */
export function decideCoach(mode: CoachMode, counts: CoachCounts, afterMiss: boolean): CoachAppearance {
  if (mode !== 'guided') return 'none';
  const triggered = afterMiss || counts.seenAtLevel < config.coach.guidedFirstWords;
  if (!triggered) return 'none';
  if (!afterMiss && counts.cleanStreak >= config.coach.fadeAfterCleanReads) return 'reminder';
  return 'full';
}

/** Updates the counts after a multi-syllable word finishes. */
export function updateCoachCounts(counts: CoachCounts, outcome: { correct: boolean; usedCoach: boolean }): CoachCounts {
  return {
    seenAtLevel: counts.seenAtLevel + 1,
    cleanStreak: outcome.correct && !outcome.usedCoach ? counts.cleanStreak + 1 : 0,
  };
}
