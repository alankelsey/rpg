export interface Route {
  storyId?: string;
  view: 'picker' | 'reader' | 'map' | 'create' | 'docs';
}

// Hash routes keep the build static: #/ is the picker, #/story/<id> is the reader,
// and #/story/<id>/map is the read-only branching viewer.
export function parseRoute(hash: string): Route {
  if (/^#\/create\/?$/.test(hash)) return { view: 'create' };
  if (/^#\/docs\/?$/.test(hash)) return { view: 'docs' };
  const map = /^#\/story\/([\w-]+)\/map\/?$/.exec(hash);
  if (map) return { storyId: map[1], view: 'map' };
  const reader = /^#\/story\/([\w-]+)\/?$/.exec(hash);
  if (reader) return { storyId: reader[1], view: 'reader' };
  return { view: 'picker' };
}

export function currentRoute(): Route {
  return parseRoute(window.location.hash);
}

export function navigate(hash: string) {
  window.location.hash = hash;
}
