import { useCallback, useState } from 'react';
import type { Level, SkillId } from '../content/schema';
import { AppHeader } from './components/AppHeader';
import { RulesGuide } from './components/RulesGuide';
import { HomeScreen } from './screens/HomeScreen';
import { PracticeScreen, type PracticeStats } from './screens/PracticeScreen';
import { SkillScreen } from './screens/SkillScreen';
import { WordListScreen } from './screens/WordListScreen';

type Route =
  | { name: 'home' }
  | { name: 'skill'; skillId: SkillId }
  | { name: 'words'; skillId: SkillId }
  | { name: 'practice'; skillId: SkillId; level: Level };

export function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [guideOpen, setGuideOpen] = useState(false);
  const [stats, setStats] = useState<PracticeStats>({ stars: 0, streak: 0 });
  const onStats = useCallback((s: PracticeStats) => setStats(s), []);

  let screen;
  switch (route.name) {
    case 'skill':
      screen = (
        <SkillScreen
          skillId={route.skillId}
          onBack={() => setRoute({ name: 'home' })}
          onPractice={(level) => setRoute({ name: 'practice', skillId: route.skillId, level })}
          onWords={() => setRoute({ name: 'words', skillId: route.skillId })}
        />
      );
      break;
    case 'words':
      screen = <WordListScreen skillId={route.skillId} onBack={() => setRoute({ name: 'skill', skillId: route.skillId })} />;
      break;
    case 'practice':
      screen = (
        <PracticeScreen
          key={`${route.skillId}-${route.level}`}
          skillId={route.skillId}
          level={route.level}
          onStats={onStats}
          onExit={() => setRoute({ name: 'skill', skillId: route.skillId })}
        />
      );
      break;
    default:
      screen = <HomeScreen onOpenSkill={(skillId) => setRoute({ name: 'skill', skillId })} />;
  }

  return (
    <div className="min-h-full flex flex-col">
      {/* Session stars and streak. Persistence and per-profile totals arrive in Phase 4. */}
      <AppHeader stars={stats.stars} streak={stats.streak} onOpenGuide={() => setGuideOpen(true)} />
      {guideOpen && <RulesGuide onClose={() => setGuideOpen(false)} />}
      {screen}
    </div>
  );
}
