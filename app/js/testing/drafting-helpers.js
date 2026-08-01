const TRIB_DEFAULT = [
  { k: 'familia', syn: ['familia'], ficha: '{n}º Juzgado de Familia de {ciudad}', head: 'S.J.L. DE FAMILIA DE {ciudad} ({n}º)' },
  { k: 'civil', syn: ['civil'], ficha: '{n}º Juzgado Civil de {ciudad}', head: 'S.J.L. EN LO CIVIL DE {ciudad} ({n}º)' },
  { k: 'garantia', syn: ['garantia', 'garantía'], ficha: '{n}º Juzgado de Garantía de {ciudad}', head: 'S.J.L. DE GARANTÍA DE {ciudad} ({n}º)' },
  { k: 'trabajo', syn: ['trabajo', 'laboral'], ficha: '{n}º Juzgado de Letras del Trabajo de {ciudad}', head: 'S.J.L. DEL TRABAJO DE {ciudad} ({n}º)' },
  { k: 'cobranza', syn: ['cobranza'], ficha: '{n}º Juzgado de Cobranza Laboral y Previsional de {ciudad}', head: 'S.J.L. DE COBRANZA LABORAL Y PREVISIONAL DE {ciudad} ({n}º)' },
  { k: 'policia', syn: ['policia', 'policía'], ficha: '{n}º Juzgado de Policía Local de {ciudad}', head: 'S.J.L. DE POLICÍA LOCAL DE {ciudad} ({n}º)' },
  { k: 'oral', syn: ['oral', 'juicio oral', 'top'], ficha: '{n}º Tribunal de Juicio Oral en lo Penal de {ciudad}', head: 'S.J.L. DE JUICIO ORAL EN LO PENAL DE {ciudad} ({n}º)' },
  { k: 'letras', syn: ['letras'], ficha: '{n}º Juzgado de Letras de {ciudad}', head: 'S.J. DE LETRAS DE {ciudad} ({n}º)' }
];

const ORD_U = { primer: 1, primero: 1, segundo: 2, tercer: 3, tercero: 3, cuarto: 4, quinto: 5, sexto: 6, septimo: 7, séptimo: 7, octavo: 8, noveno: 9, decimo: 10, décimo: 10, undecimo: 11, undécimo: 11, duodecimo: 12, duodécimo: 12, decimotercero: 13, decimocuarto: 14, decimoquinto: 15, decimosexto: 16, decimoseptimo: 17, decimoséptimo: 17, decimoctavo: 18, decimonoveno: 19 };
const ORD_T = { vigesimo: 20, vigésimo: 20, trigesimo: 30, trigésimo: 30 };
const ORD_KEYS = Object.keys(ORD_U).concat(Object.keys(ORD_T));

function capCiudad(str) {
  return String(str || '').toLowerCase().replace(/\b([a-záéíóúñ])/g, (m) => m.toUpperCase());
}

function fillTrib(pattern, n, city) {
  return String(pattern || '').replace(/\{n\}/g, n).replace(/\{ciudad\}/g, city);
}

function reWord(word) {
  return new RegExp(`\\b${String(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
}

function tribNum(value) {
  const digit = value.match(/(\d{1,3})\s*[º°]?/);
  if (digit) return parseInt(digit[1], 10);
  const low = ` ${value.toLowerCase().replace(/[º°]/g, ' ')} `;
  for (const key in ORD_T) {
    if (low.includes(` ${key} `)) {
      const base = ORD_T[key];
      for (const inner in ORD_U) {
        if (ORD_U[inner] < 10 && low.includes(` ${inner} `)) return base + ORD_U[inner];
      }
      return base;
    }
  }
  const keys = Object.keys(ORD_U).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (low.includes(` ${key} `)) return ORD_U[key];
  }
  return null;
}

export function parseTribunal(raw, tipos = TRIB_DEFAULT) {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (/^s\.?\s*j\.?/i.test(value)) return null;
  const n = tribNum(value);
  const tipo = tipos.find((item) => (item.syn || []).some((word) => reWord(word).test(value)));
  if (!n || !tipo) return null;
  const allSyn = tipos.reduce((acc, item) => acc.concat(item.syn || []), []).concat(['previsional', 'penal', 'juicio', 'local']).concat(ORD_KEYS);
  const synRe = new RegExp(`\\b(${allSyn.map((word) => String(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
  let city = value
    .replace(/\d{1,3}\s*[º°]?/g, ' ')
    .replace(/\b(juzgado|tribunal|corte|de\s+letras|en\s+lo|del|de\s+la|de\s+los|de|en|lo|la|el|los)\b/gi, ' ')
    .replace(synRe, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!city) return null;
  return {
    n,
    tipo: tipo.k,
    ciudad: capCiudad(city),
    nombre: fillTrib(tipo.ficha, n, capCiudad(city)),
    heading: fillTrib(tipo.head, n, city.toUpperCase())
  };
}

export function tribunalHeading(raw, tipos = TRIB_DEFAULT) {
  const parsed = parseTribunal(raw, tipos);
  return parsed ? parsed.heading : '';
}
