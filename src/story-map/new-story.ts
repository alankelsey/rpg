import type { Story } from '../engine';

export function newStoryTemplate(): Story {
  return {
    schemaVersion: 1,
    rulesVersion: 1,
    id: 'untitled-story',
    version: 1,
    title: 'Untitled story',
    summary: 'A new branching story.',
    start: 'opening',
    stats: { energy: { label: 'Energy', initial: 50, min: 0, max: 100 } },
    items: {},
    scenes: {
      opening: { title: 'Opening', text: 'Write your opening passage.', choices: [{ id: 'continue', label: 'Continue', to: 'ending' }] },
      ending: { title: 'Ending', text: 'Write your ending.', ending: { id: 'ending', title: 'Ending', tone: 'neutral' } },
    },
  };
}
