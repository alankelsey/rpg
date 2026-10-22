import type { Story } from './types';

// Small fixture for engine tests, loosely based on the new-town opening. Not the real story.
export const testStory: Story = {
  id: 'test-town',
  version: 1,
  title: 'Test Town',
  summary: 'Engine fixture.',
  start: 'curb',
  stats: {
    money: { label: 'Money', initial: 1500, min: 0 },
    health: { label: 'Health', initial: 100, min: 0, max: 100 },
    energy: { label: 'Energy', initial: 50, min: 0, max: 100 },
    kindness: { label: 'Kindness', initial: 0, min: 0, max: 100 },
    junkMeals: { label: 'Junk meals', initial: 0, min: 0, hidden: true },
  },
  scenes: {
    curb: {
      text: 'Where do you want to start, {name}?',
      choices: [
        { id: 'store', label: 'Convenience store', to: 'store' },
        { id: 'hotel', label: 'Hotel', to: 'street' },
      ],
    },
    store: {
      text: 'You are hungry.',
      choices: [
        { id: 'mnms', label: 'Peanut M&Ms', to: 'curb', effects: { stats: { energy: 15, money: -3, junkMeals: 1 } } },
        { id: 'jerky', label: 'Jerky', to: 'curb', effects: { stats: { health: 5, money: -6 } } },
      ],
    },
    street: {
      text: 'A hotel, and a hostel across the street. Someone drops their groceries.',
      choices: [
        { id: 'hotel', label: 'Go to the hotel', to: 'hotel' },
        { id: 'help', label: 'Help pick them up', to: 'street', effects: { stats: { kindness: 10 }, flags: { helped: true } } },
        {
          id: 'thank',
          label: 'Accept their thanks',
          to: 'hostel',
          requires: [{ flag: 'helped', is: true }],
          hideWhenLocked: true,
        },
      ],
    },
    hotel: {
      text: 'The hotel is $90 a night.',
      choices: [
        { id: 'checkin', label: 'Check in', to: 'rested', requires: [{ stat: 'money', gte: 90 }], effects: { stats: { money: -90 } } },
        { id: 'hostel', label: 'Try the hostel', to: 'hostel' },
      ],
    },
    hostel: { text: 'A clean bunk.', ending: { id: 'hostel', title: 'Cheap and cheerful', tone: 'neutral' } },
    rested: { text: 'You sleep well.', ending: { id: 'rested', title: 'Well rested', tone: 'good' } },
  },
};
