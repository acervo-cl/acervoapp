import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTribunal, tribunalHeading } from '../app/js/testing/drafting-helpers.js';

test('parseTribunal parses numeric family court shorthand', () => {
  const parsed = parseTribunal('3 familia santiago');
  assert.equal(parsed?.n, 3);
  assert.equal(parsed?.tipo, 'familia');
  assert.equal(parsed?.ciudad, 'Santiago');
  assert.equal(parsed?.heading, 'S.J.L. DE FAMILIA DE SANTIAGO (3º)');
});

test('parseTribunal parses ordinal wording', () => {
  const parsed = parseTribunal('tercero de familia de santiago');
  assert.equal(parsed?.n, 3);
  assert.equal(parsed?.tipo, 'familia');
});

test('tribunalHeading returns empty for existing heading input', () => {
  assert.equal(tribunalHeading('S.J.L. DE FAMILIA DE SANTIAGO'), '');
});

test('tribunalHeading returns civil heading from shorthand', () => {
  assert.equal(tribunalHeading('30 civil santiago'), 'S.J.L. EN LO CIVIL DE SANTIAGO (30º)');
});
