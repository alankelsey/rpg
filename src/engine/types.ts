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
}

/** A deterministic check. All listed comparisons must hold. */
export type Condition =
  | { stat: string; gte?: number; lte?: number }
  | { flag: string; is: boolean };

export interface Effects {
  /** Added to the current value, then clamped. */
  stats?: Record<string, number>;
  flags?: Record<string, boolean>;
}

export interface Choice {
  /** Unique within its scene. */
  id: string;
  label: string;
  to: string;
  requires?: Condition[];
  effects?: Effects;
  /** When locked, hide the choice instead of showing it disabled. */
  hideWhenLocked?: boolean;
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
  id: string;
  version: number;
  title: string;
  summary: string;
  start: string;
  stats: Record<string, StatDef>;
  /** Flags start false unless listed here. */
  flags?: Record<string, boolean>;
  scenes: Record<string, Scene>;
}

export interface RunState {
  storyId: string;
  storyVersion: number;
  playerName: string;
  sceneId: string;
  stats: Record<string, number>;
  flags: Record<string, boolean>;
  /** Accepted choice ids, in order. Replaying them from the start reproduces this state. */
  history: string[];
  ended: boolean;
}

export interface ChoiceView {
  choice: Choice;
  available: boolean;
  /** The conditions that failed, for "you need ..." hints. */
  failed: Condition[];
}
