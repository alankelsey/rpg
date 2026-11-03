import { describe, expect, it } from 'vitest';
import { StoryFormatError, parseStory } from './parse';
import { testStory } from './test-story';

describe('parseStory', () => {
  it('accepts and clones a structurally and semantically valid story', () => {
    const parsed = parseStory(testStory);
    expect(parsed).toEqual(testStory);
    expect(parsed).not.toBe(testStory);
  });

  it('rejects malformed nested authored data with paths instead of throwing a type error', () => {
    const malformed = structuredClone(testStory) as unknown as Record<string, unknown>;
    const scenes = malformed.scenes as Record<string, Record<string, unknown>>;
    const choices = scenes.curb!.choices as Array<Record<string, unknown>>;
    choices[0]!.requires = [{ any: [{ stat: 7, gte: 'lots' }] }];
    expect(() => parseStory(malformed)).toThrow(StoryFormatError);
    try {
      parseStory(malformed);
    } catch (error) {
      expect((error as StoryFormatError).problems).toEqual(expect.arrayContaining([
        'scenes.curb.choices[0].requires[0].any[0].stat: must be a string',
        'scenes.curb.choices[0].requires[0].any[0].gte: must be a number',
      ]));
    }
  });

  it('rejects semantic errors after the shape is safe', () => {
    const broken = structuredClone(testStory);
    broken.scenes.curb!.choices![0]!.to = 'missing';
    expect(() => parseStory(broken)).toThrow(/Leads to missing scene/);
  });

  it('bounds recursive condition depth', () => {
    const broken = structuredClone(testStory) as unknown as Record<string, unknown>;
    const scenes = broken.scenes as Record<string, Record<string, unknown>>;
    const choices = scenes.curb!.choices as Array<Record<string, unknown>>;
    let condition: unknown = { stat: 'money', gte: 1 };
    for (let index = 0; index < 22; index++) condition = { not: condition };
    choices[0]!.requires = [condition];
    expect(() => parseStory(broken)).toThrow(/nesting exceeds/);
  });
});
