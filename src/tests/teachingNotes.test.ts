import { describe, expect, it } from 'vitest';
import { NOTE_SECTIONS, noteWordCount, parseTeachingNote, teachingNoteFor, teachingNotes } from '../content/teachingNotes';

describe('teaching notes', () => {
  it('ships notes for 1.1 to 1.7, 2.1 and syllable splitting', () => {
    expect(teachingNotes.map((n) => n.id)).toEqual(['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '2.1', 'syllable-splitting']);
  });
  it('has all six sections, filled, in every note', () => {
    for (const note of teachingNotes) {
      for (const s of NOTE_SECTIONS) expect(note.sections[s], `${note.id} ${s}`).not.toBe('');
    }
  });
  it('keeps every note under 150 words', () => {
    for (const note of teachingNotes) expect(noteWordCount(note), note.id).toBeLessThan(150);
  });
  it('parses a note', () => {
    const n = parseTeachingNote('# 9.9 Test\n\n## Rule\nA.\n\n## How to teach\nB.\n\n## What to say\nC.\n\n## Common mistakes\nD.\n\n## Activity\nE.\n\n## Ready when\nF.\n', '9.9-test.md');
    expect(n.id).toBe('9.9');
    expect(n.sections['Ready when']).toBe('F.');
    expect(teachingNoteFor('1.3')?.sections.Rule).toMatch(/silent/);
  });
});
