import { useEffect, useState } from 'react';
import { allSkillFiles } from '../../content';
import { SET1_SKILL_IDS, SET2_SKILL_IDS, SKILLS, type Level, type SetNumber, type SkillId } from '../../content/schema';
import { DEFAULT_PROFILE_ID, getProfile } from '../../store/profiles';
import { getSetting, setSetting, settingKeys } from '../../store/settings';
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

export function HomeScreen({ onOpenSkill, onLevelTest }: { onOpenSkill: (id: SkillId) => void; onLevelTest: () => void }) {
  const [offer, setOffer] = useState<'none' | 'offer' | 'resume'>('none');
  const [tested, setTested] = useState(false);
  useEffect(() => {
    void (async () => {
      const progress = await getSetting<unknown>(settingKeys.placementProgress(DEFAULT_PROFILE_ID), null);
      if (progress) { setOffer('resume'); return; }
      const profile = await getProfile(DEFAULT_PROFILE_ID);
      setTested(!!profile?.lastPlacementAt);
      const offered = await getSetting<boolean>(settingKeys.placementOffered(DEFAULT_PROFILE_ID), false);
      if (!offered && !profile?.lastPlacementAt) setOffer('offer');
    })();
  }, []);
  const skipTest = () => {
    setOffer('none');
    void setSetting(settingKeys.placementOffered(DEFAULT_PROFILE_ID), true);
  };
  const [confetti, setConfetti] = useState(false);
  const [set, setSet] = useState<SetNumber>(1);
  const [levels, setLevels] = useState<Partial<Record<SkillId, Level>>>({});
  useEffect(() => {
    void getProfile(DEFAULT_PROFILE_ID).then((p) => p && setLevels(p.levels));
  }, []);
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
          <div className="font-display text-lg">{stub ? '' : `Level ${levels[id] ?? meta.levels[0]}`}</div>
          <div className="text-xs text-gray-400">{stub ? 'V2' : `${n} words`}</div>
        </div>
      </Card>
    );
  };

  const ids = set === 1 ? SET1_SKILL_IDS : SET2_SKILL_IDS;

  return (
    <main className="flex-1 px-4 py-6 max-w-5xl w-full mx-auto">
      {confetti && <StarConfetti />}
      {offer === 'offer' && (
        <Card className="p-5 mb-6 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1">
            <div className="font-display text-xl font-semibold text-slate-800">Find the right starting level</div>
            <p className="text-sm text-slate-600">A 5 to 8 minute level test, up to 40 words, read aloud with a parent sitting in. No stars, no help, nothing marked wrong. Or skip it and start everything at Level 1.</p>
          </div>
          <div className="flex gap-2">
            <BigButton tone="secondary" className="!text-lg !px-5 !py-2.5" onClick={onLevelTest}>take the level test</BigButton>
            <BigButton tone="ghost" className="!text-lg !px-5 !py-2.5" onClick={skipTest}>skip</BigButton>
          </div>
        </Card>
      )}
      {offer === 'resume' && (
        <Card className="p-5 mb-6 flex items-center gap-3">
          <div className="flex-1 font-display text-xl font-semibold text-slate-800">A level test is paused.</div>
          <BigButton tone="secondary" className="!text-lg !px-5 !py-2.5" onClick={onLevelTest}>▶ resume the test</BigButton>
        </Card>
      )}

      <div className="flex justify-center items-center gap-3 mb-8 flex-wrap">
        <BigButton onClick={() => { setConfetti(false); requestAnimationFrame(() => setConfetti(true)); onOpenSkill('1.1'); }}>
          ⭐ start practicing
        </BigButton>
        {offer === 'none' && (
          <button onClick={onLevelTest} className="text-sm font-bold text-sky-700 underline underline-offset-4">{tested ? 'rerun the level test' : 'level test'}</button>
        )}
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
