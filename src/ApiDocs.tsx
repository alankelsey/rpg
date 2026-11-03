import { WorkspaceNav } from './WorkspaceNav';

interface Operation {
  group: 'RUN' | 'READ' | 'VALIDATE';
  name: string;
  signature: string;
  summary: string;
  returns: string;
  throws?: string;
}

const operations: Operation[] = [
  {
    group: 'RUN',
    name: 'startRun',
    signature: 'startRun(story: Story, playerName: string): RunState',
    summary: 'Creates a deterministic run at the story start with initial stats and flags.',
    returns: 'A new RunState. The supplied Story is not modified.',
  },
  {
    group: 'READ',
    name: 'choiceViews',
    signature: 'choiceViews(story: Story, state: RunState): ChoiceView[]',
    summary: 'Returns the choices visible at the current passage, including failed requirements for locked choices.',
    returns: 'Visible choices in authored order. Secret locked choices are omitted.',
  },
  {
    group: 'RUN',
    name: 'applyChoice',
    signature: 'applyChoice(story: Story, state: RunState, choiceId: string): RunState',
    summary: 'Checks a choice, applies its effects once, and advances to its destination passage.',
    returns: 'A new immutable RunState with updated history, stats, flags, and ending status.',
    throws: 'IllegalChoiceError when the choice is missing, locked, from the wrong story version, or the run has ended.',
  },
  {
    group: 'RUN',
    name: 'replay',
    signature: 'replay(story: Story, playerName: string, history: readonly string[]): RunState',
    summary: 'Rebuilds and verifies a saved run by applying its ordered choice IDs from the beginning.',
    returns: 'The reproduced RunState for the exact story version.',
    throws: 'IllegalChoiceError when any recorded choice is invalid for the replayed state.',
  },
  {
    group: 'READ',
    name: 'endingsOf',
    signature: "endingsOf(story: Story): { sceneId: string; ending: Ending }[]",
    summary: 'Lists every explicitly authored ending passage in a story.',
    returns: 'Ending metadata paired with its passage ID.',
  },
  {
    group: 'VALIDATE',
    name: 'validateStory',
    signature: 'validateStory(story: Story): Issue[]',
    summary: 'Checks story structure, references, effects, requirements, reachability, and ending rules.',
    returns: 'Errors that block play or publication and warnings for suspicious content.',
  },
  {
    group: 'VALIDATE',
    name: 'explore',
    signature: 'explore(story: Story, maxStates = 20000): ExploreReport',
    summary: 'Plays every reachable engine state within a bound to find endings, stuck states, and unusable choices.',
    returns: 'Ending paths, stuck runs, never-available choices, visited-state count, and truncation status.',
  },
];

const storyExample = `{
  "id": "new-town",
  "version": 1,
  "title": "New Town",
  "start": "curb",
  "stats": {
    "money": { "label": "Money", "initial": 1500, "min": 0 }
  },
  "scenes": {
    "curb": {
      "text": "The bus pulls away...",
      "choices": [
        { "id": "store", "label": "The convenience store", "to": "store" }
      ]
    }
  }
}`;

const schemas = [
  ['Story', 'id, version, title, summary, start, stats, optional initial flags, and a scene record.'],
  ['Scene', 'Plain-text passage body with optional title, choices, or one explicit ending.'],
  ['Choice', 'Scene-local ID, player-facing label, destination, requirements, effects, and visibility behavior.'],
  ['Condition', 'A deterministic stat threshold or required boolean flag.'],
  ['Effects', 'Additive stat deltas and boolean flag assignments applied exactly once.'],
  ['RunState', 'Story/version identity, player, current scene, stats, flags, ordered choice history, and ending status.'],
  ['SaveFile', 'Story/version identity plus player name and choice history; loading replays the canonical engine.'],
];

export function ApiDocs() {
  return (
    <main className="docs-page">
      <WorkspaceNav />
      <header className="docs-hero">
        <p className="eyebrow">Developer documentation · v0</p>
        <h1>Story engine API</h1>
        <p className="lede">A compact reference for playing, validating, and visualizing versioned choose-your-own-adventure stories.</p>
        <div className="api-notice">
          <strong>Browser API</strong>
          <span>This project has no HTTP backend yet. These are TypeScript functions and JSON contracts exported by <code>src/engine</code>, documented in a Swagger-style format.</span>
        </div>
      </header>

      <div className="docs-layout">
        <nav className="docs-toc" aria-label="API sections">
          <strong>On this page</strong>
          <a href="#operations">Operations</a>
          <a href="#story-schema">Story schema</a>
          <a href="#example">Example story</a>
          <a href="#source">Source</a>
        </nav>

        <div className="docs-content">
          <section id="operations" className="api-section">
            <p className="eyebrow">Engine surface</p>
            <h2>Operations</h2>
            <div className="operation-list">
              {operations.map((operation) => (
                <details key={operation.name} className={`operation operation-${operation.group.toLowerCase()}`} open={operation.name === 'applyChoice'}>
                  <summary>
                    <span className="operation-method">{operation.group}</span>
                    <code>{operation.name}</code>
                    <span>{operation.summary}</span>
                  </summary>
                  <div className="operation-body">
                    <h3>Signature</h3>
                    <pre><code>{operation.signature}</code></pre>
                    <dl>
                      <div><dt>Returns</dt><dd>{operation.returns}</dd></div>
                      {operation.throws && <div><dt>Throws</dt><dd>{operation.throws}</dd></div>}
                    </dl>
                  </div>
                </details>
              ))}
            </div>
          </section>

          <section id="story-schema" className="api-section">
            <p className="eyebrow">Data contracts</p>
            <h2>Story schema</h2>
            <p>Stories are declarative data. The reader, map, tests, and future editor all use the same source of truth.</p>
            <div className="schema-list">
              {schemas.map(([name, description]) => (
                <article key={name}>
                  <code>{name}</code>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="example" className="api-section">
            <p className="eyebrow">JSON</p>
            <h2>Minimal story example</h2>
            <pre className="code-example"><code>{storyExample}</code></pre>
          </section>

          <section id="source" className="api-section docs-source">
            <p className="eyebrow">Source and planning</p>
            <h2>Continue reading</h2>
            <div className="docs-link-grid">
              <a href="https://github.com/alankelsey/rpg#readme" target="_blank" rel="noreferrer">
                <strong>GitHub README</strong>
                <span>Setup, status, features, and project documentation.</span>
              </a>
              <a href="https://github.com/alankelsey/rpg/tree/master/src/engine" target="_blank" rel="noreferrer">
                <strong>Engine source</strong>
                <span>Types, runtime behavior, validation, and tests.</span>
              </a>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
