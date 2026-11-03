import type { Choice, Condition, Story } from '../engine';

interface Props {
  story: Story;
  choice: Choice;
  onChange: (patch: Partial<Choice>) => void;
}

function numeric(value: string): number {
  return value === '' ? 0 : Number(value);
}

function flagNames(story: Story): string[] {
  const names = new Set(Object.keys(story.flags ?? {}));
  const visit = (condition: Condition) => {
    if ('flag' in condition) names.add(condition.flag);
    else if ('all' in condition || 'any' in condition) ('all' in condition ? condition.all : condition.any).forEach(visit);
    else if ('not' in condition) visit(condition.not);
  };
  for (const scene of Object.values(story.scenes)) for (const choice of scene.choices ?? []) {
    Object.keys(choice.effects?.flags ?? {}).forEach((name) => names.add(name));
    choice.requires?.forEach(visit);
  }
  return [...names].sort();
}

function RecordRows({ label, values, options, onChange, onRename, onAdd, onRemove, kind }: {
  label: string;
  values: Record<string, number | boolean>;
  options: string[];
  onChange: (key: string, value: number | boolean) => void;
  onRename: (from: string, to: string) => void;
  onAdd: (key: string) => void;
  onRemove: (key: string) => void;
  kind: 'number' | 'boolean';
}) {
  const unused = options.filter((key) => !(key in values));
  return (
    <div className="rule-editor-group">
      <div className="rule-editor-group-heading"><strong>{label}</strong><button type="button" disabled={unused.length === 0} onClick={() => onAdd(unused[0]!)}>Add</button></div>
      {Object.entries(values).map(([key, value]) => (
        <div className="rule-editor-row" key={key}>
          <select aria-label={`${label} target`} value={key} onChange={(event) => onRename(key, event.target.value)}>{[key, ...unused].map((id) => <option key={id} value={id}>{id}</option>)}</select>
          {kind === 'boolean' ? <select aria-label={`${label} ${key}`} value={String(value)} onChange={(event) => onChange(key, event.target.value === 'true')}><option value="true">Yes</option><option value="false">No</option></select>
            : <input aria-label={`${label} ${key}`} type="number" value={Number(value)} onChange={(event) => onChange(key, numeric(event.target.value))} />}
          <button type="button" aria-label={`Remove ${label} ${key}`} onClick={() => onRemove(key)}>Remove</button>
        </div>
      ))}
    </div>
  );
}

type ConditionKind = 'stat' | 'item' | 'flag' | 'all' | 'any' | 'not';

function conditionKind(condition: Condition): ConditionKind {
  if ('stat' in condition) return 'stat';
  if ('item' in condition) return 'item';
  if ('flag' in condition) return 'flag';
  if ('all' in condition) return 'all';
  if ('any' in condition) return 'any';
  return 'not';
}

function defaultCondition(kind: ConditionKind, statIds: string[], itemIds: string[], flags: string[]): Condition {
  switch (kind) {
    case 'stat': return { stat: statIds[0]!, gte: 0 };
    case 'item': return { item: itemIds[0]!, gte: 1 };
    case 'flag': return { flag: flags[0]!, is: true };
    case 'all': return { all: [{ stat: statIds[0]!, gte: 0 }] };
    case 'any': return { any: [{ stat: statIds[0]!, gte: 0 }] };
    case 'not': return { not: { stat: statIds[0]!, gte: 0 } };
  }
}

function ConditionControl({ condition, path, statIds, itemIds, flags, onChange, onRemove }: {
  condition: Condition;
  path: string;
  statIds: string[];
  itemIds: string[];
  flags: string[];
  onChange: (condition: Condition) => void;
  onRemove: () => void;
}) {
  const kind = conditionKind(condition);
  const childProps = { statIds, itemIds, flags };
  const groupChildren = 'all' in condition ? condition.all : 'any' in condition ? condition.any : [];
  return (
    <div className="condition-control">
      <div className="condition-toolbar">
        <select aria-label={`Requirement ${path} type`} value={kind} onChange={(event) => { const nextKind = event.target.value as ConditionKind; onChange((kind === 'all' || kind === 'any') && (nextKind === 'all' || nextKind === 'any') ? (nextKind === 'all' ? { all: groupChildren } : { any: groupChildren }) : defaultCondition(nextKind, statIds, itemIds, flags)); }}>
          <option value="stat">Stat</option><option value="item" disabled={itemIds.length === 0}>Item</option><option value="flag" disabled={flags.length === 0}>Flag</option><option value="all">All of</option><option value="any">Any of</option><option value="not">Not</option>
        </select>
        <button type="button" aria-label={`Remove requirement ${path}`} onClick={onRemove}>Remove</button>
      </div>
      {'stat' in condition || 'item' in condition ? (
        <div className="condition-fields">
          <select aria-label={`Requirement ${path} target`} value={'stat' in condition ? condition.stat : condition.item} onChange={(event) => onChange('stat' in condition ? { ...condition, stat: event.target.value } : { ...condition, item: event.target.value })}>{('stat' in condition ? statIds : itemIds).map((id) => <option key={id} value={id}>{id}</option>)}</select>
          <label>Min<input type="number" value={condition.gte ?? ''} onChange={(event) => onChange({ ...condition, gte: event.target.value === '' ? undefined : numeric(event.target.value) })} /></label>
          <label>Max<input type="number" value={condition.lte ?? ''} onChange={(event) => onChange({ ...condition, lte: event.target.value === '' ? undefined : numeric(event.target.value) })} /></label>
        </div>
      ) : 'flag' in condition ? (
        <div className="condition-fields"><select aria-label={`Requirement ${path} flag`} value={condition.flag} onChange={(event) => onChange({ ...condition, flag: event.target.value })}>{flags.map((id) => <option key={id} value={id}>{id}</option>)}</select><select aria-label={`Requirement ${path} expected value`} value={String(condition.is)} onChange={(event) => onChange({ ...condition, is: event.target.value === 'true' })}><option value="true">Is set</option><option value="false">Is clear</option></select></div>
      ) : 'not' in condition ? (
        <div className="condition-children"><ConditionControl {...childProps} path={`${path}.1`} condition={condition.not} onChange={(next) => onChange({ not: next })} onRemove={() => onChange({ stat: statIds[0]!, gte: 0 })} /></div>
      ) : (
        <div className="condition-children">
          {groupChildren.map((child, index, children) => (
            <ConditionControl key={index} {...childProps} path={`${path}.${index + 1}`} condition={child} onChange={(next) => onChange(kind === 'all' ? { all: children.map((item, at) => at === index ? next : item) } : { any: children.map((item, at) => at === index ? next : item) })} onRemove={() => onChange(kind === 'all' ? { all: children.filter((_, at) => at !== index) } : { any: children.filter((_, at) => at !== index) })} />
          ))}
          <button type="button" onClick={() => onChange(kind === 'all' ? { all: [...groupChildren, defaultCondition('stat', statIds, itemIds, flags)] } : { any: [...groupChildren, defaultCondition('stat', statIds, itemIds, flags)] })}>Add condition inside {kind === 'all' ? 'all' : 'any'}</button>
        </div>
      )}
    </div>
  );
}

export function ChoiceRulesEditor({ story, choice, onChange }: Props) {
  const statIds = Object.keys(story.stats);
  const itemIds = Object.keys(story.items ?? {});
  const flags = flagNames(story);
  const requires = choice.requires ?? [];
  const updateRequirement = (index: number, next: Condition) => onChange({ requires: requires.map((item, at) => at === index ? next : item) });
  const addRequirement = (kind: ConditionKind) => onChange({ requires: [...requires, defaultCondition(kind, statIds, itemIds, flags)] });
  const costs = choice.costs ?? {};
  const effects = choice.effects ?? {};
  const updateCost = (key: string, value?: number) => {
    const next = { ...costs };
    if (value === undefined) delete next[key]; else next[key] = value;
    onChange({ costs: next });
  };
  const renameCost = (from: string, to: string) => {
    const next = { ...costs, [to]: costs[from]! };
    delete next[from];
    onChange({ costs: next });
  };
  const updateEffect = (kind: 'stats' | 'inventory' | 'flags', key: string, value?: number | boolean) => {
    const next = { ...(effects[kind] ?? {}) } as Record<string, number | boolean>;
    if (value === undefined) delete next[key]; else next[key] = value;
    onChange({ effects: { ...effects, [kind]: next } });
  };
  const renameEffect = (kind: 'stats' | 'inventory' | 'flags', from: string, to: string) => {
    const next = { ...(effects[kind] ?? {}) } as Record<string, number | boolean>;
    next[to] = next[from]!;
    delete next[from];
    onChange({ effects: { ...effects, [kind]: next } });
  };
  return (
    <details className="choice-rule-editor">
      <summary>Requirements, costs & effects</summary>
      <div className="rule-editor-group">
        <strong>Requirements</strong>
        {requires.map((condition, index) => <ConditionControl key={index} condition={condition} path={String(index + 1)} statIds={statIds} itemIds={itemIds} flags={flags} onChange={(next) => updateRequirement(index, next)} onRemove={() => onChange({ requires: requires.filter((_, at) => at !== index) })} />)}
        <div className="rule-add-buttons"><button type="button" disabled={statIds.length === 0} onClick={() => addRequirement('stat')}>Add stat check</button><button type="button" disabled={itemIds.length === 0} onClick={() => addRequirement('item')}>Add item check</button><button type="button" disabled={flags.length === 0} onClick={() => addRequirement('flag')}>Add flag check</button><button type="button" disabled={statIds.length === 0} onClick={() => addRequirement('all')}>Add all group</button><button type="button" disabled={statIds.length === 0} onClick={() => addRequirement('any')}>Add any group</button></div>
      </div>
      <RecordRows label="Costs" values={costs} options={statIds} kind="number" onChange={(key, value) => updateCost(key, Number(value))} onRename={renameCost} onAdd={(key) => updateCost(key, 1)} onRemove={(key) => updateCost(key)} />
      <RecordRows label="Stat changes" values={effects.stats ?? {}} options={statIds} kind="number" onChange={(key, value) => updateEffect('stats', key, Number(value))} onRename={(from, to) => renameEffect('stats', from, to)} onAdd={(key) => updateEffect('stats', key, 0)} onRemove={(key) => updateEffect('stats', key)} />
      <RecordRows label="Item changes" values={effects.inventory ?? {}} options={itemIds} kind="number" onChange={(key, value) => updateEffect('inventory', key, Number(value))} onRename={(from, to) => renameEffect('inventory', from, to)} onAdd={(key) => updateEffect('inventory', key, 0)} onRemove={(key) => updateEffect('inventory', key)} />
      <RecordRows label="Flag changes" values={effects.flags ?? {}} options={flags} kind="boolean" onChange={(key, value) => updateEffect('flags', key, Boolean(value))} onRename={(from, to) => renameEffect('flags', from, to)} onAdd={(key) => updateEffect('flags', key, true)} onRemove={(key) => updateEffect('flags', key)} />
      <label className="rule-editor-hint">Locked hint<input value={choice.lockedHint ?? ''} onChange={(event) => onChange({ lockedHint: event.target.value || undefined })} /></label>
      <label className="rule-editor-check"><input type="checkbox" checked={choice.hideWhenLocked ?? false} onChange={(event) => onChange({ hideWhenLocked: event.target.checked })} />Hide choice when locked</label>
      <label className="rule-editor-check"><input type="checkbox" checked={choice.intentionalLoop ?? false} onChange={(event) => onChange({ intentionalLoop: event.target.checked })} />This edge is an intentional loop</label>
    </details>
  );
}
