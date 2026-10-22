import { describe, expect, it } from 'vitest';
import { catalog } from './catalog';
import { endingsOf, explore, validateStory } from '../engine';

describe.each(catalog)('story $id', (entry) => {
  it('matches its catalog entry', async () => {
    const story = await entry.load();
    expect({ id: story.id, title: story.title, summary: story.summary }).toEqual({
      id: entry.id,
      title: entry.title,
      summary: entry.summary,
    });
  });

  it('passes validation with no errors or warnings', async () => {
    expect(validateStory(await entry.load())).toEqual([]);
  });

  it('reaches every ending, never gets stuck, and can use every choice', async () => {
    const story = await entry.load();
    const report = explore(story);
    expect(report.truncated).toBe(false);
    expect(report.stuck).toEqual([]);
    expect(report.neverAvailable).toEqual([]);
    expect([...report.endings.keys()].sort()).toEqual(endingsOf(story).map((e) => e.ending.id).sort());
  });
});
