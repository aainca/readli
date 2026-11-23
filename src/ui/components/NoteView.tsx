import { NOTE_SECTIONS, type TeachingNote } from '../../content/teachingNotes';

/** Renders a parent teaching note's six sections. */
export function NoteView({ note, compact = false }: { note: TeachingNote; compact?: boolean }) {
  return (
    <div className={`flex flex-col ${compact ? 'gap-2' : 'gap-3'}`}>
      {NOTE_SECTIONS.map((s) => (
        <section key={s}>
          <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 mb-0.5">{s}</h4>
          <div className={`text-slate-700 ${compact ? 'text-sm' : 'text-[15px]'} leading-snug whitespace-pre-line`}>
            {note.sections[s].replace(/^\d+\.\s+/gm, (m) => m)}
          </div>
        </section>
      ))}
    </div>
  );
}
