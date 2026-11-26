import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getWord } from '../../content';
import type { Story } from '../../content/stories';
import { SKILLS } from '../../content/schema';
import { applyFinal, applyStable, createReading, isFinished, markNext, matchOption, readCount, tokenizeStory, wordCount, type ReadingState } from '../../engine/stories';
import { answer, createQuiz, initialReadScore, next, quizSummary, scoreSkip, scoreWords, type QuizState, type ReadScore } from '../../engine/storyGame';
import { tts } from '../../speech/tts';
import { logAttempt, wordsReadCorrectly } from '../../store/attempts';
import { getSetting, setSetting, settingKeys } from '../../store/settings';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { FallbackBanner } from '../components/FallbackBanner';
import { QuizPanel } from '../components/QuizPanel';
import { StarConfetti } from '../components/StarConfetti';
import { useRecognizer } from '../hooks/useRecognizer';
import { useActiveProfileId } from '../ProfileContext';

type Phase = 'read' | 'quiz' | 'done';

/**
 * Display text with dots between syllables when the word is in our lists
 * and has more than one syllable. Punctuation and capitals are kept.
 */
function withDots(display: string, word: string): string {
  const entry = getWord(word);
  if (!entry || entry.syllables.length < 2) return display;
  const m = /^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/.exec(display);
  if (!m) return display;
  const [, pre, core, post] = m;
  if (core!.toLowerCase() !== word) return display;
  const parts: string[] = [];
  let i = 0;
  for (const syl of entry.syllables) {
    parts.push(core!.slice(i, i + syl.length));
    i += syl.length;
  }
  return `${pre}${parts.join('·')}${post}`;
}

const SENTENCE_PRAISE = ['Nice!', 'Keep going!', 'Great reading!', 'You got it!', 'Super!'];

/**
 * Read a story aloud, with live scoring. Each word the engine hears in
 * order turns green and earns a star; five in a row earns a bonus; each
 * finished sentence gets a word of praise. Then a short spoken quiz, with
 * ten stars per correct answer.
 */
export function StoryScreen({ story, onBack, onStars }: { story: Story; onBack: () => void; onStars: (earned: number) => void }) {
  const profileId = useActiveProfileId();
  const [known, setKnown] = useState<Set<string>>(new Set());
  const tokens = useMemo(() => tokenizeStory(story.text, known), [story.text, known]);
  const [reading, setReading] = useState<ReadingState>(() => createReading(tokens));
  const [score, setScore] = useState<ReadScore>(initialReadScore);
  const [pop, setPop] = useState<{ id: number; text: string } | null>(null);
  const [phase, setPhase] = useState<Phase>('read');
  const [quiz, setQuiz] = useState<QuizState>(() => createQuiz(story.questions));
  const [confetti, setConfetti] = useState(0);
  const wantListening = useRef(false);
  const popId = useRef(0);
  const sentencesDone = useRef(new Set<number>());
  const [heardLine, setHeardLine] = useState('');
  const [dots, setDots] = useState(false);
  useEffect(() => { void getSetting<boolean>(settingKeys.storyDots, false).then(setDots); }, []);
  const toggleDots = (on: boolean) => { setDots(on); void setSetting(settingKeys.storyDots, on); };
  const quizRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<Phase>('read');
  phaseRef.current = phase;
  const quizStateRef = useRef<QuizState>(quiz);
  quizStateRef.current = quiz;

  useEffect(() => { void wordsReadCorrectly(profileId).then(setKnown); }, [profileId]);
  useEffect(() => { setReading((r) => ({ ...createReading(tokens), read: r.read.length === tokens.length ? r.read : createReading(tokens).read, position: r.position })); }, [tokens]);

  const homophones = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const t of tokens) {
      const w = getWord(t.word);
      if (w?.homophones?.length) m.set(t.word, w.homophones);
    }
    return m;
  }, [tokens]);

  const showPop = (text: string) => {
    popId.current += 1;
    setPop({ id: popId.current, text });
  };

  /** Scores newly read words and praises each sentence as it completes. */
  const commit = useCallback((before: ReadingState, after: ReadingState) => {
    const newly = after.read.filter((r, i) => r && !before.read[i]).length;
    if (newly === 0) return;
    setScore((s) => {
      const ns = scoreWords(s, newly);
      showPop(ns.lastBonus ? `+${newly} ⭐ streak +${ns.lastBonus}!` : `+${newly} ⭐`);
      return ns;
    });
    // Sentence finished?
    const lastIdx = after.read.lastIndexOf(true);
    const sentence = after.tokens[lastIdx]?.sentence;
    if (sentence !== undefined && !sentencesDone.current.has(sentence)) {
      const inSentence = after.tokens.map((t, i) => (t.sentence === sentence && t.word ? i : -1)).filter((i) => i >= 0);
      const complete = inSentence.every((i) => after.read[i] || after.skipped[i]);
      if (complete) {
        sentencesDone.current.add(sentence);
        if (!isFinished(after)) void tts.speak(SENTENCE_PRAISE[sentence % SENTENCE_PRAISE.length]!, { rate: 1.05 });
      }
    }
  }, []);

  const rec = useRecognizer((r) => {
    if (!wantListening.current) return;
    const text = r.alternatives[0] ?? '';
    setHeardLine(text);
    if (phaseRef.current === 'read') {
      setReading((s) => {
        const n = applyFinal(s, text, homophones);
        commit(s, n);
        return n;
      });
    } else if (phaseRef.current === 'quiz') {
      const q = quizStateRef.current;
      const cur = q.questions[q.index];
      if (!cur || q.chosen[q.index] !== null) return;
      const i = matchOption(text, cur.options);
      if (i !== null) pickAnswer(i);
    }
  });

  // Partial results: commit everything but the last word so words turn green one by one.
  useEffect(() => {
    if (!rec.interim || phase !== 'read') return;
    setHeardLine(rec.interim);
    setReading((s) => {
      const n = applyStable(s, rec.interim, homophones);
      commit(s, n);
      return n;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.interim]);

  // The engine listens for the story's words while reading, and for the answers during the quiz.
  useEffect(() => {
    if (phase === 'quiz') {
      const cur = quiz.questions[quiz.index];
      const words = cur ? cur.options.flatMap((o) => o.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/)).filter(Boolean) : [];
      rec.setGrammar([...new Set([...words, 'a', 'b', 'c'])]);
    } else {
      rec.setGrammar([...new Set(tokens.map((t) => t.word).filter(Boolean))]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, rec.mode, phase, quiz.index]);

  useEffect(() => () => { rec.stop(); tts.cancel(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reading finished: stop the mic and start the quiz.
  useEffect(() => {
    if (phase !== 'read' || !isFinished(reading) || reading.tokens.length === 0) return;
    setConfetti((c) => c + 1);
    setHeardLine('');
    void tts.speak(`The end! You read ${readCount(reading)} words. Now, three questions about the story. Say the answer, or tap it.`).then(() => {
      setPhase('quiz');
      setTimeout(() => quizRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reading, phase]);

  // Quiz finished: tally, log, celebrate.
  useEffect(() => {
    if (phase !== 'quiz' || !quiz.finished) return;
    rec.stop();
    wantListening.current = false;
    const q = quizSummary(quiz);
    const total = score.stars + q.stars;
    onStars(total);
    void logAttempt({
      profileId, word: `story:${story.id}`, skillId: story.skillId, level: story.level, timestamp: Date.now(),
      tries: 1, helpStep: 0, result: 'correct', overrideUsed: false, stars: total, mode: 'story', panelOn: false,
    });
    setConfetti((c) => c + 1);
    void tts.speak(`${q.right} of ${q.total} right. ${total} stars for this story. Great job!`);
    setPhase('done');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.finished, phase]);

  const pickAnswer = (o: number) => {
    const q = quizStateRef.current;
    if (q.questions[q.index]?.answer === o) setConfetti((c) => c + 1);
    setQuiz((cur) => answer(cur, o));
    setHeardLine('');
  };

  const toggleMic = () => {
    if (wantListening.current) { wantListening.current = false; rec.stop(); }
    else { wantListening.current = true; rec.start(); }
  };
  const hearWord = (i: number) => { const t = tokens[i]; if (t?.word) void tts.speak(t.word, { rate: 0.8 }); };
  const hearSentence = () => {
    const cur = reading.tokens[reading.position]?.sentence ?? 0;
    void tts.speak(reading.tokens.filter((t) => t.sentence === cur).map((t) => t.display).join(' '), { rate: 0.85 });
  };
  const parentMark = (asRead: boolean) => {
    setReading((s) => {
      const n = markNext(s, asRead);
      if (asRead) commit(s, n);
      else setScore((sc) => scoreSkip(sc));
      return n;
    });
  };
  const restart = () => {
    rec.stop();
    wantListening.current = false;
    sentencesDone.current = new Set();
    setReading(createReading(tokens));
    setScore(initialReadScore);
    setQuiz(createQuiz(story.questions));
    setPhase('read');
  };

  const total = wordCount(reading);
  const progress = total ? readCount(reading) / total : 0;
  const qs = quizSummary(quiz);

  return (
    <main className="flex-1 px-4 py-4 max-w-3xl w-full mx-auto flex flex-col gap-3">
      {confetti > 0 && <StarConfetti key={confetti} count={50} />}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <BigButton tone="ghost" className="!text-base !px-4 !py-1.5" onClick={() => { rec.stop(); tts.cancel(); onBack(); }}>← stories</BigButton>
        <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
          <span><span className="text-slate-400">{story.skillId}</span> {SKILLS[story.skillId].name}</span>
          <span className="relative bg-amber-100 text-amber-800 rounded-full px-3 py-1 font-display text-lg">
            ⭐ {score.stars + qs.stars}
            {pop && <span key={pop.id} className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-emerald-700 text-sm font-bold animate-[confetti-fall_1.2s_ease-out_reverse]">{pop.text}</span>}
          </span>
          {score.streak >= 2 && phase === 'read' && <span className="text-orange-600">🔥 {score.streak} in a row</span>}
        </div>
      </div>
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${progress * 100}%` }} /></div>

      {phase === 'read' && rec.fallbackMessage && <FallbackBanner message={rec.fallbackMessage} onRetry={rec.retry} />}
      {phase === 'read' && rec.mode === 'vosk' && rec.engine.status === 'loading' && (
        <div className="bg-sky-50 border border-sky-200 text-sky-900 text-sm font-semibold rounded-2xl px-4 py-2">Downloading the voice engine once ({Math.round(rec.engine.progress * 100)}%)…</div>
      )}

      {(phase === 'read' || phase === 'quiz') && (
        <>
          <Card className="p-5 md:p-8">
            <h1 className="font-display text-3xl font-bold text-slate-800 mb-4">{story.title}</h1>
            <p className="font-display text-3xl md:text-4xl leading-[1.9] text-slate-800" lang="en">
              {reading.tokens.map((t, i) => {
                const isNext = i === reading.position;
                const cls = reading.read[i]
                  ? 'bg-emerald-200 text-emerald-900 rounded-lg'
                  : reading.tentative[i]
                    ? 'bg-amber-200 text-amber-900 rounded-lg'
                    : reading.skipped[i]
                      ? 'text-slate-400 line-through decoration-2'
                      : isNext && phase === 'read'
                        ? 'rounded-lg ring-2 ring-sky-400'
                        : '';
                return (
                  <span key={i}>
                    <button onClick={() => hearWord(i)} className={`px-1 transition ${cls}`} title="tap to hear">{dots ? withDots(t.display, t.word) : t.display}</button>{' '}
                  </span>
                );
              })}
            </p>
            <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
              <p className="text-xs text-slate-400">Read from the outlined word. Green = heard you, +1 star each. Five in a row = +5. Tap any word to hear it.</p>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 select-none cursor-pointer shrink-0">
                syllable dots
                <button role="switch" aria-checked={dots} aria-label="syllable dots" onClick={() => toggleDots(!dots)} className={`relative inline-flex h-5 w-9 rounded-full transition ${dots ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${dots ? 'left-4' : 'left-0.5'}`} />
                </button>
              </label>
            </div>
          </Card>
          <div className="w-full max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 flex flex-col items-center gap-0.5 text-sm font-bold text-slate-600 shadow-inner">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${rec.listening ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              {rec.listening ? (rec.hearsSpeech ? (phase === 'quiz' ? 'Listening… say the answer' : 'Listening… read out loud') : 'Parent judging') : phase === 'quiz' ? 'Tap an answer, or tap the microphone and say it' : 'Tap the microphone, then read from the outlined word'}
            </div>
            {rec.hearsSpeech && <div className="text-xs text-slate-400 italic font-normal min-h-[1rem]">{heardLine ? `heard: ${heardLine}` : ''}</div>}
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            <BigButton tone="secondary" className={`!text-lg ${rec.listening ? '!bg-red-500 !border-red-700 mic-active-pulse' : ''}`} onClick={toggleMic}>
              {rec.listening ? '⏹ stop' : rec.hearsSpeech ? '🎤 speak' : '▶ start'}
            </BigButton>
            {phase === 'read' && <BigButton tone="ghost" className="!text-lg" onClick={hearSentence}>🔊 hear this sentence</BigButton>}
          </div>
          {phase === 'read' && (
            <>
              <div className="flex justify-center gap-2 text-xs">
                <button onClick={() => parentMark(true)} className="px-3 py-1.5 rounded-full border border-emerald-200 bg-white text-emerald-700 font-bold">✓ read it right</button>
                <button onClick={() => parentMark(false)} className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 font-bold">skip this word</button>
                <button onClick={restart} className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 font-bold">restart</button>
              </div>
              <p className="text-center text-[11px] text-slate-400">Parent buttons move past the outlined word when the microphone misses it.</p>
            </>
          )}
        </>
      )}

      {phase === 'quiz' && (
        <div ref={quizRef}>
          <QuizPanel quiz={quiz} onAnswer={pickAnswer} onNext={() => { setQuiz((q) => next(q)); setHeardLine(''); }} />
        </div>
      )}

      {phase === 'done' && (
        <Card className="p-6 md:p-8 text-center flex flex-col items-center gap-3">
          <div className="text-6xl">🏆</div>
          <h2 className="font-display text-4xl font-bold text-orange-600">Story complete!</h2>
          <div className="grid grid-cols-3 gap-3 w-full max-w-md text-center">
            <div className="bg-emerald-50 rounded-2xl p-3"><div className="font-display text-2xl text-emerald-800">{score.wordsRead}/{total}</div><div className="text-xs text-slate-500">words read</div></div>
            <div className="bg-indigo-50 rounded-2xl p-3"><div className="font-display text-2xl text-indigo-800">{qs.right}/{qs.total}</div><div className="text-xs text-slate-500">questions right</div></div>
            <div className="bg-amber-50 rounded-2xl p-3"><div className="font-display text-2xl text-amber-800">⭐ {score.stars + qs.stars}</div><div className="text-xs text-slate-500">stars earned</div></div>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <BigButton onClick={restart}>read it again</BigButton>
            <BigButton tone="ghost" onClick={onBack}>more stories</BigButton>
          </div>
        </Card>
      )}
    </main>
  );
}
