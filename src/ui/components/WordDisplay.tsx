import { SYLLABLE_LABELS, type Word } from '../../content/schema';
import { syllableTextColor } from './SyllableTag';

interface Props {
  word: Word;
  /** Letter indices to underline (rule panel). */
  highlight: Set<number>;
  /** Help step 1: dots between syllables, colors and labels. */
  split: boolean;
  /** Help step 2: syllables become tap targets that speak. */
  onTapSyllable?: (index: number) => void;
}

/** The big lowercase word, with the help ladder's syllable view when `split` is on. */
export function WordDisplay({ word, highlight, split, onTapSyllable }: Props) {
  let idx = 0;
  return (
    <div className="flex items-end justify-center gap-1 flex-wrap" lang="en">
      {word.syllables.map((syl, si) => {
        const type = word.syllableTypes[si] ?? 'closed';
        const letters = [...syl].map((ch) => {
          const i = idx++;
          const hl = highlight.has(i);
          return (
            <span key={i} className={hl ? 'text-indigo-600 underline decoration-4 decoration-indigo-300 underline-offset-8' : ''}>
              {ch}
            </span>
          );
        });
        const text = (
          <span className={`font-display text-7xl md:text-8xl font-semibold tracking-wider leading-none select-none ${split ? syllableTextColor[type] : 'text-slate-800'}`}>
            {letters}
          </span>
        );
        return (
          <span key={si} className="flex items-end">
            {split && si > 0 && <span className="font-display text-6xl text-slate-300 mx-1 leading-none pb-6">·</span>}
            {split ? (
              <span className="flex flex-col items-center gap-1">
                {onTapSyllable ? (
                  <button onClick={() => onTapSyllable(si)} className="rounded-2xl px-2 py-1 active:bg-indigo-50" aria-label={`hear ${syl}`}>
                    {text}
                  </button>
                ) : (
                  text
                )}
                <span className="text-xs font-bold text-white rounded-full px-2 py-0.5" style={{ background: `var(--color-syl-${type})` }}>
                  {SYLLABLE_LABELS[type]}
                </span>
              </span>
            ) : (
              text
            )}
          </span>
        );
      })}
    </div>
  );
}
