import { describe, expect, it } from 'vitest';
import { createSession, nextWord, requeue, shuffle } from '../engine/session';
import type { Word } from '../content/schema';

const w = (text: string): Word => ({ text, set: 1, skillId: '1.1', level: 1, syllables: [text], syllableTypes: ['closed'], chunks: [...text] });
const words = ['a', 'b', 'c', 'd', 'e', 'f'].map(w);
const noShuffle = () => 0;

describe('session order', () => {
  it('serves every word once', () => {
    let s = createSession(words, noShuffle);
    const seen: string[] = [];
    for (let i = 0; i < 6; i++) {
      const r = nextWord(s);
      seen.push(r.word!.text);
      s = r.state;
    }
    expect(seen.sort()).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(nextWord(s).word).toBeNull();
  });

  it('brings a requeued word back later in the same session and keeps it on skip', () => {
    let s = createSession(words, noShuffle);
    const first = nextWord(s);
    s = requeue(first.state, first.word!);
    s = requeue(s, first.word!); // no duplicates
    expect(s.review).toHaveLength(1);
    const texts: string[] = [];
    for (let i = 0; i < 4; i++) {
      const r = nextWord(s);
      texts.push(r.word!.text);
      s = r.state;
    }
    expect(texts).toContain(first.word!.text);
  });

  it('shuffle keeps all items', () => {
    expect(shuffle([1, 2, 3, 4], Math.random).sort()).toEqual([1, 2, 3, 4]);
  });
});
