import { parseTeachingNote, teachingNoteFor, teachingNotes, type TeachingNote } from '../content/teachingNotes';
import { getDB } from './db';

const KEY = (id: string) => `noteOverride:${id}`;

/** The note as the parent edited it, or the original. */
export async function getNote(id: string): Promise<{ note: TeachingNote; edited: boolean } | null> {
  const original = teachingNoteFor(id);
  if (!original) return null;
  try {
    const db = await getDB();
    const rec = await db.get('settings', KEY(id));
    if (rec && typeof rec.value === 'string') return { note: parseTeachingNote(rec.value, `${id}.md`), edited: true };
  } catch { /* fall through */ }
  return { note: original, edited: false };
}

export async function getAllNotes(): Promise<{ note: TeachingNote; edited: boolean }[]> {
  return Promise.all(teachingNotes.map(async (n) => (await getNote(n.id)) ?? { note: n, edited: false }));
}

export async function saveNoteOverride(id: string, markdown: string): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key: KEY(id), value: markdown });
}

export async function restoreNote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('settings', KEY(id));
}
