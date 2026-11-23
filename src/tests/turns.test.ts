import { describe, expect, it } from 'vitest';
import { createGame, currentPlayer, passTurn, progress, recordWord, standings, totalStars } from '../engine/turns';

const players = [
  { profileId: 'a', name: 'Ava', color: '#f00' },
  { profileId: 'b', name: 'Ben', color: '#00f' },
];

describe('turn manager', () => {
  it('needs two players', () => {
    expect(() => createGame([players[0]!], 'coop', 50)).toThrow();
  });

  it('passes the turn after the words-per-turn count', () => {
    let s = createGame(players, 'coop', 100, 2);
    expect(currentPlayer(s).name).toBe('Ava');
    let r = recordWord(s, 10);
    expect(r.turnEnded).toBe(false);
    s = r.state;
    r = recordWord(s, 6);
    expect(r.turnEnded).toBe(true);
    s = r.state;
    expect(currentPlayer(s).name).toBe('Ben');
    expect(s.scores).toEqual([16, 0]);
    expect(s.wordsThisTurn).toBe(0);
    expect(s.round).toBe(1);
    s = passTurn(s);
    expect(currentPlayer(s).name).toBe('Ava');
    expect(s.round).toBe(2);
  });

  it('co-op finishes when the shared goal is reached', () => {
    let s = createGame(players, 'coop', 25, 3);
    s = recordWord(s, 10).state;
    s = recordWord(s, 10).state;
    const r = recordWord(s, 10);
    expect(r.state.finished).toBe(true);
    expect(r.state.winner).toBeNull();
    expect(totalStars(r.state)).toBe(30);
    expect(progress(r.state)).toBe(1);
    expect(recordWord(r.state, 10).state).toBe(r.state);
  });

  it('race finishes when one player reaches the target', () => {
    let s = createGame(players, 'race', 20, 1);
    s = recordWord(s, 10).state; // Ava 10, turn passes
    expect(currentPlayer(s).name).toBe('Ben');
    s = recordWord(s, 6).state; // Ben 6
    s = recordWord(s, 10).state; // Ava 20 -> wins
    expect(s.finished).toBe(true);
    expect(s.winner).toBe(0);
    expect(standings(s)[0]!.player.name).toBe('Ava');
    expect(progress(s)).toBe(1);
  });

  it('tracks progress toward the goal', () => {
    let s = createGame(players, 'coop', 40, 3);
    s = recordWord(s, 10).state;
    expect(progress(s)).toBeCloseTo(0.25);
  });
});
