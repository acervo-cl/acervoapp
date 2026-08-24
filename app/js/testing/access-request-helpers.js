const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeAccessRequestName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function isAccessRequestEmail(value) {
  return EMAIL_PATTERN.test(String(value || '').trim());
}

export function accessRequestBranch(value) {
  return value === 'Estudiando derecho' || value === 'Preparando el examen de grado' ? 'estudia' : 'ejerce';
}

export function missingAccessRequestFields({ branch, responses = {}, requiredByBranch, consent }) {
  const required = ['rama', ...(requiredByBranch[accessRequestBranch(branch)] || []), 'q_celular'];
  return required.filter((id) => id === 'rama' ? !branch : id === 'q_donde' ? !(responses[id] || []).length : !responses[id]);
}

export function validateAccessRequest({ name, email, branch, responses, requiredByBranch, consent }) {
  const normalizedName = normalizeAccessRequestName(name);
  if (normalizedName.split(' ').filter(Boolean).length < 2) {
    return { ok: false, field: 'rsv-nombre', message: 'Nombre completo: nombre y apellido, porfa.' };
  }
  if (!isAccessRequestEmail(email)) {
    return { ok: false, field: 'rsv-correo', message: 'Ese correo no existe ni en sueños. Revísalo.' };
  }
  const missing = missingAccessRequestFields({ branch, responses, requiredByBranch, consent });
  if (missing.length) {
    return { ok: false, field: missing[0], message: missing.length === 1 ? 'Te falta una. La marcamos en rojo.' : `Te faltan ${missing.length}. Empecemos por la de arriba.` };
  }
  if (!consent) return { ok: false, field: 'rsv-ok', message: 'Falta la casilla. Sin tu autorización no guardamos nada, y así tiene que ser.' };
  return { ok: true, name: normalizedName, email: String(email).trim() };
}

export function buildAccessRequestPayload({ name, email, phone = '', institution = '', referred = '', branch, profile, comment = '', responses, consentVersion }) {
  return {
    nombre: normalizeAccessRequestName(name),
    correo: String(email || '').trim(),
    fono: String(phone || '').trim(),
    institucion: String(institution || '').trim(),
    referido: String(referred || '').trim(),
    rama: branch,
    perfil: profile,
    comentario: String(comment || '').trim(),
    consent: true,
    consent_version: consentVersion,
    respuestas: {
      q_donde: responses.q_donde,
      q_buscar: responses.q_buscar,
      q_repetir: responses.q_repetir,
      q_celular: responses.q_celular,
      q_libertad: responses.q_libertad,
    },
  };
}
