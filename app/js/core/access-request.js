import {
  accessRequestBranch,
  buildAccessRequestPayload,
  validateAccessRequest,
} from '../testing/access-request-helpers.js';

const CONTACT_EMAIL = '99leoncarlos@gmail.com';
const CONSENT_VERSION = 'aviso-datos-v1';
const REQUIRED_BY_BRANCH = { estudia: ['q_donde', 'q_buscar', 'q_repetir'], ejerce: ['q_donde', 'q_buscar', 'q_repetir'] };

const branchQuestion = {
  id: 'rama', type: 'single', title: 'Partamos por lo básico: ¿en qué estás ahora?',
  options: ['Estudiando derecho', 'Ejerciendo', 'Procurando mientras estudio', 'Preparando el examen de grado'],
};

const branchQuestions = {
  estudia: [
    { id: 'q_donde', type: 'multiple', title: '¿Dónde viven hoy tus apuntes y materiales?', note: 'Marca todas las que te duelan.', options: ['Carpetas del escritorio', 'El WhatsApp conmigo mismo', '200 PDF en Descargas', 'Fotocopias, impresos, anillados', 'El Drive de un compañero', 'En mi cabeza (por ahora)'] },
    { id: 'q_buscar', type: 'single', title: 'Sabes que lo leíste. No sabes dónde.', options: ['Me pasa todas las semanas', 'De vez en cuando', 'Lo tengo todo ubicado', 'Prefiero releer entero, y ahí se me va la tarde'] },
    { id: 'q_repetir', type: 'single', title: 'Lo que subrayas en un PDF, ¿dónde termina?', options: ['Ahí adentro, y no lo vuelvo a abrir', 'Lo copio a un Word aparte', 'Lo paso a mano a un cuaderno', 'No subrayo: releo y rezo'] },
  ],
  ejerce: [
    { id: 'q_donde', type: 'multiple', title: '¿Dónde viven hoy tus escritos y tus causas?', note: 'Marca todas las que te duelan.', options: ['Carpetas del escritorio', 'El WhatsApp conmigo mismo', 'Descargas, junto a todo lo demás', 'Carpeta física, en papel', 'El Drive del estudio', 'Me los mando por correo a mí mismo'] },
    { id: 'q_buscar', type: 'single', title: '¿Cuánto te demoras en encontrar un escrito que sabes que hiciste?', options: ['Al tiro, sé dónde está', 'Unos minutos revolviendo', 'Tanto, que a veces prefiero rehacerlo', 'Se lo pido a alguien del estudio'] },
    { id: 'q_repetir', type: 'single', title: 'El mismo escrito, otra vez. ¿Qué te toca hacer?', note: 'Ya lo hiciste antes. Y aun así hay que sentarse.', options: ['Sentarme a escribirlo de nuevo, aunque ya lo hice mil veces', 'Buscar uno viejo y cambiarle los nombres', 'Tengo mis modelos y los relleno', 'Se lo encargo a alguien'] },
  ],
};

const commonQuestions = [
  { id: 'q_celular', type: 'single', title: 'Si pudieras hacerlo todo desde el teléfono, ¿tendrías más libertad… o menos vida?', options: ['Más libertad, sin duda', 'Libertad, pero no me desconectaría nunca más', 'Ya lo intento y termino peleando con el teléfono', 'Prefiero el computador y punto'] },
  { id: 'q_libertad', type: 'range', title: '¿Cuánta libertad quieres tener?', left: 'Enséñame paso a paso', right: 'Dame las llaves', labels: ['Enséñame paso a paso', 'Enséñame paso a paso', 'Guíame al principio', 'Guíame al principio', 'Un empujón y sigo solo', 'Un empujón y sigo solo', 'Déjame probar y ver', 'Déjame probar y ver', 'Casi no me hables', 'Dame las llaves', 'Ingobernable'] },
  { id: 'q_coment', type: 'text', title: '¿Algún comentario?', placeholder: 'Lo que quieras decirnos. Acá mandas tú.' },
];

const state = { values: { q_libertad: 5 } };
const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const notice = `<p><b>Quién los guarda.</b> Acervo. Para cualquier cosa de esta lista, escribe a <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
<p><b>Qué guardamos.</b> Solo lo que escribiste en esta hoja. No usamos cookies de rastreo ni te seguimos por otros sitios.</p>
<p><b>Para qué.</b> Avisarte cuando se abra tu acceso y contar de forma agregada cuánta gente quiere entrar y qué le duele, para decidir qué construir.</p>
<p><b>Con quién.</b> Con nadie. No los vendemos ni los pasamos a terceros para publicidad. Se almacenan en Supabase, el proveedor donde vive la app.</p>
<p><b>Hasta cuándo.</b> Hasta que te demos acceso, o hasta 12 meses después si no alcanzamos a abrir cupo. Luego se eliminan.</p>
<p><b>Tus derechos.</b> Puedes pedir que te digamos qué tenemos tuyo, que lo corrijamos o que lo borremos. Basta un correo.</p>
<p class="legal">Tratamos tus datos conforme a la Ley Nº 19.628 y, desde su entrada en vigencia, a la Ley Nº 21.719. Tu autorización es voluntaria.</p>`;

function questionMarkup(question, number) {
  const current = state.values[question.id];
  let controls = '';
  if (question.type === 'single' || question.type === 'multiple') {
    controls = `<div class="rsv-opts">${question.options.map((option) => {
      const selected = question.type === 'single' ? current === option : (current || []).includes(option);
      return `<button type="button" class="rsv-opt${selected ? ' sel' : ''}" data-rsv-action="pick" data-rsv-id="${esc(question.id)}" data-rsv-type="${question.type}" data-rsv-value="${esc(option)}" aria-pressed="${selected}">${esc(option)}</button>`;
    }).join('')}</div>`;
  } else if (question.type === 'range') {
    const value = Number.isInteger(current) ? current : 5;
    controls = `<div class="rsv-slider"><input type="range" min="0" max="10" value="${value}" data-rsv-action="range" aria-label="Nivel de libertad"><div class="rsv-ends"><span>${esc(question.left)}</span><span>${esc(question.right)}</span></div><div class="rsv-val" id="rsv-barval">${esc(question.labels[value])}</div></div>`;
  } else {
    controls = `<div class="rsv-field" style="margin:0"><textarea id="rsv-coment" rows="3" placeholder="${esc(question.placeholder)}">${esc(state.values[question.id] || '')}</textarea><div class="rsv-note" style="margin:6px 0 0">Opcional. Lo lee una persona, no un robot.</div></div>`;
  }
  return `<div class="rsv-q" data-rq="${question.id}"><div class="rsv-num">${String(number).padStart(2, '0')}</div><div class="rsv-qt">${esc(question.title)}</div>${question.note ? `<div class="rsv-note">${esc(question.note)}</div>` : ''}${controls}</div>`;
}

function branchKey() { return accessRequestBranch(state.values.rama); }

function renderBranch() {
  const branch = document.getElementById('rsv-rama');
  const common = document.getElementById('rsv-comunes');
  if (!branch || !common) return;
  branch.innerHTML = branchQuestions[branchKey()].map((question, index) => questionMarkup(question, index + 2)).join('');
  common.innerHTML = `${commonQuestions.map((question, index) => questionMarkup(question, index + 5)).join('')}
    <div class="rsv-hr"></div>
    <div class="rsv-consent" id="rsv-consent">
      <label class="rsv-crow"><input type="checkbox" id="rsv-ok"><span>Autorizo a Acervo a guardar estos datos para avisarme cuando haya cupo y para medir cuánta gente quiere entrar. Puedo pedir que los borren cuando quiera.</span></label>
      <button type="button" class="rsv-toggle" data-rsv-action="notice">cómo usamos tus datos</button>
      <div class="rsv-datos" id="rsv-datosbox">${notice}</div>
    </div>
    <div class="rsv-hr"></div>
    <button type="button" class="rsv-send" id="rsv-send" data-rsv-action="submit">Reservar mi cupo →</button>
    <div class="rsv-err" id="rsv-err" role="alert" aria-live="polite"></div>
    <p class="rsv-foot">Esto no te da acceso. Te pone en la fila.<br>Alguien va a leer lo que escribiste — una persona, no un robot.</p>`;
}

function renderForm() {
  document.getElementById('rsv-content').innerHTML = `<div class="rsv-eyebrow">Acervo · acceso por invitación</div>
    <h1 id="rsv-dialog-title" class="rsv-title">Reserva tu lugar<br>en la fila.</h1>
    <p class="rsv-lead">Acervo no se abre a todo el mundo de una. Déjanos cómo ubicarte y responde unas cosas — tardas menos de lo que llevas leyendo esto.</p>
    <div class="rsv-hr"></div>
    <div class="rsv-row2"><div class="rsv-field"><label for="rsv-nombre">Nombre completo</label><input id="rsv-nombre" type="text" placeholder="Nombre y apellido" autocomplete="name"></div><div class="rsv-field"><label for="rsv-correo">Correo</label><input id="rsv-correo" type="email" placeholder="tucorreo@ejemplo.com" autocomplete="email"></div></div>
    <button type="button" class="rsv-toggle" data-rsv-action="extra">+ agregar datos opcionales</button>
    <div id="rsv-extra"><div class="rsv-row2"><div class="rsv-field"><label for="rsv-fono">WhatsApp <i>(opcional)</i></label><input id="rsv-fono" type="tel" placeholder="+56 9 …" autocomplete="tel"></div><div class="rsv-field"><label for="rsv-inst">Universidad o estudio <i>(opcional)</i></label><input id="rsv-inst" type="text" placeholder="Dónde estudias o dónde trabajas"></div></div><div class="rsv-field"><label for="rsv-ref">¿Quién te habló de esto? <i>(opcional)</i></label><input id="rsv-ref" type="text" placeholder="Un nombre, un grupo, o «lo encontré solo»"></div></div>
    <div class="rsv-hr"></div><div class="rsv-eyebrow" style="margin-bottom:22px">Unas preguntas, cero letra chica</div><div id="rsv-q0">${questionMarkup(branchQuestion, 1)}</div><div id="rsv-rama"></div><div id="rsv-comunes"></div>`;
  renderBranch();
}

function setError(message, field) {
  const error = document.getElementById('rsv-err');
  if (error) error.textContent = message;
  const element = document.getElementById(field) || document.querySelector(`[data-rq="${field}"]`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable = element.matches('input,textarea,button') ? element : element.querySelector('input,textarea,button');
    if (focusable) focusable.focus();
    const title = element.querySelector('.rsv-qt');
    if (title) { title.style.color = '#B23B2E'; setTimeout(() => { title.style.color = ''; }, 1600); }
  }
}

function profileFor(values) {
  const locations = values.q_donde || [];
  if (locations.includes('El WhatsApp conmigo mismo')) return 'EL WHATSAPP CONSIGO MISMO';
  if (values.q_repetir === 'Sentarme a escribirlo de nuevo, aunque ya lo hice mil veces' || values.q_buscar === 'Tanto, que a veces prefiero rehacerlo') return 'EL ESCRITO QUE YA HABÍA HECHO';
  if (locations.includes('200 PDF en Descargas') || locations.includes('Descargas, junto a todo lo demás')) return 'LA CARPETA DE DESCARGAS';
  if (locations.includes('En mi cabeza (por ahora)')) return 'SU PROPIA MEMORIA';
  if (locations.includes('Fotocopias, impresos, anillados') || locations.includes('Carpeta física, en papel')) return 'UNA TORRE DE PAPEL';
  if (locations.includes('El Drive de un compañero') || locations.includes('El Drive del estudio')) return 'EL DRIVE DE OTRA PERSONA';
  if (values.q_repetir === 'No subrayo: releo y rezo') return 'LA RELECTURA ETERNA';
  return 'SUS PROPIAS CARPETAS';
}

function collectValues() {
  state.values.q_coment = document.getElementById('rsv-coment')?.value.trim() || '';
  return state.values;
}

function reservationResolution(id) {
  const values = state.values;
  const name = document.getElementById('rsv-nombre').value.trim().replace(/\s+/g, ' ');
  const email = document.getElementById('rsv-correo').value.trim();
  const number = String(typeof id === 'object' ? (id.id ?? id.reservation_id ?? 0) : id || 0).padStart(3, '0');
  const year = new Date().getFullYear();
  const surname = name.split(' ').slice(-1)[0].toUpperCase();
  const freedom = values.q_libertad ?? 5;
  const guidance = freedom >= 8 ? 'Concédasele el acceso sin tutorial, atendido que declaró querer las llaves y ningún acompañamiento.' : freedom <= 3 ? 'Muéstresele todo con calma la primera vez, según lo pidió expresamente.' : 'Muéstresele lo justo y déjesele probar, que es como pidió aprender.';
  const content = document.getElementById('rsv-content');
  content.innerHTML = `<div class="rsv-eyebrow">Acervo · solicitud recibida</div><div class="rsv-stampzone"><div class="rsv-stamp">Cupo reservado nº ${esc(number)}</div></div><div class="rsv-res"><div class="rsv-rol">Rol Nº A-${esc(number)}-${year}</div><div class="rsv-carat">${esc(surname)} con ${esc(profileFor(values))}</div><div class="rsv-place">Acervo, ${new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}.</div><div class="rsv-h">SE RESUELVE:</div><ol><li>Téngase por reservado el acceso de don/doña <b>${esc(name)}</b>, bajo el número ${esc(number)} de esta lista.</li><li>Notifíquese por correo electrónico a <b>${esc(email)}</b> en cuanto se abra el siguiente grupo.</li><li>${esc(guidance)}</li><li>Ténganse por autorizados sus datos solo para lo dicho, con facultad de revocar cuando quiera.</li><li>Archívese la excusa de «después lo ordeno».</li></ol><div class="rsv-firma"><b>Acervo</b><br>Tu espacio de estudio y trabajo</div></div><div class="rsv-real"><strong>Ahora en serio:</strong> quedaste anotado. Cuando abramos el siguiente grupo te llega el correo con tu acceso. Tus datos quedan solo para eso; si te arrepientes, escribe a <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> y los borramos.</div><div class="rsv-hr"></div><button type="button" class="rsv-send" data-rsv-action="close">Listo, volver</button><p class="rsv-foot">Puedes cerrar esta ventana. Ya está guardado.</p>`;
  document.getElementById('rsv-back').scrollTop = 0;
}

async function submitReservation() {
  collectValues();
  const values = state.values;
  const validation = validateAccessRequest({ name: document.getElementById('rsv-nombre').value, email: document.getElementById('rsv-correo').value, branch: values.rama, responses: values, requiredByBranch: REQUIRED_BY_BRANCH, consent: document.getElementById('rsv-ok')?.checked });
  if (!validation.ok) {
    if (validation.field === 'rsv-ok') document.getElementById('rsv-consent')?.classList.add('falta');
    setError(validation.message, validation.field);
    return;
  }
  const button = document.getElementById('rsv-send');
  button.disabled = true;
  button.textContent = 'Guardando…';
  const payload = buildAccessRequestPayload({ name: validation.name, email: validation.email, phone: document.getElementById('rsv-fono')?.value, institution: document.getElementById('rsv-inst')?.value, referred: document.getElementById('rsv-ref')?.value, branch: values.rama, profile: profileFor(values), comment: values.q_coment, responses: values, consentVersion: CONSENT_VERSION });
  try {
    const client = window.acervoSupabase;
    if (!client?.rpc) throw new Error('Supabase client unavailable');
    const { data, error } = await client.rpc('reservar_acceso', { p: payload });
    if (error) throw error;
    reservationResolution(data);
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Reservar mi cupo →';
    setError('No pudimos guardar tu reserva. Revisa la conexión y vuelve a intentar.', 'rsv-send');
    console.warn('reservar_acceso:', error?.message || error);
  }
}

function handleClick(event) {
  const target = event.target.closest('[data-rsv-action]');
  if (!target) return;
  const action = target.dataset.rsvAction;
  if (action === 'close') return closeReservaAcceso();
  if (action === 'extra') {
    const extra = document.getElementById('rsv-extra');
    const open = extra.classList.toggle('show');
    target.textContent = open ? '– ocultar datos opcionales' : '+ agregar datos opcionales';
  } else if (action === 'notice') {
    const box = document.getElementById('rsv-datosbox');
    const open = box.classList.toggle('show');
    target.textContent = open ? 'ocultar' : 'cómo usamos tus datos';
  } else if (action === 'pick') {
    const { rsvId: id, rsvType: type, rsvValue: value } = target.dataset;
    if (type === 'single') {
      state.values[id] = value;
      target.parentElement.querySelectorAll('.rsv-opt').forEach((option) => { option.classList.toggle('sel', option === target); option.setAttribute('aria-pressed', option === target); });
      if (id === 'rama') {
        delete state.values.q_donde; delete state.values.q_buscar; delete state.values.q_repetir;
        renderBranch();
        document.getElementById('rsv-rama')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      const selected = new Set(state.values[id] || []);
      selected.has(value) ? selected.delete(value) : selected.add(value);
      state.values[id] = [...selected];
      target.classList.toggle('sel', selected.has(value));
      target.setAttribute('aria-pressed', selected.has(value));
    }
    const error = document.getElementById('rsv-err');
    if (error) error.textContent = '';
  } else if (action === 'submit') {
    submitReservation();
  }
}

function handleInput(event) {
  if (event.target.id === 'rsv-coment') state.values.q_coment = event.target.value;
  if (event.target.dataset.rsvAction === 'range') {
    state.values.q_libertad = Number(event.target.value);
    document.getElementById('rsv-barval').textContent = commonQuestions[1].labels[state.values.q_libertad];
  }
}

function closeReservaAcceso() {
  const backdrop = document.getElementById('rsv-back');
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  document.getElementById('login-screen')?.classList.remove('rsv-blur');
}

function openReservaAcceso() {
  state.values = { q_libertad: 5 };
  document.getElementById('login-screen')?.classList.add('rsv-blur');
  const backdrop = document.getElementById('rsv-back');
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  renderForm();
  document.getElementById('rsv-nombre')?.focus();
}

window.openReservaAcceso = openReservaAcceso;
window.closeReservaAcceso = closeReservaAcceso;

document.addEventListener('DOMContentLoaded', () => {
  const backdrop = document.getElementById('rsv-back');
  if (!backdrop) return;
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) closeReservaAcceso(); });
  backdrop.addEventListener('click', handleClick);
  backdrop.addEventListener('input', handleInput);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && backdrop.classList.contains('open')) closeReservaAcceso(); });
});
