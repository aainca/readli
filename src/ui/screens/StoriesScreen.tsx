import { useEffect, useState } from 'react';
import { STORIES, type Story } from '../../content/stories';
import { SKILLS } from '../../content/schema';
import { rankStories, type StoryMatch } from '../../engine/stories';
import { wordsReadCorrectly } from '../../store/attempts';
import { getProfile } from '../../store/profiles';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { useActiveProfileId } from '../ProfileContext';

/** Stories ranked by how many of their words the reader has already read in practice. */
export function StoriesScreen({ onBack, onOpen }: { onBack: () => void; onOpen: (story: Story) => void }) {
  const profileId = useActiveProfileId();
  const [ranked, setRanked] = useState<StoryMatch[] | null>(null);
  const [knownCount, setKnownCount] = useState(0);

  useEffect(() => {
    void (async () => {
      const [known, profile] = await Promise.all([wordsReadCorrectly(profileId), getProfile(profileId)]);
      setKnownCount(known.size);
      const practiced = Object.keys(profile?.levels ?? {});
      setRanked(rankStories(STORIES, known, practiced));
    })();
  }, [profileId]);

  return (
    <main className="flex-1 px-4 py-6 max-w-3xl w-full mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <BigButton tone="ghost" className="!text-lg !px-5 !py-2" onClick={onBack}>← back</BigButton>
        <h1 className="font-display text-3xl font-bold text-slate-800">📖 Stories</h1>
      </div>
      <p className="text-sm text-slate-600 font-semibold">
        Stories made from the words you practice. The best match is first.
        {knownCount > 0 ? ` You have read ${knownCount} different words so far.` : ' Practice some words and the stories will light up.'}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(ranked ?? []).map((m) => {
          const pct = Math.round(m.coverage * 100);
          return (
            <Card key={m.story.id} role="button" tabIndex={0} onClick={() => onOpen(m.story)} onKeyDown={(e) => e.key === 'Enter' && onOpen(m.story)} className="p-4 cursor-pointer hover:-translate-y-0.5 transition">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-xl font-semibold text-slate-800">{m.story.title}</div>
                  <div className="text-xs text-slate-500"><span className="text-slate-400">{m.story.skillId}</span> {SKILLS[m.story.skillId].name} · Level {m.story.level}</div>
                </div>
                <div className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${pct >= 60 ? 'bg-emerald-100 text-emerald-800' : pct >= 30 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                  {pct}% words you know
                </div>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${pct}%` }} /></div>
              <p className="mt-2 text-sm text-slate-500 line-clamp-2">{m.story.text}</p>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
