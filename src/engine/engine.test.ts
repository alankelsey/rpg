import { describe, expect, it } from 'vitest';
import { IllegalChoiceError, applyChoice, choiceViews, replay, sceneText, startRun } from './engine';
import { testStory as story } from './test-story';

describe('startRun', () => {
  it('starts at the start scene with initial stats and the trimmed name', () => {
    const run = startRun(story, '  Mara ');
    expect(run).toMatchObject({ sceneId: 'curb', playerName: 'Mara', ended: false, history: [] });
    expect(run.stats).toEqual({ money: 1500, health: 100, energy: 50, kindness: 0, junkMeals: 0 });
  });

  it('fills {name} in scene text', () => {
    expect(sceneText(story, startRun(story, 'Mara'))).toBe('Where do you want to start, Mara?');
  });
});

describe('applyChoice', () => {
  it('applies effects once and moves to the next scene', () => {
    const run = applyChoice(story, startRun(story, 'Mara'), 'store');
    const fed = applyChoice(story, run, 'mnms');
    expect(fed.sceneId).toBe('curb');
    expect(fed.stats).toMatchObject({ money: 1497, energy: 65, junkMeals: 1 });
    expect(fed.history).toEqual(['store', 'mnms']);
  });

  it('does not modify the state it was given', () => {
    const run = startRun(story, 'Mara');
    const snapshot = structuredClone(run);
    applyChoice(story, run, 'store');
    expect(run).toEqual(snapshot);
  });

  it('clamps bounded stats', () => {
    let run = applyChoice(story, startRun(story, 'Mara'), 'store');
    run = applyChoice(story, run, 'jerky');
    expect(run.stats.health).toBe(100);
  });

  it('rejects a choice from another scene', () => {
    expect(() => applyChoice(story, startRun(story, 'Mara'), 'mnms')).toThrow(IllegalChoiceError);
  });

  it('rejects a locked choice', () => {
    const run = { ...startRun(story, 'Mara'), sceneId: 'hotel', stats: { ...startRun(story, 'Mara').stats, money: 50 } };
    expect(choiceViews(story, run).find((v) => v.choice.id === 'checkin')?.available).toBe(false);
    expect(() => applyChoice(story, run, 'checkin')).toThrow(/locked/);
  });

  it('omits hidden locked choices and shows them once unlocked', () => {
    const atStreet = applyChoice(story, startRun(story, 'Mara'), 'hotel');
    const ids = (run: typeof atStreet) => choiceViews(story, run).map((v) => v.choice.id);
    expect(ids(atStreet)).not.toContain('thank');
    const helped = applyChoice(story, atStreet, 'help');
    expect(ids(helped)).toContain('thank');
  });

  it('ends the run at an ending scene and refuses further choices', () => {
    const ended = replay(story, 'Mara', ['hotel', 'hotel', 'checkin']);
    expect(ended.ended).toBe(true);
    expect(choiceViews(story, ended)).toEqual([]);
    expect(() => applyChoice(story, ended, 'checkin')).toThrow(/ended/);
  });

  it('rejects a run saved against a different story version', () => {
    const run = { ...startRun(story, 'Mara'), storyVersion: 99 };
    expect(() => applyChoice(story, run, 'store')).toThrow(/v99/);
  });
});

describe('replay', () => {
  it('reproduces the same state from the same history', () => {
    const history = ['store', 'mnms', 'hotel', 'help', 'hotel', 'checkin'];
    expect(replay(story, 'Mara', history)).toEqual(replay(story, 'Mara', history));
    expect(replay(story, 'Mara', history).stats).toMatchObject({ money: 1407, kindness: 10 });
  });
});
