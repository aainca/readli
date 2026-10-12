import { useState } from 'react';
import { allGroupFiles } from '../../content';
import { BONUS_GROUP_IDS, CORE_GROUP_IDS, GROUPS, type GroupId } from '../../content/schema';
import { Card } from '../components/Card';
import { BigButton } from '../components/BigButton';
import { StarConfetti } from '../components/StarConfetti';

const groupBg: Record<string, string> = {
  'syl-closed': 'bg-syl-closed',
  'syl-open': 'bg-syl-open',
  'syl-vce': 'bg-syl-vce',
  'syl-team': 'bg-syl-team',
  'syl-r': 'bg-syl-r',
  'syl-cle': 'bg-syl-cle',
  'syl-diphthong': 'bg-syl-diphthong',
  'syl-schwa': 'bg-syl-schwa',
};

export function HomeScreen({ onOpenGroup }: { onOpenGroup: (g: GroupId) => void }) {
  const [confetti, setConfetti] = useState(false);
  const counts = Object.fromEntries(allGroupFiles.map((f) => [f.group, f.words.length])) as Record<GroupId, number>;

  const tile = (g: GroupId) => {
    const meta = GROUPS[g];
    const n = counts[g] ?? 0;
    return (
      <Card
        key={g}
        role="button"
        tabIndex={0}
        onClick={() => onOpenGroup(g)}
        onKeyDown={(e) => e.key === 'Enter' && onOpenGroup(g)}
        className="p-5 cursor-pointer hover:-translate-y-1 transition flex items-center gap-4"
      >
        <div className={`w-14 h-14 rounded-2xl ${groupBg[meta.color]} text-white font-display text-2xl flex items-center justify-center shadow-inner`}>
          {meta.examples[0]?.[0] ?? '?'}
        </div>
        <div className="flex-1">
          <div className="font-display text-xl font-semibold">{meta.name}</div>
          <div className="text-sm text-gray-500">{meta.examples.join(', ')}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-lg">{n}</div>
          <div className="text-xs text-gray-400">{n ? 'words' : 'coming soon'}</div>
        </div>
      </Card>
    );
  };

  return (
    <main className="min-h-full px-4 py-8 max-w-3xl mx-auto">
      {confetti && <StarConfetti />}
      <header className="text-center mb-8">
        <h1 className="font-display text-5xl font-bold text-orange-600 drop-shadow-sm">Vowel Mastery</h1>
        <p className="text-gray-600 mt-2 text-lg">read the word, earn stars</p>
      </header>

      <div className="flex justify-center mb-10">
        <BigButton onClick={() => { setConfetti(false); requestAnimationFrame(() => setConfetti(true)); }}>
          ⭐ practice (coming in Phase 2)
        </BigButton>
      </div>

      <h2 className="font-display text-2xl text-gray-700 mb-3">The 7 syllable types</h2>
      <div className="grid gap-3 sm:grid-cols-2 mb-8">{CORE_GROUP_IDS.map(tile)}</div>

      <h2 className="font-display text-2xl text-gray-700 mb-3">Bonus units</h2>
      <div className="grid gap-3 sm:grid-cols-2">{BONUS_GROUP_IDS.map(tile)}</div>

      <p className="text-center text-xs text-gray-400 mt-10">
        This app uses your device's default microphone and speaker.
      </p>
    </main>
  );
}
