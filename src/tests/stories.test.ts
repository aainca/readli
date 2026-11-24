import { describe, expect, it } from 'vitest';
import { STORIES, STORY_FUNCTION_WORDS } from '../content/stories';
import { allWords } from '../content';
import { alignWords, applyFinal, applyPartial, applyStable, createReading, isFinished, markNext, matchOption, rankStories, readCount, tokenizeStory, wordCount } from '../engine/stories';

describe('story content', () => {
  it('has stories for every vowel group', () => {
    expect(new Set(STORIES.map((s) => s.skillId)).size).toBe(7);
    expect(new Set(STORIES.map((s) => s.id)).size).toBe(STORIES.length);
  });
  it('uses mostly practice words and heart words', () => {
    const vocab = new Set(allWords.map((w) => w.text));
    for (const story of STORIES) {
      const tokens = tokenizeStory(story.text);
      const unknown = [...new Set(tokens.map((t) => t.word).filter((w) => w && !vocab.has(w) && !STORY_FUNCTION_WORDS.has(w)))];
      // allow a few names, plurals and simple extras per story
      expect(unknown.length, `${story.id}: ${unknown.join(', ')}`).toBeLessThanOrEqual(8);
    }
  });
});

describe('tokenizeStory', () => {
  it('keeps display text, lowercases words and counts sentences', () => {
    const t = tokenizeStory('Sam is a cat. "Hi," said Sam!', new Set(['cat']));
    expect(t.map((x) => x.word)).toEqual(['sam', 'is', 'a', 'cat', 'hi', 'said', 'sam']);
    expect(t[3]).toMatchObject({ display: 'cat.', known: true, isFunction: false, sentence: 0 });
    expect(t[4]!.sentence).toBe(1);
    expect(t[1]!.isFunction).toBe(true);
  });
});

describe('rankStories', () => {
  it('ranks by the share of content words the student has read', () => {
    const known = new Set(['kite', 'cape', 'lake', 'cake', 'bite', 'ride', 'wide', 'white', 'plane', 'rose', 'jake', 'take']);
    const ranked = rankStories(STORIES, known);
    expect(ranked[0]!.story.id).toBe('cape-kite');
    expect(ranked[0]!.coverage).toBeGreaterThan(0.5);
    expect(ranked[ranked.length - 1]!.coverage).toBeLessThan(ranked[0]!.coverage);
  });
});

describe('reading tracker', () => {
  const tokens = tokenizeStory('Sam is a cat. Sam sat on a rug.');
  it('aligns heard words in order and tolerates a dropped word', () => {
    expect(alignWords(tokens, 0, ['sam', 'is', 'a', 'cat'])).toEqual([0, 1, 2, 3]);
    expect(alignWords(tokens, 0, ['sam', 'cat'])).toEqual([0, 3]);
    expect(alignWords(tokens, 0, ['rug'])).toEqual([]); // too far ahead
    expect(alignWords(tokens, 0, ['xyz'])).toEqual([]);
  });
  it('accepts homophones', () => {
    const h = new Map([['sat', ['sad']]]);
    expect(alignWords(tokens, 4, ['sam', 'sad'], h)).toEqual([4, 5]);
  });
  it('commits finals, shows partials tentatively, and finishes', () => {
    let s = createReading(tokens);
    s = applyPartial(s, 'sam is');
    expect(s.tentative.slice(0, 2)).toEqual([true, true]);
    expect(s.position).toBe(0);
    s = applyFinal(s, 'sam is a cat');
    expect(s.read.slice(0, 4)).toEqual([true, true, true, true]);
    expect(s.tentative.every((t) => !t)).toBe(true);
    expect(s.position).toBe(4);
    s = applyFinal(s, 'sam on a rug'); // "sat" dropped
    expect(readCount(s)).toBe(8);
    expect(wordCount(s)).toBe(9);
    expect(s.read[5]).toBe(false);
    expect(isFinished(s)).toBe(true);
  });
  it('commits the stable part of a partial word by word', () => {
    let s = createReading(tokens);
    s = applyStable(s, 'sam');
    expect(s.read[0]).toBe(false);
    expect(s.tentative[0]).toBe(true);
    s = applyStable(s, 'sam is');
    expect(s.read[0]).toBe(true);
    expect(s.tentative[1]).toBe(true);
    expect(s.position).toBe(1);
    s = applyStable(s, 'sam is a cat');
    expect(s.read.slice(0, 3)).toEqual([true, true, true]);
    expect(s.tentative[3]).toBe(true);
    s = applyFinal(s, 'sam is a cat');
    expect(s.read[3]).toBe(true);
    expect(s.position).toBe(4);
  });

  it('matches a spoken answer to an option by words or letter', () => {
    const opts = ['a cat', 'a bug', 'on the rug'];
    expect(matchOption('a cat', opts)).toBe(0);
    expect(matchOption('I think it is a bug', opts)).toBe(1);
    expect(matchOption('on the rug please', opts)).toBe(2);
    expect(matchOption('b', opts)).toBe(1);
    expect(matchOption('the dog', opts)).toBeNull();
    expect(matchOption('', opts)).toBeNull();
  });

  it('lets the parent mark or skip the next word', () => {
    let s = createReading(tokens);
    s = markNext(s, true);
    expect(s.read[0]).toBe(true);
    s = markNext(s, false);
    expect(s.skipped[1]).toBe(true);
    expect(s.position).toBe(2);
  });
});
