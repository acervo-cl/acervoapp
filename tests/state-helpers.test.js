import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStatePayloadShape,
  makeFreshStateSnapshot
} from '../app/js/testing/state-helpers.js';

test('buildStatePayloadShape removes shared items from persisted collections', () => {
  const payload = buildStatePayloadShape({
    subjects: [{ id: '__shared__' }, { id: 'civil' }],
    documents: [{ id: 'd1', shared: true }, { id: 'd2', shared: false }],
    apuntes: [{ id: 'a1', sharedDoc: true }, { id: 'a2', sharedDoc: false }],
    expedientes: [{ id: 'e1', shared: true }, { id: 'e2', shared: false }],
    exdocs: [{ id: 'x1', shared: true }, { id: 'x2', shared: false }],
    documentos: [{ id: 'o1', sharedDoc: true }, { id: 'o2', sharedDoc: false }],
    annotations: [{ id: 'n1', shared: true }, { id: 'n2', shared: false }],
    favorites: ['d2'],
    mmExpanded: ['civil'],
    state: { docOrder: ['d2'] }
  });

  assert.deepEqual(payload.subjects.map((x) => x.id), ['civil']);
  assert.deepEqual(payload.documents.map((x) => x.id), ['d2']);
  assert.deepEqual(payload.apuntes.map((x) => x.id), ['a2']);
  assert.deepEqual(payload.expedientes.map((x) => x.id), ['e2']);
  assert.deepEqual(payload.exdocs.map((x) => x.id), ['x2']);
  assert.deepEqual(payload.documentos.map((x) => x.id), ['o2']);
  assert.deepEqual(payload.annotations.map((x) => x.id), ['n2']);
  assert.deepEqual(payload.favorites, ['d2']);
  assert.deepEqual(payload.mmExpanded, ['civil']);
});

test('makeFreshStateSnapshot returns expected empty defaults', () => {
  const snapshot = makeFreshStateSnapshot();

  assert.deepEqual(snapshot.docOrder, []);
  assert.deepEqual(snapshot.flashcards, []);
  assert.deepEqual(snapshot.bookmarks, {});
  assert.equal(snapshot.tabActive, null);
  assert.deepEqual(snapshot.perfilAbogado, {
    nombre: '',
    rut: '',
    domicilio: '',
    email: '',
    cargo: 'Abogado'
  });
  assert.deepEqual(snapshot.membrete, { logo: '', pie: '' });
  assert.equal(snapshot.favorites instanceof Set, true);
  assert.equal(snapshot.mmExpanded instanceof Set, true);
});
