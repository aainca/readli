import { SYLLABLE_LABELS, type Word } from '../../content/schema';
import { promptFor, type CoachEvent, type CoachState } from '../../engine/coach';
import { syllableTextColor } from './SyllableTag';

interface Props {
  word: Word;
  coach: CoachState;
  dispatch: (e: CoachEvent) => void;
  /** Speak one syllable (help step 2 voice, free inside the coach). */
  onHearPart?: (index: number) => void;
  /** Whether the microphone is already listening at the blend step. */
  listening?: boolean;
}

const STEPS: { key: CoachState['step']; label: string }[] = [
  { key: 'vowels', label: 'vowels' },
  { key: 'between', label: 'between' },
  { key: 'split', label: 'split' },
  { key: 'read', label: 'read' },
  { key: 'blend', label: 'blend' },
];

const LETTER = 'font-display text-5xl md:text-6xl font-semibold leading-none select-none';

/**
 * Break It Down coach. One screen per prompt, big tap targets, no scrolling.
 * Prompts 5 and 6 (blend, check) render only the prompt and buttons; the
 * normal listening box below handles the reading.
 */
export function CoachPanel({ word, coach, dispatch, onHearPart, listening = false }: Props) {
  const letters = [...word.text];
  const step = coach.step;
  const stepIndex = STEPS.findIndex((s) => s.key === (step === 'check' ? 'blend' : step));
  const lastPart = coach.readIndex >= word.syllables.length - 1;

  const syllableOf = (i: number) => {
    let pos = 0;
    for (let s = 0; s < word.syllables.length; s++) {
      pos += word.syllables[s]!.length;
      if (i < pos) return s;
    }
    return word.syllables.length - 1;
  };

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Step tracker: where we are in the six prompts. */}
      <ol className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${i < stepIndex ? 'bg-emerald-500 text-white' : i === stepIndex ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {i < stepIndex ? '✓' : i + 1}
            </span>
            <span className={i === stepIndex ? 'text-indigo-700' : 'text-slate-400'}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="text-slate-300">›</span>}
          </li>
        ))}
      </ol>
      <div className="font-display text-2xl md:text-3xl font-semibold text-indigo-700">{promptFor(step)}</div>

      {step === 'vowels' && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {letters.map((ch, i) => {
            const tapped = coach.tappedVowels.includes(i);
            return (
              <button
                key={i}
                onClick={() => dispatch({ type: 'tapLetter', index: i })}
                className={`${LETTER} min-w-[3.25rem] h-16 md:h-20 px-2 rounded-2xl border-2 transition ${
                  tapped ? 'bg-indigo-600 text-white border-indigo-700 underline decoration-4 underline-offset-4' : 'bg-white border-slate-200 text-slate-800 active:bg-indigo-50'
                }`}
              >
                {ch}
              </button>
            );
          })}
        </div>
      )}

      {step === 'between' && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {letters.map((ch, i) => {
            const vowel = coach.vowelIndices.includes(i);
            const between = coach.between.some((b) => b.letters.includes(i));
            return (
              <span
                key={i}
                className={`${LETTER} min-w-[3.25rem] h-16 md:h-20 px-2 rounded-2xl border-2 flex items-center justify-center ${
                  between ? 'bg-amber-200 border-amber-400 text-slate-900' : vowel ? 'bg-indigo-100 border-indigo-300 text-indigo-800 underline decoration-4 underline-offset-4' : 'border-transparent text-slate-500'
                }`}
              >
                {ch}
              </span>
            );
          })}
        </div>
      )}

      {step === 'split' && (
        <div className="flex flex-wrap justify-center items-center">
          {letters.map((ch, i) => (
            <span key={i} className="flex items-center">
              {i > 0 && (
                coach.foundSplits.includes(i) ? (
                  <span className="w-8 h-16 md:h-20 flex items-center justify-center text-4xl text-emerald-600 font-bold">·</span>
                ) : (
                  <button
                    aria-label={`split before ${ch}`}
                    onClick={() => dispatch({ type: 'tapGap', gap: i })}
                    className="w-8 h-16 md:h-20 rounded-xl bg-slate-100 border border-dashed border-slate-300 active:bg-indigo-100 flex items-center justify-center text-slate-300 text-2xl"
                  >
                    |
                  </button>
                )
              )}
              <span className={`${LETTER} px-0.5 ${coach.vowelIndices.includes(i) ? 'text-indigo-700' : 'text-slate-800'}`}>{ch}</span>
            </span>
          ))}
        </div>
      )}

      {step === 'read' && (
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm font-bold text-slate-500">
            part {coach.readIndex + 1} of {word.syllables.length} · say <span className="font-display text-xl text-slate-800">"{word.syllables[coach.readIndex]}"</span> out loud, then tap next
          </div>
          <div className="flex items-end justify-center gap-3">
            {word.syllables.map((syl, s) => {
              const type = word.syllableTypes[s] ?? 'closed';
              const lit = s === coach.readIndex;
              return (
                <div key={s} className="flex flex-col items-center gap-1">
                  <span className={`${LETTER} px-3 py-2 rounded-2xl transition ${lit ? `bg-amber-100 ${syllableTextColor[type]} scale-110` : 'text-slate-300'}`}>{syl}</span>
                  <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${lit ? 'bg-indigo-600 text-white' : 'text-transparent'}`}>{SYLLABLE_LABELS[type]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 'blend' && (
        <div className={`text-base font-bold rounded-full px-4 py-1.5 ${listening ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900 bounce-gentle'}`}>
          {listening ? '🎤 listening: say the whole word' : '👇 tap 🎤 speak, then say the whole word'}
        </div>
      )}
      {(step === 'blend' || step === 'check') && (
        <div className="flex items-center justify-center gap-2" lang="en">
          {word.syllables.map((syl, s) => (
            <span key={s} className={`${LETTER} ${syllableTextColor[word.syllableTypes[s] ?? 'closed']}`}>
              {s > 0 && <span className="text-slate-300 mr-2">·</span>}
              {syl}
            </span>
          ))}
        </div>
      )}

      {coach.feedback && <div className="text-base md:text-lg font-bold text-slate-700 text-center max-w-md">{coach.feedback}</div>}

      <div className="flex gap-2 flex-wrap justify-center">
        {step === 'vowels' && (
          <button onClick={() => dispatch({ type: 'showVowels' })} className="text-sm font-bold text-slate-500 underline underline-offset-4 px-3 py-2">show me</button>
        )}
        {step === 'between' && (
          <Big onClick={() => dispatch({ type: 'next' })}>{`${coach.between.map((b) => b.letters.length).join(' and ')} → next`}</Big>
        )}
        {step === 'read' && (
          <>
            {onHearPart && (
              <button onClick={() => onHearPart(coach.readIndex)} className="font-display text-lg px-4 py-3 rounded-full border border-sky-200 bg-sky-50 text-sky-800">🔊 hear it</button>
            )}
            <Big onClick={() => dispatch({ type: 'nextSyllable' })}>{lastPart ? '✓ all parts read → blend it' : '✓ I said it → next part'}</Big>
          </>
        )}
        {step === 'check' && (
          <>
            <Big onClick={() => dispatch({ type: 'checkAnswer', realWord: true })}>yes</Big>
            <Big onClick={() => dispatch({ type: 'checkAnswer', realWord: false })} tone="amber">not really</Big>
          </>
        )}
      </div>
      {step === 'split' && <div className="text-xs text-slate-400">tap the gap between the letters · {syllableOf(0) === 0 ? `${coach.splitGaps.length - coach.foundSplits.length} to find` : ''}</div>}
    </div>
  );
}

function Big({ children, onClick, tone = 'indigo' }: { children: React.ReactNode; onClick: () => void; tone?: 'indigo' | 'amber' }) {
  const t = tone === 'indigo' ? 'bg-indigo-600 border-indigo-800 text-white' : 'bg-amber-400 border-amber-600 text-amber-950';
  return (
    <button onClick={onClick} className={`font-display text-xl font-semibold px-6 py-3 rounded-full border-b-4 active:translate-y-1 active:border-b-0 ${t}`}>
      {children}
    </button>
  );
}
