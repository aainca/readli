import { useState } from 'react';
import { levelsAvailable, wordsFor } from '../../content';
import { SKILLS, type Level, type SkillId } from '../../content/schema';
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
    </main>
  );
}
