import { useEffect, useState } from 'react';
import type { TeachingNote } from '../../content/teachingNotes';
import { getNote } from '../../store/notes';
import { NoteView } from './NoteView';

/**
 * "Parent tip" tab on the practice screen. Opens a side sheet with the note
 * for the current skill, plus the syllable-splitting note on long words.
 * The sheet sits beside the card on wide screens and never covers the word.
 */
export function ParentTip({ skillId, multiSyllable }: { skillId: string; multiSyllable: boolean }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<TeachingNote | null>(null);
  const [split, setSplit] = useState<TeachingNote | null>(null);
  const [tab, setTab] = useState<'skill' | 'split'>('skill');

  useEffect(() => {
    void getNote(skillId).then((n) => setNote(n?.note ?? null));
    void getNote('syllable-splitting').then((n) => setSplit(n?.note ?? null));
  }, [skillId]);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-indigo-600 text-white text-xs font-bold px-2 py-3 rounded-l-xl shadow-lg [writing-mode:vertical-rl] rotate-180"
        title="Parent tip"
      >
        Parent tip
      </button>
      {open && (
        <aside className="fixed right-0 top-20 bottom-0 z-30 w-[min(22rem,90vw)] bg-white border-l border-indigo-100 shadow-2xl overflow-y-auto p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="font-display text-lg font-semibold text-slate-800">Parent tip</div>
            <button onClick={() => setOpen(false)} aria-label="close" className="text-slate-400 text-xl px-2">✕</button>
          </div>
          {multiSyllable && split && (
            <div className="flex gap-1 text-xs font-bold">
              <button onClick={() => setTab('skill')} className={`px-3 py-1.5 rounded-full border ${tab === 'skill' ? 'bg-indigo-600 text-white border-indigo-700' : 'border-slate-200'}`}>this rule</button>
              <button onClick={() => setTab('split')} className={`px-3 py-1.5 rounded-full border ${tab === 'split' ? 'bg-indigo-600 text-white border-indigo-700' : 'border-slate-200'}`}>splitting the word</button>
            </div>
          )}
          {tab === 'split' && multiSyllable && split ? (
            <><div className="font-bold text-slate-700">{split.title}</div><NoteView note={split} compact /></>
          ) : note ? (
            <><div className="font-bold text-slate-700">{note.title}</div><NoteView note={note} compact /></>
          ) : (
            <p className="text-sm text-slate-500">No note for this skill yet.</p>
          )}
        </aside>
      )}
    </>
  );
}
