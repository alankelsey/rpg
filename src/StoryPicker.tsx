import { useRef, useState } from 'react';
import { navigate } from './router';
import { catalog } from './stories/catalog';
import { deleteSave, endingsFound, exportAll, importAll, lastPlayed, loadSave } from './saves';
import { WorkspaceNav } from './WorkspaceNav';

export function StoryPicker() {
  const [, refresh] = useState(0);
  const [confirming, setConfirming] = useState<string>();
  const [status, setStatus] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const resume = lastPlayed();
  const resumeEntry = resume && catalog.find((e) => e.id === resume.storyId);

  const startOver = (id: string) => {
    if (confirming !== id) return setConfirming(id);
    deleteSave(id);
    setConfirming(undefined);
    navigate(`#/story/${id}`);
  };

  const download = () => {
    const blob = new Blob([exportAll(catalog.map((e) => e.id))], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rpg-saves-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus('Saves downloaded.');
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const count = importAll(await file.text());
      setStatus(`Restored ${count} save${count === 1 ? '' : 's'}.`);
      refresh((n) => n + 1);
    } catch {
      setStatus("That file isn't a saves file from this game.");
    }
  };

  return (
    <main className="page landing-page">
      <WorkspaceNav active="home" />
      <header className="masthead landing-masthead">
        <p className="eyebrow">Choose-your-own-adventure workshop</p>
        <h1>Build the character.<br />See every path.</h1>
        <p className="lede">Move between the character generator, the live story flow chart, and the playable adventure from one workspace.</p>
      </header>

      <section className="workbench" aria-labelledby="workbench-heading">
        <div className="section-heading">
          <p className="eyebrow">Stage 1 experiments</p>
          <h2 id="workbench-heading">Workshop tools</h2>
        </div>
        <div className="tool-grid">
          <a className="tool-card character-tool" href="./stat-lab.html">
            <span className="tool-number">01</span>
            <span className="tool-icon" aria-hidden="true">✦</span>
            <strong>Character Generator</strong>
            <span>Build an origin, tune stats, and generate a reusable character card.</span>
            <em>Open character workshop →</em>
          </a>
          <a className="tool-card map-tool" href="#/story/new-town/map">
            <span className="tool-number">02</span>
            <span className="tool-icon" aria-hidden="true">⌁</span>
            <strong>Story Flow Chart</strong>
            <span>Inspect all 21 passages, choice connections, state rules, and four endings.</span>
            <em>Open branching viewer →</em>
          </a>
          <a className="tool-card map-tool" href="#/create">
            <span className="tool-number">03</span>
            <span className="tool-icon" aria-hidden="true">✎</span>
            <strong>New Story Draft</strong>
            <span>Start with a two passage template, explore paths, and download your story as JSON.</span>
            <em>Create a local story →</em>
          </a>
        </div>
      </section>

      {resume && resumeEntry && (
        <section className="continue" aria-labelledby="continue-heading">
          <h2 id="continue-heading">Continue</h2>
          <p>
            <strong>{resumeEntry.title}</strong> · {resume.playerName} · {resume.sceneTitle}
          </p>
          <button className="primary" type="button" onClick={() => navigate(`#/story/${resume.storyId}`)}>
            Continue {resumeEntry.title}
          </button>
        </section>
      )}

      <section className="play-library" aria-labelledby="stories-heading">
        <div className="section-heading">
          <p className="eyebrow">Playable build</p>
          <h2 id="stories-heading">Stories</h2>
        </div>
      <ul className="story-list">
        {catalog.map((entry) => {
          const save = loadSave(entry.id);
          const inProgress = save && !save.ended;
          const found = endingsFound(entry.id).length;
          return (
            <li key={entry.id} className="story-card">
              <h2>{entry.title}</h2>
              <p>{entry.summary}</p>
              <p className="meta">
                {inProgress ? `In progress: ${save.sceneTitle}` : 'Not started'}
                {found > 0 && ` · ${found} ending${found === 1 ? '' : 's'} found`}
              </p>
              <div className="actions">
                <button className="primary" type="button" onClick={() => navigate(`#/story/${entry.id}`)}>
                  {inProgress ? 'Continue' : 'Start'}
                </button>
                <button type="button" onClick={() => navigate(`#/story/${entry.id}/map`)}>
                  View story map
                </button>
                {inProgress && (
                  <button type="button" onClick={() => startOver(entry.id)}>
                    {confirming === entry.id ? 'Tap again to erase progress' : 'Start over'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      </section>

      <section className="saves" aria-labelledby="saves-heading">
        <h2 id="saves-heading">Your saves</h2>
        <p>Saves stay in this browser. Download them to keep a backup or move to another device.</p>
        <div className="actions">
          <button type="button" onClick={download}>
            Download saves
          </button>
          <button type="button" onClick={() => fileInput.current?.click()}>
            Load saves from a file
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void upload(e.target.files?.[0])}
          />
        </div>
        <p role="status" className="status">
          {status}
        </p>
      </section>

      <footer className="landing-footer">
        <div>
          <p className="eyebrow">Documentation</p>
          <h2>Build on the story engine</h2>
          <p>Read the project overview or browse the engine functions and story contracts.</p>
        </div>
        <nav aria-label="Documentation links">
          <a href="https://github.com/alankelsey/rpg#readme" target="_blank" rel="noreferrer">
            <span aria-hidden="true">↗</span>
            <strong>GitHub README</strong>
            <small>Project setup and roadmap</small>
          </a>
          <a href="#/docs">
            <span aria-hidden="true">{'{}'}</span>
            <strong>API Reference</strong>
            <small>Engine operations and schemas</small>
          </a>
        </nav>
      </footer>
    </main>
  );
}
