import { useEffect, useState } from 'react';
import { SET1_SKILL_IDS, SKILLS, type Level, type Set1SkillId, type SkillId } from '../../content/schema';
import { placementHistory } from '../../store/placements';
import { DEFAULT_PROFILE_ID } from '../../store/profiles';
import type { PlacementResult } from '../../store/db';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';

interface Props {
  result: PlacementResult;
  onPractice: (skillId: Set1SkillId, level: Level) => void;
  onHome: () => void;
}

/** Parent result screen: starting level per group, words missed, strongest and weakest. */
export function PlacementResultScreen({ result, onPractice, onHome }: Props) {
  const [previous, setPrevious] = useState<PlacementResult | null>(null);
  useEffect(() => {
    void placementHistory(DEFAULT_PROFILE_ID).then((all) => {
      const earlier = all.filter((r) => r.date < result.date);
      setPrevious(earlier[earlier.length - 1] ?? null);
    });
  }, [result.date]);

  const name = (id: SkillId | null) => (id ? SKILLS[id].name : '');
  const lvl = (id: SkillId) => result.placement[id] ?? SKILLS[id].levels[0]!;
  const readLine =
    result.strongest && result.weakest
      ? result.strongest === result.weakest
        ? `He is at the same level across the groups tested.`
        : `Strongest: ${name(result.strongest)} (Level ${lvl(result.strongest)}). Weakest: ${name(result.weakest)} (Level ${lvl(result.weakest)}).`
      : 'The test ended before enough groups were measured to compare them.';

  return (
    <main className="flex-1 px-4 py-6 max-w-3xl w-full mx-auto flex flex-col gap-4">
      <h1 className="font-display text-3xl font-bold text-slate-800">Level test results</h1>
      <p className="text-slate-600 font-semibold">{readLine}</p>
      {result.endedEarly && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2">
          The test stopped early after six misses in a row. Groups it did not reach start at Level 1. Rerun it another day if he was tired.
        </p>
      )}

      <Card className="p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 text-xs uppercase tracking-wide">
              <th className="py-1">Group</th>
              <th className="py-1">Starts at</th>
              {previous && <th className="py-1">Last test</th>}
              <th className="py-1">Note</th>
            </tr>
          </thead>
          <tbody>
            {SET1_SKILL_IDS.map((id) => {
              const level = lvl(id);
              const prev = previous?.placement[id];
              const estimated = result.estimated.includes(id);
              const untested = result.untested.includes(id);
              return (
                <tr key={id} className="border-t border-slate-100">
                  <td className="py-2 font-bold text-slate-700"><span className="text-slate-400 mr-1">{id}</span>{SKILLS[id].name}</td>
                  <td className="py-2 font-display text-lg">
                    <button onClick={() => onPractice(id, level)} className="underline underline-offset-4 decoration-orange-300">Level {level}</button>
                  </td>
                  {previous && <td className="py-2 text-slate-500">{prev !== undefined ? `Level ${prev}${prev !== level ? (SKILLS[id].levels.indexOf(level) > SKILLS[id].levels.indexOf(prev) ? ' ↑' : ' ↓') : ' ='}` : '–'}</td>}
                  <td className="py-2 text-xs text-slate-500">
                    {untested && result.endedEarly ? `not reached, starts at Level ${SKILLS[id].levels[0]}` : estimated ? 'estimated from the other groups' : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Words missed ({result.missedWords.length} of {result.wordsTested})</div>
        <div className="flex flex-wrap gap-1.5">
          {result.missedWords.length === 0 && <span className="text-slate-500 text-sm">none</span>}
          {result.missedWords.map((w, i) => <span key={i} className="bg-rose-50 text-rose-700 border border-rose-100 rounded-lg px-2 py-0.5 font-display">{w}</span>)}
        </div>
      </Card>

      <p className="text-xs text-slate-500">
        Placement is provisional. In the first 10 words at a placed level, 9 or more right on the first try moves him up at once, and 4 or fewer moves him down.
        The dashboard will suggest a retest in 6 weeks.
      </p>

      <div className="flex gap-3 flex-wrap">
        <BigButton onClick={() => onPractice('1.1', lvl('1.1'))}>⭐ start practicing</BigButton>
        <BigButton tone="ghost" onClick={onHome}>home</BigButton>
      </div>
    </main>
  );
}
