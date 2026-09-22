// ── La plantilla del estudio se aplica SOLA al equipo cuando el admin guarda (ya no hay botón "Publicar") ──
let _masterSig = null, _masterSyncT = null;

function _masterData() {
  return {
    tiposDoc: TIPOSDOC,
    modelos: MODELOS,
    removedTiposDoc: STATE.removedTiposDoc || [],
    compareceTpl: STATE.compareceTpl || null,
    causaTpl: STATE.causaTpl || null,
    indivTpl: STATE.indivTpl || null,
    materias: STATE.materias || null,
    rolesProcesales: STATE.rolesProcesales || null,
    tribTipos: STATE.tribTipos || null
  };
}

async function _writeMaster() {
  if (!STATE.isAdmin || typeof sb === 'undefined' || !sb || !STATE.uid) return;
  const data = Object.assign({}, _masterData(), {
    publishedAt: new Date().toISOString(),
    publishedBy: STATE.user || ''
  });
  try {
    await sb.from('acervo_master').upsert({ id: 'master', data, updated_at: new Date().toISOString() });
  } catch (e) {
    console.warn('master sync:', e.message || e);
  }
}

function syncMaster() {
  if (!STATE.isAdmin || _masterSig === null) return;
  let sig;
  try { sig = JSON.stringify(_masterData()); } catch (_) { return; }
  if (sig === _masterSig) return;
  _masterSig = sig;
  clearTimeout(_masterSyncT);
  _masterSyncT = setTimeout(_writeMaster, 1200);
}

function initMasterBaseline() {
  if (STATE.isAdmin) {
    try { _masterSig = JSON.stringify(_masterData()); } catch (_) { _masterSig = ''; }
  }
}

async function loadMasterConfig() {
  if (typeof sb === 'undefined' || !sb) return;
  if (STATE.isAdmin) return;
  try {
    const { data, error } = await sb.from('acervo_master').select('data').eq('id', 'master').maybeSingle();
    if (error || !data || !data.data) return;
    applyMasterToSession(data.data);
  } catch (e) {}
}

function applyMasterToSession(m) {
  if (!m) return;
  STATE.removedTiposDoc = Array.isArray(m.removedTiposDoc) ? m.removedTiposDoc : [];
  const tipos = (m.tiposDoc || []).filter(t => t && t.paraTodos);
  TIPOSDOC.length = 0;
  tipos.forEach(t => TIPOSDOC.push(JSON.parse(JSON.stringify(t))));
  if (Array.isArray(m.modelos)) {
    const ids = new Set(TIPOSDOC.map(t => t.id));
    MODELOS.length = 0;
    m.modelos.forEach(x => {
      if (ids.has(x.tipoId || x.categoria) && x.paraTodos !== false) {
        MODELOS.push(JSON.parse(JSON.stringify(x)));
      }
    });
  }
  if (m.compareceTpl !== undefined) STATE.compareceTpl = m.compareceTpl;
  if (m.causaTpl !== undefined) STATE.causaTpl = m.causaTpl;
  if (m.indivTpl !== undefined) STATE.indivTpl = m.indivTpl;
  if (m.materias !== undefined) STATE.materias = m.materias;
  if (m.rolesProcesales !== undefined) STATE.rolesProcesales = m.rolesProcesales;
  if (m.tribTipos !== undefined) STATE.tribTipos = m.tribTipos;
}

async function publishMaster() {
  if (!STATE.isAdmin) { toast('Solo el administrador puede publicar', 'error'); return; }
  if (typeof sb === 'undefined' || !sb || !STATE.uid) { toast('Necesitas sesión en la nube para publicar', 'error'); return; }
  const cnt = (TIPOSDOC || []).filter(t => t.paraTodos).length;
  if (!confirm(`¿Publicar la plantilla para TODOS los usuarios?\n\nSe publicarán ${cnt} tipo(s) marcados como “disponible para todos”, con sus modelos, estructura, comparecencia, individualización, materias y roles/calidades.\n\nLos usuarios verán estos cambios al volver a entrar.`)) return;
  const data = {
    tiposDoc: TIPOSDOC,
    modelos: MODELOS,
    removedTiposDoc: STATE.removedTiposDoc || [],
    compareceTpl: STATE.compareceTpl || null,
    causaTpl: STATE.causaTpl || null,
    indivTpl: STATE.indivTpl || null,
    materias: STATE.materias || null,
    rolesProcesales: STATE.rolesProcesales || null,
    tribTipos: STATE.tribTipos || null,
    publishedAt: new Date().toISOString(),
    publishedBy: STATE.user || ''
  };
  try {
    const { error } = await sb.from('acervo_master').upsert({ id: 'master', data, updated_at: new Date().toISOString() });
    if (error) throw error;
    toast('Plantilla publicada para todos ✓', 'success');
  } catch (e) {
    toast('No se pudo publicar: ' + (e.message || e), 'error');
  }
}

async function loadBaseBooks() {
  if (typeof sb === 'undefined' || !sb) return;
  try {
    const { data, error } = await sb.from('acervo_base_books').select('data').eq('id', 'base').maybeSingle();
    if (error || !data || !data.data) return;
    const books = (data.data.books) || [];
    const hidden = new Set(STATE.hiddenBooks || []);
    books.forEach((b) => {
      if (!b || !b.id) return;
      if (hidden.has(b.id)) return;
      if (DOCUMENTS.some(x => x.id === b.id)) return;
      DOCUMENTS.push(Object.assign({}, b, { shared: true, baseLib: true, unlocked: false, owner: 'admin' }));
    });
  } catch (e) {}
}

async function toggleBaseBook(id) {
  if (!STATE.isAdmin) { toast('Solo el administrador', 'error'); return; }
  const d = DOCUMENTS.find(x => x.id === id);
  if (!d) { toast('Libro no encontrado', 'error'); return; }
  d.baseLib = !d.baseLib;
  if (d.baseLib && d.hasFile && _hasStorage()) {
    try {
      const blob = await getFileBlob(id);
      if (blob) await sb.storage.from(FILE_BUCKET).upload('base/' + id, blob, { upsert: true, contentType: blob.type || 'application/octet-stream' });
    } catch (e) {
      toast('No se pudo subir el archivo base', 'error');
    }
  }
  saveState();
  await publishBaseBooks();
  toast(d.baseLib ? 'Agregado a la biblioteca base del estudio ✓' : 'Quitado de la base', 'success');
  try { refreshLibrary(); } catch (_) {}
}

async function publishBaseBooks() {
  if (!STATE.isAdmin || typeof sb === 'undefined' || !sb) return;
  const books = DOCUMENTS.filter(d => d.baseLib && !d.shared).map(d => {
    const c = Object.assign({}, d);
    delete c._shareNotes;
    delete c._shareBack;
    return c;
  });
  try {
    await sb.from('acervo_base_books').upsert({ id: 'base', data: { books, updatedAt: new Date().toISOString() }, updated_at: new Date().toISOString() });
  } catch (e) {
    toast('No se pudo publicar la base: ' + (e.message || e), 'error');
  }
}

let _connections = [];

async function loadConnections() {
  _connections = [];
  if (typeof sb === 'undefined' || !sb || !STATE.uid) return;
  try {
    const { data, error } = await sb.from('acervo_connections').select('*').or(`requester_id.eq.${STATE.uid},addressee_id.eq.${STATE.uid}`);
    if (error) return;
    const rows = data || [];
    const ids = [...new Set(rows.map(c => c.requester_id === STATE.uid ? c.addressee_id : c.requester_id))];
    let map = {};
    if (ids.length) {
      try {
        const { data: profs } = await sb.from('profiles').select('id,email,display_name,rut,firma').in('id', ids);
        (profs || []).forEach(p => map[p.id] = p);
      } catch (_) {
        try {
          const { data: profs } = await sb.from('profiles').select('id,email,display_name,rut').in('id', ids);
          (profs || []).forEach(p => map[p.id] = p);
        } catch (__) {}
      }
    }
    rows.forEach(c => {
      const oid = c.requester_id === STATE.uid ? c.addressee_id : c.requester_id;
      c.other = map[oid] || { id: oid, email: '' };
      c.incoming = (c.addressee_id === STATE.uid);
    });
    _connections = rows;
  } catch (e) {}
}

function socialCollaborators() { return _connections.filter(c => c.status === 'accepted').map(c => c.other); }

function teamColaboradores() {
  return socialCollaborators().map((p) => {
    const f = (p && p.firma) || {};
    return {
      id: p.id,
      nombre: f.nombre || p.display_name || p.email || '',
      rut: f.rut || p.rut || '',
      domicilio: f.domicilio || '',
      correo: f.correo || p.email || '',
      cargo: f.cargo || p.cargo || 'Abogado',
      _team: true
    };
  }).filter(c => (c.nombre || '').trim());
}

function allColaboradores() {
  const team = teamColaboradores();
  const ids = new Set(team.map(c => c.id));
  const manual = (STATE.colaboradores || []).filter(c => !ids.has(c.id));
  return team.concat(manual);
}

function findColaborador(id) { return allColaboradores().find(c => String(c.id) === String(id)); }
function _pendingIncoming() { return _connections.filter(c => c.status === 'pending' && c.incoming); }
function socialBadgeCount() { return _pendingIncoming().length; }

async function socialInvite() {
  const inp = document.getElementById('social-email');
  const email = (inp && inp.value || '').trim().toLowerCase();
  if (!/.+@.+\..+/.test(email)) { toast('Correo no válido', 'error'); return; }
  if (email === (STATE.user || '').toLowerCase()) { toast('Ese eres tú 🙂', 'error'); return; }
  try {
    const { data: profs } = await sb.from('profiles').select('id,email').ilike('email', email);
    const p = (profs || [])[0];
    if (!p) { toast('Ese correo aún no está en Acervo. Pídele al admin que cree la cuenta.', 'error'); return; }
    if (_connections.some(c => c.other && c.other.id === p.id)) { toast('Ya tienes conexión o solicitud con esa persona', 'error'); return; }
    const { error } = await sb.from('acervo_connections').insert({ requester_id: STATE.uid, addressee_id: p.id, status: 'pending' });
    if (error) { toast('No se pudo invitar: ' + error.message, 'error'); return; }
    if (inp) inp.value = '';
    toast('Solicitud enviada ✓', 'success');
    await loadConnections();
    renderSocial();
  } catch (e) {
    toast('Error: ' + (e.message || e), 'error');
  }
}

async function socialAccept(id) {
  try {
    const { error } = await sb.from('acervo_connections').update({ status: 'accepted' }).eq('id', id);
    if (error) throw error;
    await loadConnections();
    renderSocial();
    toast('Ahora colaboran ✓', 'success');
  } catch (e) {
    toast('Error: ' + (e.message || e), 'error');
  }
}

async function socialRemove(id) {
  if (!confirm('¿Quitar esta conexión/solicitud?')) return;
  try {
    const { error } = await sb.from('acervo_connections').delete().eq('id', id);
    if (error) throw error;
    await loadConnections();
    renderSocial();
  } catch (e) {
    toast('Error: ' + (e.message || e), 'error');
  }
}

function openSocial() {
  try { closeAvatarMenu(); } catch (_) {}
  loadConnections().then(renderSocial);
  openModal('modal-social');
}

function renderSocial() {
  const body = document.getElementById('social-body');
  if (!body) return;
  const accepted = _connections.filter(c => c.status === 'accepted');
  const incoming = _pendingIncoming();
  const outgoing = _connections.filter(c => c.status === 'pending' && !c.incoming);
  const nm = o => escapeHtml((o && (o.display_name || o.email)) || 'Usuario');
  const sub = o => escapeHtml([o && o.email, o && o.rut].filter(Boolean).join(' · '));
  const row = (o, right) => `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid rgba(255,255,255,.06)"><div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold2));color:var(--navy);font-weight:800;display:flex;align-items:center;justify-content:center;flex:0 0 auto">${nm(o).slice(0,2).toUpperCase()}</div><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13.5px">${nm(o)}</div><div style="font-size:11px;color:var(--gray2)">${sub(o)}</div></div>${right}</div>`;
  body.innerHTML = `<div class="modal-title">🤝 Mi equipo</div>
    <div style="font-size:12px;color:var(--gray2);margin:-6px 0 10px">Tus colegas de Acervo. Al redactar con colaboradores (PYP/mandatos) los eliges de aquí y sus datos (nombre, RUT, domicilio, correo) se agregan solos desde su perfil.</div>
    <div class="form-row"><label class="form-label">Invitar a mi equipo (por correo)</label>
      <div style="display:flex;gap:8px"><input class="form-input" id="social-email" type="email" placeholder="colega@ejemplo.com" style="flex:1" onkeydown="if(event.key==='Enter')socialInvite()"><button class="btn-gold" onclick="socialInvite()">Invitar</button></div>
      <div style="font-size:11px;color:var(--gray2);margin-top:4px">Debe tener cuenta en Acervo. Le llegará una solicitud que verá en su Mi equipo.</div>
    </div>
    ${incoming.length ? `<div class="partes-h" style="margin-top:14px">Solicitudes recibidas (${incoming.length})</div>${incoming.map(c => row(c.other, `<button class="btn-gold" style="padding:6px 12px;font-size:12px" onclick="socialAccept('${c.id}')">Aceptar</button><button class="btn-ghost" style="padding:6px 10px;font-size:12px;color:var(--danger)" onclick="socialRemove('${c.id}')">✕</button>`)).join('')}` : ''}
    <div class="partes-h" style="margin-top:14px">Mi equipo${accepted.length ? ` (${accepted.length})` : ''}</div>
    ${accepted.length ? accepted.map(c => row(c.other, `<button class="btn-ghost" style="padding:6px 10px;font-size:12px;color:var(--danger)" onclick="socialRemove('${c.id}')" title="Quitar">✕</button>`)).join('') : '<div style="font-size:12.5px;color:var(--gray2);padding:8px 0">Aún no tienes colaboradores. Invita a alguien por su correo.</div>'}
    ${outgoing.length ? `<div class="partes-h" style="margin-top:14px">Solicitudes enviadas (${outgoing.length})</div>${outgoing.map(c => row(c.other, `<span style="font-size:11px;color:var(--gold3)">pendiente</span><button class="btn-ghost" style="padding:6px 10px;font-size:12px;color:var(--danger)" onclick="socialRemove('${c.id}')" title="Cancelar">✕</button>`)).join('')}` : ''}
    <div class="modal-footer"><button class="btn-gold" onclick="closeAllModals()">Cerrar</button></div>`;
}

async function loadSharedBooks() {
  for (let i = DOCUMENTS.length - 1; i >= 0; i--) {
    const d = DOCUMENTS[i];
    if (d && d.shared && !d.sharedDoc) DOCUMENTS.splice(i, 1);
  }
  return;
}

async function shareBookToCloud(doc, scope, userIds) {
  const id = (doc.id && String(doc.id).startsWith('sb_')) ? doc.id : ('sb_' + Date.now());
  const row = {
    id,
    title: doc.title,
    subject: doc.subject || '',
    pages: doc.pages || 0,
    type: doc.type || 'Compartido',
    summary: doc.summary || '',
    content: doc.content || '',
    tags: doc.tags || [],
    scope,
    created_by: STATE.uid,
    updated_at: new Date().toISOString()
  };
  const { error } = await sb.from('shared_books').upsert(row);
  if (error) { toast('Error al compartir: ' + error.message, 'error'); return null; }
  await sb.from('shared_book_access').delete().eq('book_id', id);
  if (scope === 'selected' && userIds.length) {
    const { error: e2 } = await sb.from('shared_book_access').insert(userIds.map(u => ({ book_id: id, user_id: u })));
    if (e2) console.warn('accesos:', e2.message);
  }
  return id;
}

async function unshareBookFromCloud(id) {
  try { await sb.from('shared_book_access').delete().eq('book_id', id); } catch (e) {}
  try { await sb.from('shared_books').delete().eq('id', id); } catch (e) {}
}

async function loadSharedAccess(id) {
  if (!id || !String(id).startsWith('sb_')) return [];
  const { data } = await sb.from('shared_book_access').select('user_id').eq('book_id', id);
  return (data || []).map(r => r.user_id);
}
