import { useState } from 'react';
import { levelsAvailable, wordsFor } from '../../content';
import { SKILLS, type Level, type SkillId } from '../../content/schema';
import { Card } from '../components/Card';
import { BigButton } from '../components/BigButton';
import { SyllableTag, syllableTextColor } from '../components/SyllableTag';

/** Parent-facing browser of the word lists. Also previews the help-ladder look. */
export function WordListScreen({ skillId, onBack }: { skillId: SkillId; onBack: () => void }) {
  const meta = SKILLS[skillId];
  const levels = levelsAvailable(skillId);
  const [level, setLevel] = useState<Level | undefined>(levels[0]);
  const words = level !== undefined ? wordsFor(skillId, level, { pool: 'all' }) : [];
  const held = words.filter((w) => w.heldOut).length;

  return (
    <main className="flex-1 px-4 py-6 max-w-5xl w-full mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BigButton tone="ghost" className="!text-lg !px-5 !py-2" onClick={onBack}>← back</BigButton>
        <h1 className="font-display text-3xl font-bold text-gray-800">
          <span className="text-gray-400 mr-2">{skillId}</span>{meta.name}
        </h1>
      </div>

      <p className="text-sm text-indigo-700 font-semibold bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-2 mb-5">{meta.hint}</p>

      {levels.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">No words yet. This skill ships in V2.</Card>
      ) : (
        <>
          <div className="flex gap-2 mb-2 flex-wrap">
            {levels.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`font-display text-lg px-5 py-2 rounded-full border-2 ${
                  l === level ? 'bg-orange-500 text-white border-orange-600' : 'bg-white border-orange-200 text-gray-700'
                }`}
              >
                Level {l} <span className="text-sm opacity-70">({wordsFor(skillId, l).length})</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mb-5">
            {words.length - held} practice words{held ? `, ${held} held out for the placement test (marked)` : ''}.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {words.map((w) => (
              <Card key={w.text} className={`p-4 ${w.heldOut ? 'border-dashed border-gray-300' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-display text-3xl tracking-wide">
                    {w.syllables.map((s, i) => (
                      <span key={i}>
                        {i > 0 && <span className="text-gray-300 mx-1">·</span>}
                        <span className={syllableTextColor[w.syllableTypes[i] ?? 'closed']}>{s}</span>
                      </span>
                    ))}
                  </div>
                  {w.heldOut && <span className="text-[10px] uppercase tracking-wide text-gray-400 border border-gray-300 rounded px-1">test</span>}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {w.syllableTypes.map((t, i) => <SyllableTag key={i} type={t} />)}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  chunks: {w.chunks.join(' - ')}
                  {w.homophones?.length ? <span> · also: {w.homophones.join(', ')}</span> : null}
                </div>
                {w.confusables?.map((c) => (
                  <div key={c.heard} className="text-xs text-amber-700 mt-1">
                    if heard "{c.heard}": {c.hint}
                  </div>
                ))}
              </Card>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
