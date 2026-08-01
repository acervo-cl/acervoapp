import test from 'node:test';
import assert from 'node:assert/strict';
import { dueCount, isDue } from '../app/js/testing/pure-helpers.js';

test('isDue returns true when no due date exists', () => {
  assert.equal(isDue({}), true);
});

test('isDue returns true for today or past dates', () => {
  assert.equal(isDue({ due: '2026-08-01' }, '2026-08-01'), true);
  assert.equal(isDue({ due: '2026-07-31' }, '2026-08-01'), true);
});

test('isDue returns false for future dates', () => {
  assert.equal(isDue({ due: '2026-08-02' }, '2026-08-01'), false);
});

test('dueCount excludes known cards and future cards', () => {
  const cards = [
    { known: false, due: '2026-08-01' },
    { known: false, due: '2026-07-31' },
    { known: false, due: '2026-08-02' },
    { known: true, due: '2026-08-01' }
  ];
  assert.equal(dueCount(cards, '2026-08-01'), 2);
});
