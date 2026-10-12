import { describe, expect, it } from 'vitest';
import { initialAttempt, reduceAttempt, type AttemptEvent, type AttemptState } from '../engine/attempt';

function run(events: AttemptEvent[], from: AttemptState = initialAttempt): AttemptState {
  return events.reduce(reduceAttempt, from);
}

describe('attempt state machine', () => {
  it('first-try correct earns 10 stars', () => {
    const s = run([{ type: 'start' }, { type: 'heard', outcome: 'correct' }]);
    expect(s).toMatchObject({ phase: 'done', result: 'correct', tries: 1, stars: 10, needsReview: false });
  });

  it('a miss shows the confusable hint, then listens again; second try earns 6', () => {
    let s = run([{ type: 'start' }, { type: 'heard', outcome: 'confusable', hint: 'Look at the e.' }]);
    expect(s).toMatchObject({ phase: 'wrong', tries: 1, hint: 'Look at the e.' });
    s = run([{ type: 'retry' }, { type: 'heard', outcome: 'correct' }], s);
    expect(s).toMatchObject({ phase: 'done', result: 'correct', tries: 2, stars: 6 });
  });

  it('a plain miss has no hint', () => {
    const s = run([{ type: 'start' }, { type: 'heard', outcome: 'wrong' }]);
    expect(s).toMatchObject({ phase: 'wrong', hint: null });
  });

  it('third miss goes to modeling, then the repeat finishes as modeled with no stars and review', () => {
    let s = run([
      { type: 'start' }, { type: 'heard', outcome: 'wrong' },
      { type: 'retry' }, { type: 'heard', outcome: 'wrong' },
      { type: 'retry' }, { type: 'heard', outcome: 'wrong' },
    ]);
    expect(s.phase).toBe('modeling');
    expect(s.tries).toBe(3);
    s = run([{ type: 'modeled' }], s);
    expect(s.phase).toBe('repeating');
    s = run([{ type: 'heard', outcome: 'correct' }], s);
    expect(s).toMatchObject({ phase: 'done', result: 'modeled', stars: 0, needsReview: true });
  });

  it('help lowers stars and tracks the highest step', () => {
    const s = run([{ type: 'start' }, { type: 'help', step: 2 }, { type: 'help', step: 1 }, { type: 'heard', outcome: 'correct' }]);
    expect(s).toMatchObject({ helpStep: 2, stars: 4 });
  });

  it('"I heard it right" override finishes as correct in any live phase', () => {
    const fromReady = run([{ type: 'override', verdict: 'right' }]);
    expect(fromReady).toMatchObject({ phase: 'done', result: 'correct', overrideUsed: true, stars: 10 });
    const fromWrong = run([{ type: 'start' }, { type: 'heard', outcome: 'wrong' }, { type: 'override', verdict: 'right' }]);
    expect(fromWrong).toMatchObject({ result: 'correct', tries: 2, stars: 6 });
  });

  it('"Not quite" override counts as a miss and reaches modeling on the third', () => {
    const s = run([{ type: 'start' }, { type: 'override', verdict: 'notQuite' }]);
    expect(s).toMatchObject({ phase: 'wrong', tries: 1, overrideUsed: true });
    const third = run([{ type: 'retry' }, { type: 'override', verdict: 'notQuite' }, { type: 'retry' }, { type: 'override', verdict: 'notQuite' }], s);
    expect(third.phase).toBe('modeling');
  });

  it('overrides during the repeat finish the word as modeled', () => {
    const base = run([{ type: 'start' }, { type: 'heard', outcome: 'wrong' }, { type: 'retry' }, { type: 'heard', outcome: 'wrong' }, { type: 'retry' }, { type: 'heard', outcome: 'wrong' }, { type: 'modeled' }]);
    expect(run([{ type: 'override', verdict: 'right' }], base)).toMatchObject({ result: 'modeled', stars: 0 });
    expect(run([{ type: 'override', verdict: 'notQuite' }], base)).toMatchObject({ result: 'modeled', stars: 0 });
  });

  it('skip finishes with no stars and needs review', () => {
    const s = run([{ type: 'start' }, { type: 'skip' }]);
    expect(s).toMatchObject({ phase: 'done', result: 'skipped', stars: 0, needsReview: true });
  });

  it('ignores events once done', () => {
    const done = run([{ type: 'start' }, { type: 'heard', outcome: 'correct' }]);
    expect(run([{ type: 'heard', outcome: 'wrong' }, { type: 'skip' }], done)).toBe(done);
  });

  it('reset returns to the initial state even when done', () => {
    const done = run([{ type: 'start' }, { type: 'heard', outcome: 'correct' }]);
    expect(run([{ type: 'reset' }], done)).toBe(initialAttempt);
  });

  it('ignores speech while not listening', () => {
    expect(run([{ type: 'heard', outcome: 'correct' }])).toBe(initialAttempt);
  });
});
