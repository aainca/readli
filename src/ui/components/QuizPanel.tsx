import { useEffect } from 'react';
import type { QuizState } from '../../engine/storyGame';
import { currentQuestion, STORY_POINTS } from '../../engine/storyGame';
import { tts } from '../../speech/tts';
import { BigButton } from './BigButton';
import { Card } from './Card';

interface Props {
  quiz: QuizState;
  onAnswer: (option: number) => void;
  onNext: () => void;
}

/** One comprehension question at a time: shown big, spoken aloud, answered by tapping. */
export function QuizPanel({ quiz, onAnswer, onNext }: Props) {
  const q = currentQuestion(quiz);
  const chosen = quiz.chosen[quiz.index];

  // Speak the question (and its options) each time a new one appears.
  useEffect(() => {
    if (!q) return;
    void tts.speak(`${q.q} ${q.options.map((o, i) => `${['A', 'B', 'C'][i]}: ${o}.`).join(' ')}`, { rate: 0.95 });
    return () => tts.cancel();
  }, [q]);

  useEffect(() => {
    if (quiz.feedback === 'right') void tts.speak(['Yes!', 'That is right!', 'Great thinking!'][quiz.index % 3]!);
    else if (quiz.feedback === 'wrong' && q) void tts.speak(`Not quite. It was ${q.options[q.answer]}.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.feedback]);

  if (!q) return null;

  return (
    <Card className="p-5 md:p-7 flex flex-col items-center text-center gap-4">
      <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">question {quiz.index + 1} of {quiz.questions.length} · +{STORY_POINTS.perQuestion} stars each · say the answer or tap it</div>
      <div className="flex items-center gap-2">
        <h2 className="font-display text-3xl md:text-4xl font-semibold text-slate-800">{q.q}</h2>
        <button onClick={() => void tts.speak(q.q)} className="text-sky-700 text-xl" title="hear the question">🔊</button>
      </div>
      <div className="w-full max-w-md grid gap-2">
        {q.options.map((opt, i) => {
          const isChosen = chosen === i;
          const isRight = i === q.answer;
          const revealed = chosen !== null;
          const cls = !revealed
            ? 'bg-white border-slate-200 hover:bg-indigo-50'
            : isRight
              ? 'bg-emerald-100 border-emerald-500 text-emerald-900'
              : isChosen
                ? 'bg-rose-100 border-rose-400 text-rose-900'
                : 'bg-white border-slate-100 text-slate-400';
          return (
            <button
              key={i}
              disabled={revealed}
              onClick={() => onAnswer(i)}
              className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left font-display text-2xl transition ${cls}`}
            >
              <span className="w-9 h-9 rounded-full bg-indigo-600 text-white text-base font-bold flex items-center justify-center shrink-0">{['A', 'B', 'C'][i]}</span>
              <span className="flex-1">{opt}</span>
              <span onClick={(e) => { e.stopPropagation(); void tts.speak(opt); }} className="text-sky-600 text-lg" title="hear it">🔊</span>
              {revealed && isRight && <span>✓</span>}
            </button>
          );
        })}
      </div>
      {chosen !== null && (
        <div className="flex flex-col items-center gap-2">
          <div className={`font-display text-2xl ${quiz.feedback === 'right' ? 'text-emerald-700' : 'text-slate-600'}`}>
            {quiz.feedback === 'right' ? `Yes! +${STORY_POINTS.perQuestion} stars` : `It was "${q.options[q.answer]}".`}
          </div>
          <BigButton onClick={onNext}>{quiz.index + 1 < quiz.questions.length ? 'next question →' : 'see my score →'}</BigButton>
        </div>
      )}
    </Card>
  );
}
