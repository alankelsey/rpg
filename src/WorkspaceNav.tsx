export type WorkspaceView = 'home' | 'characters' | 'map';

export function WorkspaceNav({ active }: { active?: WorkspaceView }) {
  return (
    <nav className="workspace-tabs" aria-label="RPG workshop">
      <a className={active === 'home' ? 'active' : ''} aria-current={active === 'home' ? 'page' : undefined} href="#/">
        <span aria-hidden="true">⌂</span> Home
      </a>
      <a
        className={active === 'characters' ? 'active' : ''}
        aria-current={active === 'characters' ? 'page' : undefined}
        href="./stat-lab.html"
      >
        <span aria-hidden="true">✦</span> Character Generator
      </a>
      <a className={active === 'map' ? 'active' : ''} aria-current={active === 'map' ? 'page' : undefined} href="#/story/new-town/map">
        <span aria-hidden="true">⌁</span> Story Flow Chart
      </a>
    </nav>
  );
}
