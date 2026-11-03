import { describe, expect, it } from 'vitest';
import type { Story } from '../engine';
import newTown from '../stories/new-town.json';
import { layoutStory } from './layout';

const story = newTown as unknown as Story;

describe('story map layout', () => {
  it('maps every New Town passage and choice from the story source', () => {
    const map = layoutStory(story);
    const expectedChoices = Object.values(story.scenes).reduce((total, scene) => total + (scene.choices?.length ?? 0), 0);
    expect(map.nodes).toHaveLength(Object.keys(story.scenes).length);
    expect(map.edges).toHaveLength(expectedChoices);
    expect(new Set(map.nodes.map((node) => `${node.x}/${node.y}`)).size).toBe(map.nodes.length);
    expect(map.nodes.every((node) => node.reachable)).toBe(true);
  });

  it('places the start first and all four endings after it', () => {
    const map = layoutStory(story);
    const start = map.nodes.find((node) => node.id === story.start)!;
    const endings = map.nodes.filter((node) => node.scene.ending);
    expect(start.depth).toBe(0);
    expect(endings.map((node) => node.scene.ending?.id).sort()).toEqual(['bakery', 'bus', 'keys', 'weekly']);
    expect(endings.every((node) => node.depth > start.depth)).toBe(true);
  });

  it('keeps reconverging branches connected to the same passage node', () => {
    const map = layoutStory(story);
    expect(map.edges.filter((edge) => edge.target === 'hotelFront').map((edge) => edge.source).sort()).toEqual([
      'curb',
      'curbEvening',
      'officeLate',
    ]);
    expect(map.nodes.filter((node) => node.id === 'hotelFront')).toHaveLength(1);
  });
});
