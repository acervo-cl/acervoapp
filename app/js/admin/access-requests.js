const ACCESS_REQUEST_STATUSES = [
  ['nuevo', 'Nuevo'],
  ['contactado', 'Contactado'],
  ['invitado', 'Invitado'],
  ['descartado', 'Descartado'],
];

let _accessRequestRows = [];
let _accessRequestFilter = 'all';
let _accessRequestQuery = '';

function accessRequestStatus(row) {
  return row && row.estado ? row.estado : 'nuevo';
}

function accessRequestStatusLabel(status) {
  return (ACCESS_REQUEST_STATUSES.find(([value]) => value === status) || [status, status])[1];
}

function accessRequestDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-CL', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function accessRequestSearchText(row) {
  const answers = row && row.respuestas ? row.respuestas : {};
  return [
    row && row.nombre, row && row.correo, row && row.fono, row && row.institucion,
    row && row.referido, row && row.rama, row && row.perfil, row && row.comentario,
    answers.q_donde, answers.q_buscar, answers.q_repetir, answers.q_celular, answers.q_libertad,
  ].flat().filter(Boolean).join(' ').toLowerCase();
}

function filteredAccessRequests() {
  const query = _accessRequestQuery.trim().toLowerCase();
  return _accessRequestRows.filter((row) => {
    const matchesStatus = _accessRequestFilter === 'all' || accessRequestStatus(row) === _accessRequestFilter;
    return matchesStatus && (!query || accessRequestSearchText(row).includes(query));
  });
}

function renderAccessRequestSummary() {
  const host = document.getElementById('access-requests-summary');
  if (!host) return;
  const count = (status) => _accessRequestRows.filter((row) => !status || accessRequestStatus(row) === status).length;
  host.innerHTML = [
    ['all', 'Total'], ['nuevo', 'Nuevas'], ['contactado', 'Contactadas'], ['invitado', 'Invitadas'],
  ].map(([status, label]) => `<div class="access-admin-stat"><div class="access-admin-stat-value">${count(status === 'all' ? '' : status)}</div><div class="access-admin-stat-label">${label}</div></div>`).join('');
}

function renderAccessRequestRows() {
  const host = document.getElementById('admin-access-requests');
  if (!host) return;
  const rows = filteredAccessRequests();
  if (!rows.length) {
    host.innerHTML = `<div class="access-admin-empty">${_accessRequestRows.length ? 'No hay solicitudes que coincidan con el filtro.' : 'Todavía nadie ha reservado acceso.'}</div>`;
    return;
  }
  host.innerHTML = rows.map((row) => {
    const answers = row.respuestas || {};
    const where = Array.isArray(answers.q_donde) ? answers.q_donde.join(' · ') : answers.q_donde;
    const status = accessRequestStatus(row);
    return `<div class="access-admin-row">
      <div class="access-admin-row-top">
        <div class="access-admin-main">
          <div class="access-admin-name">${escapeHtml(row.nombre || '—')} <span class="access-admin-pill">${escapeHtml(row.rama || 'sin rama')}</span></div>
          <div class="access-admin-meta">${escapeHtml(row.correo || '')}${row.fono ? ` · ${escapeHtml(row.fono)}` : ''}${row.institucion ? ` · ${escapeHtml(row.institucion)}` : ''}</div>
        </div>
        <div class="access-admin-date">${accessRequestDate(row.created_at)}</div>
        <select class="access-admin-status" onchange="setAccessRequestStatus(${Number(row.id)},this.value)">
          ${ACCESS_REQUEST_STATUSES.map(([value, label]) => `<option value="${value}" ${status === value ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
        <button class="btn-ghost" style="font-size:12px;padding:6px 12px" onclick="createUserFromAccessRequest(${Number(row.id)})">＋ Crear cuenta</button>
        <button class="btn-ghost" style="font-size:12px;padding:6px 10px;color:var(--danger)" onclick="deleteAccessRequest(${Number(row.id)})">🗑</button>
      </div>
      <div class="access-admin-answers">
        <b>Dónde vive:</b> ${escapeHtml(where || '—')} · <b>Buscar:</b> ${escapeHtml(answers.q_buscar || '—')} · <b>Repetir:</b> ${escapeHtml(answers.q_repetir || '—')}<br>
        <b>Teléfono:</b> ${escapeHtml(answers.q_celular || '—')} · <b>Libertad:</b> ${escapeHtml(answers.q_libertad ?? '—')}/10 · <b>Perfil:</b> ${escapeHtml(row.perfil || '—')}${row.referido ? ` · <b>Le habló:</b> ${escapeHtml(row.referido)}` : ''}
        ${row.comentario ? `<br><b>Comentario:</b> «${escapeHtml(row.comentario)}»` : ''}
      </div>
    </div>`;
  }).join('');
}

function filterAccessRequests(value) {
  _accessRequestFilter = value || 'all';
  renderAccessRequestRows();
}

function searchAccessRequests(value) {
  _accessRequestQuery = value || '';
  renderAccessRequestRows();
}

async function renderAccessRequests() {
  const host = document.getElementById('admin-access-requests');
  if (!host) return;
  if (!STATE.isAdmin) {
    host.innerHTML = '';
    return;
  }
  const client = window.acervoSupabase;
  if (!client || typeof client.from !== 'function') {
    host.innerHTML = '<div class="access-admin-empty">Supabase no está disponible.</div>';
    return;
  }
  host.innerHTML = '<div class="access-admin-empty">Cargando solicitudes…</div>';
  const { data, error } = await client.from('access_requests').select('*').order('created_at', { ascending: false });
  if (error) {
    host.innerHTML = `<div class="access-admin-empty" style="color:#f88">No se pudieron cargar las solicitudes: ${escapeHtml(error.message)}</div>`;
    return;
  }
  _accessRequestRows = data || [];
  renderAccessRequestSummary();
  renderAccessRequestRows();
}

function createUserFromAccessRequest(id) {
  const row = _accessRequestRows.find((item) => Number(item.id) === Number(id));
  if (!row) return;
  if (typeof openCreateUser !== 'function') {
    toast('No está disponible el formulario de usuarios.', 'error');
    return;
  }
  openCreateUser(row.correo || '', row.nombre || '');
}

async function setAccessRequestStatus(id, status) {
  if (!ACCESS_REQUEST_STATUSES.some(([value]) => value === status)) return;
  const client = window.acervoSupabase;
  const { error } = await client.from('access_requests').update({ estado: status }).eq('id', id);
  if (error) {
    toast(`Error: ${error.message}`, 'error');
    return;
  }
  const row = _accessRequestRows.find((item) => Number(item.id) === Number(id));
  if (row) row.estado = status;
  renderAccessRequestSummary();
  renderAccessRequestRows();
  toast(`Solicitud marcada como ${accessRequestStatusLabel(status)}`, 'success');
}

async function deleteAccessRequest(id) {
  if (!confirm('¿Borrar esta solicitud? No se puede deshacer.')) return;
  const client = window.acervoSupabase;
  const { error } = await client.from('access_requests').delete().eq('id', id);
  if (error) {
    toast(`Error: ${error.message}`, 'error');
    return;
  }
  _accessRequestRows = _accessRequestRows.filter((row) => Number(row.id) !== Number(id));
  renderAccessRequestSummary();
  renderAccessRequestRows();
  toast('Solicitud eliminada', 'success');
}

function downloadAccessRequestsCsv() {
  if (!_accessRequestRows.length) {
    toast('No hay solicitudes que exportar', 'error');
    return;
  }
  const columns = [
    ['Fecha', (row) => accessRequestDate(row.created_at)], ['Nombre', (row) => row.nombre], ['Correo', (row) => row.correo],
    ['WhatsApp', (row) => row.fono], ['Universidad o estudio', (row) => row.institucion], ['Quién le habló', (row) => row.referido],
    ['Estudia o ejerce', (row) => row.rama], ['Contraparte (perfil)', (row) => row.perfil],
    ['Dónde vive su material', (row) => (row.respuestas || {}).q_donde], ['Buscar y no encontrar', (row) => (row.respuestas || {}).q_buscar],
    ['Trabajo que se repite', (row) => (row.respuestas || {}).q_repetir], ['Teléfono = libertad', (row) => (row.respuestas || {}).q_celular],
    ['Libertad (0-10)', (row) => (row.respuestas || {}).q_libertad], ['Comentario', (row) => row.comentario],
    ['Estado', (row) => accessRequestStatus(row)], ['Autorizó uso de datos', (row) => row.consent ? 'sí' : 'no'],
    ['Texto aceptado', (row) => row.consent_version],
  ];
  const cell = (value) => `"${String(Array.isArray(value) ? value.join(' | ') : value == null ? '' : value).replace(/"/g, '""')}"`;
  const csv = `\ufeff${[columns.map(([label]) => cell(label)).join(';')].concat(_accessRequestRows.map((row) => columns.map(([, get]) => cell(get(row))).join(';'))).join('\r\n')}`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  link.download = `acervo-solicitudes-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 2000);
}
