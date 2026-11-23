import type { Word } from '../content/schema';

/**
 * Words the recognizer should listen for on one practice word: the target,
 * its homophones and confusables, plus a few distractors from the same pool
 * so a wrong reading is not forced onto the target. Pure.
 */
export function grammarFor(word: Word, pool: Word[], distractors = 8, rng: () => number = Math.random): string[] {
  const out = new Set<string>([word.text, ...(word.homophones ?? []), ...(word.confusables ?? []).map((c) => c.heard)]);
  const others = pool.filter((w) => w.text !== word.text);
  for (let i = 0; i < distractors && others.length > 0; i++) {
    const j = Math.floor(rng() * others.length);
    out.add(others[j]!.text);
    others.splice(j, 1);
  }
  return [...out];
}
