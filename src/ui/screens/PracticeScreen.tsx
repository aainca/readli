import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { wordsFor } from '../../content';
import { SKILLS, type Level, type SkillId, type Word } from '../../content/schema';
import { initialAttempt, reduceAttempt, type AttemptState } from '../../engine/attempt';
import { matchWord } from '../../engine/matcher';
import { rulePanelFor } from '../../engine/rulePanel';
import { streakBonus } from '../../engine/scoring';
import { createSession, nextWord, requeue, type SessionState } from '../../engine/session';
import { tts } from '../../speech/tts';
import { logAttempt } from '../../store/attempts';
import { DEFAULT_PROFILE_ID, ensureDefaultProfile } from '../../store/profiles';
import { getSetting, setSetting, settingKeys } from '../../store/settings';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { RulePanel } from '../components/RulePanel';
import { StarConfetti } from '../components/StarConfetti';
import { WordDisplay } from '../components/WordDisplay';
import { useRecognizer } from '../hooks/useRecognizer';

export interface PracticeStats {
  stars: number;
  streak: number;
}

interface Props {
  skillId: SkillId;
  level: Level;
  onExit: () => void;
  onStats: (s: PracticeStats) => void;
}

const PRAISE = ['Yes!', 'Great reading!', 'You got it!', 'Nice one!', 'Super!'];

export function PracticeScreen({ skillId, level, onExit, onStats }: Props) {
  const meta = SKILLS[skillId];
  const pool = useMemo(() => wordsFor(skillId, level), [skillId, level]);

  const [session, setSession] = useState<SessionState>(() => createSession(pool));
  const [word, setWord] = useState<Word | null>(null);
  const [attempt, dispatch] = useReducer(reduceAttempt, initialAttempt);
  const [stats, setStats] = useState<PracticeStats>({ stars: 0, streak: 0 });
  const [message, setMessage] = useState<string>('Tap the microphone, then read the word.');
  const [confetti, setConfetti] = useState(0);
  const [showRule, setShowRule] = useState(true);
  const [heard, setHeard] = useState<string[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const wordRef = useRef<Word | null>(null);
  wordRef.current = word;
  const attemptRef = useRef<AttemptState>(attempt);
  attemptRef.current = attempt;
  const wantListening = useRef(false);

  const rec = useRecognizer((r) => {
    const w = wordRef.current;
    const a = attemptRef.current;
    if (!w || (a.phase !== 'listening' && a.phase !== 'repeating')) return;
    const m = matchWord(r.alternatives, w);
    setHeard(m.heard);
    if (m.outcome === 'empty') return;
    dispatch({ type: 'heard', outcome: m.outcome, hint: m.hint });
  });

  // Settings and profile.
  useEffect(() => {
    ensureDefaultProfile().catch(() => {});
    getSetting(settingKeys.showRule(DEFAULT_PROFILE_ID), true).then(setShowRule);
  }, []);
  const toggleRule = (on: boolean) => {
    setShowRule(on);
    void setSetting(settingKeys.showRule(DEFAULT_PROFILE_ID), on);
  };

  // Serve the first word.
  useEffect(() => {
    const r = nextWord(session);
    setSession(r.state);
    setWord(r.word);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => onStats(stats), [stats, onStats]);

  // After a fallback to manual mode, keep the "listening" intent so the
  // parent buttons flow continues without another tap.
  useEffect(() => {
    if (rec.mode === 'manual' && wantListening.current) rec.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.mode]);
  useEffect(() => () => { rec.stop(); tts.cancel(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const listen = useCallback(() => {
    wantListening.current = true;
    dispatch({ type: 'start' });
    rec.start();
  }, [rec]);

  const pause = useCallback(() => {
    wantListening.current = false;
    rec.stop();
  }, [rec]);

  const advance = useCallback(
    (s: SessionState) => {
      const r = nextWord(s);
      setSession(r.state);
      setHeard([]);
      if (!r.word) {
        setFinished(true);
        setWord(null);
        setMessage('All done! Great practice.');
        return;
      }
      setWord(r.word);
      dispatch({ type: 'reset' });
      setMessage(wantListening.current ? 'Read the word.' : 'Tap the microphone, then read the word.');
      if (wantListening.current) {
        dispatch({ type: 'start' });
        rec.start();
      }
    },
    [rec],
  );

  // React to attempt phase changes.
  useEffect(() => {
    if (!word) return;
    const a = attempt;
    let cancelled = false;

    if (a.phase === 'wrong') {
      rec.stop();
      const text = a.hint ?? 'Not quite. Try again.';
      setMessage(text);
      tts.speak(text).then(() => {
        if (cancelled || !wantListening.current) return;
        dispatch({ type: 'retry' });
        rec.start();
      });
    } else if (a.phase === 'modeling') {
      rec.stop();
      setMessage(`Listen: ${word.text}. Now you say it.`);
      tts.speak(`Listen. ${word.text}. ${word.text}. Now you say it.`, { rate: 0.75 }).then(() => {
        if (cancelled) return;
        dispatch({ type: 'modeled' });
        if (wantListening.current) rec.start();
      });
    } else if (a.phase === 'done') {
      rec.stop();
      const bonusStreak = a.result === 'correct' ? stats.streak + 1 : 0;
      const bonus = a.result === 'correct' ? streakBonus(bonusStreak) : 0;
      const earned = a.stars + bonus;
      setStats({ stars: stats.stars + earned, streak: bonusStreak });

      void logAttempt({
        profileId: DEFAULT_PROFILE_ID,
        word: word.text,
        skillId: word.skillId,
        level: word.level,
        timestamp: Date.now(),
        tries: Math.max(1, a.tries),
        helpStep: a.helpStep,
        result: a.result ?? 'skipped',
        overrideUsed: a.overrideUsed,
        stars: earned,
        mode: 'practice',
        panelOn: showRule,
      });

      let next = session;
      if (a.needsReview) {
        next = requeue(session, word);
        setReviewCount(next.review.length);
      } else {
        setReviewCount(session.review.length);
      }

      let line: string;
      let speech: string;
      if (a.result === 'correct') {
        const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)]!;
        line = `${praise} +${earned} stars${bonus ? ` (streak bonus!)` : ''}`;
        speech = `${praise} ${word.text}.`;
        setConfetti((c) => c + 1);
      } else if (a.result === 'modeled') {
        line = 'Good. We will see that one again.';
        speech = 'Good. We will see that one again.';
      } else {
        line = 'Skipped. It will come back later.';
        speech = 'Okay, later.';
      }
      setMessage(line);
      tts.speak(speech).then(() => {
        if (cancelled) return;
        setTimeout(() => { if (!cancelled) advance(next); }, 500);
      });
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt.phase]);

  const panel = useMemo(() => (word ? rulePanelFor(word) : null), [word]);
  const highlight = useMemo(() => new Set(showRule && panel ? panel.ruleLetters : []), [showRule, panel]);

  const live = attempt.phase !== 'done';
  const canHelp = live && attempt.phase !== 'modeling';

  return (
    <main className="flex-1 px-4 py-4 max-w-3xl w-full mx-auto flex flex-col gap-3">
      {confetti > 0 && <StarConfetti key={confetti} />}

      <div className="flex items-center justify-between gap-2">
        <BigButton tone="ghost" className="!text-base !px-4 !py-1.5" onClick={() => { pause(); tts.cancel(); onExit(); }}>← done</BigButton>
        <div className="text-sm font-bold text-slate-500">
          <span className="text-slate-400 mr-1">{skillId}</span>{meta.name} · Level {level}
          {reviewCount > 0 && <span className="ml-2 bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 text-xs">{reviewCount} to review</span>}
        </div>
      </div>

      {rec.fallbackMessage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm font-semibold rounded-2xl px-4 py-2">
          {rec.fallbackMessage}
        </div>
      )}

      <Card className="p-5 md:p-7 flex flex-col items-center text-center">
        <div className="min-h-[7rem] md:min-h-[8rem] flex items-center justify-center py-4">
          {word ? (
            <WordDisplay word={word} highlight={highlight} split={attempt.helpStep >= 1} />
          ) : (
            <div className="font-display text-4xl text-slate-500">{finished ? 'All done!' : '…'}</div>
          )}
        </div>

        <div className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex flex-col items-center gap-1 shadow-inner">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500">
            <span className={`w-3 h-3 rounded-full ${rec.listening ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>{rec.listening ? (rec.hearsSpeech ? 'Listening…' : 'Parent judging') : attempt.phase === 'wrong' ? 'Paused' : 'Not listening'}</span>
          </div>
          <div className="text-lg font-bold text-slate-800 min-h-[1.75rem]">{message}</div>
          {rec.hearsSpeech && (
            <div className="text-xs text-slate-400 italic min-h-[1rem]">
              {rec.interim ? `hearing: ${rec.interim}` : heard.length ? `heard: ${heard.slice(0, 3).join(' / ')}` : ''}
            </div>
          )}
        </div>

        <div className="w-full max-w-md grid grid-cols-3 gap-3 mt-4">
          <BigButton
            tone="secondary"
            className={`!text-lg !px-3 ${rec.listening ? '!bg-red-500 !border-red-700 mic-active-pulse' : ''}`}
            disabled={!word || finished}
            onClick={() => (wantListening.current ? pause() : listen())}
          >
            {rec.listening ? '⏹ stop' : rec.hearsSpeech ? '🎤 speak' : '▶ start'}
          </BigButton>
          <BigButton tone="ghost" className="!text-lg !px-3" disabled={!canHelp} onClick={() => dispatch({ type: 'help', step: 1 })}>
            💡 help
          </BigButton>
          <BigButton tone="ghost" className="!text-lg !px-3" disabled={!live || !word} onClick={() => dispatch({ type: 'skip' })}>
            ⏭ skip
          </BigButton>
        </div>

        {panel && <RulePanel data={panel} on={showRule} onToggle={toggleRule} />}
      </Card>

      {/* Parent override: small, always available in every mode. */}
      <div className="flex justify-center gap-2 text-xs">
        <button
          disabled={!live || !word}
          onClick={() => dispatch({ type: 'override', verdict: 'right' })}
          className="px-3 py-1.5 rounded-full border border-emerald-200 bg-white text-emerald-700 font-bold disabled:opacity-40"
        >
          ✓ I heard it right
        </button>
        <button
          disabled={!live || !word}
          onClick={() => dispatch({ type: 'override', verdict: 'notQuite' })}
          className="px-3 py-1.5 rounded-full border border-rose-200 bg-white text-rose-700 font-bold disabled:opacity-40"
        >
          ✗ Not quite
        </button>
      </div>
      <p className="text-center text-[11px] text-slate-400">
        Parent buttons. This app uses the device's default microphone and speaker.
      </p>
    </main>
  );
}
