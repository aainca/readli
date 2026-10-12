import type { Word } from '../content/schema';

/**
 * Strict whole-word matcher. Pure: no DOM, no speech.
 *
 * - Normalizes each alternative: lowercase, punctuation stripped, trimmed.
 * - Splits each alternative into tokens.
 * - Correct when any token equals the target or a listed homophone.
 * - No substring matching ("catalog" never matches "cat").
 * - When not correct and a token equals a listed confusable, returns its hint.
 */
export type MatchOutcome = 'correct' | 'confusable' | 'wrong' | 'empty';

export interface MatchResult {
  outcome: MatchOutcome;
  /** Hint for a recognized confusable. Never contains the target word. */
  hint?: string;
  /** The token that matched (correct or confusable), if any. */
  matched?: string;
  /** Normalized alternatives, best first, for the "heard" display. */
  heard: string[];
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .replace(/'/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  return normalize(text).split(' ').filter(Boolean);
}

export function matchWord(alternatives: string[], word: Pick<Word, 'text' | 'homophones' | 'confusables'>): MatchResult {
  const heard = alternatives.map(normalize).filter(Boolean);
  if (heard.length === 0) return { outcome: 'empty', heard };

  const accepted = new Set([word.text, ...(word.homophones ?? [])]);
  for (const alt of heard) {
    for (const token of alt.split(' ')) {
      if (accepted.has(token)) return { outcome: 'correct', matched: token, heard };
    }
  }

  const confusables = new Map((word.confusables ?? []).map((c) => [c.heard, c.hint]));
  for (const alt of heard) {
    for (const token of alt.split(' ')) {
      const hint = confusables.get(token);
      if (hint) return { outcome: 'confusable', hint, matched: token, heard };
    }
  }

  return { outcome: 'wrong', heard };
}
