import { useState } from 'react';
import type { SkillId } from '../content/schema';
import { AppHeader } from './components/AppHeader';
import { RulesGuide } from './components/RulesGuide';
import { HomeScreen } from './screens/HomeScreen';
import { WordListScreen } from './screens/WordListScreen';

type Route = { name: 'home' } | { name: 'words'; skillId: SkillId };

export function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="min-h-full flex flex-col">
      {/* Stars and streak are wired to the attempt log in Phase 4. */}
      <AppHeader stars={0} streak={0} onOpenGuide={() => setGuideOpen(true)} />
      {guideOpen && <RulesGuide onClose={() => setGuideOpen(false)} />}
      {route.name === 'words' ? (
        <WordListScreen skillId={route.skillId} onBack={() => setRoute({ name: 'home' })} />
      ) : (
        <HomeScreen onOpenSkill={(skillId) => setRoute({ name: 'words', skillId })} />
      )}
    </div>
  );
}
