import { SKILLS, type Level, type SkillId } from '../../content/schema';
import { BigButton } from '../components/BigButton';
import { Card } from '../components/Card';
import { StarConfetti } from '../components/StarConfetti';

interface Props {
  skillId: SkillId;
  fromLevel: Level;
  toLevel: Level;
  onContinue: () => void;
}

export function LevelUpScreen({ skillId, fromLevel, toLevel, onContinue }: Props) {
  const meta = SKILLS[skillId];
  return (
    <main className="flex-1 px-4 py-8 max-w-2xl w-full mx-auto flex items-center justify-center">
      <StarConfetti count={60} />
      <Card className="p-8 md:p-12 text-center flex flex-col items-center gap-4 w-full">
        <div className="text-7xl bounce-gentle">🏆</div>
        <h1 className="font-display text-5xl font-bold text-orange-600">Level {toLevel} unlocked!</h1>
        <p className="font-display text-2xl text-slate-700">
          You mastered {meta.name} Level {fromLevel}.
        </p>
        <p className="text-slate-500">Nine out of ten words right on the first try, on two different days. That is real reading.</p>
        <BigButton onClick={onContinue} className="mt-2">⭐ keep going</BigButton>
      </Card>
    </main>
  );
}
