// Browser saves: one slot per story, plus endings found. A save stores the choice history, not
// the stats, so loading it replays the engine and can't produce a state the story doesn't allow.
// Storage can be missing or blocked (private windows), so every access is wrapped.

import type { RunState, Story } from './engine';

export interface SaveFile {
  storyId: string;
  storyVersion: number;
  playerName: string;
  history: string[];
  /** For the picker, so it doesn't have to load the story. */
  sceneTitle: string;
  ended: boolean;
  updatedAt: string;
}

const SAVE_PREFIX = 'rpg.save.';
const ENDINGS_PREFIX = 'rpg.endings.';
const LAST_PLAYED = 'rpg.lastPlayed';
const LAST_NAME = 'rpg.lastName';

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to remove if storage is unavailable.
  }
}

export function loadSave(storyId: string): SaveFile | undefined {
  return read<SaveFile>(SAVE_PREFIX + storyId);
}

/** Returns false if the browser refused to store it. */
export function writeSave(story: Story, state: RunState): boolean {
  const save: SaveFile = {
    storyId: state.storyId,
    storyVersion: state.storyVersion,
    playerName: state.playerName,
    history: state.history,
    sceneTitle: story.scenes[state.sceneId]?.title ?? '',
    ended: state.ended,
    updatedAt: new Date().toISOString(),
  };
  write(LAST_NAME, state.playerName);
  if (!state.ended) write(LAST_PLAYED, state.storyId);
  return write(SAVE_PREFIX + state.storyId, save);
}

export function deleteSave(storyId: string) {
  remove(SAVE_PREFIX + storyId);
  if (read<string>(LAST_PLAYED) === storyId) remove(LAST_PLAYED);
}

/** The story to offer under "Continue", if its run is still in progress. */
export function lastPlayed(): SaveFile | undefined {
  const id = read<string>(LAST_PLAYED);
  const save = id ? loadSave(id) : undefined;
  return save && !save.ended ? save : undefined;
}

export function lastName(): string {
  return read<string>(LAST_NAME) ?? '';
}

export function endingsFound(storyId: string): string[] {
  return read<string[]>(ENDINGS_PREFIX + storyId) ?? [];
}

export function recordEnding(storyId: string, endingId: string) {
  const found = endingsFound(storyId);
  if (!found.includes(endingId)) write(ENDINGS_PREFIX + storyId, [...found, endingId]);
}

interface ExportFile {
  format: 'rpg-saves';
  version: 1;
  saves: SaveFile[];
  endings: Record<string, string[]>;
}

export function exportAll(storyIds: string[]): string {
  const file: ExportFile = {
    format: 'rpg-saves',
    version: 1,
    saves: storyIds.flatMap((id) => loadSave(id) ?? []),
    endings: Object.fromEntries(storyIds.map((id) => [id, endingsFound(id)])),
  };
  return JSON.stringify(file, null, 2);
}

/** Restores saves from an export. Returns how many saves were restored. Throws on a file that isn't an export. */
export function importAll(text: string): number {
  const file = JSON.parse(text) as Partial<ExportFile>;
  if (file.format !== 'rpg-saves' || !Array.isArray(file.saves)) throw new Error('Not a saves file');
  let restored = 0;
  for (const save of file.saves) {
    if (typeof save?.storyId === 'string' && Array.isArray(save.history) && write(SAVE_PREFIX + save.storyId, save)) {
      restored++;
    }
  }
  for (const [storyId, ids] of Object.entries(file.endings ?? {})) {
    if (Array.isArray(ids)) for (const id of ids) if (typeof id === 'string') recordEnding(storyId, id);
  }
  return restored;
}
