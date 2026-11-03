import { useEffect, useState } from 'react';
import { StoryPicker } from './StoryPicker';
import { Reader } from './Reader';
import { NewStoryMap, StoryMap } from './StoryMap';
import { ApiDocs } from './ApiDocs';
import { currentRoute } from './router';

export function App() {
  const [route, setRoute] = useState(currentRoute);

  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (route.storyId && route.view === 'map') return <StoryMap key={`map/${route.storyId}`} storyId={route.storyId} />;
  if (route.view === 'create') return <NewStoryMap />;
  if (route.storyId && route.view === 'reader') return <Reader key={route.storyId} storyId={route.storyId} />;
  if (route.view === 'docs') return <ApiDocs />;
  return <StoryPicker />;
}
