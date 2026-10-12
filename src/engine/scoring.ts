import { config } from './config';

export type HelpStep = 0 | 1 | 2 | 3;

export interface ScoreInput {
  /** 1 = first try. */
  tries: number;
  /** Highest help step used on this word. */
  helpStep: HelpStep;
}

/**
 * Stars for one correct read, per the spec:
 * first try no help 10; second try or help 1: 6; help 2: 4; help 3 or third try: 2.
 */
export function starsFor({ tries, helpStep }: ScoreInput): number {
  const s = config.stars;
  if (tries >= 3 || helpStep >= 3) return s.help3OrThirdTry;
  if (helpStep === 2) return s.help2;
  if (tries === 2 || helpStep === 1) return s.secondTryOrHelp1;
  return s.firstTry;
}

/** Streak bonus awarded when the streak reaches a multiple of streakEvery. */
export function streakBonus(streakAfter: number): number {
  const s = config.stars;
  return streakAfter > 0 && streakAfter % s.streakEvery === 0 ? s.streakBonus : 0;
}

/** True when the read counts toward mastery: first try, no help, no override. */
export function isCleanRead({ tries, helpStep }: ScoreInput): boolean {
  return tries === 1 && helpStep === 0;
}
