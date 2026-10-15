import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../app/js/core/utils.js', import.meta.url), 'utf8');

function loadDateInputValue() {
  const context = {};
  vm.runInNewContext(`${source}\nthis.toDateInputValue = toDateInputValue;`, context);
  return context.toDateInputValue;
}

test('toDateInputValue keeps ISO dates for native date inputs', () => {
  const toDateInputValue = loadDateInputValue();
  assert.equal(toDateInputValue('2026-10-15'), '2026-10-15');
});

test('toDateInputValue converts legacy Chilean dates', () => {
  const toDateInputValue = loadDateInputValue();
  assert.equal(toDateInputValue('5/2/2020'), '2020-02-05');
  assert.equal(toDateInputValue('05-02-2020'), '2020-02-05');
});

test('toDateInputValue ignores empty and invalid values', () => {
  const toDateInputValue = loadDateInputValue();
  assert.equal(toDateInputValue(''), '');
  assert.equal(toDateInputValue('fecha pendiente'), '');
});
