import { useState } from 'react';
import type { ItemDef, StatDef, Story } from '../engine';

const validId = (id: string) => /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id);
const number = (value: string) => value === '' ? 0 : Number(value);
const optionalNumber = (value: string) => value === '' ? undefined : Number(value);

export function DefinitionsEditor({ story, onChange }: { story: Story; onChange: (story: Story) => void }) {
  const [newStatId, setNewStatId] = useState('');
  const [newItemId, setNewItemId] = useState('');
  const [notice, setNotice] = useState('');
  const updateStat = (id: string, patch: Partial<StatDef>) => onChange({ ...story, stats: { ...story.stats, [id]: { ...story.stats[id]!, ...patch } } });
  const updateItem = (id: string, patch: Partial<ItemDef>) => onChange({ ...story, items: { ...story.items, [id]: { ...story.items?.[id]!, ...patch } } });
  const addStat = () => {
    const id = newStatId.trim();
    if (!validId(id)) return setNotice('Stat IDs use 1–64 letters, numbers, _ or -, starting with a letter or number.');
    if (Object.hasOwn(story.stats, id)) return setNotice(`Stat “${id}” already exists.`);
    onChange({ ...story, stats: { ...story.stats, [id]: { label: id, initial: 0, min: 0, max: 100 } } });
    setNewStatId('');
    setNotice(`Stat “${id}” added.`);
  };
  const addItem = () => {
    const id = newItemId.trim();
    if (!validId(id)) return setNotice('Item IDs use 1–64 letters, numbers, _ or -, starting with a letter or number.');
    if (Object.hasOwn(story.items ?? {}, id)) return setNotice(`Item “${id}” already exists.`);
    onChange({ ...story, items: { ...story.items, [id]: { label: id, initial: 0, max: 1 } } });
    setNewItemId('');
    setNotice(`Item “${id}” added.`);
  };
  const removeStat = (id: string) => {
    if (!window.confirm(`Remove stat “${id}” from the draft? Choice rules that refer to it will need repair.`)) return;
    const stats = { ...story.stats };
    delete stats[id];
    onChange({ ...story, stats });
  };
  const removeItem = (id: string) => {
    if (!window.confirm(`Remove item “${id}” from the draft? Choice rules that refer to it will need repair.`)) return;
    const items = { ...story.items };
    delete items[id];
    onChange({ ...story, items });
  };
  return (
    <details className="definitions-editor">
      <summary>Stat & item definitions</summary>
      <p>Rules refer to these IDs. Changing or removing a definition may make existing choices invalid until repaired.</p>
      <div className="definitions-grid">
        <section aria-labelledby="definition-stats-heading">
          <h3 id="definition-stats-heading">Stats</h3>
          {Object.entries(story.stats).map(([id, def]) => (
            <div className="definition-row" key={id} id={`definition-stat-${id}`}>
              <strong>{id}</strong><button type="button" disabled={Object.keys(story.stats).length === 1} onClick={() => removeStat(id)}>Remove</button>
              <label>Label<input value={def.label} onChange={(event) => updateStat(id, { label: event.target.value })} /></label>
              <label>Initial<input type="number" value={def.initial} onChange={(event) => updateStat(id, { initial: number(event.target.value) })} /></label>
              <label>Minimum<input type="number" value={def.min ?? ''} onChange={(event) => updateStat(id, { min: optionalNumber(event.target.value) })} /></label>
              <label>Maximum<input type="number" value={def.max ?? ''} onChange={(event) => updateStat(id, { max: optionalNumber(event.target.value) })} /></label>
              <label>Display<select value={def.format ?? 'number'} onChange={(event) => updateStat(id, { format: event.target.value === 'money' ? 'money' : undefined })}><option value="number">Number</option><option value="money">Money</option></select></label>
              <label className="definition-check"><input type="checkbox" checked={def.hidden ?? false} onChange={(event) => updateStat(id, { hidden: event.target.checked })} />Hidden from reader</label>
            </div>
          ))}
          <div className="definition-add"><input aria-label="New stat ID" value={newStatId} onChange={(event) => setNewStatId(event.target.value)} placeholder="e.g. courage" /><button type="button" onClick={addStat}>Add stat</button></div>
        </section>
        <section aria-labelledby="definition-items-heading">
          <h3 id="definition-items-heading">Items</h3>
          {Object.entries(story.items ?? {}).map(([id, def]) => (
            <div className="definition-row" key={id} id={`definition-item-${id}`}>
              <strong>{id}</strong><button type="button" onClick={() => removeItem(id)}>Remove</button>
              <label>Label<input value={def.label} onChange={(event) => updateItem(id, { label: event.target.value })} /></label>
              <label>Initial<input type="number" step="1" min="0" value={def.initial ?? 0} onChange={(event) => updateItem(id, { initial: number(event.target.value) })} /></label>
              <label>Maximum<input type="number" step="1" min="0" value={def.max ?? ''} onChange={(event) => updateItem(id, { max: optionalNumber(event.target.value) })} /></label>
            </div>
          ))}
          <div className="definition-add"><input aria-label="New item ID" value={newItemId} onChange={(event) => setNewItemId(event.target.value)} placeholder="e.g. key" /><button type="button" onClick={addItem}>Add item</button></div>
        </section>
      </div>
      {notice && <p role="status">{notice}</p>}
    </details>
  );
}
