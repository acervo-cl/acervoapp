import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
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

test('structure editor wraps the selected text with formatting markers', () => {
  const source = readFileSync(new URL('../app/js/admin/structure-editor.js', import.meta.url), 'utf8');
  const textarea = {
    value: 'Hola mundo',
    selectionStart: 5,
    selectionEnd: 10,
    focus() {},
    setSelectionRange(start, end) {
      this.selectionStart = start;
      this.selectionEnd = end;
    },
  };
  const context = {
    document: { getElementById: () => textarea },
    window: { addEventListener() {} },
  };
  vm.runInNewContext(`${source}\nthis.testSurround = _taSurround;`, context);

  context.testSurround('ee-txt-0', '[[B]]', '[[/B]]');

  assert.equal(textarea.value, 'Hola [[B]]mundo[[/B]]');
  assert.equal(textarea.selectionStart, 10);
  assert.equal(textarea.selectionEnd, 15);
});

test('drafting resolves party and case variables throughout the model body', () => {
  const source = readFileSync(new URL('../app/js/drafting/drafting-runtime-core.js', import.meta.url), 'utf8');
  const model = {
    id: 'm-body',
    tipoId: 'escrito',
    cabecera: 'SOLICITA {{causa.rol}}',
    cuerpo: 'Cliente: {{cliente.nombre}} · RUT: {{cliente.rut}} · Materia: {{causa.materia}}',
    pie: '',
    variables: [],
  };
  const context = {
    STATE: { nombreMayusNegrita: false, perfilAbogado: { nombre: 'Ana Abogada', cargo: 'abogada' } },
    CLIENTES: [{ id: 'c1', nombre: 'Carlos Cliente', rut: '1-9', genero: 'm' }],
    EMPRESAS: [],
    EXPEDIENTES: [],
    MODELOS: [model],
    MODELOS_DEFAULT: [],
    TIPOSDOC: [{ id: 'escrito', motor: 'judicial', partes: [{ key: 'cuerpo', on: true }] }],
    TIPOSDOC_DEFAULT: [],
    findColaborador() { return null; },
    saveState() {},
    tipoOfModel: (m) => context.TIPOSDOC.find((t) => t.id === m.tipoId),
    tribunalHeading() { return ''; },
    fillMarkers(tpl, map) {
      return Object.keys(map).reduce((text, key) => text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), map[key] ?? ''), tpl || '');
    },
  };
  vm.runInNewContext(`${source}\nthis.testGenerate = generarEscritoTexto;`, context);

  const result = context.testGenerate({
    clienteId: 'c1',
    rol: 'C-1-2026',
    materia: 'Alimentos',
    caratula: 'Cliente con Contraparte',
    partes: {},
  }, [{ modeloId: 'm-body', vars: {} }]);

  assert.match(result, /Cliente: Carlos Cliente/);
  assert.match(result, /RUT: 1-9/);
  assert.match(result, /Materia: Alimentos/);
  assert.doesNotMatch(result, /\{\{cliente\.|\{\{causa\./);
});
