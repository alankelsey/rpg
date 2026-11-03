import { useEffect, useRef, useState, type FormEvent } from 'react';
import { navigate } from './router';
import {
  choiceViews,
  endingsOf,
  formatStat,
  getScene,
  lockedChoicesSeen,
  lockedReason,
  replay,
  sceneText,
  startRun,
  transition,
  validateStory,
  type RunState,
  type Story,
  type TransitionEvent,
} from './engine';
import { findStory } from './stories/catalog';
import { endingsFound, lastName, loadSave, recordEnding, writeSave } from './saves';

type Load =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; story: Story; run?: RunState; notice?: string };

export function Reader({ storyId }: { storyId: string }) {
  const [load, setLoad] = useState<Load>({ kind: 'loading' });

  useEffect(() => {
    const entry = findStory(storyId);
    if (!entry) return setLoad({ kind: 'error', message: "That story doesn't exist." });
    const save = loadSave(storyId);
    const requestedVersion = save && !save.ended ? save.storyVersion : entry.latestVersion;
    const requested = entry.loadVersion(requestedVersion);
    (requested ?? entry.load())
      .then((story) => {
        const errors = validateStory(story).filter((i) => i.level === 'error');
        if (errors.length > 0) return setLoad({ kind: 'error', message: 'This story has errors and cannot be played.' });
        if (!requested && save && !save.ended) {
          return setLoad({
            kind: 'ready',
            story,
            notice: `This build does not include ${story.title} v${save.storyVersion}. The save is preserved for export. Starting v${story.version} will replace it.`,
          });
        }
        setLoad({ kind: 'ready', ...resume(story, save) });
      })
      .catch(() => setLoad({ kind: 'error', message: "The story couldn't be loaded. Check your connection and try again." }));
  }, [storyId]);

  if (load.kind === 'loading') return <main className="page"><p>Loading…</p></main>;
  if (load.kind === 'error') {
    return (
      <main className="page">
        <p>{load.message}</p>
        <button type="button" onClick={() => navigate('#/')}>Back to stories</button>
      </main>
    );
  }
  return <Playthrough story={load.story} initialRun={load.run} notice={load.notice} />;
}

/** Rebuild the saved run by replaying its choices. A save from another story version can't be trusted. */
function resume(story: Story, save = loadSave(story.id)): { story: Story; run?: RunState; notice?: string } {
  if (!save || save.ended) return { story };
  if (save.storyVersion === story.version && save.rulesVersion === story.rulesVersion) {
    try {
      const run = replay(story, save.playerName, save.history);
      if (run.revision !== save.revision) throw new Error('Save revision does not match history');
      return { story, run };
    } catch {
      // Fall through to the notice below.
    }
  }
  return {
    story,
    notice: 'This save needs a different story or rules version. It has been preserved for export, but it cannot resume here. Starting a new run will replace it.',
  };
}

function Playthrough({ story, initialRun, notice }: { story: Story; initialRun?: RunState; notice?: string }) {
  const [run, setRun] = useState(initialRun);
  const [events, setEvents] = useState<TransitionEvent[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  const begin = (name: string) => {
    const state = startRun(story, name);
    setEvents([]);
    setRun(state);
    setSaveFailed(!writeSave(story, state));
  };

  const choose = (choiceId: string) => {
    if (!run) return;
    const result = transition(story, run, choiceId);
    setEvents(result.events);
    setRun(result.state);
    setSaveFailed(!writeSave(story, result.state));
    const ending = getScene(story, result.state.sceneId).ending;
    if (ending) recordEnding(story.id, ending.id);
  };

  // Move focus to the new scene so keyboard and screen-reader users start reading from the top.
  useEffect(() => {
    if (run && run.history.length > 0) heading.current?.focus();
  }, [run]);

  if (!run) return <StartScreen story={story} notice={notice} onBegin={begin} />;

  const scene = getScene(story, run.sceneId);
  return (
    <main className="page reader">
      <nav className="reader-nav">
        <button type="button" className="link" onClick={() => navigate('#/')}>← Stories</button>
        <span className="reader-title">{story.title}</span>
        <button type="button" className="link" onClick={() => navigate(`#/story/${story.id}/map`)}>Story map</button>
      </nav>
      <StatsPanel story={story} run={run} events={events} />
      <article className="scene" aria-live="off">
        <h1 ref={heading} tabIndex={-1}>{scene.title}</h1>
        {sceneText(story, run).split('\n\n').map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </article>
      {saveFailed && <p className="warning">This browser isn't saving progress (private mode or storage blocked).</p>}
      {run.ended ? (
        <EndingPanel story={story} run={run} onReplay={() => begin(run.playerName)} />
      ) : (
        <Choices story={story} run={run} onChoose={choose} />
      )}
    </main>
  );
}

function StartScreen({ story, notice, onBegin }: { story: Story; notice?: string; onBegin: (name: string) => void }) {
  const [name, setName] = useState(lastName);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) onBegin(name);
  };
  return (
    <main className="page">
      <nav className="reader-nav">
        <button type="button" className="link" onClick={() => navigate('#/')}>← Stories</button>
        <button type="button" className="link" onClick={() => navigate(`#/story/${story.id}/map`)}>Story map</button>
      </nav>
      <h1>{story.title}</h1>
      <p className="lede">{story.summary}</p>
      {notice && <p className="warning">{notice}</p>}
      <form className="start-form" onSubmit={submit}>
        <label htmlFor="player-name">What's your name?</label>
        <input id="player-name" value={name} maxLength={40} autoComplete="given-name" onChange={(e) => setName(e.target.value)} />
        <button className="primary" type="submit" disabled={!name.trim()}>Begin</button>
      </form>
    </main>
  );
}

function StatsPanel({ story, run, events }: { story: Story; run: RunState; events: TransitionEvent[] }) {
  const visible = Object.entries(story.stats).filter(([, def]) => !def.hidden);
  return (
    <section className="stats" aria-label="Your stats">
      <ul>
        {visible.map(([key, def]) => {
          const value = run.stats[key] ?? 0;
          const delta = events
            .filter((event): event is Extract<TransitionEvent, { type: 'stat' }> => event.type === 'stat' && event.stat === key)
            .reduce((total, event) => total + event.delta, 0);
          return (
            <li key={key}>
              <span className="stat-label">{def.label}</span>
              <span className="stat-value">
                {formatStat(story, key, value)}
                {def.max !== undefined && <span className="stat-max">/{def.max}</span>}
              </span>
              {def.max !== undefined && <meter min={def.min ?? 0} max={def.max} value={value} aria-hidden="true" />}
              {delta !== 0 && (
                <span className={`delta ${delta > 0 ? 'up' : 'down'}`}>
                  {delta > 0 ? '+' : '−'}
                  {formatStat(story, key, Math.abs(delta))}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Choices({ story, run, onChoose }: { story: Story; run: RunState; onChoose: (id: string) => void }) {
  const views = choiceViews(story, run);

  // Number keys pick a choice: 1 is the first choice shown.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      const view = views[Number(e.key) - 1];
      if (view?.available) onChoose(view.choice.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [views, onChoose]);

  return (
    <section aria-label="Choices">
      <ol className="choices">
        {views.map((view, i) => {
          const hintId = `hint-${view.choice.id}`;
          return (
            <li key={view.choice.id}>
              <button
                type="button"
                className="choice"
                disabled={!view.available}
                aria-describedby={view.available ? undefined : hintId}
                onClick={() => onChoose(view.choice.id)}
              >
                <span className="choice-key" aria-hidden="true">{i + 1}</span>
                <span>
                  {view.choice.label}
                  {!view.available && (
                    <span id={hintId} className="choice-hint">
                      🔒 {lockedReason(story, view, run)}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function EndingPanel({ story, run, onReplay }: { story: Story; run: RunState; onReplay: () => void }) {
  const ending = getScene(story, run.sceneId).ending!;
  const found = new Set(endingsFound(story.id));
  const missed = lockedChoicesSeen(story, run.playerName, run.history);
  return (
    <section className={`ending tone-${ending.tone}`} aria-labelledby="ending-heading">
      <h2 id="ending-heading">The end</h2>
      <p className="eyebrow">
        {ending.tone === 'good' ? 'A good ending' : ending.tone === 'bad' ? 'A hard ending' : 'An open ending'} · {found.size} of{' '}
        {endingsOf(story).length} endings found
      </p>

      <h3>Endings</h3>
      <ul className="endings">
        {endingsOf(story).map(({ ending: e }) => (
          <li key={e.id} className={found.has(e.id) ? 'found' : 'unfound'}>
            {found.has(e.id) ? e.title : '???'}
          </li>
        ))}
      </ul>

      {missed.length > 0 && (
        <>
          <h3>Paths you couldn't take this time</h3>
          <ul className="missed">
            {missed.map((m) => (
              <li key={`${m.sceneId}/${m.choiceId}`}>
                <strong>{m.label}</strong>
                <span>{m.reason}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="actions">
        <button className="primary" type="button" onClick={onReplay}>Play again</button>
        <button type="button" onClick={() => navigate('#/')}>Back to stories</button>
      </div>
    </section>
  );
}
