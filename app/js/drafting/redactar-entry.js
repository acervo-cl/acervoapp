let _RW = null;

function renderRedactarList() {
  ensureModelos();
  const host = document.getElementById('redactar-list');
  if (!host) return;
  const perfil = STATE.perfilAbogado || {};
  let html = '';
  const d = STATE.redaccionDraft;
  if (d) {
    const t = tipoNombre(d.tipoDoc) || 'documento';
    html += `<div class="redactar-hint" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span>📝 Tienes una <b>redacción en curso</b> (${escapeHtml(t)}${d.cx && d.cx.caratula ? ` · ${escapeHtml(d.cx.caratula)}` : ''}).</span><span style="display:flex;gap:8px"><button class="btn-gold" onclick="rwResumeDraft()">Continuar</button><button class="btn-ghost" onclick="rwDiscardDraft()">Descartar</button></span></div>`;
  }
  if (!perfil.nombre) {
    html += '<div class="redactar-hint">⚠️ Aún no completas tu <b>perfil de abogado</b> (nombre, RUT, domicilio). Se usa en el patrocinio y poder y en las notificaciones. <a href="#" onclick="openPartesPanel();return false">Completar perfil →</a></div>';
  }
  if (_redView === 'historial') {
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div class="content-title" style="font-size:16px">📜 Historial</div><button class="btn-ghost" onclick="_redView=\'chooser\';renderRedactarList()">← Volver</button></div>';
    host.innerHTML = html + renderHistorial();
    return;
  }
  html += `<div style="font-size:15px;color:var(--white);font-weight:600;margin-bottom:2px">¿Qué quieres redactar?</div>
    <div style="font-size:12px;color:var(--gray2);margin-bottom:14px">Elige el tipo de documento para empezar.</div>
    <div class="rw-tipos"><button class="rw-tipo" onclick="rwLibre()"><div class="rw-tipo-l">📄 Libre</div><div class="rw-tipo-d">Hoja en blanco para escribir o pegar. Sale con membrete y PDF, listo para el tribunal.</div></button>${TIPOSDOC.map((t) => `<button class="rw-tipo" onclick="openRedactarTipo('${t.id}')"><div class="rw-tipo-l">${t.icono || ''} ${escapeHtml(t.nombre)}</div><div class="rw-tipo-d">${escapeHtml(t.desc || '')}</div></button>`).join('')}</div>
    <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn-ghost" onclick="_redView='historial';renderRedactarList()">📜 Ver historial de documentos</button><button class="btn-ghost" onclick="openHerramientas(null,'cifras')">🛠️ Herramientas</button></div>`;
  host.innerHTML = html;
}

function openRedactarTipo(tid) {
  ensureModelos();
  _RW = { tipoDoc: tid, cx: { expId: null, rol: '', caratula: '', tribunal: '', tipo: '', submateria: '', tienePoder: false, rolProcesal: 'demandante', clienteId: '', esCAJ: false, partes: {} }, fixedCausa: false, mode: 'exist', escs: [], step: 'tipo' };
  openModal('modal-redactar');
  rwGo(1);
}

function renderHistorial() {
  const docs = EXDOCS.filter((x) => x.kind === 'exescrito' && x.redactado).sort((a, b) => (b.created || 0) - (a.created || 0));
  if (!docs.length) return '<div class="favs-empty" style="width:100%"><div>📜</div><p>Aún no has generado documentos.<br>Usa <b>＋ Redactar</b> para crear el primero.</p></div>';
  return docs.map((x) => {
    const e = EXPEDIENTES.find((p) => p.id === x.expediente);
    const snip = (stripHtml(x.content || '').slice(0, 160)) || '(vacío)';
    const fecha = x.created ? new Date(x.created).toLocaleDateString('es-CL') : '';
    return `<div class="hist-card">
      <div style="flex:1;min-width:0">
        <div class="redactar-card-title">📄 ${escapeHtml(x.title || 'Documento')} <span style="font-size:11px;color:var(--gray2);font-weight:400">${escapeHtml(tipoNombre(x.tipoDoc) || '')} · ${fecha}</span></div>
        <div class="redactar-card-sub">📁 ${escapeHtml(e ? e.name : '(sin carpeta)')}</div>
        <div class="hist-snip">${escapeHtml(snip)}</div>
      </div>
      <div class="redactar-card-acts">
        <button class="btn-gold" onclick="openExdoc('${x.id}')">Abrir</button>
        ${e ? `<button class="btn-ghost" onclick="openExpediente('${e.id}')">📂 Ir a carpeta</button>` : ''}
        <button class="btn-ghost" onclick="printRedaccion('${x.id}')">🖨️ PDF</button>
        <button class="btn-ghost" onclick="printRedaccion('${x.id}','share')">⬇ Guardar</button>
      </div>
    </div>`;
  }).join('');
}

function rwSteps() {
  if (!_RW.tipoDoc) return ['tipo'];
  const t = tipoById(_RW.tipoDoc);
  if (_RW.masivoIds && _RW.masivoIds.length) return ['tipo', 'escritos', 'generar'];
  if (t && (t.motor || 'judicial') === 'documental') return ['tipo', 'modelo', 'datos', 'generar'];
  const ex = (_RW.cx && _RW.cx.expId) ? EXPEDIENTES.find((x) => x.id === _RW.cx.expId) : null;
  const pedirCausa = !_RW.fixedCausa || (ex && (ex.prep || !ex.tribunal));
  const hasRoles = (_RW.escs || []).some((e) => {
    const m = MODELOS.find((x) => x.id === e.modeloId);
    return m && (m.roles || []).length;
  });
  return ['tipo', ...(pedirCausa ? ['causa'] : []), 'escritos', ...(hasRoles ? ['datos'] : []), 'generar'];
}

function openRedactar(expId) {
  ensureModelos();
  let cx;
  let fixed = false;
  if (expId) {
    const e = EXPEDIENTES.find((x) => x.id === expId);
    if (!e) {
      toast('No se encontró la causa', 'error');
      return;
    }
    cx = cxFromExpediente(e);
    fixed = true;
  } else {
    cx = { expId: null, rol: '', caratula: '', tribunal: '', tipo: '', submateria: '', tienePoder: false, rolProcesal: 'demandante', clienteId: '', esCAJ: false };
  }
  _RW = { tipoDoc: null, cx, fixedCausa: fixed, mode: 'exist', escs: [], step: 'tipo' };
  rwPrefillPartes();
  openModal('modal-redactar');
  renderRW();
}

function openMasivoFromCausas() {
  const ids = [..._expSel];
  if (!ids.length) {
    toast('Selecciona al menos una causa', 'error');
    return;
  }
  ensureModelos();
  _startMasivo(ids);
}

function _startMasivo(ids) {
  const base = EXPEDIENTES.find((x) => x.id === ids[0]);
  const cx = base ? cxFromExpediente(base) : { expId: null, rol: '', caratula: '', tribunal: '', tipo: '', submateria: '', tienePoder: false, rolProcesal: 'demandante', clienteId: '', esCAJ: '' };
  _RW = { tipoDoc: null, cx, fixedCausa: false, mode: 'exist', escs: [], step: 'tipo', masivoIds: ids.slice() };
  _expSelMode = false;
  try {
    _expSel.clear();
  } catch (_) {}
  openModal('modal-redactar');
  renderRW();
}

function openMasivoPicker() {
  const list = EXPEDIENTES.filter((e) => !e.shared).slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const sel = new Set(_RW.masivoIds || []);
  const rowsHtml = list.map((e) => {
    const cli = findCliente(e.clienteId);
    return `<label class="rw-check" style="display:flex;gap:9px;align-items:center;padding:8px 6px;border-bottom:1px solid rgba(201,168,76,.08);margin:0"><input type="checkbox" class="masivo-c" value="${e.id}" ${sel.has(e.id) ? 'checked' : ''} style="width:16px;height:16px"><div style="min-width:0"><div style="font-weight:600;font-size:13px">${escapeHtml(causaLabel(e))}</div><div style="font-size:11px;color:var(--gray2)">${escapeHtml([e.rol, e.tribunal, cli && cli.nombre].filter(Boolean).join(' · '))}</div></div></label>`;
  }).join('') || '<div style="font-size:12.5px;color:var(--gray2);padding:8px">No tienes causas.</div>';
  document.getElementById('import-body').innerHTML = `<div class="modal-title">📚 Aplicar a varias causas</div>
    <div style="font-size:12px;color:var(--gray2);margin-bottom:8px">Marca las causas. Se generará el mismo escrito para cada una, con su tribunal, rol, carátula y cliente.</div>
    <div style="display:flex;gap:8px;margin-bottom:8px"><input class="form-input" id="masivo-buscar" placeholder="Buscar causa…" oninput="_masivoFilter(this.value)" style="flex:1"><button class="btn-ghost" onclick="_masivoAll(true)">Todas</button><button class="btn-ghost" onclick="_masivoAll(false)">Ninguna</button></div>
    <div id="masivo-list" style="max-height:44vh;overflow:auto">${rowsHtml}</div>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" onclick="_masivoApply()">Aplicar</button></div>`;
  openModal('modal-import');
}

function _masivoFilter(q) {
  q = (q || '').toLowerCase();
  document.querySelectorAll('#masivo-list .rw-check').forEach((l) => {
    l.style.display = l.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function _masivoAll(on) {
  document.querySelectorAll('#masivo-list .masivo-c').forEach((c) => {
    if (c.closest('.rw-check').style.display !== 'none') c.checked = on;
  });
}

function _masivoApply() {
  const ids = [...document.querySelectorAll('.masivo-c:checked')].map((x) => x.value);
  if (!ids.length) {
    toast('Marca al menos una causa', 'error');
    return;
  }
  _RW.masivoIds = ids;
  const base = EXPEDIENTES.find((x) => x.id === ids[0]);
  if (base) {
    const bcx = cxFromExpediente(base);
    _RW.cx = Object.assign(bcx, { tienePoder: _RW.cx.tienePoder, mandato: _RW.cx.mandato, rolProcesal: _RW.cx.rolProcesal || bcx.rolProcesal, esCAJ: _RW.cx.esCAJ });
  }
  closeAllModals();
  if (_RW.step === 'causa') _RW.step = 'escritos';
  rwSaveDraft();
  renderRW();
  toast(`${ids.length} causa(s) seleccionada(s) 📚`, 'success');
}

function rwSaveDraft() {
  if (!_RW) return;
  STATE.redaccionDraft = { tipoDoc: _RW.tipoDoc, cx: _RW.cx, fixedCausa: _RW.fixedCausa, mode: _RW.mode, escs: _RW.escs, step: _RW.step, masivoIds: _RW.masivoIds };
  saveState();
}

function rwClose() {
  rwSaveDraft();
  closeAllModals();
}

function rwResumeDraft() {
  const d = STATE.redaccionDraft;
  if (!d) {
    openRedactar(null);
    return;
  }
  ensureModelos();
  _RW = JSON.parse(JSON.stringify(d));
  if (!_RW.step) _RW.step = 'tipo';
  openModal('modal-redactar');
  renderRW();
}

function rwDiscardDraft() {
  if (!confirm('¿Descartar la redacción en curso?')) return;
  STATE.redaccionDraft = null;
  saveState();
  renderRedactarList();
}

const EXP2RW = { demandante: 'demandante', demandado: 'demandado', solicitante: 'demandante', requerido: 'demandado', querellante: 'demandante', querellado: 'demandado', 'hijo/a': 'hijo', testigo: 'testigo', representante: 'representante', tercero: 'tercero' };

function rwPrefillPartes() {
  if (!_RW || !_RW.cx || !_RW.cx.expId) return;
  const e = EXPEDIENTES.find((x) => x.id === _RW.cx.expId);
  if (!e || !Array.isArray(e.partes)) return;
  _RW.cx.partes = _RW.cx.partes || {};
  const used = {};
  e.partes.forEach((p) => {
    const base = EXP2RW[p.rol];
    if (!base || !findCliente(p.personaId)) return;
    const key = (used[base] || 0) === 0 ? base : base + ((used[base] || 0) + 1);
    used[base] = (used[base] || 0) + 1;
    if (!_RW.cx.partes[key]) _RW.cx.partes[key] = p.personaId;
  });
}

function rwSetTipo(t) {
  _RW.tipoDoc = t;
  _RW.escs = [];
  _RW.cx.partes = {};
  rwPrefillPartes();
  rwSaveDraft();
  renderRW();
}

let _rwTapKey = null;
let _rwTapT = 0;

function rwTap(kind, id) {
  const now = Date.now();
  const same = (_rwTapKey === `${kind}|${id}`) && (now - _rwTapT < 500);
  _rwTapKey = `${kind}|${id}`;
  _rwTapT = now;
  if (kind === 'tipo') rwSetTipo(id);
  else if (kind === 'pieza') rwPickPieza(id);
  else if (kind === 'causa') rwSelectCausa(id);
  if (same) rwGo(1);
}
