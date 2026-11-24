import { describe, expect, it } from 'vitest';
import { STORIES } from '../content/stories';
import { answer, createQuiz, currentQuestion, initialReadScore, next, quizSummary, scoreSkip, scoreWords, STORY_POINTS } from '../engine/storyGame';

describe('story questions content', () => {
  it('every story has 3 questions with 3 options and a valid answer index', () => {
    for (const s of STORIES) {
      expect(s.questions, s.id).toHaveLength(3);
      for (const q of s.questions) {
        expect(q.options).toHaveLength(3);
        expect(q.answer).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBeLessThan(3);
        expect(new Set(q.options).size).toBe(3);
      }
    }
  });
  it('does not always put the right answer first', () => {
    const positions = new Set(STORIES.flatMap((s) => s.questions.map((q) => q.answer)));
    expect(positions.size).toBe(3);
  });
});

describe('reading score', () => {
  it('gives one star per word and a bonus at every 5 in a row', () => {
    let s = scoreWords(initialReadScore, 4);
    expect(s).toMatchObject({ stars: 4, wordsRead: 4, streak: 4, lastBonus: 0 });
    s = scoreWords(s, 1);
    expect(s).toMatchObject({ stars: 10, streak: 5, lastBonus: STORY_POINTS.streakBonus });
    s = scoreWords(s, 6);
    expect(s.stars).toBe(10 + 6 + 5);
    expect(s.streak).toBe(11);
  });
  it('a skip resets the streak but keeps the stars', () => {
    const s = scoreSkip(scoreWords(initialReadScore, 3));
    expect(s).toMatchObject({ stars: 3, streak: 0 });
  });
});

describe('quiz', () => {
  const qs = STORIES[0]!.questions;
  it('scores only the first pick on each question and finishes at the end', () => {
    let q = createQuiz(qs);
    expect(currentQuestion(q)).toBe(qs[0]);
    q = answer(q, qs[0]!.answer);
    expect(q.feedback).toBe('right');
    expect(q.stars).toBe(10);
    q = answer(q, (qs[0]!.answer + 1) % 3); // second pick ignored
    expect(q.stars).toBe(10);
    q = next(q);
    expect(q.index).toBe(1);
    q = answer(q, (qs[1]!.answer + 1) % 3);
    expect(q.feedback).toBe('wrong');
    expect(q.stars).toBe(10);
    q = next(q);
    q = answer(q, qs[2]!.answer);
    q = next(q);
    expect(q.finished).toBe(true);
    expect(quizSummary(q)).toEqual({ right: 2, total: 3, stars: 20 });
    expect(answer(q, 0)).toBe(q);
  });
  it('next does nothing before an answer', () => {
    const q = createQuiz(qs);
    expect(next(q)).toBe(q);
  });
});
