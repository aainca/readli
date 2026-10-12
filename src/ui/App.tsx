import { useCallback, useEffect, useState } from 'react';
import { totalStars } from '../store/attempts';
import { DEFAULT_PROFILE_ID } from '../store/profiles';
import type { Level, SkillId } from '../content/schema';
import { AppHeader } from './components/AppHeader';
import { RulesGuide } from './components/RulesGuide';
import { HomeScreen } from './screens/HomeScreen';
import { LevelUpScreen } from './screens/LevelUpScreen';
import { PlacementResultScreen } from './screens/PlacementResultScreen';
import { PlacementScreen } from './screens/PlacementScreen';
import type { PlacementResult } from '../store/db';
import { PracticeScreen, type PracticeStats } from './screens/PracticeScreen';
import { SkillScreen } from './screens/SkillScreen';
import { WordListScreen } from './screens/WordListScreen';

type Route =
  | { name: 'home' }
  | { name: 'skill'; skillId: SkillId }
  | { name: 'words'; skillId: SkillId }
  | { name: 'practice'; skillId: SkillId; level: Level }
  | { name: 'levelUp'; skillId: SkillId; from: Level; to: Level }
  | { name: 'placement' }
  | { name: 'placementResult'; result: PlacementResult };

export function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [guideOpen, setGuideOpen] = useState(false);
  const [stats, setStats] = useState<PracticeStats>({ stars: 0, streak: 0 });
  const onStats = useCallback((s: PracticeStats) => setStats(s), []);
  useEffect(() => {
    void totalStars(DEFAULT_PROFILE_ID).then((stars) => setStats((s) => ({ ...s, stars }))).catch(() => {});
  }, []);

  let screen;
  switch (route.name) {
    case 'skill':
      screen = (
        <SkillScreen
          key={route.skillId}
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
          onLevelUp={(from, to) => setRoute({ name: 'levelUp', skillId: route.skillId, from, to })}
          onFastAdjustDown={(to) => setRoute({ name: 'practice', skillId: route.skillId, level: to })}
        />
      );
      break;
    case 'placement':
      screen = (
        <PlacementScreen
          onPause={() => setRoute({ name: 'home' })}
          onDone={(result) => setRoute({ name: 'placementResult', result })}
        />
      );
      break;
    case 'placementResult':
      screen = (
        <PlacementResultScreen
          result={route.result}
          onPractice={(skillId, level) => setRoute({ name: 'practice', skillId, level })}
          onHome={() => setRoute({ name: 'home' })}
        />
      );
      break;
    case 'levelUp':
      screen = (
        <LevelUpScreen
          skillId={route.skillId}
          fromLevel={route.from}
          toLevel={route.to}
          onContinue={() => setRoute({ name: 'practice', skillId: route.skillId, level: route.to })}
        />
      );
      break;
    default:
      screen = <HomeScreen onOpenSkill={(skillId) => setRoute({ name: 'skill', skillId })} onLevelTest={() => setRoute({ name: 'placement' })} />;
  }

  return (
    <div className="min-h-full flex flex-col">
      <AppHeader stars={stats.stars} streak={stats.streak} onOpenGuide={() => setGuideOpen(true)} />
      {guideOpen && <RulesGuide onClose={() => setGuideOpen(false)} />}
      {screen}
    </div>
  );
}
