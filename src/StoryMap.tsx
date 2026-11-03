import { useEffect, useMemo, useRef, useState } from 'react';
import { choiceViews, explore, formatStat, lockedReason, simulateRoute, validateStory, type Choice, type Condition, type RouteSimulation, type Scene, type Story, type TransitionEvent } from './engine';
import { navigate } from './router';
import { MAP_NODE_HEIGHT, MAP_NODE_WIDTH, layoutStory } from './story-map/layout';
import { findStory } from './stories/catalog';
import { WorkspaceNav } from './WorkspaceNav';

type Load =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; story: Story };

export function StoryMap({ storyId }: { storyId: string }) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });

  useEffect(() => {
    const entry = findStory(storyId);
    if (!entry) return setLoad({ kind: 'error', message: "That story doesn't exist." });
    entry
      .load()
      .then((story) => {
        const errors = validateStory(story).filter((issue) => issue.level === 'error');
        if (errors.length > 0) return setLoad({ kind: 'error', message: 'This story has errors and cannot be mapped.' });
        setLoad({ kind: 'ready', story });
      })
      .catch(() => setLoad({ kind: 'error', message: "The story map couldn't be loaded." }));
  }, [storyId]);

  if (load.kind === 'loading') return <main className="page"><p>Building story map…</p></main>;
  if (load.kind === 'error') {
    return (
      <main className="page">
        <p>{load.message}</p>
        <button type="button" onClick={() => navigate('#/')}>Back to stories</button>
      </main>
    );
  }
  return <MapView story={load.story} />;
}

function MapView({ story }: { story: Story }) {
  const layout = useMemo(() => layoutStory(story), [story]);
  const exploration = useMemo(() => explore(story), [story]);
  const [selectedId, setSelectedId] = useState(story.start);
  const [previewHistory, setPreviewHistory] = useState<string[]>();
  const [showLabels, setShowLabels] = useState(true);
  const viewportRef = useRef<HTMLElement | null>(null);
  const nodeById = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout.nodes]);
  const selected = nodeById.get(selectedId) ?? layout.nodes[0]!;
  const selectedEdges = new Set(
    layout.edges.filter((edge) => edge.source === selected.id || edge.target === selected.id).map((edge) => edge.id),
  );
  const endingCount = layout.nodes.filter((node) => node.scene.ending).length;
  const preview = useMemo(
    () => previewHistory ? simulateRoute(story, 'Preview', previewHistory) : undefined,
    [previewHistory, story],
  );
  const previewNodes = new Set(preview ? [story.start, ...preview.steps.map((step) => step.result.state.sceneId)] : []);
  const previewEdges = new Set(preview?.steps.map((step) => `${step.fromSceneId}/${step.choiceId}`) ?? []);

  const selectNode = (id: string, scroll = false) => {
    setSelectedId(id);
    if (scroll) {
      const node = nodeById.get(id);
      const viewport = viewportRef.current;
      if (node && viewport) viewport.scrollTo({ left: node.x + MAP_NODE_WIDTH / 2 - viewport.clientWidth / 2, top: node.y + MAP_NODE_HEIGHT / 2 - viewport.clientHeight / 2 });
    }
  };
  const setRoute = (history: readonly string[]) => {
    const route = simulateRoute(story, 'Preview', history);
    setPreviewHistory([...history]);
    selectNode(route.final.sceneId, true);
  };
  const advanceRoute = (choiceId: string) => {
    if (!preview || !choiceViews(story, preview.final).some((view) => view.choice.id === choiceId && view.available)) return;
    setRoute([...preview.final.history, choiceId]);
  };

  return (
    <main className="map-page">
      <header className="map-header">
        <WorkspaceNav active="map" />
        <nav className="reader-nav" aria-label="Story map navigation">
          <button type="button" className="link" onClick={() => navigate('#/')}>← Stories</button>
          <span className="reader-title">Stage 1 · Branching viewer</span>
          <button type="button" className="link" onClick={() => navigate(`#/story/${story.id}`)}>Play story →</button>
        </nav>
        <div className="map-heading">
          <div>
            <p className="eyebrow">Story structure</p>
            <h1>{story.title} map</h1>
            <p className="lede">Follow every choice from the opening passage to four possible endings.</p>
          </div>
          <dl className="map-summary" aria-label="Map summary">
            <div><dt>Passages</dt><dd>{layout.nodes.length}</dd></div>
            <div><dt>Choices</dt><dd>{layout.edges.length}</dd></div>
            <div><dt>Endings</dt><dd>{endingCount}</dd></div>
          </dl>
        </div>
      </header>

      <section className="map-toolbar" aria-label="Map controls">
        <label>
          <span>Find passage</span>
          <select value={selected.id} onChange={(event) => selectNode(event.target.value, true)}>
            {layout.nodes.map((node) => <option key={node.id} value={node.id}>{node.scene.title ?? node.id}</option>)}
          </select>
        </label>
        <label className="map-toggle">
          <input type="checkbox" checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} />
          Choice labels
        </label>
        <div className="map-legend" aria-label="Ending legend">
          <span><i className="legend-dot good" /> Good</span>
          <span><i className="legend-dot neutral" /> Neutral</span>
          <span><i className="legend-dot bad" /> Hard</span>
        </div>
      </section>

      <div className="map-workspace">
        <section ref={viewportRef} className="map-viewport" aria-label={`Flow chart for ${story.title}`} tabIndex={0}>
          <div className="map-canvas" style={{ width: layout.width, height: layout.height }}>
            <svg className="map-edges" width={layout.width} height={layout.height} aria-hidden="true">
              <defs>
                <marker id="map-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" />
                </marker>
              </defs>
              {layout.edges.map((edge) => {
                const source = nodeById.get(edge.source)!;
                const target = nodeById.get(edge.target)!;
                const path = edgePath(source.x + MAP_NODE_WIDTH, source.y + MAP_NODE_HEIGHT / 2, target.x, target.y + MAP_NODE_HEIGHT / 2);
                const active = selectedEdges.has(edge.id);
                const label = edgeLabelPosition(source.x + MAP_NODE_WIDTH, source.y + MAP_NODE_HEIGHT / 2, target.x, target.y + MAP_NODE_HEIGHT / 2);
                return (
                  <g key={edge.id} className={`map-edge ${previewEdges.has(`${edge.source}/${edge.choice.id}`) ? 'route-preview' : ''} ${active ? 'active' : 'muted'}`}>
                    <path d={path} markerEnd="url(#map-arrow)" />
                    {showLabels && (
                      <foreignObject x={label.x - 68} y={label.y - 20} width="136" height="40">
                        <div className="map-edge-label" title={edge.choice.label}>{edge.choice.label}</div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}
            </svg>

            {layout.nodes.map((node) => {
              const ending = node.scene.ending;
              const kind = ending ? `ending-node ${ending.tone}` : node.id === story.start ? 'start-node' : '';
              return (
                <button
                  key={node.id}
                  type="button"
                  className={`map-node ${kind} ${selected.id === node.id ? 'selected' : ''} ${previewNodes.has(node.id) ? 'route-preview' : ''} ${node.reachable ? '' : 'unreachable'}`}
                  style={{ left: node.x, top: node.y, width: MAP_NODE_WIDTH, height: MAP_NODE_HEIGHT }}
                  aria-pressed={selected.id === node.id}
                  onClick={() => selectNode(node.id)}
                >
                  <span className="map-node-kind">{nodeKind(node.id, story.start, node.scene)}</span>
                  <strong>{node.scene.title ?? node.id}</strong>
                  <span className="map-node-id">{node.id}</span>
                  {!ending && <span className="map-node-count">{node.scene.choices?.length ?? 0} choice{node.scene.choices?.length === 1 ? '' : 's'}</span>}
                </button>
              );
            })}
          </div>
        </section>

        <PassageInspector
          story={story}
          sceneId={selected.id}
          scene={selected.scene}
          endingRoute={selected.scene.ending ? exploration.endings.get(selected.scene.ending.id) : undefined}
          preview={preview}
          onPreview={setRoute}
          onAdvance={advanceRoute}
          onSelect={selectNode}
        />
      </div>
    </main>
  );
}

function PassageInspector({
  story,
  sceneId,
  scene,
  endingRoute,
  preview,
  onPreview,
  onAdvance,
  onSelect,
}: {
  story: Story;
  sceneId: string;
  scene: Scene;
  endingRoute?: string[];
  preview?: RouteSimulation;
  onPreview: (history: readonly string[]) => void;
  onAdvance: (choiceId: string) => void;
  onSelect: (id: string, scroll?: boolean) => void;
}) {
  const routeHere = preview?.final.sceneId === sceneId ? preview : undefined;
  return (
    <aside className="map-inspector" aria-labelledby="passage-heading">
      <RouteSimulator story={story} preview={preview} onPreview={onPreview} onAdvance={onAdvance} />
      <p className="eyebrow">Selected passage · {sceneId}</p>
      <h2 id="passage-heading">{scene.title ?? sceneId}</h2>
      <p className="map-excerpt">{scene.text.replaceAll('{name}', 'the player')}</p>
      {scene.ending ? (
        <>
          <div className={`ending-chip ${scene.ending.tone}`}>
            <span>{scene.ending.tone} ending</span>
            <strong>{scene.ending.title}</strong>
          </div>
          {endingRoute && (
            <section className="route-state-preview" aria-label="Route state preview">
              <button type="button" onClick={() => onPreview(endingRoute)}>
                {routeHere ? 'Refresh canonical route' : `Trace one route · ${endingRoute.length} choices`}
              </button>
            </section>
          )}
        </>
      ) : (
        <div className="inspector-choices">
          <h3>Choices from here</h3>
          {(scene.choices ?? []).map((choice) => (
            <article key={choice.id} className="inspector-choice">
              <button type="button" className="inspector-destination" onClick={() => onSelect(choice.to, true)}>
                <span>{choice.label}</span>
                <strong>→ {story.scenes[choice.to]?.title ?? choice.to}</strong>
              </button>
              {(choice.requires?.length || choice.costs || choice.effects) && (
                <dl className="choice-rules">
                  {choice.requires?.length ? <Rule label="Requires" value={choice.requires.map((condition) => describeCondition(story, condition)).join(' · ')} /> : null}
                  {choice.costs ? <Rule label="Costs" value={describeCosts(story, choice)} /> : null}
                  {choice.effects ? <Rule label="Changes" value={describeEffects(story, choice)} /> : null}
                </dl>
              )}
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}

function RouteSimulator({ story, preview, onPreview, onAdvance }: {
  story: Story;
  preview?: RouteSimulation;
  onPreview: (history: readonly string[]) => void;
  onAdvance: (choiceId: string) => void;
}) {
  const state = preview?.final;
  const scene = state ? story.scenes[state.sceneId] : undefined;
  const views = state ? choiceViews(story, state) : [];
  const lastStep = preview?.steps.at(-1);
  return (
    <section className="route-simulator" aria-labelledby="route-simulator-heading">
      <div className="simulator-heading">
        <div>
          <p className="eyebrow">Engine-backed preview</p>
          <h3 id="route-simulator-heading">Route simulator</h3>
        </div>
        {preview && <span className="simulator-count">{state?.revision} choices</span>}
      </div>
      {!preview ? (
        <>
          <p>Choose a path from the opening. The map and state update after each accepted choice.</p>
          <button type="button" onClick={() => onPreview([])}>Start from opening</button>
        </>
      ) : (
        <>
          <div className="simulator-actions">
            <button type="button" disabled={preview.steps.length === 0} onClick={() => onPreview(state!.history.slice(0, -1))}>← Undo choice</button>
            <button type="button" disabled={preview.steps.length === 0} onClick={() => onPreview([])}>Reset route</button>
          </div>
          <p className="simulator-location">At <strong>{scene?.title ?? state?.sceneId}</strong>{state?.ended ? ' · ending reached' : ''}</p>
          {lastStep && (
            <div className="simulator-events">
              <strong>Last choice changed</strong>
              <ul>{lastStep.result.events.map((event, index) => <li key={`${lastStep.result.state.revision}-${index}`}>{describeEvent(story, event)}</li>)}</ul>
            </div>
          )}
          {!state?.ended && (
            <div className="simulator-choices">
              <strong>Choose the next path</strong>
              {views.map((view) => (
                <div key={view.choice.id} className="simulator-choice">
                  <button type="button" disabled={!view.available} onClick={() => onAdvance(view.choice.id)}>{view.choice.label} →</button>
                  {!view.available && <small>{lockedReason(story, view, state!)}</small>}
                </div>
              ))}
              {views.length === 0 && <p>No visible choices are available from this passage.</p>}
            </div>
          )}
          <RouteState story={story} preview={preview} />
          <div className="simulator-timeline">
            <strong>Rewind to a step</strong>
            <ol>
              <li><button type="button" onClick={() => onPreview([])}>Start</button></li>
              {preview.steps.map((step, index) => {
                const choice = story.scenes[step.fromSceneId]?.choices?.find((item) => item.id === step.choiceId);
                return <li key={`${index}/${step.fromSceneId}/${step.choiceId}`}><button type="button" onClick={() => onPreview(state!.history.slice(0, index + 1))}>{choice?.label ?? step.choiceId}</button></li>;
              })}
            </ol>
          </div>
        </>
      )}
    </section>
  );
}

function describeEvent(story: Story, event: TransitionEvent): string {
  switch (event.type) {
    case 'stat': return `${story.stats[event.stat]?.label ?? humanize(event.stat)}: ${formatStat(story, event.stat, event.before)} → ${formatStat(story, event.stat, event.after)}`;
    case 'flag': return `${humanize(event.flag)}: ${event.before ? 'yes' : 'no'} → ${event.after ? 'yes' : 'no'}`;
    case 'inventory': return `${story.items?.[event.item]?.label ?? humanize(event.item)}: ${event.before} → ${event.after}`;
    case 'scene': return `Passage: ${story.scenes[event.to]?.title ?? event.to}`;
    case 'ending': return `Ending reached: ${event.endingId}`;
  }
}

function RouteState({ story, preview }: { story: Story; preview: RouteSimulation }) {
  const state = preview.final;
  const allStats = Object.entries(state.stats);
  const inventory = Object.entries(state.inventory).filter(([, quantity]) => quantity > 0);
  const flags = Object.entries(state.flags).filter(([, value]) => value);
  return (
    <div className="route-state">
      <p><strong>Canonical state after {state.revision} choices</strong></p>
      <dl>
        {allStats.map(([id, value]) => <Rule key={id} label={`${story.stats[id]?.label ?? humanize(id)}${story.stats[id]?.hidden ? ' (hidden)' : ''}`} value={formatStat(story, id, value)} />)}
        {inventory.map(([id, quantity]) => <Rule key={id} label={story.items?.[id]?.label ?? humanize(id)} value={String(quantity)} />)}
        {flags.length > 0 && <Rule label="Flags" value={flags.map(([id]) => humanize(id)).join(', ')} />}
      </dl>
      <ol>
        {preview.steps.map((step) => (
          <li key={`${step.result.state.revision}/${step.fromSceneId}/${step.choiceId}`}>
            {story.scenes[step.fromSceneId]?.title ?? step.fromSceneId}: {step.choiceId}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function describeCondition(story: Story, condition: Condition): string {
  if ('flag' in condition) return `${humanize(condition.flag)} is ${condition.is ? 'set' : 'not set'}`;
  if ('all' in condition) return `all of (${condition.all.map((child) => describeCondition(story, child)).join('; ')})`;
  if ('any' in condition) return `any of (${condition.any.map((child) => describeCondition(story, child)).join('; ')})`;
  if ('not' in condition) return `not (${describeCondition(story, condition.not)})`;
  const key = 'stat' in condition ? condition.stat : condition.item;
  const label = 'stat' in condition
    ? (story.stats[key]?.label ?? humanize(key))
    : (story.items?.[key]?.label ?? humanize(key));
  const value = (amount: number) => ('stat' in condition ? formatStat(story, key, amount) : String(amount));
  const requirements = [
    condition.gte === undefined ? '' : `${label} ≥ ${value(condition.gte)}`,
    condition.lte === undefined ? '' : `${label} ≤ ${value(condition.lte)}`,
  ].filter(Boolean);
  return requirements.join(' and ');
}

function describeEffects(story: Story, choice: Choice): string {
  const stats = Object.entries(choice.effects?.stats ?? {}).map(([stat, delta]) => {
    const label = story.stats[stat]?.label ?? humanize(stat);
    return `${label} ${delta >= 0 ? '+' : '−'}${formatStat(story, stat, Math.abs(delta))}`;
  });
  const flags = Object.entries(choice.effects?.flags ?? {}).map(([flag, value]) => `${humanize(flag)} = ${value ? 'yes' : 'no'}`);
  const inventory = Object.entries(choice.effects?.inventory ?? {}).map(([item, delta]) => {
    const label = story.items?.[item]?.label ?? humanize(item);
    return `${label} ${delta >= 0 ? '+' : '−'}${Math.abs(delta)}`;
  });
  return [...stats, ...flags, ...inventory].join(' · ');
}

function describeCosts(story: Story, choice: Choice): string {
  return Object.entries(choice.costs ?? {}).map(([stat, amount]) => {
    const label = story.stats[stat]?.label ?? humanize(stat);
    return `${label} ${formatStat(story, stat, amount)}`;
  }).join(' · ');
}

function humanize(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (letter) => letter.toUpperCase());
}

function nodeKind(id: string, start: string, scene: Scene): string {
  if (scene.ending) return `${scene.ending.tone} ending`;
  if (id === start) return 'start';
  return 'passage';
}

function edgePath(sourceX: number, sourceY: number, targetX: number, targetY: number): string {
  if (targetX > sourceX) {
    const control = Math.max(48, (targetX - sourceX) * 0.45);
    return `M ${sourceX} ${sourceY} C ${sourceX + control} ${sourceY}, ${targetX - control} ${targetY}, ${targetX} ${targetY}`;
  }
  const bend = 80;
  return `M ${sourceX} ${sourceY} C ${sourceX + bend} ${sourceY}, ${targetX - bend} ${targetY}, ${targetX} ${targetY}`;
}

function edgeLabelPosition(sourceX: number, sourceY: number, targetX: number, targetY: number): { x: number; y: number } {
  return { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2 };
}
