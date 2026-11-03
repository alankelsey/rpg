import type { Story } from '../engine';

export interface CatalogEntry {
  id: string;
  title: string;
  summary: string;
  latestVersion: number;
  /** Immutable published versions. Keep loaders here while their saves can be restored. */
  versions: Record<number, () => Promise<Story>>;
  /** Loads the current version without downloading every story on the picker. */
  load: () => Promise<Story>;
  /** Returns undefined when this build does not carry the requested immutable version. */
  loadVersion: (version: number) => Promise<Story> | undefined;
}

function entry(input: Omit<CatalogEntry, 'load' | 'loadVersion'>): CatalogEntry {
  return {
    ...input,
    load: input.versions[input.latestVersion]!,
    loadVersion: (version) => input.versions[version]?.(),
  };
}

// Title and summary are repeated here so the picker doesn't load every story;
// catalog.test.ts checks they match the story files.
export const catalog: CatalogEntry[] = [
  entry({
    id: 'new-town',
    title: 'New Town',
    summary:
      'You step off a bus in a small town with $1,500 and a blue JanSport backpack. One week to find work and a place to live.',
    latestVersion: 1,
    versions: {
      1: async () => (await import('./new-town.json')).default as unknown as Story,
    },
  }),
];

export function findStory(id: string): CatalogEntry | undefined {
  return catalog.find((entry) => entry.id === id);
}
