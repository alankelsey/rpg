// Browser saves: one slot per story, plus endings found. A save stores the choice history, not
// the stats, so loading it replays the engine and can't produce a state the story doesn't allow.
// Storage can be missing or blocked (private windows), so every access is wrapped.

import type { RunState, Story } from './engine';

export interface SaveFile {
  saveVersion: 1;
  rulesVersion: 1;
  storyId: string;
  storyVersion: number;
  playerName: string;
  history: string[];
  revision: number;
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
  const candidate = read<unknown>(SAVE_PREFIX + storyId);
  const save = validateSaveFile(candidate);
  return save?.storyId === storyId ? save : undefined;
}

/** Returns false if the browser refused to store it. */
export function writeSave(story: Story, state: RunState): boolean {
  const save: SaveFile = {
    saveVersion: 1,
    rulesVersion: state.rulesVersion,
    storyId: state.storyId,
    storyVersion: state.storyVersion,
    playerName: state.playerName,
    history: state.history,
    revision: state.revision,
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

/** Validates stored/imported data without trusting TypeScript assertions at the JSON boundary. */
export function validateSaveFile(value: unknown): SaveFile | undefined {
  if (!isRecord(value)) return undefined;

  // Saves written before the versioned contract are migrated from their verified history.
  const saveVersion = value.saveVersion ?? 1;
  const rulesVersion = value.rulesVersion ?? 1;
  const revision = value.revision ?? (Array.isArray(value.history) ? value.history.length : undefined);
  if (saveVersion !== 1 || rulesVersion !== 1) return undefined;
  if (typeof value.storyId !== 'string' || value.storyId.length === 0) return undefined;
  if (!Number.isInteger(value.storyVersion) || (value.storyVersion as number) < 1) return undefined;
  if (typeof value.playerName !== 'string' || value.playerName.length === 0 || value.playerName.length > 40) return undefined;
  if (!Array.isArray(value.history) || !value.history.every((id) => typeof id === 'string' && id.length > 0)) return undefined;
  if (!Number.isInteger(revision) || revision !== value.history.length) return undefined;
  if (typeof value.sceneTitle !== 'string' || typeof value.ended !== 'boolean') return undefined;
  if (typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt))) return undefined;
  return {
    saveVersion: 1,
    rulesVersion: 1,
    storyId: value.storyId,
    storyVersion: value.storyVersion as number,
    playerName: value.playerName,
    history: [...value.history],
    revision,
    sceneTitle: value.sceneTitle,
    ended: value.ended,
    updatedAt: value.updatedAt,
  };
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
  const file = parseExport(text);
  let restored = 0;
  for (const save of file.saves) if (write(SAVE_PREFIX + save.storyId, save)) restored++;
  for (const [storyId, ids] of Object.entries(file.endings ?? {})) {
    if (Array.isArray(ids)) for (const id of ids) if (typeof id === 'string') recordEnding(storyId, id);
  }
  return restored;
}

export function parseExport(text: string): ExportFile {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('Save export is not valid JSON');
  }
  if (!isRecord(value) || value.format !== 'rpg-saves' || value.version !== 1 || !Array.isArray(value.saves)) {
    throw new Error('Unsupported save export');
  }
  const saves = value.saves.map(validateSaveFile);
  if (saves.some((save) => !save)) throw new Error('Save export contains an invalid save');
  if (!isRecord(value.endings)) throw new Error('Save export endings are invalid');
  const endings: Record<string, string[]> = {};
  for (const [storyId, ids] of Object.entries(value.endings)) {
    if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string' && id.length > 0)) {
      throw new Error(`Save export endings for "${storyId}" are invalid`);
    }
    endings[storyId] = [...ids];
  }
  return { format: 'rpg-saves', version: 1, saves: saves as SaveFile[], endings };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
