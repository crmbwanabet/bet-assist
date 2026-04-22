// test/popup-lists.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeName, isInClubList, findDerby, TOP_CLUBS, DERBIES } from '../api/popup-lists.js';

test('normalizeName lowercases and strips diacritics', () => {
  assert.equal(normalizeName('Atlético Madrid'), 'atletico madrid');
  assert.equal(normalizeName('  REAL   MADRID  '), 'real madrid');
  assert.equal(normalizeName(''), '');
  assert.equal(normalizeName(null), '');
});

test('isInClubList matches exact name case-insensitively', () => {
  assert.equal(isInClubList('Real Madrid', TOP_CLUBS), true);
  assert.equal(isInClubList('real madrid', TOP_CLUBS), true);
  assert.equal(isInClubList('REAL MADRID', TOP_CLUBS), true);
});

test('isInClubList matches accented variant', () => {
  assert.equal(isInClubList('Atlético Madrid', TOP_CLUBS), true);
  assert.equal(isInClubList('Atletico Madrid', TOP_CLUBS), true);
});

test('isInClubList matches substring (ESPN often adds FC / CF suffixes)', () => {
  assert.equal(isInClubList('Real Madrid CF', TOP_CLUBS), true);
  assert.equal(isInClubList('Liverpool FC', TOP_CLUBS), true);
});

test('isInClubList rejects non-matches', () => {
  assert.equal(isInClubList('Leeds United', TOP_CLUBS), false);
  assert.equal(isInClubList('', TOP_CLUBS), false);
  assert.equal(isInClubList(null, TOP_CLUBS), false);
});

test('findDerby detects El Clasico in both orders', () => {
  const d1 = findDerby('Real Madrid', 'Barcelona');
  assert.equal(d1?.name, 'El Clásico');
  const d2 = findDerby('Barcelona', 'Real Madrid');
  assert.equal(d2?.name, 'El Clásico');
});

test('findDerby detects Madrid Derby and North London Derby', () => {
  assert.equal(findDerby('Real Madrid', 'Atletico Madrid')?.name, 'Madrid Derby');
  assert.equal(findDerby('Arsenal', 'Tottenham Hotspur')?.name, 'North London Derby');
});

test('findDerby handles diacritics', () => {
  assert.equal(findDerby('Atlético Madrid', 'Real Madrid')?.name, 'Madrid Derby');
});

test('findDerby handles ESPN suffixes', () => {
  assert.equal(findDerby('Real Madrid CF', 'FC Barcelona')?.name, 'El Clásico');
});

test('findDerby returns null for non-derby pairs', () => {
  assert.equal(findDerby('Liverpool', 'Chelsea'), null);
  assert.equal(findDerby('', ''), null);
});

test('findDerby detects Zambian derbies', () => {
  assert.equal(findDerby('Nkana', 'Power Dynamos')?.name, 'Kitwe Derby');
  assert.equal(findDerby('Red Arrows', 'Green Buffaloes')?.name, 'Lusaka Derby');
});
