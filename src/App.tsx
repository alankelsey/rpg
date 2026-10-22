import { useEffect, useState } from 'react';
import { StoryPicker } from './StoryPicker';
import { Reader } from './Reader';
import { currentRoute } from './router';

export function App() {
  const [route, setRoute] = useState(currentRoute);

  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return route.storyId ? <Reader key={route.storyId} storyId={route.storyId} /> : <StoryPicker />;
}
