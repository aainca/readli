import { useState } from 'react';
import { levelsAvailable, wordsFor } from '../../content';
import { GROUPS, type GroupId, type Level } from '../../content/schema';
import { Card } from '../components/Card';
import { BigButton } from '../components/BigButton';
import { SyllableTag, syllableTextColor } from '../components/SyllableTag';

/** Parent-facing browser of the word lists. Also previews the help-ladder look. */
export function WordListScreen({ group, onBack }: { group: GroupId; onBack: () => void }) {
  const meta = GROUPS[group];
  const levels = levelsAvailable(group);
  const [level, setLevel] = useState<Level | undefined>(levels[0]);
  const words = level ? wordsFor(group, level) : [];

  return (
    <main className="min-h-full px-4 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BigButton tone="ghost" className="!text-lg !px-5 !py-2" onClick={onBack}>← back</BigButton>
        <h1 className="font-display text-3xl font-bold text-gray-800">{meta.name}</h1>
      </div>

      {levels.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">No words yet. This unit is a stub.</Card>
      ) : (
        <>
          <div className="flex gap-2 mb-5 flex-wrap">
            {levels.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`font-display text-lg px-5 py-2 rounded-full border-2 ${
                  l === level ? 'bg-orange-500 text-white border-orange-600' : 'bg-white border-orange-200 text-gray-700'
                }`}
              >
                Level {l} <span className="text-sm opacity-70">({wordsFor(group, l).length})</span>
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {words.map((w) => (
              <Card key={w.text} className="p-4">
                <div className="font-display text-3xl tracking-wide">
                  {w.syllables.map((s, i) => (
                    <span key={i}>
                      {i > 0 && <span className="text-gray-300 mx-1">·</span>}
                      <span className={syllableTextColor[w.syllableTypes[i] ?? 'closed']}>{s}</span>
                    </span>
                  ))}
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
