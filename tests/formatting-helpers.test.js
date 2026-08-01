import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fmtRut,
  normMatch,
  numeroAPalabras,
  palabrasANumero
} from '../app/js/testing/pure-helpers.js';

test('fmtRut formats a normalized rut', () => {
  assert.equal(fmtRut('12345678k'), '12.345.678-K');
});

test('fmtRut preserves invalid input', () => {
  assert.equal(fmtRut('abc'), 'abc');
});

test('numeroAPalabras converts simple values', () => {
  assert.equal(numeroAPalabras(0), 'cero');
  assert.equal(numeroAPalabras(21), 'veintiuno');
  assert.equal(numeroAPalabras(100), 'cien');
});

test('palabrasANumero converts simple values', () => {
  assert.equal(palabrasANumero('veintiuno'), 21);
  assert.equal(palabrasANumero('ciento veinte'), 120);
  assert.equal(palabrasANumero('dos millones'), 2000000);
});

test('normMatch removes accents and normalizes separators', () => {
  assert.equal(normMatch('Policia Local - Nunoa'), 'policia local nunoa');
  assert.equal(normMatch('Estado civil'), 'estado civil');
});
