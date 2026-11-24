import type { StoryQuestion } from '../content/stories';

/**
 * Story game scoring. Pure.
 *
 * Reading: 1 star per word read correctly, +5 at every 5 words in a row
 * without a skip. Quiz: 10 stars per correct answer, first try only.
 */
export const STORY_POINTS = {
  perWord: 1,
  streakEvery: 5,
  streakBonus: 5,
  perQuestion: 10,
} as const;

export interface ReadScore {
  stars: number;
  wordsRead: number;
  streak: number;
  /** Set on the event that earned a streak bonus, for a "+5" pop. */
  lastBonus: number;
}

export const initialReadScore: ReadScore = { stars: 0, wordsRead: 0, streak: 0, lastBonus: 0 };

/** Applies `n` newly read words in a row (one final result can commit several). */
export function scoreWords(s: ReadScore, n: number): ReadScore {
  let { stars, wordsRead, streak } = s;
  let bonus = 0;
  for (let i = 0; i < n; i++) {
    stars += STORY_POINTS.perWord;
    wordsRead += 1;
    streak += 1;
    if (streak % STORY_POINTS.streakEvery === 0) {
      stars += STORY_POINTS.streakBonus;
      bonus += STORY_POINTS.streakBonus;
    }
  }
  return { stars, wordsRead, streak, lastBonus: bonus };
}

/** A skipped word breaks the streak. */
export function scoreSkip(s: ReadScore): ReadScore {
  return { ...s, streak: 0, lastBonus: 0 };
}

/* ---------- quiz ---------- */

export interface QuizState {
  questions: StoryQuestion[];
  index: number;
  /** Chosen option per question, or null while unanswered. */
  chosen: (number | null)[];
  /** Whether the first pick was right, per question. */
  correct: boolean[];
  stars: number;
  /** The last pick's outcome, for feedback. */
  feedback: 'right' | 'wrong' | null;
  finished: boolean;
}

export function createQuiz(questions: StoryQuestion[]): QuizState {
  return { questions, index: 0, chosen: questions.map(() => null), correct: questions.map(() => false), stars: 0, feedback: null, finished: questions.length === 0 };
}

export function currentQuestion(q: QuizState): StoryQuestion | null {
  return q.finished ? null : q.questions[q.index] ?? null;
}

/** Picks an option for the current question. Only the first pick on a question scores. */
export function answer(q: QuizState, option: number): QuizState {
  if (q.finished) return q;
  const cur = q.questions[q.index];
  if (!cur || q.chosen[q.index] !== null) return q;
  const right = option === cur.answer;
  const chosen = [...q.chosen];
  chosen[q.index] = option;
  const correct = [...q.correct];
  correct[q.index] = right;
  return { ...q, chosen, correct, stars: q.stars + (right ? STORY_POINTS.perQuestion : 0), feedback: right ? 'right' : 'wrong' };
}

/** Moves to the next question after the feedback. */
export function next(q: QuizState): QuizState {
  if (q.finished || q.chosen[q.index] === null) return q;
  const index = q.index + 1;
  return { ...q, index, feedback: null, finished: index >= q.questions.length };
}

export function quizSummary(q: QuizState): { right: number; total: number; stars: number } {
  return { right: q.correct.filter(Boolean).length, total: q.questions.length, stars: q.stars };
}
