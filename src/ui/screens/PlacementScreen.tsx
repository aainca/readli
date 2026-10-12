import { useCallback, useEffect, useRef, useState } from 'react';
import { wordsFor } from '../../content';
import { SET1_SKILL_IDS, SKILLS, type Word } from '../../content/schema';
import { config } from '../../engine/config';
import { matchWord } from '../../engine/matcher';
import { placementStep, probeWords, type Placement, type PlacementEntry, type Probe } from '../../engine/placement';
import { tts } from '../../speech/tts';
import { logAttempt } from '../../store/attempts';
import { applyPlacement } from '../../store/placements';
import { DEFAULT_PROFILE_ID, ensureDefaultProfile } from '../../store/profiles';
import { getSetting, setSetting, settingKeys } from '../../store/settings';
import type { PlacementResult } from '../../store/db';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { FallbackBanner } from '../components/FallbackBanner';
import { useRecognizer } from '../hooks/useRecognizer';

export interface PlacementProgress {
  entries: PlacementEntry[];
  seed: number;
  startedAt: number;
}

interface Props {
  onPause: () => void;
  onDone: (result: PlacementResult) => void;
}

const NEUTRAL = 'Got it, next one.';

function probeSeed(seed: number, probe: Probe): number {
  let h = seed;
  for (const ch of `${probe.skillId}:${probe.level}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * The level test. Same reading flow as practice but with no stars, no help
 * ladder, no rule panel and no right or wrong signal. Every word gets the
 * same neutral line. Parent buttons are large because one wrong judgment
 * can shift a level. Pause saves progress; the test resumes with the same
 * words.
 */
export function PlacementScreen({ onPause, onDone }: Props) {
  const [progress, setProgress] = useState<PlacementProgress | null>(null);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [word, setWord] = useState<Word | null>(null);
  const [message, setMessage] = useState('Tap the microphone, then read the word.');
  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState<string[]>([]);
  const wordRef = useRef<Word | null>(null);
  wordRef.current = word;
  const busyRef = useRef(false);
  const wantListening = useRef(false);
  const progressRef = useRef<PlacementProgress | null>(null);
  progressRef.current = progress;

  const rec = useRecognizer((r) => {
    const w = wordRef.current;
    if (!w || busyRef.current) return;
    const m = matchWord(r.alternatives, w);
    setHeard(m.heard);
    if (m.outcome === 'empty') return;
    void answer(m.outcome === 'correct');
  });

  const showStep = useCallback((p: PlacementProgress) => {
    const step = placementStep(p.entries);
    if (step.kind === 'done') {
      void finishTest(p, step);
      return;
    }
    const pool = wordsFor(step.skillId, step.level, { pool: 'test' });
    const words = probeWords(pool, probeSeed(p.seed, step));
    const w = words[step.index] ?? words[0] ?? null;
    setProbe(step);
    setWord(w);
    setHeard([]);
    if (wantListening.current) rec.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec]);

  useEffect(() => {
    void (async () => {
      await ensureDefaultProfile().catch(() => {});
      const saved = await getSetting<PlacementProgress | null>(settingKeys.placementProgress(DEFAULT_PROFILE_ID), null);
      const p = saved ?? { entries: [], seed: (Date.now() % 1000000) + 1, startedAt: Date.now() };
      setProgress(p);
      progressRef.current = p;
      await setSetting(settingKeys.placementProgress(DEFAULT_PROFILE_ID), p);
      showStep(p);
    })();
    return () => { rec.stop(); tts.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answer = async (correct: boolean) => {
    const w = wordRef.current;
    const p = progressRef.current;
    const pr = probe;
    if (!w || !p || !pr || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    rec.stop();
    setMessage(NEUTRAL);
    const timestamp = Date.now();
    void logAttempt({
      profileId: DEFAULT_PROFILE_ID, word: w.text, skillId: w.skillId, level: w.level, timestamp,
      tries: 1, helpStep: 0, result: correct ? 'correct' : 'skipped', overrideUsed: false, stars: 0, mode: 'placement', panelOn: false,
    });
    const next: PlacementProgress = { ...p, entries: [...p.entries, { skillId: pr.skillId, level: pr.level, word: w.text, correct }] };
    setProgress(next);
    progressRef.current = next;
    await setSetting(settingKeys.placementProgress(DEFAULT_PROFILE_ID), next);
    await tts.speak(NEUTRAL);
    busyRef.current = false;
    setBusy(false);
    setMessage(wantListening.current ? 'Read the word.' : 'Tap the microphone, then read the word.');
    showStep(next);
  };

  const finishTest = async (_p: PlacementProgress, placement: Placement) => {
    rec.stop();
    setWord(null);
    setMessage('All done. Thank you!');
    const result = await applyPlacement(DEFAULT_PROFILE_ID, placement, Date.now());
    await setSetting(settingKeys.placementProgress(DEFAULT_PROFILE_ID), null);
    await setSetting(settingKeys.placementOffered(DEFAULT_PROFILE_ID), true);
    onDone(result);
  };

  const pause = async () => {
    wantListening.current = false;
    rec.stop();
    tts.cancel();
    onPause();
  };

  const answered = progress?.entries.length ?? 0;
  const groupName = probe ? SKILLS[probe.skillId].name : '';
  const groupIndex = probe ? SET1_SKILL_IDS.indexOf(probe.skillId) + 1 : 0;

  return (
    <main className="flex-1 px-4 py-3 max-w-3xl w-full mx-auto flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <BigButton tone="ghost" className="!text-base !px-4 !py-1.5" onClick={() => void pause()}>⏸ pause</BigButton>
        <div className="text-sm font-bold text-slate-500">Level test · word {Math.min(answered + 1, config.placement.maxWords)} of up to {config.placement.maxWords}</div>
      </div>
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
        <div className="h-full bg-sky-400 transition-all" style={{ width: `${(answered / config.placement.maxWords) * 100}%` }} />
      </div>

      {rec.fallbackMessage && <FallbackBanner message={rec.fallbackMessage} onRetry={rec.retry} />}

      <Card className="p-5 md:p-8 flex flex-col items-center text-center gap-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{probe ? `group ${groupIndex} of 7 · ${groupName}` : ''}</div>
        <div className="min-h-[7rem] md:min-h-[8rem] flex items-center justify-center">
          {word ? (
            <div className="font-display text-7xl md:text-8xl font-semibold tracking-wider text-slate-800 leading-none select-none" lang="en">{word.text}</div>
          ) : (
            <div className="font-display text-3xl text-slate-500">…</div>
          )}
        </div>

        <div className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 flex flex-col items-center gap-0.5 shadow-inner">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500">
            <span className={`w-3 h-3 rounded-full ${rec.listening ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>{rec.listening ? (rec.hearsSpeech ? 'Listening…' : 'Parent judging') : 'Not listening'}</span>
          </div>
          <div className="text-lg font-bold text-slate-800 min-h-[1.75rem]">{message}</div>
          {rec.hearsSpeech && <div className="text-xs text-slate-400 italic min-h-[1rem]">{rec.interim ? `hearing: ${rec.interim}` : heard.length ? `heard: ${heard.slice(0, 3).join(' / ')}` : ''}</div>}
        </div>

        <BigButton
          tone="secondary"
          className={rec.listening ? '!bg-red-500 !border-red-700 mic-active-pulse' : ''}
          disabled={!word || busy}
          onClick={() => { if (wantListening.current) { wantListening.current = false; rec.stop(); } else { wantListening.current = true; rec.start(); } }}
        >
          {rec.listening ? '⏹ stop' : rec.hearsSpeech ? '🎤 speak' : '▶ start'}
        </BigButton>

        {/* Parent buttons, large: one wrong judgment can shift a level. */}
        <div className="w-full max-w-md grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <BigButton className="!bg-emerald-500 !border-emerald-700 !text-xl" disabled={!word || busy} onClick={() => void answer(true)}>✓ I heard it right</BigButton>
          <BigButton className="!bg-rose-500 !border-rose-700 !text-xl" disabled={!word || busy} onClick={() => void answer(false)}>✗ Not quite</BigButton>
        </div>
        <p className="text-[11px] text-slate-400">Parent: sit in for this test. The buttons count as the final judgment for each word.</p>
      </Card>
    </main>
  );
}
