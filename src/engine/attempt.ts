import { config } from './config';
import type { HelpStep } from './scoring';
import { starsFor } from './scoring';

/**
 * State machine for one word attempt. Pure and synchronous. The UI drives it
 * with events and reads the phase to decide what to show.
 *
 * Phases:
 *   ready      word shown, not listening yet (waits for a tap)
 *   listening  recognizer running
 *   wrong      a miss; hint and help are offered, then back to listening
 *   modeling   third miss: the app says the word, then asks for a repeat
 *   repeating  listening for the repeat after modeling
 *   done       word finished, result known
 */
export type AttemptPhase = 'ready' | 'listening' | 'wrong' | 'modeling' | 'repeating' | 'done';

export type AttemptResult = 'correct' | 'modeled' | 'skipped';

export interface AttemptState {
  phase: AttemptPhase;
  tries: number;
  helpStep: HelpStep;
  /** Hint from a confusable, shown after a miss. */
  hint: string | null;
  overrideUsed: boolean;
  result: AttemptResult | null;
  /** Stars earned, set when done. 0 for modeled or skipped. */
  stars: number;
  /** True when the word must go to the review queue (modeled or skipped). */
  needsReview: boolean;
}

export type AttemptEvent =
  | { type: 'start' }
  | { type: 'heard'; outcome: 'correct' | 'confusable' | 'wrong'; hint?: string }
  | { type: 'override'; verdict: 'right' | 'notQuite' }
  | { type: 'help'; step: HelpStep }
  | { type: 'modeled' }
  | { type: 'skip' }
  | { type: 'retry' }
  | { type: 'reset' };

export const initialAttempt: AttemptState = {
  phase: 'ready',
  tries: 0,
  helpStep: 0,
  hint: null,
  overrideUsed: false,
  result: null,
  stars: 0,
  needsReview: false,
};

function finish(s: AttemptState, result: AttemptResult): AttemptState {
  const stars = result === 'correct' ? starsFor({ tries: Math.max(1, s.tries), helpStep: s.helpStep }) : 0;
  return { ...s, phase: 'done', result, stars, needsReview: result !== 'correct' };
}

function miss(s: AttemptState, hint?: string): AttemptState {
  const tries = s.tries + 1;
  if (tries >= config.attempt.maxTries) {
    return { ...s, tries, hint: null, phase: 'modeling' };
  }
  return { ...s, tries, hint: hint ?? null, phase: 'wrong' };
}

export function reduceAttempt(s: AttemptState, e: AttemptEvent): AttemptState {
  if (e.type === 'reset') return initialAttempt;
  if (s.phase === 'done') return s;

  switch (e.type) {
    case 'start':
      if (s.phase === 'ready' || s.phase === 'wrong') return { ...s, phase: 'listening' };
      return s;

    case 'retry':
      if (s.phase === 'wrong') return { ...s, phase: 'listening', hint: null };
      return s;

    case 'heard': {
      if (s.phase === 'repeating') {
        // After modeling, any repeat finishes the word as modeled.
        return finish({ ...s, tries: s.tries }, 'modeled');
      }
      if (s.phase !== 'listening') return s;
      if (e.outcome === 'correct') return finish({ ...s, tries: s.tries + 1 }, 'correct');
      return miss(s, e.outcome === 'confusable' ? e.hint : undefined);
    }

    case 'override': {
      // Always works, in every phase except done.
      const o = { ...s, overrideUsed: true };
      if (e.verdict === 'right') {
        if (s.phase === 'repeating' || s.phase === 'modeling') return finish(o, 'modeled');
        return finish({ ...o, tries: s.tries + 1 }, 'correct');
      }
      if (s.phase === 'repeating' || s.phase === 'modeling') return finish(o, 'modeled');
      return miss(o);
    }

    case 'help':
      return { ...s, helpStep: Math.max(s.helpStep, e.step) as HelpStep };

    case 'modeled':
      if (s.phase === 'modeling') return { ...s, phase: 'repeating' };
      return s;

    case 'skip':
      return finish(s, 'skipped');
  }
}
