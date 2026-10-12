import { config } from './config';

/**
 * Mastery per skill and level. Pure.
 *
 * Mastered: 85% or more first-try, no-help reads over the last 20 attempts at
 * the level, spanning at least 2 calendar days.
 * Step back: under 60% over the same window (once enough attempts exist).
 */
export interface AttemptLike {
  timestamp: number;
  tries: number;
  helpStep: number;
  result: 'correct' | 'modeled' | 'skipped';
  /** Placement-test attempts never count. */
  mode?: 'practice' | 'placement';
}

export interface MasteryReport {
  attemptsInWindow: number;
  cleanReads: number;
  /** cleanReads / attemptsInWindow, 0 when empty. */
  accuracy: number;
  distinctDays: number;
  /** Window is full, accuracy and days both meet the bar. */
  mastered: boolean;
  /** Enough attempts and accuracy under the step-back bar. */
  stepBack: boolean;
  /** What is still missing, for the UI. */
  needs: { attempts: number; accuracy: boolean; days: number };
}

/** First try, no help, correct. Overrides count as what the parent judged. */
export function isCleanRead(a: AttemptLike): boolean {
  return a.result === 'correct' && a.tries === 1 && a.helpStep === 0;
}

/** Local calendar day key, "YYYY-MM-DD". */
export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function countDistinctDays(timestamps: number[]): number {
  return new Set(timestamps.map(dayKey)).size;
}

/** Last N practice attempts by time, newest last. */
export function rollingWindow<T extends AttemptLike>(attempts: T[], size = config.mastery.windowSize): T[] {
  return attempts
    .filter((a) => a.mode !== 'placement')
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-size);
}

export function evaluateMastery(attempts: AttemptLike[]): MasteryReport {
  const m = config.mastery;
  const window = rollingWindow(attempts);
  const clean = window.filter(isCleanRead).length;
  const accuracy = window.length ? clean / window.length : 0;
  const days = countDistinctDays(window.map((a) => a.timestamp));
  const full = window.length >= m.windowSize;
  const mastered = full && accuracy >= m.masteryAccuracy && days >= m.minDistinctDays;
  const stepBack = window.length >= m.minAttemptsForStepBack && accuracy < m.stepBackAccuracy;
  return {
    attemptsInWindow: window.length,
    cleanReads: clean,
    accuracy,
    distinctDays: days,
    mastered,
    stepBack,
    needs: {
      attempts: Math.max(0, m.windowSize - window.length),
      accuracy: accuracy < m.masteryAccuracy,
      days: Math.max(0, m.minDistinctDays - days),
    },
  };
}
