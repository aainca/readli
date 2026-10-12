/**
 * Parent teaching notes, one Markdown file per skill plus one on syllable
 * splitting. Each note has six sections in this order. Phase 6 shows them
 * in the app and lets the parent edit them as overrides.
 */
export const NOTE_SECTIONS = [
  'Rule',
  'How to teach',
  'What to say',
  'Common mistakes',
  'Activity',
  'Ready when',
] as const;

export type NoteSection = (typeof NOTE_SECTIONS)[number];

export interface TeachingNote {
  /** "1.3" for a skill, or "syllable-splitting". */
  id: string;
  title: string;
  sections: Record<NoteSection, string>;
  /** Raw Markdown as authored. */
  markdown: string;
}

const files = import.meta.glob<string>('./teaching-notes/*.md', { eager: true, query: '?raw', import: 'default' });

export function parseTeachingNote(markdown: string, fileName: string): TeachingNote {
  const titleMatch = /^#\s+(.+)$/m.exec(markdown);
  const title = titleMatch?.[1]?.trim() ?? fileName;
  const idMatch = /^(\d+\.\d+)\b/.exec(title);
  const id = idMatch?.[1] ?? fileName.replace(/\.md$/, '');
  const sections = {} as Record<NoteSection, string>;
  for (const name of NOTE_SECTIONS) {
    const re = new RegExp(`^##\\s+${name}\\s*$\\n([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'm');
    sections[name] = re.exec(markdown)?.[1]?.trim() ?? '';
  }
  return { id, title, sections, markdown };
}

export const teachingNotes: TeachingNote[] = Object.entries(files)
  .map(([path, md]) => parseTeachingNote(md, path.split('/').pop()!))
  .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

export function teachingNoteFor(id: string): TeachingNote | undefined {
  return teachingNotes.find((n) => n.id === id);
}

export function noteWordCount(note: TeachingNote): number {
  return Object.values(note.sections)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
}
