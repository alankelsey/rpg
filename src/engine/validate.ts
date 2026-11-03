import type { Condition, Story } from './types';

export interface Issue {
  level: 'error' | 'warning';
  /** Where the problem is, e.g. `scenes.hotel.choices.hostel`. */
  at: string;
  message: string;
}

/**
 * Checks a story's structure before it is published or played. Errors mean the story
 * can break during play; warnings are content that is probably a mistake.
 * This checks graph shape only; it does not prove every ending is reachable with real stats.
 */
export function validateStory(story: Story): Issue[] {
  const issues: Issue[] = [];
  const error = (at: string, message: string) => issues.push({ level: 'error', at, message });
  const warn = (at: string, message: string) => issues.push({ level: 'warning', at, message });

  const sceneIds = new Set(Object.keys(story.scenes));
  const flagIds = new Set(Object.keys(story.flags ?? {}));
  const setFlags = new Set<string>();
  const readFlags: { flag: string; at: string }[] = [];

  if (story.schemaVersion !== 1) error('schemaVersion', 'Only story schema version 1 is supported');
  if (story.rulesVersion !== 1) error('rulesVersion', 'Only rules version 1 is supported');
  if (!Number.isInteger(story.version) || story.version < 1) error('version', 'Version must be a positive integer');
  if (!sceneIds.has(story.start)) error('start', `Start scene "${story.start}" does not exist`);

  for (const [key, def] of Object.entries(story.stats)) {
    if (!Number.isFinite(def.initial)) error(`stats.${key}.initial`, 'Initial value must be finite');
    if (def.min !== undefined && def.max !== undefined && def.min > def.max) {
      error(`stats.${key}`, 'min is greater than max');
    }
  }

  for (const [key, def] of Object.entries(story.items ?? {})) {
    if (!Number.isInteger(def.initial ?? 0) || (def.initial ?? 0) < 0) {
      error(`items.${key}.initial`, 'Initial quantity must be a non-negative integer');
    }
    if (def.max !== undefined && (!Number.isInteger(def.max) || def.max < 0 || def.max < (def.initial ?? 0))) {
      error(`items.${key}.max`, 'Maximum quantity must be an integer at least as large as the initial quantity');
    }
  }

  const checkCondition = (c: Condition, at: string) => {
    if ('flag' in c) {
      readFlags.push({ flag: c.flag, at });
      return;
    }
    if ('all' in c || 'any' in c) {
      const children = 'all' in c ? c.all : c.any;
      if (children.length === 0) error(at, 'Condition group cannot be empty');
      children.forEach((child, i) => checkCondition(child, `${at}.${'all' in c ? 'all' : 'any'}[${i}]`));
      return;
    }
    if ('not' in c) {
      checkCondition(c.not, `${at}.not`);
      return;
    }
    const key = 'stat' in c ? c.stat : c.item;
    const kind = 'stat' in c ? 'stat' : 'item';
    const definitions = kind === 'stat' ? story.stats : (story.items ?? {});
    if (!(key in definitions)) error(at, `Requires unknown ${kind} "${key}"`);
    if (c.gte === undefined && c.lte === undefined) error(at, `Condition on "${key}" has no gte or lte`);
    if (c.gte !== undefined && !Number.isFinite(c.gte)) error(at, 'gte must be finite');
    if (c.lte !== undefined && !Number.isFinite(c.lte)) error(at, 'lte must be finite');
    if (c.gte !== undefined && c.lte !== undefined && c.gte > c.lte) error(at, 'gte cannot be greater than lte');
  };

  for (const [sceneId, scene] of Object.entries(story.scenes)) {
    const at = `scenes.${sceneId}`;
    const choices = scene.choices ?? [];
    if (scene.ending && choices.length > 0) error(at, 'An ending scene cannot have choices');
    if (!scene.ending && choices.length === 0) error(at, 'Dead end: no choices and not marked as an ending');

    const seen = new Set<string>();
    for (const choice of choices) {
      const cAt = `${at}.choices.${choice.id}`;
      if (seen.has(choice.id)) error(cAt, `Duplicate choice id "${choice.id}"`);
      seen.add(choice.id);
      if (!sceneIds.has(choice.to)) error(cAt, `Leads to missing scene "${choice.to}"`);
      choice.requires?.forEach((c, i) => checkCondition(c, `${cAt}.requires[${i}]`));
      for (const [key, amount] of Object.entries(choice.costs ?? {})) {
        if (!(key in story.stats)) error(cAt, `Spends unknown stat "${key}"`);
        if (!Number.isFinite(amount) || amount <= 0) error(cAt, `Cost for "${key}" must be a positive finite number`);
      }
      for (const key of Object.keys(choice.effects?.stats ?? {})) {
        if (!(key in story.stats)) error(cAt, `Changes unknown stat "${key}"`);
      }
      for (const [key, delta] of Object.entries(choice.effects?.stats ?? {})) {
        if (!Number.isFinite(delta)) error(cAt, `Stat change for "${key}" must be finite`);
        if (delta < 0 && story.stats[key]?.format === 'money') {
          warn(cAt, `Negative money effect for "${key}" does not check affordability; use costs for a purchase`);
        }
      }
      for (const [key, delta] of Object.entries(choice.effects?.inventory ?? {})) {
        if (!(key in (story.items ?? {}))) error(cAt, `Changes unknown item "${key}"`);
        if (!Number.isInteger(delta)) error(cAt, `Item change for "${key}" must be an integer`);
      }
      for (const flag of Object.keys(choice.effects?.flags ?? {})) setFlags.add(flag);
      const vague = choice.requires?.some((c) => conditionNeedsHint(story, c));
      if (vague && !choice.hideWhenLocked && !choice.lockedHint) {
        warn(cAt, 'Shown when locked but depends on a flag or hidden stat; add a lockedHint');
      }
    }
    if (choices.length > 0 && choices.every((c) => c.requires?.length && c.hideWhenLocked)) {
      warn(at, 'Every choice can be hidden; the player may see no way forward');
    }
  }

  for (const { flag, at } of readFlags) {
    if (!flagIds.has(flag) && !setFlags.has(flag)) warn(at, `Flag "${flag}" is never set by any choice`);
  }

  if (sceneIds.has(story.start)) {
    const reachable = reachableScenes(story);
    for (const id of sceneIds) if (!reachable.has(id)) warn(`scenes.${id}`, 'Unreachable from the start scene');
    if (![...reachable].some((id) => story.scenes[id]?.ending)) error('scenes', 'No ending is reachable');
  }

  return issues;
}

function conditionNeedsHint(story: Story, condition: Condition): boolean {
  if ('stat' in condition) return Boolean(story.stats[condition.stat]?.hidden);
  if ('item' in condition || 'flag' in condition || 'not' in condition) return true;
  return ('all' in condition ? condition.all : condition.any).some((child) => conditionNeedsHint(story, child));
}

/** Scenes reachable by following choices from the start, ignoring requirements. */
export function reachableScenes(story: Story): Set<string> {
  const seen = new Set<string>();
  const queue = [story.start];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id) || !story.scenes[id]) continue;
    seen.add(id);
    for (const choice of story.scenes[id].choices ?? []) queue.push(choice.to);
  }
  return seen;
}
