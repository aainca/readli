import { useEffect, useState } from 'react';
import { levelsAvailable, wordsFor } from '../../content';
import { SKILLS, type Level, type SkillId } from '../../content/schema';
import type { CoachMode } from '../../engine/coach';
import { DEFAULT_PROFILE_ID } from '../../store/profiles';
import { getSetting, setSetting, settingKeys } from '../../store/settings';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';

interface Props {
  skillId: SkillId;
  onBack: () => void;
  onPractice: (level: Level) => void;
  onWords: () => void;
}

/** Pick a level, then practice or browse the words. Level progress arrives in Phase 4. */
export function SkillScreen({ skillId, onBack, onPractice, onWords }: Props) {
  const meta = SKILLS[skillId];
  const levels = levelsAvailable(skillId);
  const [level, setLevel] = useState<Level | undefined>(levels[0]);
  const [coachMode, setCoachMode] = useState<CoachMode>('guided');
  useEffect(() => {
    void getSetting<CoachMode>(settingKeys.coachMode(DEFAULT_PROFILE_ID), 'guided').then(setCoachMode);
  }, []);
  const pickMode = (m: CoachMode) => {
    setCoachMode(m);
    void setSetting(settingKeys.coachMode(DEFAULT_PROFILE_ID), m);
  };

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
            {levels.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`font-display text-xl px-6 py-3 rounded-full border-2 ${
                  l === level ? 'bg-orange-500 text-white border-orange-600' : 'bg-white border-orange-200 text-slate-700'
                }`}
              >
                Level {l} <span className="text-sm opacity-70">({wordsFor(skillId, l).length})</span>
              </button>
            ))}
          </div>
          <BigButton disabled={level === undefined} onClick={() => level !== undefined && onPractice(level)}>
            ⭐ practice Level {level}
          </BigButton>
          <button onClick={onWords} className="text-sm font-bold text-sky-700 underline underline-offset-4">see the word list</button>
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
