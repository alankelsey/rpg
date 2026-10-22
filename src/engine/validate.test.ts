import { describe, expect, it } from 'vitest';
import { validateStory } from './validate';
import { testStory } from './test-story';
import type { Story } from './types';

const edit = (change: (s: Story) => void): Story => {
  const copy = structuredClone(testStory);
  change(copy);
  return copy;
};
const messages = (story: Story) => validateStory(story).map((i) => `${i.level}: ${i.at}: ${i.message}`);

describe('validateStory', () => {
  it('accepts the fixture story', () => {
    expect(validateStory(testStory)).toEqual([]);
  });

  it('reports a missing start scene', () => {
    expect(messages(edit((s) => (s.start = 'nowhere')))).toContain('error: start: Start scene "nowhere" does not exist');
  });

  it('reports choices that lead to missing scenes', () => {
    const story = edit((s) => (s.scenes.curb!.choices![0]!.to = 'scene4'));
    expect(messages(story)).toContain('error: scenes.curb.choices.store: Leads to missing scene "scene4"');
  });

  it('reports duplicate choice ids, like the prototype food choices', () => {
    const story = edit((s) => (s.scenes.store!.choices![1]!.id = 'mnms'));
    expect(messages(story)).toContain('error: scenes.store.choices.mnms: Duplicate choice id "mnms"');
  });

  it('reports unknown stats in effects and requirements', () => {
    const story = edit((s) => {
      s.scenes.store!.choices![0]!.effects = { stats: { sugar: 1 } };
      s.scenes.hotel!.choices![0]!.requires = [{ stat: 'cash', gte: 90 }];
    });
    expect(messages(story)).toEqual(
      expect.arrayContaining([
        'error: scenes.store.choices.mnms: Changes unknown stat "sugar"',
        'error: scenes.hotel.choices.checkin.requires[0]: Requires unknown stat "cash"',
      ]),
    );
  });

  it('reports dead ends and endings with choices', () => {
    const story = edit((s) => {
      delete s.scenes.hostel!.ending;
      s.scenes.rested!.choices = [{ id: 'again', label: 'Again', to: 'curb' }];
    });
    expect(messages(story)).toEqual(
      expect.arrayContaining([
        'error: scenes.hostel: Dead end: no choices and not marked as an ending',
        'error: scenes.rested: An ending scene cannot have choices',
      ]),
    );
  });

  it('warns about unreachable scenes and flags nothing sets', () => {
    const story = edit((s) => {
      s.scenes.attic = { text: 'Dusty.', ending: { id: 'attic', title: 'Attic', tone: 'neutral' } };
      s.scenes.street!.choices![1]!.effects = { stats: { kindness: 10 } };
    });
    expect(messages(story)).toEqual(
      expect.arrayContaining([
        'warning: scenes.attic: Unreachable from the start scene',
        'warning: scenes.street.choices.thank.requires[0]: Flag "helped" is never set by any choice',
      ]),
    );
  });

  it('reports a story with no reachable ending', () => {
    const story = edit((s) => {
      s.scenes.hotel!.choices = [{ id: 'back', label: 'Back', to: 'curb' }];
      s.scenes.street!.choices = [{ id: 'back', label: 'Back', to: 'curb' }];
    });
    expect(messages(story)).toContain('error: scenes: No ending is reachable');
  });
});
