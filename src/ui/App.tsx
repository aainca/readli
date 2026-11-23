import { useCallback, useEffect, useState } from 'react';
import { totalStars } from '../store/attempts';
import { ProfileProvider, useProfiles } from './ProfileContext';
import { ProfilesScreen } from './screens/ProfilesScreen';
import { MultiplayerSetupScreen, type GameSetup } from './screens/MultiplayerSetupScreen';
import { MultiplayerScreen } from './screens/MultiplayerScreen';
import { StoriesScreen } from './screens/StoriesScreen';
import { StoryScreen } from './screens/StoryScreen';
import type { Story } from '../content/stories';
import type { Level, SkillId } from '../content/schema';
import { AppHeader } from './components/AppHeader';
import { AudioSetup } from './components/AudioSetup';
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
  | { name: 'placementResult'; result: PlacementResult }
  | { name: 'profiles' }
  | { name: 'playSetup' }
  | { name: 'play'; setup: GameSetup }
  | { name: 'stories' }
  | { name: 'story'; story: Story };

export function App() {
  return (
    <ProfileProvider>
      <AppInner />
    </ProfileProvider>
  );
}

function AppInner() {
  const { active, activeId, loaded } = useProfiles();
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [guideOpen, setGuideOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  useEffect(() => {
    const open = () => setAudioOpen(true);
    window.addEventListener('open-audio-setup', open);
    return () => window.removeEventListener('open-audio-setup', open);
  }, []);
  const [stats, setStats] = useState<PracticeStats>({ stars: 0, streak: 0 });
  const onStats = useCallback((s: PracticeStats) => setStats(s), []);
  useEffect(() => {
    if (!loaded) return;
    void totalStars(activeId).then((stars) => setStats({ stars, streak: 0 })).catch(() => {});
  }, [activeId, loaded, route.name]);

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
          key={`${activeId}-${route.skillId}-${route.level}`}
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
    case 'profiles':
      screen = <ProfilesScreen onBack={() => setRoute({ name: 'home' })} />;
      break;
    case 'playSetup':
      screen = <MultiplayerSetupScreen onBack={() => setRoute({ name: 'home' })} onStart={(setup) => setRoute({ name: 'play', setup })} />;
      break;
    case 'play':
      screen = <MultiplayerScreen setup={route.setup} onExit={() => setRoute({ name: 'home' })} />;
      break;
    case 'stories':
      screen = <StoriesScreen onBack={() => setRoute({ name: 'home' })} onOpen={(story) => setRoute({ name: 'story', story })} />;
      break;
    case 'story':
      screen = (
        <StoryScreen
          key={route.story.id}
          story={route.story}
          onBack={() => setRoute({ name: 'stories' })}
          onStars={(earned) => setStats((s) => ({ ...s, stars: s.stars + earned }))}
        />
      );
      break;
    default:
      screen = (
        <HomeScreen
          onOpenSkill={(skillId) => setRoute({ name: 'skill', skillId })}
          onLevelTest={() => setRoute({ name: 'placement' })}
          onPlayTogether={() => setRoute({ name: 'playSetup' })}
          onStories={() => setRoute({ name: 'stories' })}
        />
      );
  }

  return (
    <div className="min-h-full flex flex-col">
      <AppHeader
        stars={stats.stars}
        streak={stats.streak}
        player={active ? { name: active.name, color: active.avatarColor } : null}
        onOpenProfiles={() => setRoute({ name: 'profiles' })}
        onOpenGuide={() => setGuideOpen(true)}
        onOpenAudio={() => setAudioOpen(true)}
      />
      {guideOpen && <RulesGuide onClose={() => setGuideOpen(false)} />}
      {audioOpen && <AudioSetup onClose={() => setAudioOpen(false)} />}
      {screen}
    </div>
  );
}
