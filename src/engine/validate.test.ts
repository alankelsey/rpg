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

  it('validates schema versions, inventory, and composed conditions', () => {
    const story = edit((s) => {
      Object.assign(s, { schemaVersion: 2 });
      s.scenes.curb!.choices![0]!.requires = [{ all: [] }, { item: 'missing', gte: 1 }];
      s.scenes.curb!.choices![0]!.effects = { inventory: { missing: 1.5 } };
    });
    expect(messages(story)).toEqual(
      expect.arrayContaining([
        'error: schemaVersion: Only story schema version 1 is supported',
        'error: scenes.curb.choices.store.requires[0]: Condition group cannot be empty',
        'error: scenes.curb.choices.store.requires[1]: Requires unknown item "missing"',
        'error: scenes.curb.choices.store: Changes unknown item "missing"',
        'error: scenes.curb.choices.store: Item change for "missing" must be an integer',
      ]),
    );
  });

  it('validates explicit costs and warns when a purchase is modeled as a clamped effect', () => {
    const story = edit((s) => {
      s.scenes.curb!.choices![0]!.costs = { cash: 5, money: 0 };
      s.scenes.store!.choices![0]!.effects = { stats: { money: -3 } };
    });
    expect(messages(story)).toEqual(
      expect.arrayContaining([
        'error: scenes.curb.choices.store: Spends unknown stat "cash"',
        'error: scenes.curb.choices.store: Cost for "money" must be a positive finite number',
        'warning: scenes.store.choices.mnms: Negative money effect for "money" does not check affordability; use costs for a purchase',
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

  it('warns about an unmarked structural cycle and accepts an intentional one', () => {
    const story = edit((s) => {
      s.scenes = {
        start: { text: 'Loop.', choices: [{ id: 'again', label: 'Again', to: 'start' }, { id: 'done', label: 'Done', to: 'done' }] },
        done: { text: 'Done.', ending: { id: 'done', title: 'Done', tone: 'neutral' } },
      };
      s.start = 'start';
    });
    expect(messages(story)).toContain('warning: scenes.start: Cycle involving "start" has no intentionalLoop choice');
    story.scenes.start!.choices![0]!.intentionalLoop = true;
    expect(messages(story)).not.toContain('warning: scenes.start: Cycle involving "start" has no intentionalLoop choice');
  });

  it('rejects duplicate ending ids before reports collapse them', () => {
    const story = edit((s) => {
      s.scenes.rested!.ending!.id = s.scenes.hostel!.ending!.id;
    });
    expect(messages(story)).toContain(
      'error: scenes.rested.ending.id: Duplicate ending id "hostel" also used by scene "hostel"',
    );
  });

  it('validates identifiers, labels, initial bounds, flags, and ending metadata', () => {
    const story = edit((s) => {
      s.id = 'bad story id';
      s.title = ' ';
      s.stats.money!.initial = -1;
      s.items!.key!.label = '';
      s.flags = { 'bad flag': 'yes' as unknown as boolean };
      s.scenes.hostel!.ending = { id: 'bad ending', title: '', tone: 'great' as 'good' };
      s.scenes.curb!.choices![0]!.label = '';
    });
    expect(messages(story)).toEqual(expect.arrayContaining([
      'error: id: Story id must use letters, numbers, underscores, or hyphens',
      'error: title: Title is required',
      'error: stats.money.initial: Initial value is below min',
      'error: items.key.label: Item label is required',
      'error: flags.bad flag: Flag id must use letters, numbers, underscores, or hyphens',
      'error: flags.bad flag: Initial flag value must be boolean',
      'error: scenes.hostel.ending.id: Ending id must use letters, numbers, underscores, or hyphens',
      'error: scenes.hostel.ending.title: Ending title is required',
      'error: scenes.hostel.ending.tone: Ending tone must be good, neutral, or bad',
      'error: scenes.curb.choices.store.label: Choice label is required',
    ]));
  });
});
