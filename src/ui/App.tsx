import { useState } from 'react';
import type { GroupId } from '../content/schema';
import { HomeScreen } from './screens/HomeScreen';
import { WordListScreen } from './screens/WordListScreen';

type Route = { name: 'home' } | { name: 'words'; group: GroupId };

export function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });

  if (route.name === 'words') {
    return <WordListScreen group={route.group} onBack={() => setRoute({ name: 'home' })} />;
  }
  return <HomeScreen onOpenGroup={(group) => setRoute({ name: 'words', group })} />;
}
