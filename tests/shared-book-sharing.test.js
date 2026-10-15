import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../app/js/core/shared-doc-helpers.js', import.meta.url), 'utf8');
const context = {};
vm.runInNewContext(`${source}\nthis.cloneSharedBookBookmarks = cloneSharedBookBookmarks;`, context);

test('shared book topics are copied without sharing the original array', () => {
  const original = [{ pos: 42, label: 'Contratos', quote: 'texto' }];
  const copied = context.cloneSharedBookBookmarks(original);

  assert.deepEqual(copied, original);
  assert.notEqual(copied, original);
  assert.notEqual(copied[0], original[0]);
});

test('shared book topics ignore invalid payloads', () => {
  assert.deepEqual(context.cloneSharedBookBookmarks(null), []);
  assert.deepEqual(context.cloneSharedBookBookmarks([null, { label: 'Tema' }]), [{ label: 'Tema' }]);
});
