import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accessRequestBranch,
  buildAccessRequestPayload,
  normalizeAccessRequestName,
  validateAccessRequest,
} from '../app/js/testing/access-request-helpers.js';

const requiredByBranch = { estudia: ['q_donde', 'q_buscar', 'q_repetir'], ejerce: ['q_donde', 'q_buscar', 'q_repetir'] };

test('normalizes a waitlist name without changing its words', () => {
  assert.equal(normalizeAccessRequestName('  Ana   Pérez  Soto '), 'Ana Pérez Soto');
});

test('maps the waitlist branches used by the legacy form', () => {
  assert.equal(accessRequestBranch('Estudiando derecho'), 'estudia');
  assert.equal(accessRequestBranch('Preparando el examen de grado'), 'estudia');
  assert.equal(accessRequestBranch('Ejerciendo'), 'ejerce');
});

test('rejects incomplete waitlist submissions before the RPC call', () => {
  const result = validateAccessRequest({ name: 'Ana', email: 'ana@example.com', branch: '', responses: {}, requiredByBranch, consent: false });
  assert.equal(result.ok, false);
  assert.equal(result.field, 'rsv-nombre');
});

test('accepts a complete waitlist submission', () => {
  const result = validateAccessRequest({
    name: 'Ana Pérez',
    email: 'ana@example.com',
    branch: 'Ejerciendo',
    responses: { q_donde: ['Carpetas del escritorio'], q_buscar: 'Al tiro, sé dónde está', q_repetir: 'Tengo mis modelos y los relleno', q_celular: 'Prefiero el computador y punto' },
    requiredByBranch,
    consent: true,
  });
  assert.deepEqual(result, { ok: true, name: 'Ana Pérez', email: 'ana@example.com' });
});

test('builds the legacy Supabase RPC payload without client secrets', () => {
  const payload = buildAccessRequestPayload({
    name: 'Ana Pérez',
    email: 'ana@example.com',
    branch: 'Ejerciendo',
    profile: 'SUS PROPIAS CARPETAS',
    comment: 'Hola',
    responses: { q_donde: ['Carpetas del escritorio'], q_buscar: 'Al tiro, sé dónde está', q_repetir: 'Tengo mis modelos y los relleno', q_celular: 'Prefiero el computador y punto', q_libertad: 5 },
    consentVersion: 'aviso-datos-v1',
  });
  assert.deepEqual(payload, {
    nombre: 'Ana Pérez',
    correo: 'ana@example.com',
    fono: '',
    institucion: '',
    referido: '',
    rama: 'Ejerciendo',
    perfil: 'SUS PROPIAS CARPETAS',
    comentario: 'Hola',
    consent: true,
    consent_version: 'aviso-datos-v1',
    respuestas: {
      q_donde: ['Carpetas del escritorio'],
      q_buscar: 'Al tiro, sé dónde está',
      q_repetir: 'Tengo mis modelos y los relleno',
      q_celular: 'Prefiero el computador y punto',
      q_libertad: 5,
    },
  });
  assert.equal(JSON.stringify(payload).includes('SUPA_KEY'), false);
});
