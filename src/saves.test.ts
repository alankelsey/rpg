import { describe, expect, it } from 'vitest';
import { parseExport, validateSaveFile } from './saves';
import { ENGINE_LIMITS } from './engine';

const save = {
  saveVersion: 1,
  rulesVersion: 1,
  storyId: 'new-town',
  storyVersion: 1,
  playerName: 'Mara',
  history: ['store', 'mnms'],
  revision: 2,
  sceneTitle: 'The Counter',
  ended: false,
  updatedAt: '2026-11-02T12:00:00.000Z',
};

describe('validateSaveFile', () => {
  it('accepts a versioned save whose revision matches its history', () => {
    expect(validateSaveFile(save)).toEqual(save);
  });

  it('migrates the previous unversioned save shape', () => {
    const { saveVersion: _saveVersion, rulesVersion: _rulesVersion, revision: _revision, ...legacy } = save;
    expect(validateSaveFile(legacy)).toEqual(save);
  });

  it('rejects malformed, incompatible, and internally inconsistent saves', () => {
    expect(validateSaveFile({ ...save, rulesVersion: 2 })).toBeUndefined();
    expect(validateSaveFile({ ...save, revision: 1 })).toBeUndefined();
    expect(validateSaveFile({ ...save, history: ['store', 7] })).toBeUndefined();
    expect(validateSaveFile({ ...save, updatedAt: 'not-a-date' })).toBeUndefined();
    expect(validateSaveFile({
      ...save,
      history: Array.from({ length: ENGINE_LIMITS.maxHistoryLength + 1 }, () => 'loop'),
      revision: ENGINE_LIMITS.maxHistoryLength + 1,
    })).toBeUndefined();
  });
});

describe('parseExport', () => {
  it('validates a complete export', () => {
    const parsed = parseExport(JSON.stringify({
      format: 'rpg-saves',
      version: 1,
      saves: [save],
      endings: { 'new-town': ['keys'] },
    }));
    expect(parsed.saves).toEqual([save]);
    expect(parsed.endings).toEqual({ 'new-town': ['keys'] });
  });

  it('rejects invalid JSON, saves, endings, and export versions', () => {
    expect(() => parseExport('{')).toThrow(/valid JSON/);
    expect(() => parseExport(JSON.stringify({ format: 'rpg-saves', version: 2, saves: [], endings: {} }))).toThrow(/Unsupported/);
    expect(() => parseExport(JSON.stringify({ format: 'rpg-saves', version: 1, saves: [{ ...save, revision: 99 }], endings: {} }))).toThrow(/invalid save/);
    expect(() => parseExport(JSON.stringify({ format: 'rpg-saves', version: 1, saves: [], endings: { x: [3] } }))).toThrow(/endings/);
  });
});
