export function isDue(card, today = new Date().toISOString().slice(0, 10)) {
  return !card.due || card.due <= today;
}

export function dueCount(cards, today = new Date().toISOString().slice(0, 10)) {
  return cards.filter((card) => !card.known && isDue(card, today)).length;
}

export function nrmRut(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^0-9k]/g, '');
}

export function fmtRut(value) {
  const clean = nrmRut(value);
  const match = clean.match(/^(\d{7,8})([\dk])$/);
  if (!match) return value || '';
  const body = match[1].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${body}-${match[2].toUpperCase()}`;
}

const UNI = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidos', 'veintitres', 'veinticuatro', 'veinticinco', 'veintiseis', 'veintisiete', 'veintiocho', 'veintinueve'];
const DEC = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CEN = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
const MAPA = { cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21, veintiun: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900 };

function cu(n) {
  if (n < 30) return UNI[n];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const r = n % 10;
    return DEC[d] + (r ? ` y ${UNI[r]}` : '');
  }
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100);
  const r = n % 100;
  return CEN[c] + (r ? ` ${cu(r)}` : '');
}

function capoc(s) {
  return s.replace(/veintiuno$/, 'veintiun').replace(/(^|\s)uno$/, '$1un');
}

function cmiles(n) {
  if (n === 0) return '';
  const m = Math.floor(n / 1000);
  const r = n % 1000;
  const out = [];
  if (m === 1) out.push('mil');
  else if (m > 1) out.push(`${capoc(cu(m))} mil`);
  if (r > 0) out.push(cu(r));
  return out.join(' ');
}

export function numeroAPalabras(n) {
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'cero';
  const mi = Math.floor(n / 1e6);
  const re = n % 1e6;
  const out = [];
  if (mi === 1) out.push('un millon');
  else if (mi > 1) out.push(`${capoc(cmiles(mi))} millones`);
  if (re > 0) out.push(cmiles(re));
  return out.join(' ').trim();
}

export function palabrasANumero(str) {
  const clean = String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return null;
  let total = 0;
  let cur = 0;
  let any = false;
  for (const word of clean.split(' ')) {
    if (word === 'y' || word === 'con' || word === 'de' || word === 'pesos' || word === 'peso') continue;
    if (word === 'mil') {
      cur = (cur || 1) * 1000;
      total += cur;
      cur = 0;
      any = true;
      continue;
    }
    if (word === 'millon' || word === 'millones') {
      cur = (cur || 1) * 1e6;
      total += cur;
      cur = 0;
      any = true;
      continue;
    }
    if (MAPA[word] !== undefined) {
      cur += MAPA[word];
      any = true;
    }
  }
  return any ? total + cur : null;
}

export function normMatch(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[áàä]/g, 'a')
    .replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
