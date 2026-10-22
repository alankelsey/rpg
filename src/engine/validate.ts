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

  if (!Number.isInteger(story.version) || story.version < 1) error('version', 'Version must be a positive integer');
  if (!sceneIds.has(story.start)) error('start', `Start scene "${story.start}" does not exist`);

  for (const [key, def] of Object.entries(story.stats)) {
    if (def.min !== undefined && def.max !== undefined && def.min > def.max) {
      error(`stats.${key}`, 'min is greater than max');
    }
  }

  const checkCondition = (c: Condition, at: string) => {
    if ('flag' in c) readFlags.push({ flag: c.flag, at });
    else if (!(c.stat in story.stats)) error(at, `Requires unknown stat "${c.stat}"`);
    else if (c.gte === undefined && c.lte === undefined) error(at, `Condition on "${c.stat}" has no gte or lte`);
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
      for (const key of Object.keys(choice.effects?.stats ?? {})) {
        if (!(key in story.stats)) error(cAt, `Changes unknown stat "${key}"`);
      }
      for (const flag of Object.keys(choice.effects?.flags ?? {})) setFlags.add(flag);
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
