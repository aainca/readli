/**
 * Turn manager for same-device multiplayer. Pure.
 *
 * Co-op: players take turns and fill one shared star goal together.
 * Race: players take turns; the first to reach the target wins.
 * Each player reads words at his or her own level (the screen handles that).
 */
export type GameMode = 'coop' | 'race';

export interface Player {
  profileId: string;
  name: string;
  color: string;
}

export interface TurnState {
  mode: GameMode;
  players: Player[];
  /** Stars per player, same order as players. */
  scores: number[];
  /** Words read per player. */
  words: number[];
  /** Index of the player whose turn it is. */
  current: number;
  /** Words per turn before the next player. */
  wordsPerTurn: number;
  /** Words read in the current turn. */
  wordsThisTurn: number;
  /** Star goal (co-op: shared total; race: per player). */
  goal: number;
  /** Set when the game ends. */
  winner: number | null;
  finished: boolean;
  round: number;
}

export function createGame(players: Player[], mode: GameMode, goal: number, wordsPerTurn = 3): TurnState {
  if (players.length < 2) throw new Error('a game needs at least 2 players');
  return {
    mode, players, scores: players.map(() => 0), words: players.map(() => 0),
    current: 0, wordsPerTurn, wordsThisTurn: 0, goal, winner: null, finished: false, round: 1,
  };
}

export function totalStars(s: TurnState): number {
  return s.scores.reduce((a, b) => a + b, 0);
}

/** Progress toward the goal as 0..1 (co-op: shared; race: leader). */
export function progress(s: TurnState): number {
  const value = s.mode === 'coop' ? totalStars(s) : Math.max(...s.scores);
  return Math.min(1, value / s.goal);
}

/** Records one finished word for the current player. Returns the new state and whether the turn passed. */
export function recordWord(s: TurnState, stars: number): { state: TurnState; turnEnded: boolean } {
  if (s.finished) return { state: s, turnEnded: false };
  const scores = [...s.scores];
  const words = [...s.words];
  scores[s.current] = (scores[s.current] ?? 0) + stars;
  words[s.current] = (words[s.current] ?? 0) + 1;
  let next: TurnState = { ...s, scores, words, wordsThisTurn: s.wordsThisTurn + 1 };

  if (s.mode === 'race' && (scores[s.current] ?? 0) >= s.goal) {
    return { state: { ...next, finished: true, winner: s.current }, turnEnded: true };
  }
  if (s.mode === 'coop' && totalStars(next) >= s.goal) {
    return { state: { ...next, finished: true, winner: null }, turnEnded: true };
  }
  if (next.wordsThisTurn >= s.wordsPerTurn) {
    next = passTurn(next);
    return { state: next, turnEnded: true };
  }
  return { state: next, turnEnded: false };
}

/** Hands the turn to the next player (also used when a player taps "pass"). */
export function passTurn(s: TurnState): TurnState {
  const current = (s.current + 1) % s.players.length;
  return { ...s, current, wordsThisTurn: 0, round: current === 0 ? s.round + 1 : s.round };
}

export function currentPlayer(s: TurnState): Player {
  return s.players[s.current]!;
}

/** Race standings, best first. */
export function standings(s: TurnState): { player: Player; stars: number; words: number }[] {
  return s.players
    .map((player, i) => ({ player, stars: s.scores[i] ?? 0, words: s.words[i] ?? 0 }))
    .sort((a, b) => b.stars - a.stars);
}
