import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { wordsFor } from '../../content';
import { COACH_PROMPTS } from '../../content/coach-prompts';
import { SKILLS, type Level, type SkillId, type Word } from '../../content/schema';
import { initialAttempt, reduceAttempt, type AttemptState } from '../../engine/attempt';
import {
  createCoach, decideCoach, promptFor, reduceCoach, updateCoachCounts,
  type CoachCounts, type CoachEvent, type CoachMode, type CoachState,
} from '../../engine/coach';
import { matchWord } from '../../engine/matcher';
import { rulePanelFor } from '../../engine/rulePanel';
import { streakBonus } from '../../engine/scoring';
import { evaluateMastery, isCleanRead } from '../../engine/mastery';
import { fastAdjust } from '../../engine/placement';
import { clearProvisional } from '../../store/placements';
import { dueReviews, enqueueReview, planSession, recordReviewRead } from '../../engine/scheduler';
import { createSessionFromPlan, nextWord, requeue, type SessionState } from '../../engine/session';
import { config } from '../../engine/config';
import { syllableSpeech } from '../../speech/sayAs';
import { tts } from '../../speech/tts';
import { attemptsForLevel, logAttempt, totalStars } from '../../store/attempts';
import { DEFAULT_PROFILE_ID, ensureDefaultProfile, getProfile, setSkillLevel } from '../../store/profiles';
import { getReview, getReviews, putReview } from '../../store/reviews';
import { getSetting, setSetting, settingKeys } from '../../store/settings';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { CoachPanel } from '../components/CoachPanel';
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
  onLevelUp: (from: Level, to: Level) => void;
  /** Fast adjust moved the child down a level. */
  onFastAdjustDown: (to: Level) => void;
}

interface Summary {
  words: number;
  stars: number;
  review: number;
}

const PRAISE = ['Yes!', 'Great reading!', 'You got it!', 'Nice one!', 'Super!'];
const NO_COUNTS: CoachCounts = { seenAtLevel: 0, cleanStreak: 0 };

function coachReducer(s: CoachState | null, e: CoachEvent | { type: 'open'; word: Word } | { type: 'close' }): CoachState | null {
  if (e.type === 'open') return createCoach(e.word);
  if (e.type === 'close') return null;
  return s ? reduceCoach(s, e) : s;
}

export function PracticeScreen({ skillId, level, onExit, onStats, onLevelUp, onFastAdjustDown }: Props) {
  const meta = SKILLS[skillId];

  const [session, setSession] = useState<SessionState>(() => createSessionFromPlan([]));
  const [summary, setSummary] = useState<Summary | null>(null);
  const sessionStars = useRef(0);
  const sessionWords = useRef(0);
  const [word, setWord] = useState<Word | null>(null);
  const [attempt, dispatch] = useReducer(reduceAttempt, initialAttempt);
  const [coach, coachDispatch] = useReducer(coachReducer, null);
  const [coachMode, setCoachMode] = useState<CoachMode>('guided');
  const [coachCounts, setCoachCounts] = useState<CoachCounts>(NO_COUNTS);
  const [reminder, setReminder] = useState(false);
  const [stats, setStats] = useState<PracticeStats>({ stars: 0, streak: 0 });
  const [message, setMessage] = useState<string>('Tap the microphone, then read the word.');
  const [confetti, setConfetti] = useState(0);
  const [showRule, setShowRule] = useState(true);
  const [heard, setHeard] = useState<string[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const wordRef = useRef<Word | null>(null);
  wordRef.current = word;
  const attemptRef = useRef<AttemptState>(attempt);
  attemptRef.current = attempt;
  const coachRef = useRef<CoachState | null>(coach);
  coachRef.current = coach;
  const wantListening = useRef(false);
  const usedCoach = useRef(false);
  const countsRef = useRef<CoachCounts>(coachCounts);
  countsRef.current = coachCounts;
  const modeRef = useRef<CoachMode>(coachMode);
  modeRef.current = coachMode;

  const rec = useRecognizer((r) => {
    const w = wordRef.current;
    const a = attemptRef.current;
    if (!w || (a.phase !== 'listening' && a.phase !== 'repeating')) return;
    const m = matchWord(r.alternatives, w);
    setHeard(m.heard);
    if (m.outcome === 'empty') return;
    dispatch({ type: 'heard', outcome: m.outcome, hint: m.hint });
  });

  /* ---------- settings ---------- */
  useEffect(() => {
    ensureDefaultProfile().catch(() => {});
    void getSetting(settingKeys.showRule(DEFAULT_PROFILE_ID), true).then(setShowRule);
    void getSetting<CoachMode>(settingKeys.coachMode(DEFAULT_PROFILE_ID), 'guided').then((m) => { setCoachMode(m); modeRef.current = m; });
    void (async () => {
      const c = await getSetting<CoachCounts>(settingKeys.coachCounts(DEFAULT_PROFILE_ID, skillId, level), NO_COUNTS);
      setCoachCounts(c);
      countsRef.current = c;
      const total = await totalStars(DEFAULT_PROFILE_ID).catch(() => 0);
      setStats({ stars: total, streak: 0 });
      await beginSession();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Plans a session from the scheduler: 70% current, 20% due review, 10% mastered. */
  const beginSession = useCallback(async () => {
    const now = Date.now();
    const [profile, reviews, attempts] = await Promise.all([
      getProfile(DEFAULT_PROFILE_ID),
      getReviews(DEFAULT_PROFILE_ID).catch(() => []),
      attemptsForLevel(DEFAULT_PROFILE_ID, skillId, level).catch(() => []),
    ]);
    const levels = SKILLS[skillId].levels;
    const idx = levels.indexOf(level);
    const belowLevel = idx > 0 ? levels[idx - 1] : undefined;
    const masteredLevels = (profile?.mastered?.[skillId] ?? []).concat(profile?.placedOut?.[skillId] ?? []).filter((l) => l !== level);
    const due = dueReviews(reviews, now);
    const reviewWords = due.map((r) => wordsFor(r.skillId, r.level, { pool: 'all' }).find((w) => w.text === r.word)).filter((w): w is Word => !!w);
    const plan = planSession({
      current: wordsFor(skillId, level),
      below: belowLevel !== undefined ? wordsFor(skillId, belowLevel) : [],
      review: reviewWords,
      mastered: masteredLevels.flatMap((l) => wordsFor(skillId, l)),
      stepBack: evaluateMastery(attempts).stepBack,
    });
    sessionStars.current = 0;
    sessionWords.current = 0;
    setSummary(null);
    setFinished(false);
    const s = createSessionFromPlan(plan.words);
    const r = nextWord(s);
    setSession(r.state);
    startWord(r.word, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillId, level]);
  const toggleRule = (on: boolean) => {
    setShowRule(on);
    void setSetting(settingKeys.showRule(DEFAULT_PROFILE_ID), on);
  };

  useEffect(() => onStats(stats), [stats, onStats]);
  useEffect(() => () => { rec.stop(); tts.cancel(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (rec.mode === 'manual' && wantListening.current) rec.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.mode]);

  /* ---------- word lifecycle ---------- */
  const isMulti = (w: Word | null) => !!w && w.syllables.length > 1;

  const startWord = useCallback((w: Word | null, _afterMiss: boolean) => {
    setHeard([]);
    setHelpOpen(false);
    usedCoach.current = false;
    coachDispatch({ type: 'close' });
    setReminder(false);
    dispatch({ type: 'reset' });
    if (!w) {
      setFinished(true);
      setWord(null);
      setMessage('All done! Great practice.');
      return;
    }
    setWord(w);
    const appearance = isMulti(w) ? decideCoach(modeRef.current, countsRef.current, false) : 'none';
    if (appearance === 'full') {
      usedCoach.current = true;
      rec.stop();
      coachDispatch({ type: 'open', word: w });
      setMessage('');
      return;
    }
    if (appearance === 'reminder') setReminder(true);
    setMessage(wantListening.current ? 'Read the word.' : 'Tap the microphone, then read the word.');
    if (wantListening.current) {
      dispatch({ type: 'start' });
      rec.start();
    }
  }, [rec]);

  const advance = useCallback((s: SessionState) => {
    if (sessionWords.current >= config.session.wordsPerSession || (s.queue.length === 0 && s.review.length === 0)) {
      rec.stop();
      setWord(null);
      setSummary({ words: sessionWords.current, stars: sessionStars.current, review: s.review.length });
      return;
    }
    const r = nextWord(s);
    setSession(r.state);
    startWord(r.word, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWord]);

  const listen = useCallback(() => {
    wantListening.current = true;
    if (coachRef.current && coachRef.current.step !== 'blend') return; // coach owns the screen until blend
    dispatch({ type: attemptRef.current.phase === 'wrong' ? 'retry' : 'start' });
    rec.start();
  }, [rec]);

  const pause = useCallback(() => {
    wantListening.current = false;
    rec.stop();
  }, [rec]);

  const openCoach = () => {
    if (!word || !isMulti(word) || attempt.phase === 'done') return;
    usedCoach.current = true;
    rec.stop();
    setHelpOpen(false);
    coachDispatch({ type: 'open', word });
  };

  /* ---------- coach side effects ---------- */
  const lastSpoken = useRef<string>('');
  useEffect(() => {
    if (!coach || !word) return;
    const line = coach.feedback ? `${promptFor(coach.step)} ${coach.feedback}` : promptFor(coach.step);
    if (coach.step === 'read') {
      const part = syllableSpeech(word)[coach.readIndex] ?? '';
      const toSay = coach.readIndex === 0 ? `${promptFor('read')} ${part}` : part;
      void tts.speak(toSay, { rate: 0.75 });
      return;
    }
    if (coach.step === 'done') return;
    if (line !== lastSpoken.current) {
      lastSpoken.current = line;
      void tts.speak(coach.feedback && coach.step !== 'check' ? coach.feedback : promptFor(coach.step)).then(() => {
        if (coach.step === 'blend' && coachRef.current?.step === 'blend') {
          // Hand over to the normal listener.
          if (wantListening.current) {
            dispatch({ type: attemptRef.current.phase === 'wrong' ? 'retry' : 'start' });
            rec.start();
            setMessage('Read the whole word.');
          } else {
            setMessage('Tap the microphone and read the whole word.');
          }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach?.step, coach?.feedback, coach?.readIndex]);

  useEffect(() => {
    if (coach?.revealed) dispatch({ type: 'help', step: 1 });
  }, [coach?.revealed]);

  /* ---------- attempt side effects ---------- */
  useEffect(() => {
    if (!word) return;
    const a = attempt;
    let cancelled = false;

    if (a.phase === 'wrong') {
      rec.stop();
      const c = coachRef.current;
      if (c && c.step === 'blend') {
        // Coach prompt 6.
        coachDispatch({ type: 'blendResult', correct: false });
        setMessage(a.hint ?? '');
        return;
      }
      const text = a.hint ?? 'Not quite. Try again.';
      setMessage(text);
      tts.speak(text).then(() => {
        if (cancelled) return;
        const appearance = isMulti(word) ? decideCoach(modeRef.current, countsRef.current, true) : 'none';
        if (appearance === 'full' && !coachRef.current) {
          usedCoach.current = true;
          coachDispatch({ type: 'open', word });
          return;
        }
        if (!wantListening.current) return;
        dispatch({ type: 'retry' });
        rec.start();
      });
    } else if (a.phase === 'modeling') {
      rec.stop();
      coachDispatch({ type: 'close' });
      setMessage(`Listen: ${word.text}. Now you say it.`);
      tts.speak(`Listen. ${word.text}. ${word.text}. Now you say it.`, { rate: 0.75 }).then(() => {
        if (cancelled) return;
        dispatch({ type: 'modeled' });
        if (wantListening.current) rec.start();
      });
    } else if (a.phase === 'done') {
      rec.stop();
      if (coachRef.current) coachDispatch({ type: 'blendResult', correct: a.result === 'correct' });
      const bonusStreak = a.result === 'correct' ? stats.streak + 1 : 0;
      const bonus = a.result === 'correct' ? streakBonus(bonusStreak) : 0;
      const earned = a.stars + bonus;
      setStats({ stars: stats.stars + earned, streak: bonusStreak });

      sessionStars.current += earned;
      sessionWords.current += 1;
      const timestamp = Date.now();
      const persisted = logAttempt({
        profileId: DEFAULT_PROFILE_ID,
        word: word.text,
        skillId: word.skillId,
        level: word.level,
        timestamp,
        tries: Math.max(1, a.tries),
        helpStep: a.helpStep,
        result: a.result ?? 'skipped',
        overrideUsed: a.overrideUsed,
        stars: earned,
        mode: 'practice',
        panelOn: showRule,
      });

      // Spaced review queue, then mastery check. Both after the log is written.
      const clean = isCleanRead({ timestamp, tries: Math.max(1, a.tries), helpStep: a.helpStep, result: a.result ?? 'skipped' });
      const afterPersist = persisted.then(async () => {
        const existing = await getReview(DEFAULT_PROFILE_ID, word.text).catch(() => undefined);
        if (a.needsReview) {
          await putReview(enqueueReview(existing, word, DEFAULT_PROFILE_ID, timestamp));
        } else if (existing && !existing.retiredAt) {
          await putReview(recordReviewRead(existing, { clean, timestamp }));
        }
        if (word.skillId !== skillId || word.level !== level) return null;
        const attempts = await attemptsForLevel(DEFAULT_PROFILE_ID, skillId, level);
        const profile = await getProfile(DEFAULT_PROFILE_ID);
        if ((profile?.levels[skillId] ?? SKILLS[skillId].levels[0]) !== level) return null;
        const levels = SKILLS[skillId].levels;

        // Fast adjust while a placement is provisional.
        const prov = profile?.provisional?.[skillId];
        if (prov && prov.level === level) {
          const since = attempts.filter((a) => a.timestamp >= prov.since).sort((a, b) => a.timestamp - b.timestamp);
          const verdict = fastAdjust(since);
          if (verdict !== 'pending') await clearProvisional(DEFAULT_PROFILE_ID, skillId);
          if (verdict === 'up') {
            const next = levels[levels.indexOf(level) + 1];
            if (next !== undefined) {
              await setSkillLevel(DEFAULT_PROFILE_ID, skillId, next, { masteredLevel: level });
              return { kind: 'up' as const, to: next };
            }
          }
          if (verdict === 'down') {
            const below = levels[levels.indexOf(level) - 1];
            if (below !== undefined) {
              await setSkillLevel(DEFAULT_PROFILE_ID, skillId, below);
              return { kind: 'down' as const, to: below };
            }
          }
        }

        const report = evaluateMastery(attempts);
        if (!report.mastered) return null;
        const next = levels[levels.indexOf(level) + 1];
        if (next === undefined) return null;
        await setSkillLevel(DEFAULT_PROFILE_ID, skillId, next, { masteredLevel: level });
        return { kind: 'up' as const, to: next };
      }).catch(() => null);

      if (isMulti(word)) {
        const c = updateCoachCounts(countsRef.current, { correct: a.result === 'correct', usedCoach: usedCoach.current });
        countsRef.current = c;
        setCoachCounts(c);
        void setSetting(settingKeys.coachCounts(DEFAULT_PROFILE_ID, skillId, level), c);
      }

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
        line = `${praise} +${earned} stars${bonus ? ' (streak bonus!)' : ''}`;
        speech = `${praise} ${word.text}.`;
        setConfetti((c) => c + 1);
      } else if (a.result === 'modeled') {
        line = 'Good. We will see that one again.';
        speech = line;
      } else {
        line = 'Skipped. It will come back later.';
        speech = 'Okay, later.';
      }
      setMessage(line);
      Promise.all([tts.speak(speech), afterPersist]).then(([, change]) => {
        if (cancelled) return;
        if (change) {
          rec.stop();
          if (change.kind === 'up') onLevelUp(level, change.to);
          else onFastAdjustDown(change.to);
          return;
        }
        setTimeout(() => { if (!cancelled) advance(next); }, 500);
      });
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt.phase]);

  /* ---------- help ladder ---------- */
  const help1 = () => {
    setHelpOpen(true);
    dispatch({ type: 'help', step: 1 });
  };
  const help2 = (i: number) => {
    if (!word) return;
    dispatch({ type: 'help', step: 2 });
    void tts.speak(syllableSpeech(word)[i] ?? '', { rate: 0.75 });
  };
  const help3 = () => {
    if (!word) return;
    dispatch({ type: 'help', step: 3 });
    void tts.speak(word.text, { rate: 0.75 });
  };

  const panel = useMemo(() => (word ? rulePanelFor(word) : null), [word]);
  const highlight = useMemo(() => new Set(showRule && panel ? panel.ruleLetters : []), [showRule, panel]);

  const live = attempt.phase !== 'done';
  const coachOwnsScreen = !!coach && coach.step !== 'blend' && coach.step !== 'done';
  const canHelp = live && !!word && attempt.phase !== 'modeling' && !coachOwnsScreen;
  const splitShown = attempt.helpStep >= 1 || (!!coach && (coach.step === 'blend' || coach.step === 'check'));

  return (
    <main className="flex-1 px-4 py-3 max-w-3xl w-full mx-auto flex flex-col gap-3">
      {confetti > 0 && <StarConfetti key={confetti} />}

      <div className="flex items-center justify-between gap-2">
        <BigButton tone="ghost" className="!text-base !px-4 !py-1.5" onClick={() => { pause(); tts.cancel(); onExit(); }}>← done</BigButton>
        <div className="text-sm font-bold text-slate-500">
          <span className="text-slate-400 mr-1">{skillId}</span>{meta.name} · Level {level}
          {reviewCount > 0 && <span className="ml-2 bg-amber-100 text-amber-800 rounded-full px-2 py-0.5 text-xs">{reviewCount} to review</span>}
        </div>
      </div>

      {rec.fallbackMessage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-sm font-semibold rounded-2xl px-4 py-2">{rec.fallbackMessage}</div>
      )}

      {summary && (
        <Card className="p-6 md:p-10 text-center flex flex-col items-center gap-3">
          <div className="text-6xl">🌟</div>
          <h2 className="font-display text-4xl font-bold text-orange-600">Session done!</h2>
          <p className="font-display text-2xl text-slate-700">{summary.words} words · {summary.stars} stars</p>
          {summary.review > 0 && <p className="text-slate-500">{summary.review} word{summary.review === 1 ? '' : 's'} to practice again next time.</p>}
          <div className="flex gap-3 mt-2 flex-wrap justify-center">
            <BigButton onClick={() => void beginSession()}>⭐ keep going</BigButton>
            <BigButton tone="ghost" onClick={() => { pause(); tts.cancel(); onExit(); }}>done for now</BigButton>
          </div>
        </Card>
      )}

      {!summary && <Card className="p-4 md:p-6 flex flex-col items-center text-center">
        {coach && word && coach.step !== 'done' ? (
          <div className="w-full py-2">
            <CoachPanel word={word} coach={coach} dispatch={coachDispatch} />
          </div>
        ) : (
          <div className="min-h-[7rem] md:min-h-[8rem] flex items-center justify-center py-3">
            {word ? (
              <WordDisplay word={word} highlight={highlight} split={splitShown} onTapSyllable={helpOpen ? help2 : undefined} />
            ) : (
              <div className="font-display text-4xl text-slate-500">{finished ? 'All done!' : '…'}</div>
            )}
          </div>
        )}

        {reminder && !coach && (
          <div className="text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1 mb-2">{COACH_PROMPTS.reminder}</div>
        )}

        {helpOpen && word && !coachOwnsScreen && (
          <div className="flex items-center gap-2 mb-2 text-sm font-bold text-slate-600">
            <span>tap a part to hear it ·</span>
            <button onClick={help3} className="px-3 py-1.5 rounded-full border border-sky-200 bg-sky-50 text-sky-800">🔊 hear the word</button>
          </div>
        )}

        {!coachOwnsScreen && (
          <div className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 flex flex-col items-center gap-0.5 shadow-inner">
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
        )}

        <div className="w-full max-w-md grid grid-cols-4 gap-2 mt-3">
          <BigButton
            tone="secondary"
            className={`!text-base !px-2 ${rec.listening ? '!bg-red-500 !border-red-700 mic-active-pulse' : ''}`}
            disabled={!word || finished || coachOwnsScreen}
            onClick={() => (wantListening.current ? pause() : listen())}
          >
            {rec.listening ? '⏹ stop' : rec.hearsSpeech ? '🎤 speak' : '▶ start'}
          </BigButton>
          <BigButton tone="ghost" className="!text-base !px-2" disabled={!canHelp} onClick={help1}>💡 help</BigButton>
          <BigButton tone="ghost" className="!text-base !px-2" disabled={!canHelp || !isMulti(word) || !!coach} onClick={openCoach}>🧩 break it down</BigButton>
          <BigButton tone="ghost" className="!text-base !px-2" disabled={!live || !word} onClick={() => dispatch({ type: 'skip' })}>⏭ skip</BigButton>
        </div>

        {panel && !coachOwnsScreen && <RulePanel data={panel} on={showRule} onToggle={toggleRule} />}
      </Card>}

      <div className="flex justify-center gap-2 text-xs">
        <button disabled={!live || !word} onClick={() => dispatch({ type: 'override', verdict: 'right' })} className="px-3 py-1.5 rounded-full border border-emerald-200 bg-white text-emerald-700 font-bold disabled:opacity-40">✓ I heard it right</button>
        <button disabled={!live || !word} onClick={() => dispatch({ type: 'override', verdict: 'notQuite' })} className="px-3 py-1.5 rounded-full border border-rose-200 bg-white text-rose-700 font-bold disabled:opacity-40">✗ Not quite</button>
      </div>
      <p className="text-center text-[11px] text-slate-400">Parent buttons. This app uses the device's default microphone and speaker.</p>
    </main>
  );
}
