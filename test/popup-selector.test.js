// test/popup-selector.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectContent } from '../api/popup-selector.js';

// Helpers used across tests
const baseMatch = {
  id: 'm1', home_team: 'Liverpool', away_team: 'Arsenal',
  league: 'Premier League', kickoff_utc: '2026-04-23T19:00:00Z',
  is_derby: false, derby_name: null, is_tier_1: true,
  is_knockout: false, is_zambia: false, is_african: false,
};
const hotGames = [
  { name: 'Aviator', category: 'Crash', description: 'cash out before crash' },
  { name: 'JetX', category: 'Crash', description: 'rocket crash' },
];
const TEASER = {
  type: 'teaser',
  title: null,
  body: 'Try **Bwanabet** new AI chatbot to predict bets and check stats!',
  chatPrompt: null,
  fireChat: false,
};

test('morning-of match beats T-1 and T-2', () => {
  const slot = new Date('2026-04-23T08:00:00Z');
  const matches = [
    { ...baseMatch, id: 'morning', kickoff_utc: '2026-04-23T19:00:00Z' },
    { ...baseMatch, id: 't1', kickoff_utc: '2026-04-24T19:00:00Z' },
    { ...baseMatch, id: 't2', kickoff_utc: '2026-04-25T19:00:00Z' },
  ];
  const out = selectContent({ slotDateTime: slot, shownToday: [], matches, hotGames });
  assert.equal(out.type, 'match');
  assert.equal(out.subtype, 'morning_of');
  assert.equal(out.title, 'Liverpool vs Arsenal');
});

test('T-1 match wins when no morning-of exists', () => {
  const slot = new Date('2026-04-23T08:00:00Z');
  const matches = [
    { ...baseMatch, id: 't1', kickoff_utc: '2026-04-24T19:00:00Z' },
  ];
  const out = selectContent({ slotDateTime: slot, shownToday: [], matches, hotGames });
  assert.equal(out.type, 'match');
  assert.equal(out.subtype, 't1');
});

test('T-2 match wins when no morning-of or T-1', () => {
  const slot = new Date('2026-04-23T08:00:00Z');
  const matches = [
    { ...baseMatch, id: 't2', kickoff_utc: '2026-04-25T19:00:00Z' },
  ];
  const out = selectContent({ slotDateTime: slot, shownToday: [], matches, hotGames });
  assert.equal(out.type, 'match');
  assert.equal(out.subtype, 't2');
});

test('falls back to casino when no eligible matches', () => {
  const slot = new Date('2026-04-23T08:00:00Z');
  const out = selectContent({ slotDateTime: slot, shownToday: [], matches: [], hotGames });
  assert.equal(out.type, 'casino');
  assert.equal(out.title, 'Aviator');
});

test('falls back to teaser when no matches and no casino', () => {
  const slot = new Date('2026-04-23T08:00:00Z');
  const out = selectContent({ slotDateTime: slot, shownToday: [], matches: [], hotGames: [] });
  assert.equal(out.type, 'teaser');
  assert.equal(out.body, TEASER.body);
});

test('3-match cap: 4th match slot falls through to casino', () => {
  const slot = new Date('2026-04-23T16:00:00Z');
  const matches = [{ ...baseMatch, id: 'morning', kickoff_utc: '2026-04-23T22:00:00Z' }];
  const shownToday = [
    { slot: '0', type: 'match' },
    { slot: '4', type: 'match' },
    { slot: '8', type: 'match' },
  ];
  const out = selectContent({ slotDateTime: slot, shownToday, matches, hotGames });
  assert.equal(out.type, 'casino');
});

test('morning-of with kickoff before the slot is NOT eligible', () => {
  const slot = new Date('2026-04-23T16:00:00Z');
  const matches = [
    { ...baseMatch, id: 'early', kickoff_utc: '2026-04-23T12:00:00Z' },
  ];
  const out = selectContent({ slotDateTime: slot, shownToday: [], matches, hotGames });
  assert.equal(out.type, 'casino');
});

test('casino rotation is deterministic per (slotId, date)', () => {
  const slot = new Date('2026-04-23T08:00:00Z');
  const out1 = selectContent({ slotDateTime: slot, shownToday: [], matches: [], hotGames });
  const out2 = selectContent({ slotDateTime: slot, shownToday: [], matches: [], hotGames });
  assert.equal(out1.title, out2.title);
});

test('derby match surfaces derby_name in body or title', () => {
  const slot = new Date('2026-04-23T08:00:00Z');
  const matches = [{
    ...baseMatch, id: 'derby',
    home_team: 'Liverpool', away_team: 'Everton',
    is_derby: true, derby_name: 'Merseyside Derby',
    kickoff_utc: '2026-04-23T19:00:00Z',
  }];
  const out = selectContent({ slotDateTime: slot, shownToday: [], matches, hotGames });
  assert.equal(out.type, 'match');
  assert.ok(out.body.includes('Merseyside Derby') || out.title.includes('Merseyside Derby'));
});

test('click prompt on match includes teams, kickoff, and league', () => {
  const slot = new Date('2026-04-23T08:00:00Z');
  const matches = [{ ...baseMatch, kickoff_utc: '2026-04-23T19:00:00Z' }];
  const out = selectContent({ slotDateTime: slot, shownToday: [], matches, hotGames });
  assert.ok(out.chatPrompt.startsWith('Give me a pick for Liverpool vs Arsenal'),
    `chatPrompt should start with "Give me a pick for Liverpool vs Arsenal", got: ${out.chatPrompt}`);
  assert.ok(out.chatPrompt.includes('kickoff'),
    `chatPrompt should mention kickoff, got: ${out.chatPrompt}`);
  assert.ok(out.chatPrompt.includes('Premier League'),
    `chatPrompt should mention the league, got: ${out.chatPrompt}`);
  assert.equal(out.fireChat, true);
});

test('click prompt on casino is "How do I win on X"', () => {
  const slot = new Date('2026-04-23T08:00:00Z');
  const out = selectContent({ slotDateTime: slot, shownToday: [], matches: [], hotGames });
  assert.equal(out.chatPrompt, 'How do I win on Aviator');
  assert.equal(out.fireChat, true);
});

test('click prompt on teaser is null (no auto-fire)', () => {
  const slot = new Date('2026-04-23T08:00:00Z');
  const out = selectContent({ slotDateTime: slot, shownToday: [], matches: [], hotGames: [] });
  assert.equal(out.chatPrompt, null);
  assert.equal(out.fireChat, false);
});
