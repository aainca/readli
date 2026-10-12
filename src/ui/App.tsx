import { useState } from 'react';
import type { SkillId } from '../content/schema';
import { HomeScreen } from './screens/HomeScreen';
import { WordListScreen } from './screens/WordListScreen';

type Route = { name: 'home' } | { name: 'words'; skillId: SkillId };

export function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });

  if (route.name === 'words') {
    return <WordListScreen skillId={route.skillId} onBack={() => setRoute({ name: 'home' })} />;
  }
  return <HomeScreen onOpenSkill={(skillId) => setRoute({ name: 'words', skillId })} />;
}
