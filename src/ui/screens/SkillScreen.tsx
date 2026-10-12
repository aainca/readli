import { useEffect, useState } from 'react';
import { levelsAvailable, wordsFor } from '../../content';
import { SKILLS, type Level, type SkillId } from '../../content/schema';
import type { CoachMode } from '../../engine/coach';
import { config } from '../../engine/config';
import { evaluateMastery, type MasteryReport } from '../../engine/mastery';
import { attemptsForLevel } from '../../store/attempts';
import { DEFAULT_PROFILE_ID, ensureDefaultProfile, getProfile, setSkillLevel } from '../../store/profiles';
import { getSetting, setSetting, settingKeys } from '../../store/settings';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { HoldButton } from '../components/HoldButton';

interface Props {
  skillId: SkillId;
  onBack: () => void;
  onPractice: (level: Level) => void;
  onWords: () => void;
}

/**
 * Pick a level, then practice or browse the words. Levels above the current
 * one are locked until mastery unlocks them. A parent can hold the button
 * for 3 seconds to change the level by hand.
 */
export function SkillScreen({ skillId, onBack, onPractice, onWords }: Props) {
  const meta = SKILLS[skillId];
  const levels = levelsAvailable(skillId);
  const [current, setCurrent] = useState<Level | undefined>(undefined);
  const [level, setLevel] = useState<Level | undefined>(undefined);
  const [reports, setReports] = useState<Partial<Record<Level, MasteryReport>>>({});
  const [parentMode, setParentMode] = useState(false);
  const [coachMode, setCoachMode] = useState<CoachMode>('guided');

  useEffect(() => {
    void (async () => {
      const profile = (await getProfile(DEFAULT_PROFILE_ID)) ?? (await ensureDefaultProfile());
      const cur = profile.levels[skillId] ?? levels[0];
      setCurrent(cur);
      setLevel(cur);
      const entries = await Promise.all(levels.map(async (l) => [l, evaluateMastery(await attemptsForLevel(DEFAULT_PROFILE_ID, skillId, l))] as const));
      setReports(Object.fromEntries(entries));
      setCoachMode(await getSetting<CoachMode>(settingKeys.coachMode(DEFAULT_PROFILE_ID), 'guided'));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillId]);

  const pickMode = (m: CoachMode) => {
    setCoachMode(m);
    void setSetting(settingKeys.coachMode(DEFAULT_PROFILE_ID), m);
  };

  const changeLevel = async (l: Level) => {
    await setSkillLevel(DEFAULT_PROFILE_ID, skillId, l);
    setCurrent(l);
    setLevel(l);
    setParentMode(false);
  };

  const idx = (l: Level) => levels.indexOf(l);
  const locked = (l: Level) => current !== undefined && idx(l) > idx(current);

  return (
    <main className="flex-1 px-4 py-6 max-w-3xl w-full mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <BigButton tone="ghost" className="!text-lg !px-5 !py-2" onClick={onBack}>← back</BigButton>
        <h1 className="font-display text-3xl font-bold text-slate-800">
          <span className="text-slate-400 mr-2">{skillId}</span>{meta.name}
        </h1>
      </div>
      <p className="text-sm text-indigo-700 font-semibold bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-2 mb-5">{meta.hint}</p>

      {levels.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">No words yet. This skill ships in V2.</Card>
      ) : (
        <Card className="p-6 flex flex-col items-center gap-5">
          <div className="flex gap-2 flex-wrap justify-center">
            {levels.map((l) => {
              const r = reports[l];
              const isLocked = locked(l) && !parentMode;
              const mastered = current !== undefined && idx(l) < idx(current);
              return (
                <button
                  key={l}
                  disabled={isLocked}
                  onClick={() => (parentMode ? void changeLevel(l) : setLevel(l))}
                  className={`font-display text-xl px-5 py-3 rounded-2xl border-2 flex flex-col items-center min-w-[7rem] ${
                    l === level ? 'bg-orange-500 text-white border-orange-600' : 'bg-white border-orange-200 text-slate-700'
                  } ${isLocked ? 'opacity-40' : ''}`}
                >
                  <span>{isLocked ? '🔒 ' : mastered ? '✅ ' : l === current ? '▶ ' : ''}Level {l}</span>
                  <span className="text-xs font-body font-bold opacity-80">
                    {r && r.attemptsInWindow > 0
                      ? `${r.cleanReads}/${r.attemptsInWindow} first try · ${r.distinctDays} day${r.distinctDays === 1 ? '' : 's'}`
                      : `${wordsFor(skillId, l).length} words`}
                  </span>
                </button>
              );
            })}
          </div>
          {level !== undefined && reports[level] && !reports[level]!.mastered && reports[level]!.attemptsInWindow > 0 && (
            <p className="text-xs text-slate-500 -mt-2">
              To unlock the next level: {Math.round(config.mastery.masteryAccuracy * 100)}% first try over the last {config.mastery.windowSize} words, on {config.mastery.minDistinctDays} different days.
              {reports[level]!.stepBack && ' Right now the session mixes in words from the level below.'}
            </p>
          )}
          <BigButton disabled={level === undefined} onClick={() => level !== undefined && onPractice(level)}>
            ⭐ practice Level {level}
          </BigButton>
          <div className="flex items-center gap-4 text-sm font-bold">
            <button onClick={onWords} className="text-sky-700 underline underline-offset-4">see the word list</button>
            {parentMode ? (
              <span className="text-indigo-700">tap a level to set it · <button onClick={() => setParentMode(false)} className="underline">cancel</button></span>
            ) : (
              <HoldButton onHeld={() => setParentMode(true)} className="text-slate-400 px-3 py-1.5 rounded-full border border-slate-200">
                parent: hold to change level
              </HoldButton>
            )}
          </div>
        </Card>
      )}

      {levels.length > 0 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-slate-600 flex-wrap">
          <span>Break It Down coach:</span>
          {(['guided', 'onRequest', 'off'] as const).map((m) => (
            <button
              key={m}
              onClick={() => pickMode(m)}
              className={`px-3 py-1.5 rounded-full border ${coachMode === m ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white border-slate-200'}`}
            >
              {m === 'guided' ? 'Guided' : m === 'onRequest' ? 'On request only' : 'Off'}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
