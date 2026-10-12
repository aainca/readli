import type { Word } from '../../content/schema';
import { syllableTextColor } from './SyllableTag';

/**
 * The big lowercase word. Highlights rule letters when the panel is on and,
 * when `split` is set (help step 1), shows syllables with dots and colors.
 */
export function WordDisplay({ word, highlight, split }: { word: Word; highlight: Set<number>; split: boolean }) {
  let idx = 0;
  return (
    <div className="font-display text-7xl md:text-8xl font-semibold tracking-wider text-slate-800 leading-none select-none" lang="en">
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
        return (
          <span key={si} className={split ? syllableTextColor[type] : ''}>
            {split && si > 0 && <span className="text-slate-300 mx-1">·</span>}
            {letters}
          </span>
        );
      })}
    </div>
  );
}
