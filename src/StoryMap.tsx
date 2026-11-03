import { useEffect, useMemo, useRef, useState } from 'react';
import { choiceViews, explore, formatStat, lockedReason, simulateRoute, validateStory, type Choice, type Condition, type ExploreReport, type Issue, type RouteSimulation, type Scene, type Story, type TransitionEvent } from './engine';
import { navigate } from './router';
import { MAP_NODE_HEIGHT, MAP_NODE_WIDTH, layoutStory } from './story-map/layout';
import { downloadStoryDraft, loadStoryDraft, readStoryDraftFile, saveStoryDraft } from './story-map/draft-store';
import { ChoiceRulesEditor } from './story-map/ChoiceRulesEditor';
import { DefinitionsEditor } from './story-map/DefinitionsEditor';
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

function MapView({ story: publishedStory }: { story: Story }) {
  const [story, setStory] = useState(publishedStory);
  const [storedDraft] = useState(() => loadStoryDraft(publishedStory));
  const [draft, setDraft] = useState<Story>(() => storedDraft.draft ?? structuredClone(publishedStory));
  const [draftStatus, setDraftStatus] = useState(storedDraft.notice ?? 'Draft changes are in memory until saved or downloaded.');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSceneId, setEditorSceneId] = useState(publishedStory.start);
  const draftIssues = useMemo(() => validateStory(draft), [draft]);
  const draftErrors = draftIssues.filter((issue) => issue.level === 'error');
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
    setEditorSceneId(id);
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
  const applyDraft = () => {
    if (draftErrors.length > 0) return;
    const nextStory = structuredClone(draft);
    setStory(nextStory);
    setPreviewHistory(undefined);
    setSelectedId(editorSceneId in nextStory.scenes ? editorSceneId : nextStory.start);
  };
  const updateDraft = (next: Story) => {
    setDraft(next);
    setDraftStatus('Draft has changes that are not saved locally.');
  };
  const importDraft = async (file: File) => {
    try {
      const imported = await readStoryDraftFile(file, publishedStory);
      setDraft(imported);
      setEditorSceneId(imported.start);
      setDraftStatus('Draft imported. Save locally or download a copy to keep it.');
    } catch (error) {
      setDraftStatus(error instanceof Error ? error.message : 'Draft import failed.');
    }
  };
  const traceDraftRoute = (history: readonly string[]) => {
    if (draftErrors.length > 0) return;
    const route = simulateRoute(draft, 'Preview', history);
    setStory(structuredClone(draft));
    setPreviewHistory([...history]);
    setSelectedId(route.final.sceneId);
    setEditorSceneId(route.final.sceneId);
  };

  return (
    <main className="map-page">
      <header className="map-header">
        <WorkspaceNav active="map" />
        <nav className="reader-nav" aria-label="Story map navigation">
          <button type="button" className="link" onClick={() => navigate('#/')}>← Stories</button>
          <span className="reader-title">Stage 1 · Branching workbench</span>
          <button type="button" className="link" onClick={() => navigate(`#/story/${story.id}`)}>Play story →</button>
        </nav>
        <div className="map-heading">
          <div>
            <p className="eyebrow">{story === publishedStory ? 'Story structure' : 'Unsaved draft preview'}</p>
            <h1>{story.title} map</h1>
            <p className="lede">Follow choices from the opening passage to {endingCount} possible endings.</p>
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
        <button type="button" className="map-edit-toggle" aria-expanded={editorOpen} aria-controls="map-draft-editor" onClick={() => setEditorOpen((open) => !open)}>{editorOpen ? 'Close draft editor' : 'Edit draft'}</button>
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
      {editorOpen && <DraftEditor story={draft} sceneId={editorSceneId} issues={draftIssues} status={draftStatus} onSceneSelect={setEditorSceneId} onChange={updateDraft} onApply={applyDraft} onSave={() => setDraftStatus(saveStoryDraft(publishedStory, draft) ?? 'Draft saved in this browser.')} onDownload={() => downloadStoryDraft(draft)} onImport={importDraft} onTrace={traceDraftRoute} />}
    </main>
  );
}

function DraftEditor({ story, sceneId, issues, status, onSceneSelect, onChange, onApply, onSave, onDownload, onImport, onTrace }: {
  story: Story;
  sceneId: string;
  issues: Issue[];
  status: string;
  onSceneSelect: (id: string) => void;
  onChange: (story: Story) => void;
  onApply: () => void;
  onSave: () => void;
  onDownload: () => void;
  onImport: (file: File) => void;
  onTrace: (history: readonly string[]) => void;
}) {
  const [newSceneId, setNewSceneId] = useState('');
  const [newFlagId, setNewFlagId] = useState('');
  const [message, setMessage] = useState('');
  const [issueFocus, setIssueFocus] = useState<{ at: string; key: number }>();
  const importRef = useRef<HTMLInputElement | null>(null);
  const [diagnostics, setDiagnostics] = useState<ExploreReport>();
  useEffect(() => setDiagnostics(undefined), [story]);
  const changeDraft = (next: Story) => { setDiagnostics(undefined); onChange(next); };
  const activeId = story.scenes[sceneId] ? sceneId : story.start;
  const scene = story.scenes[activeId]!;
  useEffect(() => {
    if (!issueFocus) return;
    const parts = issueFocus.at.split('.');
    if (parts[0] === 'scenes' && parts[1] !== activeId) {
      if (story.scenes[parts[1]!]) onSceneSelect(parts[1]!);
      return;
    }
    let target: HTMLElement | null = null;
    if (parts[0] === 'stats' || parts[0] === 'items') {
      const container = document.getElementById(`definition-${parts[0] === 'stats' ? 'stat' : 'item'}-${parts[1]}`);
      const details = container?.closest('details');
      if (details) details.open = true;
      const label = [...(container?.querySelectorAll('label') ?? [])].find((element) => element.textContent?.trim().toLowerCase().startsWith(parts[2] ?? ''));
      target = (label?.querySelector('input, select') ?? container?.querySelector('input, select, button') ?? null) as HTMLElement | null;
    } else if (parts[0] === 'scenes') {
      if (parts[2] === 'choices' && parts[3]) {
        const row = [...document.querySelectorAll<HTMLElement>('.draft-choice-row')].find((element) => element.dataset.choiceId === parts[3]);
        const details = row?.querySelector('details');
        if (details && parts[4] && parts[4] !== 'label') details.open = true;
        target = (parts[4] === 'label' ? row?.querySelector('input') : parts[4] === 'requires' || parts[4]?.startsWith('requires[') || parts[4] === 'costs' || parts[4] === 'effects' ? details?.querySelector('summary') : row?.querySelector('select')) ?? row ?? null;
      } else {
        target = document.getElementById(parts[2] === 'text' ? 'draft-text' : parts[2] === 'title' ? 'draft-title' : 'draft-passage');
      }
    }
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    target?.focus();
    setIssueFocus(undefined);
  }, [issueFocus, activeId, onSceneSelect, story.scenes]);
  const errors = issues.filter((issue) => issue.level === 'error');
  const updateScene = (next: Scene) => changeDraft({ ...story, scenes: { ...story.scenes, [activeId]: next } });
  const updateChoice = (id: string, patch: Partial<Choice>) => {
    updateScene({ ...scene, choices: (scene.choices ?? []).map((choice) => choice.id === id ? { ...choice, ...patch } : choice) });
  };
  const createScene = () => {
    const id = newSceneId.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id)) {
      setMessage('Use a 1–64 character ID starting with a letter or number, then letters, numbers, _ or -.');
      return;
    }
    if (story.scenes[id] || Object.values(story.scenes).some((item) => item.ending?.id === id)) {
      setMessage(`Passage or ending ID “${id}” already exists.`);
      return;
    }
    const next: Scene = { title: id, text: 'Write this passage.', ending: { id, title: id, tone: 'neutral' } };
    changeDraft({ ...story, scenes: { ...story.scenes, [id]: next } });
    onSceneSelect(id);
    setNewSceneId('');
    setMessage('New ending passage created. Connect an incoming choice to make it reachable.');
  };
  const removeScene = () => {
    if (activeId === story.start || !window.confirm(`Remove passage “${scene.title ?? activeId}” from this draft? Incoming choices will need new destinations.`)) return;
    const nextScenes = { ...story.scenes };
    delete nextScenes[activeId];
    changeDraft({ ...story, scenes: nextScenes });
    onSceneSelect(story.start);
    setMessage(`Passage “${activeId}” removed from the draft. Reconnect any incoming choices before applying.`);
  };
  const addFlag = () => {
    const id = newFlagId.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id)) return setMessage('Flag IDs use 1–64 letters, numbers, _ or -, starting with a letter or number.');
    if (Object.hasOwn(story.flags ?? {}, id)) return setMessage(`Flag “${id}” already exists.`);
    changeDraft({ ...story, flags: { ...story.flags, [id]: false } });
    setNewFlagId('');
    setMessage(`Flag “${id}” added with an initial value of no.`);
  };
  const addChoice = () => {
    const used = new Set((scene.choices ?? []).map((choice) => choice.id));
    let index = 1;
    while (used.has(`choice${index}`)) index++;
    updateScene({ ...scene, choices: [...(scene.choices ?? []), { id: `choice${index}`, label: 'New choice', to: story.start }] });
  };
  const toggleEnding = () => {
    if (scene.ending) {
      const { ending: _ending, ...passage } = scene;
      updateScene({ ...passage, choices: [] });
    } else if ((scene.choices ?? []).length === 0) {
      updateScene({ ...scene, ending: { id: activeId, title: scene.title ?? activeId, tone: 'neutral' } });
    }
  };
  return (
    <section id="map-draft-editor" className="map-draft-editor" aria-labelledby="draft-editor-heading">
      <div className="draft-editor-heading">
        <div><p className="eyebrow">Local experiment · unpublished</p><h2 id="draft-editor-heading">Passage & choice editor</h2></div>
        <div className="draft-editor-actions"><span>{errors.length} errors · {issues.length - errors.length} warnings</span><button type="button" disabled={errors.length > 0} onClick={onApply}>Apply valid draft to map</button></div>
      </div>
      <p className="draft-editor-note">Edit a copy of the story. The map and simulator keep using the last valid version until you apply this draft. Playing the story still opens the published version.</p>
      <div className="draft-file-actions"><button type="button" onClick={onSave}>Save locally</button><button type="button" onClick={onDownload}>Download JSON</button><button type="button" onClick={() => importRef.current?.click()}>Import JSON</button><input ref={importRef} type="file" accept=".json,application/json" aria-label="Import story draft JSON" onChange={(event) => { const file = event.target.files?.[0]; if (file) onImport(file); event.target.value = ''; }} /><span role="status">{status}</span></div>
      <div className="draft-editor-grid">
        <div className="draft-fields">
          <label htmlFor="draft-passage">Passage to edit</label>
          <select id="draft-passage" value={activeId} onChange={(event) => onSceneSelect(event.target.value)}>
            {Object.entries(story.scenes).map(([id, item]) => <option key={id} value={id}>{item.title ?? id} ({id})</option>)}
          </select>
          <label htmlFor="draft-title">Title</label>
          <input id="draft-title" value={scene.title ?? ''} onChange={(event) => updateScene({ ...scene, title: event.target.value, ending: scene.ending ? { ...scene.ending, title: event.target.value } : undefined })} />
          <label htmlFor="draft-text">Passage text</label>
          <textarea id="draft-text" rows={8} value={scene.text} onChange={(event) => updateScene({ ...scene, text: event.target.value })} />
          <div className="draft-ending-control">
            <span>{scene.ending ? `${scene.ending.tone} ending` : 'Story passage'}</span>
            <button type="button" disabled={!scene.ending && (scene.choices?.length ?? 0) > 0} onClick={toggleEnding}>{scene.ending ? 'Convert to passage' : 'Mark as ending'}</button>
            {scene.ending && <select aria-label="Ending tone" value={scene.ending.tone} onChange={(event) => updateScene({ ...scene, ending: { ...scene.ending!, tone: event.target.value as NonNullable<Scene['ending']>['tone'] } })}><option value="good">Good</option><option value="neutral">Neutral</option><option value="bad">Hard</option></select>}
          </div>
          <button type="button" className="draft-remove-passage" disabled={activeId === story.start} onClick={removeScene}>Remove selected passage</button>
          <div className="draft-create"><label htmlFor="draft-new-id">New passage ID</label><div><input id="draft-new-id" value={newSceneId} onChange={(event) => setNewSceneId(event.target.value)} placeholder="e.g. crossroads" /><button type="button" onClick={createScene}>Add passage</button></div>{message && <p role="status">{message}</p>}</div>
          <div className="draft-flags"><h3>Starting flags</h3>{Object.entries(story.flags ?? {}).map(([id, value]) => <label key={id}><input type="checkbox" checked={value} onChange={(event) => changeDraft({ ...story, flags: { ...story.flags, [id]: event.target.checked } })} />{id}</label>)}<div><input aria-label="New flag ID" value={newFlagId} onChange={(event) => setNewFlagId(event.target.value)} placeholder="e.g. metGuide" /><button type="button" onClick={addFlag}>Add flag</button></div></div>
        </div>
        <div className="draft-choices">
          <div className="draft-choices-heading"><h3>Choices from {scene.title ?? activeId}</h3><button type="button" disabled={Boolean(scene.ending)} onClick={addChoice}>Add choice</button></div>
          {(scene.choices ?? []).map((choice) => (
            <div key={choice.id} className="draft-choice-row" data-choice-id={choice.id}>
              <span className="draft-choice-id">{choice.id}</span>
              <label>Player-facing label<input value={choice.label} onChange={(event) => updateChoice(choice.id, { label: event.target.value })} /></label>
              <label>Destination<select value={choice.to} onChange={(event) => updateChoice(choice.id, { to: event.target.value })}>{Object.keys(story.scenes).map((id) => <option key={id} value={id}>{story.scenes[id]?.title ?? id} ({id})</option>)}</select></label>
              <button type="button" className="draft-remove" onClick={() => updateScene({ ...scene, choices: (scene.choices ?? []).filter((item) => item.id !== choice.id) })}>Remove choice</button>
              <ChoiceRulesEditor story={story} choice={choice} onChange={(patch) => updateChoice(choice.id, patch)} />
            </div>
          ))}
          {scene.ending && <p>This ending has no outgoing choices. Convert it to a passage to add one.</p>}
          {!scene.ending && (scene.choices?.length ?? 0) === 0 && <p>Add at least one choice or mark this as an ending.</p>}
        </div>
      </div>
      <DefinitionsEditor story={story} onChange={changeDraft} />
      <div className="draft-issues" aria-live="polite"><h3>Validation</h3>{issues.length === 0 ? <p>Draft is valid.</p> : <ul>{issues.map((issue, index) => <li key={`${issue.at}/${index}`} className={`draft-issue-${issue.level}`}><strong>{issue.level}</strong> {issue.at.startsWith('scenes.') || issue.at.startsWith('stats.') || issue.at.startsWith('items.') ? <button type="button" onClick={() => setIssueFocus({ at: issue.at, key: index })}>{issue.at}: {issue.message}</button> : <span>{issue.at}: {issue.message}</span>}</li>)}</ul>}</div>
      <section className="draft-explorer" aria-labelledby="draft-explorer-heading"><div><h3 id="draft-explorer-heading">Path explorer</h3><button type="button" disabled={errors.length > 0} onClick={() => setDiagnostics(explore(story, 5000))}>Explore valid draft</button></div><p>Runs a bounded engine search from the opening. This supplements human playtesting.</p>{diagnostics && <ExplorerReport story={story} report={diagnostics} onTrace={onTrace} />}</section>
    </section>
  );
}

function ExplorerReport({ story, report, onTrace }: { story: Story; report: ExploreReport; onTrace: (history: readonly string[]) => void }) {
  return <div className="explorer-report" aria-live="polite">
    <p><strong>{report.endings.size}</strong> reachable endings · <strong>{report.statesVisited}</strong> states visited{report.truncated ? ' · search truncated at 5,000 states' : ''}</p>
    <div className="explorer-endings"><strong>Ending routes</strong>{[...report.endings].map(([id, history]) => <button type="button" key={id} onClick={() => onTrace(history)}>{id} · {history.length} choices → trace on map</button>)}</div>
    <div><strong>Blocked non-endings ({report.stuck.length})</strong>{report.stuck.length > 0 && <ul>{report.stuck.slice(0, 10).map((entry, index) => <li key={`${entry.sceneId}/${index}`}>{story.scenes[entry.sceneId]?.title ?? entry.sceneId} after {entry.history.length} choices{entry.locked.length > 0 ? ` · ${entry.locked.map((locked) => `${locked.choiceId}: ${locked.failed.map((condition) => describeCondition(story, condition)).join(', ')}`).join(' | ')}` : ''}</li>)}</ul>}</div>
    <div><strong>Never available choices ({report.neverAvailable.length})</strong>{report.neverAvailable.length > 0 && <p>{report.neverAvailable.slice(0, 20).join(', ')}{report.neverAvailable.length > 20 ? '…' : ''}</p>}</div>
    <div><strong>Cycles ({report.cycles.length})</strong>{report.cycles.length > 0 && <p>{report.cycles.slice(0, 10).map((cycle) => `${cycle.sceneId}/${cycle.choiceId}${cycle.intentional ? ' (intentional)' : ''}`).join(', ')}</p>}</div>
  </div>;
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
        {preview && <span className="simulator-count">{state?.revision} {state?.revision === 1 ? 'choice' : 'choices'}</span>}
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
      <p><strong>Canonical state after {state.revision} {state.revision === 1 ? 'choice' : 'choices'}</strong></p>
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
