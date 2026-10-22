import { useRef, useState } from 'react';
import { navigate } from './router';
import { catalog } from './stories/catalog';
import { deleteSave, endingsFound, exportAll, importAll, lastPlayed, loadSave } from './saves';

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
    <main className="page">
      <header className="masthead">
        <p className="eyebrow">A choose-your-own-adventure RPG</p>
        <h1>Pick a story</h1>
        <p className="lede">Every choice is weighed against who you are. Some paths only open on another try.</p>
      </header>

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
    </main>
  );
}
