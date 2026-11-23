import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getWord } from '../../content';
import type { Story } from '../../content/stories';
import { SKILLS } from '../../content/schema';
import { applyFinal, applyPartial, createReading, isFinished, markNext, readCount, tokenizeStory, wordCount, type ReadingState } from '../../engine/stories';
import { tts } from '../../speech/tts';
import { logAttempt, wordsReadCorrectly } from '../../store/attempts';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { FallbackBanner } from '../components/FallbackBanner';
import { StarConfetti } from '../components/StarConfetti';
import { useRecognizer } from '../hooks/useRecognizer';
import { useActiveProfileId } from '../ProfileContext';

/**
 * Read a story aloud. The engine listens for the story's words; each word it
 * hears in order lights up green, a tentative match is amber, and the next
 * word to read has a marker. Tap any word to hear it.
 */
export function StoryScreen({ story, onBack, onStars }: { story: Story; onBack: () => void; onStars: (earned: number) => void }) {
  const profileId = useActiveProfileId();
  const [known, setKnown] = useState<Set<string>>(new Set());
  const tokens = useMemo(() => tokenizeStory(story.text, known), [story.text, known]);
  const [reading, setReading] = useState<ReadingState>(() => createReading(tokens));
  const readingRef = useRef(reading);
  readingRef.current = reading;
  const [done, setDone] = useState<{ read: number; total: number; stars: number } | null>(null);
  const wantListening = useRef(false);

  useEffect(() => { void wordsReadCorrectly(profileId).then(setKnown); }, [profileId]);
  useEffect(() => { setReading((r) => ({ ...createReading(tokens), read: r.read.length === tokens.length ? r.read : createReading(tokens).read, position: r.position })); }, [tokens]);

  // Homophones from the word lists so "sew" counts for "so".
  const homophones = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const t of tokens) {
      const w = getWord(t.word);
      if (w?.homophones?.length) m.set(t.word, w.homophones);
    }
    return m;
  }, [tokens]);

  const rec = useRecognizer((r) => {
    if (!wantListening.current || done) return;
    const text = r.alternatives[0] ?? '';
    setReading((s) => applyFinal(s, text, homophones));
  });

  // Interim results: tentative highlights.
  useEffect(() => {
    if (!rec.interim) return;
    setReading((s) => applyPartial(s, rec.interim, homophones));
  }, [rec.interim, homophones]);

  // The engine listens for exactly these words.
  useEffect(() => {
    const words = [...new Set(tokens.map((t) => t.word).filter(Boolean))];
    rec.setGrammar(words);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, rec.mode]);

  useEffect(() => () => { rec.stop(); tts.cancel(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = useCallback((s: ReadingState) => {
    rec.stop();
    wantListening.current = false;
    const read = readCount(s);
    const total = wordCount(s);
    const stars = read; // one star per word read
    setDone({ read, total, stars });
    onStars(stars);
    void logAttempt({
      profileId, word: `story:${story.id}`, skillId: story.skillId, level: story.level, timestamp: Date.now(),
      tries: 1, helpStep: 0, result: 'correct', overrideUsed: false, stars, mode: 'story', panelOn: false,
    });
    void tts.speak(`The end! You read ${read} words. Great reading!`);
  }, [rec, onStars, profileId, story]);

  useEffect(() => {
    if (!done && isFinished(reading) && reading.tokens.length > 0) finish(reading);
  }, [reading, done, finish]);

  const toggleMic = () => {
    if (wantListening.current) { wantListening.current = false; rec.stop(); }
    else { wantListening.current = true; rec.start(); }
  };

  const hearWord = (i: number) => {
    const t = tokens[i];
    if (t?.word) void tts.speak(t.word, { rate: 0.8 });
  };
  const hearSentence = () => {
    const cur = reading.tokens[reading.position]?.sentence ?? 0;
    const text = reading.tokens.filter((t) => t.sentence === cur).map((t) => t.display).join(' ');
    void tts.speak(text, { rate: 0.8 });
  };

  const progress = wordCount(reading) ? readCount(reading) / wordCount(reading) : 0;

  return (
    <main className="flex-1 px-4 py-4 max-w-3xl w-full mx-auto flex flex-col gap-3">
      {done && <StarConfetti count={50} />}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <BigButton tone="ghost" className="!text-base !px-4 !py-1.5" onClick={() => { rec.stop(); tts.cancel(); onBack(); }}>← stories</BigButton>
        <div className="text-sm font-bold text-slate-500"><span className="text-slate-400">{story.skillId}</span> {SKILLS[story.skillId].name} · {readCount(reading)} of {wordCount(reading)} words</div>
      </div>
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${progress * 100}%` }} /></div>

      {rec.fallbackMessage && <FallbackBanner message={rec.fallbackMessage} onRetry={rec.retry} />}
      {rec.mode === 'vosk' && rec.engine.status === 'loading' && (
        <div className="bg-sky-50 border border-sky-200 text-sky-900 text-sm font-semibold rounded-2xl px-4 py-2">Downloading the voice engine once ({Math.round(rec.engine.progress * 100)}%)…</div>
      )}

      <Card className="p-5 md:p-8">
        <h1 className="font-display text-3xl font-bold text-slate-800 mb-4">{story.title}</h1>
        <p className="font-display text-3xl md:text-4xl leading-[1.9] text-slate-800" lang="en">
          {reading.tokens.map((t, i) => {
            const isNext = i === reading.position && !done;
            const cls = reading.read[i]
              ? 'bg-emerald-200 text-emerald-900 rounded-lg'
              : reading.tentative[i]
                ? 'bg-amber-200 text-amber-900 rounded-lg'
                : reading.skipped[i]
                  ? 'text-slate-400 line-through decoration-2'
                  : isNext
                    ? 'bg-sky-100 text-sky-900 rounded-lg ring-2 ring-sky-400'
                    : t.known && !t.isFunction
                      ? 'text-indigo-700'
                      : '';
            return (
              <span key={i}>
                <button onClick={() => hearWord(i)} className={`px-1 transition ${cls}`} title="tap to hear">{t.display}</button>{' '}
              </span>
            );
          })}
        </p>
        <p className="text-xs text-slate-400 mt-3">Blue words are ones you have practiced. Tap any word to hear it. Green means the app heard you read it.</p>
      </Card>

      {done ? (
        <Card className="p-6 text-center flex flex-col items-center gap-3">
          <div className="text-5xl">🌟</div>
          <div className="font-display text-3xl font-bold text-orange-600">The end!</div>
          <div className="font-display text-xl text-slate-700">{done.read} of {done.total} words read · +{done.stars} stars</div>
          <div className="flex gap-3 flex-wrap justify-center">
            <BigButton onClick={() => { setDone(null); setReading(createReading(tokens)); }}>read it again</BigButton>
            <BigButton tone="ghost" onClick={onBack}>more stories</BigButton>
          </div>
        </Card>
      ) : (
        <>
          <div className="w-full max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold text-slate-600 shadow-inner">
            <span className={`w-3 h-3 rounded-full ${rec.listening ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            {rec.listening ? (rec.hearsSpeech ? 'Listening… read out loud from the blue word' : 'Parent judging') : 'Tap the microphone, then read from the blue word'}
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            <BigButton tone="secondary" className={`!text-lg ${rec.listening ? '!bg-red-500 !border-red-700 mic-active-pulse' : ''}`} onClick={toggleMic}>
              {rec.listening ? '⏹ stop' : rec.hearsSpeech ? '🎤 speak' : '▶ start'}
            </BigButton>
            <BigButton tone="ghost" className="!text-lg" onClick={hearSentence}>🔊 hear this sentence</BigButton>
          </div>
          <div className="flex justify-center gap-2 text-xs">
            <button onClick={() => setReading((s) => markNext(s, true))} className="px-3 py-1.5 rounded-full border border-emerald-200 bg-white text-emerald-700 font-bold">✓ read it right</button>
            <button onClick={() => setReading((s) => markNext(s, false))} className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 font-bold">skip this word</button>
            <button onClick={() => setReading(createReading(tokens))} className="px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 font-bold">restart</button>
          </div>
          <p className="text-center text-[11px] text-slate-400">Parent buttons move past the blue word when the microphone misses it.</p>
        </>
      )}
    </main>
  );
}
