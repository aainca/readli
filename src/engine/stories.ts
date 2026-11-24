import { STORY_FUNCTION_WORDS, type Story } from '../content/stories';
import { normalize } from './matcher';

/**
 * Story selection and tokenizing. Pure.
 */
export interface StoryToken {
  /** Text as shown, with punctuation. */
  display: string;
  /** Lowercase letters only, or '' for a token with no letters. */
  word: string;
  /** True when the word is a heart or sight word the story uses freely. */
  isFunction: boolean;
  /** True when the student has read this word correctly in practice. */
  known: boolean;
  /** Sentence index. */
  sentence: number;
}

export function tokenizeStory(text: string, known: Set<string> = new Set()): StoryToken[] {
  const out: StoryToken[] = [];
  let sentence = 0;
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const word = normalize(raw).replace(/\s/g, '');
    out.push({ display: raw, word, isFunction: STORY_FUNCTION_WORDS.has(word), known: known.has(word), sentence });
    if (/[.!?]["']?$/.test(raw)) sentence += 1;
  }
  return out;
}

export interface StoryMatch {
  story: Story;
  /** Distinct content words in the story. */
  contentWords: string[];
  /** Of those, the ones the student has read correctly. */
  knownWords: string[];
  /** knownWords / contentWords, 0..1. */
  coverage: number;
}

/** Ranks stories by how many of their content words the student has read correctly. */
export function rankStories(stories: Story[], known: Set<string>, preferredSkills: string[] = []): StoryMatch[] {
  const matches = stories.map((story) => {
    const tokens = tokenizeStory(story.text, known);
    const contentWords = [...new Set(tokens.filter((t) => t.word && !t.isFunction).map((t) => t.word))];
    const knownWords = contentWords.filter((w) => known.has(w));
    return { story, contentWords, knownWords, coverage: contentWords.length ? knownWords.length / contentWords.length : 0 };
  });
  const pref = (m: StoryMatch) => (preferredSkills.includes(m.story.skillId) ? 1 : 0);
  return matches.sort((a, b) => b.coverage - a.coverage || pref(b) - pref(a) || a.story.level.toString().localeCompare(b.story.level.toString()));
}

/* ---------- live reading tracker ---------- */

export interface ReadingState {
  tokens: StoryToken[];
  /** Index of the next word to read. */
  position: number;
  /** Per token: read correctly (committed). */
  read: boolean[];
  /** Per token: matched by a partial result, not yet committed. */
  tentative: boolean[];
  /** Tokens the reader was allowed to skip (parent marked, or passed over). */
  skipped: boolean[];
  /** Heard words of the current utterance already committed from partials. */
  partialCommitted: number;
}

export function createReading(tokens: StoryToken[]): ReadingState {
  const n = tokens.length;
  return { tokens, position: firstWordIndex(tokens, 0), read: Array(n).fill(false), tentative: Array(n).fill(false), skipped: Array(n).fill(false), partialCommitted: 0 };
}

function firstWordIndex(tokens: StoryToken[], from: number): number {
  let i = from;
  while (i < tokens.length && !tokens[i]!.word) i++;
  return i;
}

/** How far ahead a recognized word may match, to tolerate a dropped word or two. */
const LOOKAHEAD = 3;

/**
 * Aligns recognized words, in order, to the text from the current position.
 * A recognized word may match the next word or one of the few after it
 * (dropped words are left unread). Returns the indices matched, in order.
 */
export function alignWords(tokens: StoryToken[], position: number, heard: string[], homophones: Map<string, string[]> = new Map()): number[] {
  const matched: number[] = [];
  let pos = position;
  for (const h of heard) {
    const w = normalize(h).replace(/\s/g, '');
    if (!w) continue;
    for (let i = pos, seen = 0; i < tokens.length && seen <= LOOKAHEAD; i++) {
      const t = tokens[i]!;
      if (!t.word) continue;
      seen++;
      if (t.word === w || homophones.get(t.word)?.includes(w)) {
        matched.push(i);
        pos = i + 1;
        break;
      }
    }
  }
  return matched;
}

function commitWords(s: ReadingState, heard: string[], homophones?: Map<string, string[]>): ReadingState {
  const matched = alignWords(s.tokens, s.position, heard, homophones);
  if (matched.length === 0) return s;
  const read = [...s.read];
  for (const i of matched) read[i] = true;
  const last = matched[matched.length - 1]!;
  return { ...s, read, position: firstWordIndex(s.tokens, last + 1) };
}

/** Commits a final recognition result (the words not already committed from its partials). */
export function applyFinal(s: ReadingState, text: string, homophones?: Map<string, string[]>): ReadingState {
  const heard = text.split(/\s+/).filter(Boolean).slice(s.partialCommitted);
  const next = commitWords(s, heard, homophones);
  return { ...next, tentative: s.tentative.map(() => false), partialCommitted: 0 };
}

/**
 * Commits the stable part of a partial result and shows the rest as
 * tentative. Speech engines revise only the last word or two of a partial,
 * so everything before the last `holdBack` heard words is committed at
 * once, which is what makes words turn green one by one while reading.
 */
export function applyStable(s: ReadingState, text: string, homophones?: Map<string, string[]>, holdBack = 1): ReadingState {
  const heard = text.split(/\s+/).filter(Boolean);
  const stableEnd = Math.max(s.partialCommitted, heard.length - holdBack);
  const fresh = heard.slice(s.partialCommitted, stableEnd);
  const committed = fresh.length ? commitWords(s, fresh, homophones) : s;
  const rest = heard.slice(stableEnd);
  const tentative = committed.tokens.map(() => false);
  for (const i of alignWords(committed.tokens, committed.position, rest, homophones)) tentative[i] = true;
  return { ...committed, tentative, partialCommitted: stableEnd };
}

/** Shows a partial result as tentative highlights without moving the position. */
export function applyPartial(s: ReadingState, text: string, homophones?: Map<string, string[]>): ReadingState {
  const heard = text.split(/\s+/).filter(Boolean).slice(s.partialCommitted);
  const matched = alignWords(s.tokens, s.position, heard, homophones);
  const tentative = s.tokens.map(() => false);
  for (const i of matched) tentative[i] = true;
  return { ...s, tentative };
}

/** Parent or child marks the next word as read (or skips it) and moves on. */
export function markNext(s: ReadingState, asRead: boolean): ReadingState {
  if (s.position >= s.tokens.length) return s;
  const read = [...s.read];
  const skipped = [...s.skipped];
  if (asRead) read[s.position] = true;
  else skipped[s.position] = true;
  return { ...s, read, skipped, position: firstWordIndex(s.tokens, s.position + 1) };
}

export function isFinished(s: ReadingState): boolean {
  return s.position >= s.tokens.length;
}

export function readCount(s: ReadingState): number {
  return s.read.filter(Boolean).length;
}

export function wordCount(s: ReadingState): number {
  return s.tokens.filter((t) => t.word).length;
}

/**
 * Which answer option a spoken reply matches: the option's words in order,
 * or just its letter (a, b, c). Returns null when nothing matches.
 */
export function matchOption(heard: string, options: string[]): number | null {
  const words = normalize(heard).split(' ').filter(Boolean);
  if (words.length === 0) return null;
  const letters = ['a', 'b', 'c', 'd'];
  for (let i = 0; i < options.length; i++) {
    const opt = normalize(options[i]!).split(' ').filter(Boolean);
    if (opt.length === 0) continue;
    for (let start = 0; start + opt.length <= words.length; start++) {
      if (opt.every((w, k) => words[start + k] === w)) return i;
    }
  }
  if (words.length === 1 && letters.includes(words[0]!)) {
    const i = letters.indexOf(words[0]!);
    return i < options.length ? i : null;
  }
  return null;
}
