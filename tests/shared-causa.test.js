import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../app/js/core/shared-causa-helpers.js', import.meta.url), 'utf8');
const context = {};
vm.runInNewContext(`${source}\nthis.sharedCausaIsVisible = sharedCausaIsVisible;`, context);

test('shared cause is visible to its owner', () => {
  assert.equal(context.sharedCausaIsVisible({ id: 'c1', owner_id: 'u1' }, new Set(), 'u1'), true);
});

test('shared cause is visible only to an active member', () => {
  const row = { id: 'c1', owner_id: 'u1' };
  assert.equal(context.sharedCausaIsVisible(row, new Set(['c1']), 'u2'), true);
  assert.equal(context.sharedCausaIsVisible(row, new Set(), 'u2'), false);
});
