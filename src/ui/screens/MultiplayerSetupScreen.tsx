import { useState } from 'react';
import { SET1_SKILL_IDS, SKILLS, type Set1SkillId } from '../../content/schema';
import type { GameMode, Player } from '../../engine/turns';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { useProfiles } from '../ProfileContext';

export interface GameSetup {
  players: Player[];
  mode: GameMode;
  goal: number;
  skillId: Set1SkillId;
  wordsPerTurn: number;
}

const GOALS = { coop: [60, 100, 150], race: [30, 50, 80] } as const;

/** Pick 2 to 4 readers, a mode, a star goal and a group. Each reader plays at their own level. */
export function MultiplayerSetupScreen({ onBack, onStart }: { onBack: () => void; onStart: (setup: GameSetup) => void }) {
  const { profiles } = useProfiles();
  const [chosen, setChosen] = useState<string[]>(profiles.slice(0, 2).map((p) => p.id));
  const [mode, setMode] = useState<GameMode>('coop');
  const [goal, setGoal] = useState<number>(100);
  const [skillId, setSkillId] = useState<Set1SkillId>('1.1');

  const toggle = (id: string) =>
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 4 ? [...c, id] : c));

  const players: Player[] = chosen
    .map((id) => profiles.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({ profileId: p.id, name: p.name, color: p.avatarColor }));

  return (
    <main className="flex-1 px-4 py-6 max-w-2xl w-full mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <BigButton tone="ghost" className="!text-lg !px-5 !py-2" onClick={onBack}>← back</BigButton>
        <h1 className="font-display text-3xl font-bold text-slate-800">Play together</h1>
      </div>

      <Card className="p-4">
        <div className="font-display text-lg font-semibold text-slate-700 mb-2">Who is playing? (2 to 4)</div>
        {profiles.length < 2 && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-2">Add a second reader on the profiles screen first (tap the name in the header).</p>}
        <div className="flex gap-2 flex-wrap">
          {profiles.map((p) => (
            <button key={p.id} onClick={() => toggle(p.id)} className={`flex items-center gap-2 px-3 py-2 rounded-full border-2 ${chosen.includes(p.id) ? 'border-slate-800 bg-white' : 'border-slate-200 bg-slate-50 opacity-70'}`}>
              <span className="w-7 h-7 rounded-full text-white font-bold flex items-center justify-center" style={{ background: p.avatarColor }}>{p.name[0]?.toUpperCase()}</span>
              <span className="font-display">{p.name}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          {(['coop', 'race'] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setGoal(GOALS[m][1]); }} className={`flex-1 rounded-2xl border-2 p-3 text-left ${mode === m ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}`}>
              <div className="font-display text-lg font-semibold">{m === 'coop' ? '🤝 Co-op' : '🏁 Friendly race'}</div>
              <div className="text-xs text-slate-500">{m === 'coop' ? 'Take turns and fill one star goal together.' : 'Take turns. First to the star target wins.'}</div>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-600 flex-wrap">
          <span>{mode === 'coop' ? 'Shared goal:' : 'Target per player:'}</span>
          {GOALS[mode].map((g) => (
            <button key={g} onClick={() => setGoal(g)} className={`px-3 py-1.5 rounded-full border ${goal === g ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white border-slate-200'}`}>⭐ {g}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-600 flex-wrap">
          <span>Group:</span>
          <select value={skillId} onChange={(e) => setSkillId(e.target.value as Set1SkillId)} className="border border-slate-200 rounded-xl px-3 py-1.5 bg-white">
            {SET1_SKILL_IDS.map((id) => <option key={id} value={id}>{id} {SKILLS[id].name}</option>)}
          </select>
          <span className="text-xs text-slate-400">each reader gets words at their own level</span>
        </div>
      </Card>

      <BigButton disabled={players.length < 2} onClick={() => onStart({ players, mode, goal, skillId, wordsPerTurn: 3 })}>
        🎮 start
      </BigButton>
    </main>
  );
}
