import { useState } from 'react';
import { allSkillFiles } from '../../content';
import { SET1_SKILL_IDS, SET2_SKILL_IDS, SKILLS, type SetNumber, type SkillId } from '../../content/schema';
import { Card } from '../components/Card';
import { BigButton } from '../components/BigButton';
import { StarConfetti } from '../components/StarConfetti';

const skillBg: Record<string, string> = {
  'syl-closed': 'bg-syl-closed',
  'syl-open': 'bg-syl-open',
  'syl-vce': 'bg-syl-vce',
  'syl-team': 'bg-syl-team',
  'syl-r': 'bg-syl-r',
  'syl-cle': 'bg-syl-cle',
  'syl-diphthong': 'bg-syl-diphthong',
  'syl-schwa': 'bg-syl-schwa',
};

export function HomeScreen({ onOpenSkill }: { onOpenSkill: (id: SkillId) => void }) {
  const [confetti, setConfetti] = useState(false);
  const [set, setSet] = useState<SetNumber>(1);
  const counts = new Map(allSkillFiles.map((f) => [f.skillId, f.words.length]));

  const tile = (id: SkillId) => {
    const meta = SKILLS[id];
    const n = counts.get(id) ?? 0;
    const stub = n === 0;
    return (
      <Card
        key={id}
        role="button"
        tabIndex={0}
        onClick={() => onOpenSkill(id)}
        onKeyDown={(e) => e.key === 'Enter' && onOpenSkill(id)}
        className={`p-4 cursor-pointer hover:-translate-y-1 transition flex items-center gap-4 ${stub ? 'opacity-60' : ''}`}
      >
        <div className={`w-14 h-14 shrink-0 rounded-2xl ${skillBg[meta.color]} text-white font-display text-lg flex items-center justify-center shadow-inner`}>
          {id}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-xl font-semibold leading-tight">{meta.name}</div>
          <div className="text-sm text-gray-500 truncate">{meta.examples.join(', ')}</div>
          <div className="text-xs text-indigo-600 font-semibold mt-0.5 line-clamp-2">{meta.hint}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-lg">{stub ? '' : n}</div>
          <div className="text-xs text-gray-400">{stub ? 'V2' : 'words'}</div>
        </div>
      </Card>
    );
  };

  const ids = set === 1 ? SET1_SKILL_IDS : SET2_SKILL_IDS;

  return (
    <main className="flex-1 px-4 py-6 max-w-5xl w-full mx-auto">
      {confetti && <StarConfetti />}
      <div className="flex justify-center mb-8">
        <BigButton onClick={() => { setConfetti(false); requestAnimationFrame(() => setConfetti(true)); }}>
          ⭐ practice (coming in Phase 2)
        </BigButton>
      </div>

      <div role="tablist" className="flex gap-2 mb-5">
        {([1, 2] as const).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={set === s}
            onClick={() => setSet(s)}
            className={`font-display text-xl px-6 py-2 rounded-full border-2 transition ${
              set === s ? 'bg-orange-500 text-white border-orange-600' : 'bg-white border-orange-200 text-gray-700'
            }`}
          >
            {s === 1 ? 'Vowel Groups' : 'Word Skills'}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">{ids.map(tile)}</div>

      <p className="text-center text-xs text-gray-400 mt-10">
        This app uses your device's default microphone and speaker.
      </p>
    </main>
  );
}
