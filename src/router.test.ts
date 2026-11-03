import { describe, expect, it } from 'vitest';
import { parseRoute } from './router';

describe('parseRoute', () => {
  it('routes the story picker, reader, and map', () => {
    expect(parseRoute('#/')).toEqual({ view: 'picker' });
    expect(parseRoute('#/docs')).toEqual({ view: 'docs' });
    expect(parseRoute('#/story/new-town')).toEqual({ storyId: 'new-town', view: 'reader' });
    expect(parseRoute('#/story/new-town/map')).toEqual({ storyId: 'new-town', view: 'map' });
  });

  it('does not treat extra story path segments as the reader', () => {
    expect(parseRoute('#/story/new-town/unknown')).toEqual({ view: 'picker' });
  });
});
