import type { Choice, ChoiceView, Condition, RunState, Scene, StatDef, Story, TransitionEvent, TransitionResult } from './types';

export const RUN_SCHEMA_VERSION = 1 as const;
export const RULES_VERSION = 1 as const;

export class IllegalChoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IllegalChoiceError';
  }
}

export function startRun(story: Story, playerName: string): RunState {
  assertSupportedStory(story);
  const stats: Record<string, number> = {};
  for (const [key, def] of Object.entries(story.stats)) stats[key] = clamp(def.initial, def);
  const inventory: Record<string, number> = {};
  for (const [key, def] of Object.entries(story.items ?? {})) inventory[key] = clampItem(def.initial ?? 0, def.max);
  return {
    schemaVersion: RUN_SCHEMA_VERSION,
    rulesVersion: RULES_VERSION,
    storyId: story.id,
    storyVersion: story.version,
    playerName: playerName.trim(),
    sceneId: story.start,
    stats,
    flags: { ...story.flags },
    inventory,
    revision: 0,
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
  if ('all' in condition) return condition.all.every((child) => checkCondition(child, state));
  if ('any' in condition) return condition.any.some((child) => checkCondition(child, state));
  if ('not' in condition) return !checkCondition(condition.not, state);
  const value = 'stat' in condition ? (state.stats[condition.stat] ?? 0) : (state.inventory[condition.item] ?? 0);
  if (condition.gte !== undefined && value < condition.gte) return false;
  if (condition.lte !== undefined && value > condition.lte) return false;
  return true;
}

/** Choices to show in the current scene, with locked ones marked (or omitted if hideWhenLocked). */
export function choiceViews(story: Story, state: RunState): ChoiceView[] {
  if (state.ended) return [];
  const views: ChoiceView[] = [];
  for (const choice of getScene(story, state.sceneId).choices ?? []) {
    const costConditions: Condition[] = Object.entries(choice.costs ?? {}).map(([stat, amount]) => ({ stat, gte: amount }));
    const failed = [...(choice.requires ?? []), ...costConditions].filter((c) => !checkCondition(c, state));
    if (failed.length > 0 && choice.hideWhenLocked) continue;
    views.push({ choice, available: failed.length === 0, failed });
  }
  return views;
}

/**
 * The only way gameplay state changes. Returns a new state; the input is not modified.
 * Throws IllegalChoiceError for a choice that isn't offered or is locked.
 */
export function transition(story: Story, state: RunState, choiceId: string): TransitionResult {
  assertSupportedStory(story);
  if (state.schemaVersion !== RUN_SCHEMA_VERSION || state.rulesVersion !== story.rulesVersion) {
    throw new IllegalChoiceError(
      `Run uses state/rules v${state.schemaVersion}/${state.rulesVersion}, expected ${RUN_SCHEMA_VERSION}/${story.rulesVersion}`,
    );
  }
  if (state.storyId !== story.id || state.storyVersion !== story.version) {
    throw new IllegalChoiceError(
      `Run is for ${state.storyId} v${state.storyVersion}, not ${story.id} v${story.version}`,
    );
  }
  if (state.ended) throw new IllegalChoiceError('The story has ended');
  const view = choiceViews(story, state).find((v) => v.choice.id === choiceId);
  if (!view) throw new IllegalChoiceError(`"${choiceId}" is not a choice in scene "${state.sceneId}"`);
  if (!view.available) throw new IllegalChoiceError(`"${choiceId}" is locked`);

  const { state: withCosts, events: costEvents } = applyCosts(story, state, view.choice);
  const { state: withEffects, events } = applyEffects(story, withCosts, view.choice);
  const destination = getScene(story, view.choice.to);
  const next: RunState = {
    ...withEffects,
    sceneId: view.choice.to,
    history: [...state.history, choiceId],
    revision: state.revision + 1,
    ended: Boolean(destination.ending),
  };
  const resultEvents: TransitionEvent[] = [...costEvents, ...events, { type: 'scene', from: state.sceneId, to: next.sceneId }];
  if (destination.ending) resultEvents.push({ type: 'ending', endingId: destination.ending.id });
  return { state: next, events: resultEvents };
}

/** Compatibility wrapper for callers that only need the next state. */
export function applyChoice(story: Story, state: RunState, choiceId: string): RunState {
  return transition(story, state, choiceId).state;
}

/** Rebuild a run from its choice history. Used for save verification and bots. */
export function replay(story: Story, playerName: string, history: readonly string[]): RunState {
  return simulateRoute(story, playerName, history).final;
}

export interface RouteStep {
  choiceId: string;
  fromSceneId: string;
  result: TransitionResult;
}

export interface RouteSimulation {
  initial: RunState;
  steps: RouteStep[];
  final: RunState;
}

/** Replays a route and keeps every canonical transition for maps, previews, tests, and bots. */
export function simulateRoute(story: Story, playerName: string, history: readonly string[]): RouteSimulation {
  const initial = startRun(story, playerName);
  const steps: RouteStep[] = [];
  let state = initial;
  for (const choiceId of history) {
    const fromSceneId = state.sceneId;
    const result = transition(story, state, choiceId);
    steps.push({ choiceId, fromSceneId, result });
    state = result.state;
  }
  return { initial, steps, final: state };
}

export function formatStat(story: Story, stat: string, value: number): string {
  return story.stats[stat]?.format === 'money' ? `$${value.toLocaleString('en-US')}` : String(value);
}

/**
 * Why a locked choice is locked, for the player. Visible stats get an exact "you have" line;
 * flags and hidden stats use the choice's lockedHint, since the player can't see them.
 */
export function lockedReason(story: Story, view: ChoiceView, state: RunState): string {
  const parts: string[] = [];
  let needsHint = false;
  for (const c of view.failed) {
    if (!('stat' in c) || story.stats[c.stat]?.hidden) {
      needsHint = true;
      continue;
    }
    const label = story.stats[c.stat]?.label ?? c.stat;
    const have = formatStat(story, c.stat, state.stats[c.stat] ?? 0);
    if (c.gte !== undefined && (state.stats[c.stat] ?? 0) < c.gte) {
      parts.push(`Needs ${label} ${formatStat(story, c.stat, c.gte)}+ (you have ${have})`);
    } else if (c.lte !== undefined) {
      parts.push(`Needs ${label} ${formatStat(story, c.stat, c.lte)} or less (you have ${have})`);
    }
  }
  if (needsHint) parts.push(view.choice.lockedHint ?? 'Something has to happen first');
  return parts.join('. ');
}

export interface LockedSighting {
  sceneId: string;
  choiceId: string;
  label: string;
  reason: string;
}

/** Locked choices the player saw during a run, for the "paths you couldn't take" list at the end. */
export function lockedChoicesSeen(story: Story, playerName: string, history: readonly string[]): LockedSighting[] {
  const seen = new Map<string, LockedSighting>();
  let state = startRun(story, playerName);
  const record = () => {
    for (const view of choiceViews(story, state)) {
      const key = `${state.sceneId}/${view.choice.id}`;
      if (!view.available && !seen.has(key)) {
        seen.set(key, {
          sceneId: state.sceneId,
          choiceId: view.choice.id,
          label: view.choice.label,
          reason: lockedReason(story, view, state),
        });
      }
    }
  };
  record();
  for (const choiceId of history) {
    state = applyChoice(story, state, choiceId);
    record();
  }
  return [...seen.values()];
}

export function endingsOf(story: Story): { sceneId: string; ending: NonNullable<Scene['ending']> }[] {
  return Object.entries(story.scenes).flatMap(([sceneId, scene]) => (scene.ending ? [{ sceneId, ending: scene.ending }] : []));
}

export interface ExploreReport {
  /** Ending id -> one choice history that reaches it. */
  endings: Map<string, string[]>;
  /** States with no available choice that aren't endings. */
  stuck: { sceneId: string; history: string[] }[];
  /** `sceneId/choiceId` for choices that were never available in any explored state. */
  neverAvailable: string[];
  /** Transitions that return to a gameplay state already explored. */
  cycles: { sceneId: string; choiceId: string; history: string[] }[];
  statesVisited: number;
  /** True when maxStates was hit before every state was explored. */
  truncated: boolean;
}

/** Plays every reachable path (bounded) to check that endings are reachable with real stats. */
export function explore(story: Story, maxStates = 20000): ExploreReport {
  const endings = new Map<string, string[]>();
  const stuck: ExploreReport['stuck'] = [];
  const everAvailable = new Set<string>();
  const visited = new Set<string>();
  const cycles: ExploreReport['cycles'] = [];
  const cycleKeys = new Set<string>();
  const stack = [startRun(story, 'Explorer')];
  let truncated = false;

  while (stack.length > 0) {
    const state = stack.pop()!;
    const key = explorationKey(state);
    if (visited.has(key)) continue;
    if (visited.size >= maxStates) {
      truncated = true;
      break;
    }
    visited.add(key);

    const ending = getScene(story, state.sceneId).ending;
    if (ending) {
      if (!endings.has(ending.id)) endings.set(ending.id, state.history);
      continue;
    }
    const open = choiceViews(story, state).filter((v) => v.available);
    if (open.length === 0) stuck.push({ sceneId: state.sceneId, history: state.history });
    for (const view of open) {
      everAvailable.add(`${state.sceneId}/${view.choice.id}`);
      const next = applyChoice(story, state, view.choice.id);
      const nextKey = explorationKey(next);
      if (visited.has(nextKey)) {
        const cycleKey = `${state.sceneId}/${view.choice.id}/${nextKey}`;
        if (!cycleKeys.has(cycleKey)) {
          cycleKeys.add(cycleKey);
          cycles.push({ sceneId: state.sceneId, choiceId: view.choice.id, history: next.history });
        }
      } else {
        stack.push(next);
      }
    }
  }

  const neverAvailable = Object.entries(story.scenes).flatMap(([sceneId, scene]) =>
    (scene.choices ?? []).map((c) => `${sceneId}/${c.id}`).filter((id) => !everAvailable.has(id)),
  );
  return { endings, stuck, neverAvailable, cycles, statesVisited: visited.size, truncated };
}

function explorationKey(state: RunState): string {
  return JSON.stringify([state.sceneId, state.stats, state.flags, state.inventory]);
}

function applyEffects(story: Story, state: RunState, choice: Choice): { state: RunState; events: TransitionEvent[] } {
  const stats = { ...state.stats };
  const events: TransitionEvent[] = [];
  for (const [key, delta] of Object.entries(choice.effects?.stats ?? {})) {
    const def = story.stats[key];
    if (!def) throw new Error(`Choice "${choice.id}" changes unknown stat "${key}"`);
    const before = stats[key] ?? 0;
    const after = clamp(before + delta, def);
    stats[key] = after;
    if (after !== before) events.push({ type: 'stat', stat: key, before, after, delta: after - before });
  }
  const flags = { ...state.flags };
  for (const [flag, after] of Object.entries(choice.effects?.flags ?? {})) {
    const before = flags[flag] ?? false;
    flags[flag] = after;
    if (after !== before) events.push({ type: 'flag', flag, before, after });
  }
  const inventory = { ...state.inventory };
  for (const [item, delta] of Object.entries(choice.effects?.inventory ?? {})) {
    const def = story.items?.[item];
    if (!def) throw new Error(`Choice "${choice.id}" changes unknown item "${item}"`);
    const before = inventory[item] ?? 0;
    const after = clampItem(before + delta, def.max);
    if (before + delta < 0) throw new IllegalChoiceError(`Choice "${choice.id}" would make item "${item}" negative`);
    inventory[item] = after;
    if (after !== before) events.push({ type: 'inventory', item, before, after, delta: after - before });
  }
  return { state: { ...state, stats, flags, inventory }, events };
}

function applyCosts(story: Story, state: RunState, choice: Choice): { state: RunState; events: TransitionEvent[] } {
  const stats = { ...state.stats };
  const events: TransitionEvent[] = [];
  for (const [stat, amount] of Object.entries(choice.costs ?? {})) {
    const def = story.stats[stat];
    if (!def) throw new Error(`Choice "${choice.id}" spends unknown stat "${stat}"`);
    const before = stats[stat] ?? 0;
    if (before < amount) throw new IllegalChoiceError(`"${choice.id}" cannot spend ${amount} ${stat}; only ${before} available`);
    const after = before - amount;
    stats[stat] = after;
    events.push({ type: 'stat', stat, before, after, delta: -amount });
  }
  return { state: { ...state, stats }, events };
}

function clamp(value: number, def: StatDef): number {
  return Math.min(def.max ?? Infinity, Math.max(def.min ?? -Infinity, value));
}

function clampItem(value: number, max?: number): number {
  return Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.max(0, Math.trunc(value)));
}

function assertSupportedStory(story: Story) {
  if (story.schemaVersion !== 1 || story.rulesVersion !== RULES_VERSION) {
    throw new Error(`Unsupported story schema/rules ${story.schemaVersion}/${story.rulesVersion}`);
  }
}
