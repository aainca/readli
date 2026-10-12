import type { RulePanelData } from '../../engine/rulePanel';
import { SyllableTag } from './SyllableTag';

export function RulePanel({ data, on, onToggle }: { data: RulePanelData; on: boolean; onToggle: (on: boolean) => void }) {
  return (
    <div className="w-full border-t border-sky-100 pt-3 mt-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-display text-base font-semibold text-slate-700">
          <span className="text-slate-400 mr-1.5">{data.skillId}</span>{data.skillName}
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 select-none cursor-pointer">
          Show rule
          <button
            role="switch"
            aria-checked={on}
            onClick={() => onToggle(!on)}
            className={`relative inline-flex h-5 w-9 rounded-full transition ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${on ? 'left-4' : 'left-0.5'}`} />
          </button>
        </label>
      </div>
      {on && (
        <div className="mt-2 text-left">
          <p className="text-sm text-slate-600 font-semibold leading-snug">{data.explanation}</p>
          {data.lines.length > 1 && (
            <ul className="mt-2 space-y-1">
              {data.lines.map((l, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="font-display text-base text-slate-800 w-20">{l.syllable}</span>
                  <SyllableTag type={l.type} />
                  <span className="text-slate-500">{l.sound}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
