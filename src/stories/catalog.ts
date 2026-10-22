import type { Story } from '../engine';

export interface CatalogEntry {
  id: string;
  title: string;
  summary: string;
  /** Each story is its own build chunk, so the picker loads without downloading every story. */
  load: () => Promise<Story>;
}

// Title and summary are repeated here so the picker doesn't load every story;
// catalog.test.ts checks they match the story files.
export const catalog: CatalogEntry[] = [
  {
    id: 'new-town',
    title: 'New Town',
    summary:
      'You step off a bus in a small town with $1,500 and a blue JanSport backpack. One week to find work and a place to live.',
    load: async () => (await import('./new-town.json')).default as unknown as Story,
  },
];

export function findStory(id: string): CatalogEntry | undefined {
  return catalog.find((entry) => entry.id === id);
}
