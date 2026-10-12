import { SET1_SKILL_IDS, SKILLS } from '../../content/schema';
import { wordsFor } from '../../content';

/** The prototype's "7 Rules Guide" modal, now driven by the skill registry. */
export function RulesGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] p-6 shadow-2xl border border-sky-100 relative flex flex-col" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="close" className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl font-bold p-2">✕</button>
        <h3 className="font-display text-2xl font-bold text-sky-900 mb-1">The 7 Vowel Group Rules</h3>
        <p className="text-xs text-slate-500 font-semibold mb-4">Child-friendly guide to vowel sounds.</p>

        <div className="overflow-y-auto pr-2 space-y-3 flex-1 text-sm">
          {SET1_SKILL_IDS.map((id, idx) => {
            const meta = SKILLS[id];
            const examples = wordsFor(id, meta.levels[0], { pool: 'practice' }).slice(0, 8);
            return (
              <div key={id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-indigo-600 text-white font-display font-semibold text-xs px-2.5 py-0.5 rounded-lg">Rule {idx + 1}</span>
                  <h4 className="font-display font-semibold text-slate-800 text-base">{meta.name}</h4>
                </div>
                <p className="text-xs text-indigo-700 font-bold mb-1">{meta.hint}</p>
                <p className="text-xs text-slate-600 font-semibold mb-2 leading-relaxed">{meta.explanation}</p>
                <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-wrap gap-1.5">
                  {examples.map((w) => (
                    <span key={w.text} className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-lg border border-indigo-100">{w.text}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="bg-emerald-500 hover:bg-emerald-600 text-white font-display font-semibold px-6 py-2.5 rounded-xl text-sm shadow transition">Got it!</button>
        </div>
      </div>
    </div>
  );
}
