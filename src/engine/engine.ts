import type { Choice, ChoiceView, Condition, RunState, Scene, StatDef, Story } from './types';

export class IllegalChoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IllegalChoiceError';
  }
}

export function startRun(story: Story, playerName: string): RunState {
  const stats: Record<string, number> = {};
  for (const [key, def] of Object.entries(story.stats)) stats[key] = clamp(def.initial, def);
  return {
    storyId: story.id,
    storyVersion: story.version,
    playerName: playerName.trim(),
    sceneId: story.start,
    stats,
    flags: { ...story.flags },
    history: [],
    ended: Boolean(getScene(story, story.start).ending),
  };
}

export function getScene(story: Story, sceneId: string): Scene {
  const scene = story.scenes[sceneId];
  if (!scene) throw new Error(`Story ${story.id} has no scene "${sceneId}"`);
  return scene;
}

/** Scene text with `{name}` filled in. The result is plain text; render it as text. */
export function sceneText(story: Story, state: RunState): string {
  return getScene(story, state.sceneId).text.replaceAll('{name}', state.playerName);
}

export function checkCondition(condition: Condition, state: RunState): boolean {
  if ('flag' in condition) return (state.flags[condition.flag] ?? false) === condition.is;
  const value = state.stats[condition.stat] ?? 0;
  if (condition.gte !== undefined && value < condition.gte) return false;
  if (condition.lte !== undefined && value > condition.lte) return false;
  return true;
}

/** Choices to show in the current scene, with locked ones marked (or omitted if hideWhenLocked). */
export function choiceViews(story: Story, state: RunState): ChoiceView[] {
  if (state.ended) return [];
  const views: ChoiceView[] = [];
  for (const choice of getScene(story, state.sceneId).choices ?? []) {
    const failed = (choice.requires ?? []).filter((c) => !checkCondition(c, state));
    if (failed.length > 0 && choice.hideWhenLocked) continue;
    views.push({ choice, available: failed.length === 0, failed });
  }
  return views;
}

/**
 * The only way gameplay state changes. Returns a new state; the input is not modified.
 * Throws IllegalChoiceError for a choice that isn't offered or is locked.
 */
export function applyChoice(story: Story, state: RunState, choiceId: string): RunState {
  if (state.storyId !== story.id || state.storyVersion !== story.version) {
    throw new IllegalChoiceError(
      `Run is for ${state.storyId} v${state.storyVersion}, not ${story.id} v${story.version}`,
    );
  }
  if (state.ended) throw new IllegalChoiceError('The story has ended');
  const view = choiceViews(story, state).find((v) => v.choice.id === choiceId);
  if (!view) throw new IllegalChoiceError(`"${choiceId}" is not a choice in scene "${state.sceneId}"`);
  if (!view.available) throw new IllegalChoiceError(`"${choiceId}" is locked`);

  const next = applyEffects(story, state, view.choice);
  return {
    ...next,
    sceneId: view.choice.to,
    history: [...state.history, choiceId],
    ended: Boolean(getScene(story, view.choice.to).ending),
  };
}

/** Rebuild a run from its choice history. Used for save verification and bots. */
export function replay(story: Story, playerName: string, history: readonly string[]): RunState {
  return history.reduce((state, choiceId) => applyChoice(story, state, choiceId), startRun(story, playerName));
}

function applyEffects(story: Story, state: RunState, choice: Choice): RunState {
  const stats = { ...state.stats };
  for (const [key, delta] of Object.entries(choice.effects?.stats ?? {})) {
    const def = story.stats[key];
    if (!def) throw new Error(`Choice "${choice.id}" changes unknown stat "${key}"`);
    stats[key] = clamp((stats[key] ?? 0) + delta, def);
  }
  return { ...state, stats, flags: { ...state.flags, ...choice.effects?.flags } };
}

function clamp(value: number, def: StatDef): number {
  return Math.min(def.max ?? Infinity, Math.max(def.min ?? -Infinity, value));
}
