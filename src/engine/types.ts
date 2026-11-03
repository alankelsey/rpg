// Story format and run state. Stories are plain data so they can be validated,
// versioned, and played the same way in the browser, in tests, and by bots.

export interface StatDef {
  label: string;
  initial: number;
  /** Values are clamped to [min, max]. Omit max for unbounded stats like money. */
  min?: number;
  max?: number;
  /** Hidden stats (meta stats such as junk meals) are tracked but not shown to the player. */
  hidden?: boolean;
  /** Display format. `money` shows as $1,500. */
  format?: 'money';
}

export interface ItemDef {
  label: string;
  initial?: number;
  max?: number;
}

export type ValueCondition =
  | { stat: string; gte?: number; lte?: number }
  | { item: string; gte?: number; lte?: number };

/** A deterministic, declarative check. */
export type Condition =
  | ValueCondition
  | { flag: string; is: boolean }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export interface Effects {
  /** Added to the current value, then clamped. */
  stats?: Record<string, number>;
  flags?: Record<string, boolean>;
  /** Added to the current quantity. Item quantities are non-negative integers. */
  inventory?: Record<string, number>;
}

export interface Choice {
  /** Unique within its scene. */
  id: string;
  label: string;
  to: string;
  requires?: Condition[];
  effects?: Effects;
  /**
   * Locked choices are shown disabled by default, so players see paths to try on a replay.
   * Set this to hide the choice instead (for secrets).
   */
  hideWhenLocked?: boolean;
  /** Explains locked flag or hidden-stat conditions. Visible stat conditions get generated "Needs ..." text. */
  lockedHint?: string;
}

export interface Ending {
  id: string;
  title: string;
  tone: 'good' | 'neutral' | 'bad';
}

export interface Scene {
  title?: string;
  /** Plain text. `{name}` is replaced with the player's name. Rendered as text, never HTML. */
  text: string;
  choices?: Choice[];
  ending?: Ending;
}

export interface Story {
  schemaVersion: 1;
  rulesVersion: 1;
  id: string;
  version: number;
  title: string;
  summary: string;
  start: string;
  stats: Record<string, StatDef>;
  items?: Record<string, ItemDef>;
  /** Flags start false unless listed here. */
  flags?: Record<string, boolean>;
  scenes: Record<string, Scene>;
}

export interface RunState {
  schemaVersion: 1;
  rulesVersion: 1;
  storyId: string;
  storyVersion: number;
  playerName: string;
  sceneId: string;
  stats: Record<string, number>;
  flags: Record<string, boolean>;
  inventory: Record<string, number>;
  /** Increases exactly once for every accepted choice. */
  revision: number;
  /** Accepted choice ids, in order. Replaying them from the start reproduces this state. */
  history: string[];
  ended: boolean;
}

export type TransitionEvent =
  | { type: 'stat'; stat: string; before: number; after: number; delta: number }
  | { type: 'flag'; flag: string; before: boolean; after: boolean }
  | { type: 'inventory'; item: string; before: number; after: number; delta: number }
  | { type: 'scene'; from: string; to: string }
  | { type: 'ending'; endingId: string };

export interface TransitionResult {
  state: RunState;
  events: TransitionEvent[];
}

export interface ChoiceView {
  choice: Choice;
  available: boolean;
  /** The conditions that failed, for "you need ..." hints. */
  failed: Condition[];
}
