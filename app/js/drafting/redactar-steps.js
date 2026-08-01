function rwPreviewText() {
  if (_RW.escs && _RW.escs.length) return generarEscritoTexto(_RW.cx, _RW.escs);
  return buildCompareciente(_RW.cx);
}

function rwPreviewHTML() {
  const t = rwPreviewText();
  return t ? docTextToHtml(t) : '<span style="opacity:.5">Aún sin contenido…</span>';
}

function rwUpdatePreview() {
  const el = document.getElementById('rw-prev-doc') || document.getElementById('rw-page-prev');
  if (el) el.innerHTML = rwPreviewHTML();
}

function renderRW() {
  const body = document.getElementById('redactar-body');
  if (!body || !_RW) return;
  const steps = rwSteps();
  const curIdx = steps.indexOf(_RW.step);
  const dots = steps.map((s, i) => `<span class="rw-step ${i === curIdx ? 'on' : ''} ${i < curIdx ? 'done' : ''}">${i + 1}. ${RW_LABELS[s]}</span>`).join('<span class="rw-arrow">›</span>');
  let inner = '';
  if (_RW.step === 'tipo') inner = rwStepTipo();
  else if (_RW.step === 'causa') inner = rwStepCausa();
  else if (_RW.step === 'comp') inner = rwStepCompareciente();
  else if (_RW.step === 'modelo') inner = rwStepModelo();
  else if (_RW.step === 'datos') inner = rwStepDatos();
  else if (_RW.step === 'escritos') inner = rwStepEscritos();
  else inner = rwStepGenerar();
  const titulo = _RW.tipoDoc ? `· ${tipoNombre(_RW.tipoDoc) || ''}` : '';
  const head = `<div class="modal-title" style="display:flex;justify-content:space-between;align-items:center;gap:12px">✍️ Redactar ${titulo} <span class="rw-head-actions"><button class="rw-head-btn" onclick="openHerramientas('rw','cifras')" title="Herramientas (copiar datos · cifras)" style="font-size:15px">🛠️</button><button class="rw-head-btn" onclick="rwClose()" title="Cerrar" aria-label="Cerrar">✕</button></span></div>
    <div class="rw-steps">${dots}</div>`;
  if (_RW.step === 'generar') {
    body.innerHTML = head + inner;
    rwRenderEditor();
    return;
  }
  const showPrev = ['comp', 'escritos', 'datos'].includes(_RW.step);
  const preview = showPrev ? `<div class="rw-right"><div class="rw-preview-lbl">Vista previa</div><div class="rw-prev-doc" id="rw-prev-doc">${rwPreviewHTML()}</div></div>` : '';
  body.innerHTML = `${head}<div class="rw-wrap"><div class="rw-left">${inner}</div>${preview}</div>`;
}

function tiposParaRedaccion() {
  ensureTiposDoc();
  const base = STATE.isAdmin ? TIPOSDOC : TIPOSDOC.filter((t) => t.paraTodos);
  if (!_RW.fixedCausa) return base;
  const ex = (_RW.cx && _RW.cx.expId) ? EXPEDIENTES.find((x) => x.id === _RW.cx.expId) : null;
  if (ex && (ex.prep || ex.kind === 'asunto')) return base;
  return base.filter((t) => t.enCausa);
}

let _rwLibreBusy = false;

function rwLibre() {
  if (_rwLibreBusy) return;
  _rwLibreBusy = true;
  setTimeout(() => {
    _rwLibreBusy = false;
  }, 900);
  const exId = (_RW && _RW.fixedCausa && _RW.cx && _RW.cx.expId) ? _RW.cx.expId : '';
  const id = `xd${Date.now()}`;
  EXDOCS.push({ id, expediente: exId, title: 'Redacción libre', kind: 'exescrito', type: 'Texto', content: '', conMembrete: true, created: Date.now(), updated: Date.now() });
  STATE.redaccionDraft = null;
  saveState();
  closeAllModals();
  openExdoc(id);
}

function rwStepTipo() {
  const tipos = tiposParaRedaccion();
  const libre = '<button class="rw-tipo" onclick="rwLibre()"><div class="rw-tipo-l">📄 Libre</div><div class="rw-tipo-d">Hoja en blanco para escribir o pegar. Sale con membrete y PDF, listo para el tribunal.</div></button>';
  const cards = libre + tipos.map((t) => `<button class="rw-tipo ${_RW.tipoDoc === t.id ? 'on' : ''}" onclick="rwTap('tipo','${t.id}')"><div class="rw-tipo-l">${t.icono || ''} ${escapeHtml(t.nombre)}</div><div class="rw-tipo-d">${escapeHtml(t.desc || '')}</div></button>`).join('');
  const sel = tipoById(_RW.tipoDoc);
  const nota = _RW.fixedCausa ? '<div style="font-size:12px;color:var(--gray2);margin-bottom:8px">📁 Dentro de una causa solo se redactan <b>escritos</b>. Las demandas (que inician la causa) y los contratos se hacen desde la pestaña ✍️ Redactar.</div>' : '';
  const sinPiezas = (sel && !piezasDeTipo(sel.id).length) ? '<div class="redactar-hint">Este tipo aún no tiene modelos. Créalos en 📋 Modelos.</div>' : '';
  return `<div style="font-size:13px;color:var(--gray2);margin-bottom:10px">¿Qué documento vas a redactar?</div>${nota}
    <div class="rw-tipos">${cards}</div>${sinPiezas}
    <div class="modal-footer"><button class="btn-ghost" onclick="rwClose()">Cerrar</button><button class="btn-gold" onclick="rwGo(1)">Siguiente →</button></div>`;
}

function rwStepModelo() {
  const piezas = piezasDeTipo(_RW.tipoDoc);
  const lbl = (tipoById(_RW.tipoDoc) || {}).piezaLabel || 'modelo';
  if (!piezas.length) return '<div class="redactar-hint">No hay modelos en este tipo. El admin los crea en 📋 Modelos.</div><div class="modal-footer"><button class="btn-ghost" onclick="rwGo(-1)">← Atrás</button></div>';
  const selId = (_RW.escs[0] || {}).modeloId;
  const rows = piezas.map((m) => `<div class="rw-causa-item ${selId === m.id ? 'on' : ''}" onclick="rwTap('pieza','${m.id}')"><div class="rw-causa-t">📜 ${escapeHtml(m.nombre)}</div><div class="rw-causa-s">${escapeHtml((m.roles || []).map((r) => r.label).filter(Boolean).join(' · ') || '')}</div></div>`).join('');
  return `<div style="font-size:13px;color:var(--gray2);margin-bottom:10px">Elige el ${escapeHtml(lbl.toLowerCase())}.</div>
    <div class="rw-causa-list">${rows}</div>
    <div class="modal-footer"><button class="btn-ghost" onclick="rwGo(-1)">← Atrás</button><button class="btn-gold" onclick="rwGo(1)">Siguiente →</button></div>`;
}

function rwStepDatos() {
  const pz = MODELOS.find((x) => x.id === (_RW.escs[0] || {}).modeloId);
  if (!pz) return '<div style="color:var(--gray2)">Elige un modelo primero.</div>';
  const partes = _RW.cx.partes || {};
  const cliOpts = (sel) => CLIENTES.slice().sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')).map((c) => `<option value="${c.id}" ${String(sel) === String(c.id) ? 'selected' : ''}>${c.tipo === 'juridica' ? '🏢' : '👤'} ${escapeHtml(c.nombre || '')}${c.rut ? ` — ${escapeHtml(c.rut)}` : ''}</option>`).join('');
  const roleBlock = (r) => {
    const base = r.key;
    const keys = [base];
    let i = 2;
    while (partes[base + i] !== undefined) {
      keys.push(base + i);
      i += 1;
    }
    const sels = keys.map((k, idx) => `<div style="display:flex;gap:8px;margin-bottom:5px"><select class="form-select" onchange="rwSetParte('${k}',this.value)"><option value="">— Elegir persona —</option>${cliOpts(partes[k])}</select><button class="btn-ghost" onclick="editCliente(null,true)" title="Nueva persona">＋</button>${idx > 0 ? `<button class="btn-ghost" style="color:var(--danger)" onclick="rwDelParte('${k}')" title="Quitar">✕</button>` : ''}</div>`).join('');
    const add = r.multi ? `<button class="btn-ghost" style="font-size:12px" onclick="rwAddRolePerson('${base}')">＋ Otra persona (van por igual)</button>` : '';
    return `<div class="form-row"><label class="form-label">${escapeHtml(r.label || base)}${r.multi ? ' <span style="opacity:.6">· varias</span>' : ''} <span style="opacity:.6">· {{${escapeHtml(base)}.individualizacion}}</span></label>${sels}${add}</div>`;
  };
  const roles = (pz.roles || []).map(roleBlock).join('') || '<div style="font-size:12px;color:var(--gray2)">Este modelo no define partes.</div>';
  const esc = _RW.escs[0];
  const vars = (pz.variables || []).map((v) => {
    const val = (esc.vars && esc.vars[v.id]) || '';
    return v.tipo === 'textarea'
      ? `<div class="form-row"><label class="form-label">${escapeHtml(v.label || v.id)}</label><textarea class="form-textarea" style="min-height:60px" oninput="rwSetVar('${pz.id}','${v.id}',this.value)" placeholder="${escapeHtml(v.placeholder || '')}">${escapeHtml(val)}</textarea></div>`
      : `<div class="form-row"><label class="form-label">${escapeHtml(v.label || v.id)}</label><input class="form-input" oninput="rwSetVar('${pz.id}','${v.id}',this.value)" value="${escapeHtml(val)}" placeholder="${escapeHtml(v.placeholder || '')}"></div>`;
  }).join('');
  return `<div class="partes-h">Comparecientes / Partes</div>${roles}${vars ? `<div class="partes-h" style="margin-top:10px">Otros datos</div>${vars}` : ''}
    <div class="modal-footer"><button class="btn-ghost" onclick="rwGo(-1)">← Atrás</button><button class="btn-gold" onclick="rwGo(1)">Revisar →</button></div>`;
}

function rwCausaListHTML() {
  const q = (_RW._causaQ || '').trim().toLowerCase();
  let list = EXPEDIENTES.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
  if (q) list = list.filter((e) => {
    const c = findCliente(e.clienteId);
    return [e.name, e.rol, e.rit, e.tribunal, e.materia, c && c.nombre].some((v) => (v || '').toLowerCase().includes(q));
  });
  list = list.slice(0, 40);
  if (!list.length) return '<div style="font-size:12px;color:var(--gray2);padding:8px">Sin resultados. Usa "Nueva causa".</div>';
  return list.map((e) => {
    const c = findCliente(e.clienteId);
    const sub = [e.rol || e.rit, c ? c.nombre : '', e.tribunal].filter(Boolean).map(escapeHtml).join(' · ');
    return `<div class="rw-causa-item ${_RW.cx.expId === e.id ? 'on' : ''}" onclick="rwTap('causa','${e.id}')"><div class="rw-causa-t">📁 ${escapeHtml(causaLabel(e))}</div><div class="rw-causa-s">${sub || '—'}</div></div>`;
  }).join('');
}

function rwFilterCausas(v) {
  _RW._causaQ = v;
  const el = document.getElementById('rw-causa-list');
  if (el) el.innerHTML = rwCausaListHTML();
}

function rwSelectCausa(id) {
  const e = EXPEDIENTES.find((x) => x.id === id);
  if (e) {
    _RW.cx = cxFromExpediente(e);
    _RW._autoApplied = false;
    rwSaveDraft();
    renderRW();
  }
}

function rwStepCausa() {
  const esDemanda = _RW.tipoDoc === 'demanda';
  if (esDemanda && _RW.mode !== 'nueva') _RW.mode = 'nueva';
  const exist = _RW.mode === 'exist' && !esDemanda;
  const compPrev = _RW.cx.expId ? `<div class="rw-preview" style="margin-top:10px"><div class="rw-preview-lbl">Compareciente (de la causa)</div>${escapeHtml(buildCompareciente(_RW.cx))}</div>` : '';
  let f = '';
  if (exist) {
    f = EXPEDIENTES.length
      ? `<input class="form-input" placeholder="🔎 Buscar causa por carátula, RIT, cliente, tribunal…" value="${escapeHtml(_RW._causaQ || '')}" oninput="rwFilterCausas(this.value)" style="margin-bottom:8px">
         <div class="rw-causa-list" id="rw-causa-list">${rwCausaListHTML()}</div>${compPrev}`
      : '<div style="color:var(--gray2);font-size:13px;margin-bottom:12px">No tienes causas guardadas. Usa "Nueva causa".</div>';
  } else {
    const o = CLIENTES.slice().sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')).map((c) => `<option value="${c.id}" ${String(_RW.cx.clienteId) === String(c.id) ? 'selected' : ''}>${c.tipo === 'juridica' ? '🏢' : '👤'} ${escapeHtml(c.nombre || '(sin nombre)')}${c.rut ? ` — ${escapeHtml(c.rut)}` : ''}</option>`).join('');
    f = `<div class="form-row"><label class="form-label">Carátula / nombre</label><input class="form-input" oninput="rwSetCx('caratula',this.value)" value="${escapeHtml(_RW.cx.caratula || '')}" placeholder='Ej: "Pérez con Soto"'></div>
       <div class="form-row"><label class="form-label">Cliente *</label><div style="display:flex;gap:8px"><select class="form-select" onchange="rwSetCx('clienteId',this.value)"><option value="">— Elegir —</option>${o}</select><button class="btn-ghost" onclick="editCliente(null,true)">＋</button></div></div>
       <div class="form-grid">
         <div class="form-row"><label class="form-label">Rol / RIT</label><input class="form-input" oninput="rwSetCx('rol',this.value)" value="${escapeHtml(_RW.cx.rol || '')}" placeholder="C-1234-2025"></div>
         <div class="form-row"><label class="form-label">Tribunal</label><input class="form-input" oninput="rwSetCx('tribunal',this.value)" value="${escapeHtml(_RW.cx.tribunal || '')}" placeholder="1º Juzgado Civil"></div>
       </div>
       <div class="form-grid">
         <div class="form-row"><label class="form-label">Área (para filtrar modelos)</label><select class="form-select" onchange="rwSetCx('tipo',this.value)"><option value="">— Área —</option>${materiaOptions(_RW.cx.tipo, false)}</select></div>
         <div class="form-row"><label class="form-label">Calidad del cliente</label><select class="form-select" onchange="rwSetCx('rolProcesal',this.value)">${rolOptions(_RW.cx.rolProcesal || 'demandante')}</select></div>
       </div>
       ${esDemanda
    ? `<label class="rw-check"><input type="checkbox" ${_RW.cx.tienePoder ? 'checked' : ''} onchange="rwSetMandato(this.checked)"> Tengo mandato (comparezco yo, el abogado, en virtud del mandato; si no, comparece el cliente y se agrega la PYP)</label>`
    : `<label class="rw-check"><input type="checkbox" ${_RW.cx.tienePoder ? 'checked' : ''} onchange="rwSetPoder(this.checked)"> Tengo poder (comparece el abogado; si no, comparece el cliente y se agrega la PYP)</label>`}`;
  }
  const sel = esDemanda
    ? '<div style="font-size:12px;color:var(--gray2);margin-bottom:8px">⚖️ La demanda inicia una <b>causa nueva</b>. Indica el cliente (elígelo o crea uno con ＋) y el tribunal. El Rol/RIT puede ir en blanco hasta que ingrese.</div>'
    : `<div class="rw-toggle"><button class="rw-pill ${exist ? 'on' : ''}" onclick="rwSetMode('exist')">📂 Causa existente</button><button class="rw-pill ${exist ? '' : 'on'}" onclick="rwSetMode('nueva')">＋ Nueva causa</button></div>`;
  const masivoBtn = esDemanda ? '' : '<div style="margin:2px 0 10px"><button class="btn-ghost" style="font-size:12.5px" onclick="openMasivoPicker()">📚 Redactar para varias causas…</button><span style="font-size:11px;color:var(--gray2);margin-left:6px">el mismo escrito para muchas (ej. un PYP)</span></div>';
  return `${sel}
    ${masivoBtn}
    ${f}
    ${esDemanda ? rwPartesRedaccion() : ''}
    <div class="modal-footer"><button class="btn-ghost" onclick="rwGo(-1)">← Atrás</button><button class="btn-gold" onclick="rwGo(1)">Siguiente →</button></div>`;
}

const RW_ROLES = [['demandado', 'Demandado'], ['demandante', 'Demandante'], ['hijo', 'Hijo/a'], ['empresa', 'Empresa'], ['contraparte', 'Contraparte'], ['representante', 'Representante'], ['testigo', 'Testigo'], ['tercero', 'Tercero']];

function rwAddParte() {
  const sel = document.getElementById('rw-newrol');
  if (!sel || !sel.value) return;
  _RW.cx.partes = _RW.cx.partes || {};
  const base = sel.value;
  let key = base;
  let i = 2;
  while (_RW.cx.partes[key] !== undefined) {
    key = base + i;
    i += 1;
  }
  _RW.cx.partes[key] = '';
  rwSaveDraft();
  renderRW();
}

function rwDelParte(k) {
  if (_RW.cx.partes) delete _RW.cx.partes[k];
  rwSaveDraft();
  renderRW();
}

function rwPartesRedaccion() {
  const partes = _RW.cx.partes || {};
  const rows = Object.keys(partes).map((k) => {
    const base = k.replace(/\d+$/, '');
    const lbl = (RW_ROLES.find((r) => r[0] === base) || [, k])[1];
    return `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
      <span style="flex:0 0 auto;min-width:86px;font-size:12px;color:var(--gold3);font-weight:600">${escapeHtml(lbl)}<span style="opacity:.55;font-weight:400;font-size:10px"> {{${escapeHtml(k)}.nombre}}</span></span>
      <select class="form-select" style="flex:1;min-width:130px;font-size:12px" onchange="rwSetParte('${k}',this.value)">${personaOptions(partes[k])}</select>
      <button class="btn-ghost" style="padding:5px 8px" onclick="editCliente(null,true)" title="Nueva persona">＋</button>
      <button class="btn-ghost" style="color:var(--danger);padding:5px 8px" onclick="rwDelParte('${k}')">✕</button>
    </div>`;
  }).join('');
  return `<div class="rw-presuma-box" style="margin-top:10px"><div class="partes-h">👥 Partes de la redacción</div>
    <div style="font-size:11px;color:var(--gray2);margin-bottom:8px">Elige de tu base de <b>Personas</b> quién es el demandado, el niño/a, la empresa, etc. Luego usa sus datos en el texto con <code>{{demandado.nombre}}</code>, <code>{{hijo.rut}}</code>, <code>{{empresa.domicilio}}</code>…</div>
    ${rows || '<div style="font-size:12px;color:var(--gray2);margin-bottom:6px">Sin partes agregadas todavía.</div>'}
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><select class="form-select" id="rw-newrol" style="flex:1;min-width:120px;font-size:12px">${RW_ROLES.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select><button class="btn-ghost" onclick="rwAddParte()">＋ Agregar parte</button></div>
  </div>`;
}

function rwSetMandato(v) {
  _RW.cx.tienePoder = v;
  _RW.cx.mandato = v;
  _RW._autoApplied = false;
  renderRW();
}

function rwStepCompareciente() {
  const cx = _RW.cx;
  const perfil = STATE.perfilAbogado || {};
  const o = CLIENTES.slice().sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')).map((c) => `<option value="${c.id}" ${String(cx.clienteId) === String(c.id) ? 'selected' : ''}>${c.tipo === 'juridica' ? '🏢' : '👤'} ${escapeHtml(c.nombre || '(sin nombre)')}${c.rut ? ` — ${escapeHtml(c.rut)}` : ''}</option>`).join('');
  const sel = `<div class="form-row"><label class="form-label">Cliente de la causa</label><div style="display:flex;gap:8px"><select class="form-select" onchange="rwSetCx('clienteId',this.value)"><option value="">— Elegir —</option>${o}</select><button class="btn-ghost" onclick="editCliente(null,true)">＋ Nuevo</button></div></div>`;
  const poderBox = cx.tienePoder ? `<div class="form-row"><label class="form-label">Rol procesal del representado</label><select class="form-select" onchange="rwSetCx('rolProcesal',this.value)">${rolOptions(cx.rolProcesal)}</select></div>` : '';
  const perfilHint = !perfil.nombre ? '<div class="redactar-hint">⚠️ Completa tu <a href="#" onclick="openPartesPanel();return false">perfil de abogado</a> para el patrocinio/poder y notificaciones.</div>' : '';
  return `${sel}
    <label class="rw-check"><input type="checkbox" ${cx.tienePoder ? 'checked' : ''} onchange="rwSetPoder(this.checked)"> Comparezco como apoderado (con poder)</label>
    ${poderBox}
    <label class="rw-check"><input type="checkbox" ${cx.esCAJ ? 'checked' : ''} onchange="rwSetCx('esCAJ',this.checked)"> Causa CAJ (agrega otrosí de privilegio de pobreza)</label>
    ${perfilHint}
    <div class="modal-footer"><button class="btn-ghost" onclick="rwGo(-1)">← Atrás</button><button class="btn-gold" onclick="rwGo(1)">Siguiente →</button></div>`;
}

function rwStepEscritos() {
  const cat = _RW.tipoDoc;
  let mods = piezasDeTipo(cat).slice();
  if (cat !== 'escrito') piezasDeTipo('escrito').forEach((m) => { if (!mods.some((x) => x.id === m.id)) mods.push(m); });
  mods.sort((a, b) => {
    const A = a.tipoId === cat ? 0 : 1;
    const B = b.tipoId === cat ? 0 : 1;
    return A - B;
  });
  const causaMat = (_RW.cx.tipo || '').trim().toLowerCase();
  if (causaMat) {
    mods = mods.filter((m) => {
      const mm = m.materia || 'general';
      return mm === 'general' || mm.toLowerCase() === causaMat || _RW.escs.some((e) => e.modeloId === m.id);
    });
  }
  const rows = mods.map((m) => {
    const idx = _RW.escs.findIndex((e) => e.modeloId === m.id);
    const on = idx >= 0;
    const esc = on ? _RW.escs[idx] : null;
    const vars = on && (m.variables || []).length ? `<div class="rw-vars">${m.variables.map((v) => {
      const val = (esc.vars && esc.vars[v.id]) || '';
      return v.tipo === 'textarea'
        ? `<div class="form-row"><label class="form-label">${escapeHtml(v.label || v.id)}</label><textarea class="form-textarea" style="min-height:64px" oninput="rwSetVar('${m.id}','${v.id}',this.value)" placeholder="${escapeHtml(v.placeholder || '')}">${escapeHtml(val)}</textarea></div>`
        : `<div class="form-row"><label class="form-label">${escapeHtml(v.label || v.id)}</label><input class="form-input" oninput="rwSetVar('${m.id}','${v.id}',this.value)" value="${escapeHtml(val)}" placeholder="${escapeHtml(v.placeholder || '')}"></div>`;
    }).join('')}</div>` : '';
    const order = on ? `<span class="rw-ord">#${idx + 1}${idx === 0 ? ' · Principal' : ' · Otrosí'}</span>` : '';
    return `<div class="rw-model ${on ? 'on' : ''}">
      <div class="rw-model-head" onclick="rwToggleModel('${m.id}')">
        <span class="rw-cbx">${on ? '✓' : ''}</span>
        <span class="rw-model-name">${escapeHtml(m.nombre)}</span>
        ${order}
        <span class="rw-model-suma">${escapeHtml(m.suma || '')}</span>
      </div>${vars}</div>`;
  }).join('');
  const ordControls = _RW.escs.length > 1 ? `<div class="rw-order">${_RW.escs.map((e, i) => { const m = MODELOS.find((x) => x.id === e.modeloId); return m ? `<div class="rw-order-row"><span>${i + 1}. ${escapeHtml(m.nombre)}</span><span><button class="rw-mini" onclick="rwMove(${i},-1)">↑</button><button class="rw-mini" onclick="rwMove(${i},1)">↓</button></span></div>` : ''; }).join('')}</div>` : '';
  const ayuda = _RW.tipoDoc === 'demanda'
    ? 'Elige la <b>demanda/recurso</b> (será lo principal); sus otrosíes habituales se agregan solos y puedes sumar más.'
    : 'Marca los escritos. El primero es el <b>principal</b>; el resto van como <b>otrosíes</b> en ese orden.';
  const conPT = (_RW.cx.otrosiPT !== undefined) ? _RW.cx.otrosiPT : (STATE.otrosiPorTanto !== false);
  const hayOtrosies = _RW.escs.length > 1;
  const ptToggle = hayOtrosies ? `<label class="rw-check" style="margin-top:6px"><input type="checkbox" ${conPT ? 'checked' : ''} onchange="rwSetOtrosiPT(this.checked)"> Los otrosíes llevan «por tanto» (el principal siempre lo lleva)</label>` : '';
  const ptMan = !!_RW.cx.portantoManual;
  const ptManualUI = `<label class="rw-check" style="margin-top:6px"><input type="checkbox" ${ptMan ? 'checked' : ''} onchange="rwSetPTManual(this.checked)"> Escribir el «POR TANTO» a mano (yo pongo la palabra y el texto)</label>
    ${ptMan ? `<textarea class="form-textarea" placeholder="Ej: POR TANTO, y en mérito de lo expuesto y de los arts. … SÍRVASE US. tener por interpuesta la demanda, acogerla en todas sus partes, con costas." oninput="rwSetPTTexto(this.value)" style="min-height:70px;margin-top:6px;font-size:13px">${escapeHtml(_RW.cx.portantoTexto || '')}</textarea>` : ''}`;
  const matNote = causaMat ? `<div style="font-size:11px;color:var(--gold3);margin-bottom:8px">📂 Mostrando escritos de <b>${escapeHtml(_RW.cx.tipo)}</b> + los generales.</div>` : '';
  return `<div style="font-size:13px;color:var(--gray2);margin-bottom:10px">${ayuda}</div>${matNote}
    ${rwPresumaInputs()}
    <div class="rw-models">${rows}</div>
    ${ordControls}
    ${rwPatrocinantes()}
    ${ptToggle}
    ${ptManualUI}
    <div class="modal-footer"><button class="btn-ghost" onclick="rwGo(-1)">← Atrás</button><button class="btn-gold" onclick="rwGo(1)">Revisar →</button></div>`;
}

function rwSetOtrosiPT(v) {
  _RW.cx.otrosiPT = v;
  STATE.otrosiPorTanto = v;
  rwSaveDraft();
  renderRW();
}

function rwSetPTManual(v) {
  _RW.cx.portantoManual = v;
  rwSaveDraft();
  renderRW();
}

function rwSetPTTexto(v) {
  _RW.cx.portantoTexto = v;
  rwSaveDraft();
  if (typeof rwUpdatePreview === 'function') rwUpdatePreview();
}

function rwToggleColab(id) {
  _RW.cx.colaboradores = _RW.cx.colaboradores || [];
  const i = _RW.cx.colaboradores.indexOf(id);
  if (i >= 0) _RW.cx.colaboradores.splice(i, 1);
  else _RW.cx.colaboradores.push(id);
  rwSaveDraft();
  renderRW();
}

function rwPatrocinantes() {
  const tienePyp = _RW.escs.some((e) => {
    const m = MODELOS.find((x) => x.id === e.modeloId);
    return m && m.esPatrocinio;
  });
  if (!tienePyp) return '';
  const sel = _RW.cx.colaboradores || [];
  const colabs = allColaboradores();
  const chips = colabs.length ? colabs.map((c) => `<label class="rw-check" style="margin:0"><input type="checkbox" ${sel.includes(c.id) ? 'checked' : ''} onchange="rwToggleColab('${c.id}')"> ${escapeHtml(c.nombre)}${c._team ? ' <span style="font-size:10px;color:var(--gold3)">equipo</span>' : ''}</label>`).join('') : '<span style="font-size:12px;color:var(--gray2)">No tienes equipo. Invita colegas en 🤝 Mi equipo (por correo) o agrega externos en 👤 → Colaboradores externos.</span>';
  return `<div class="rw-presuma-box"><div class="partes-h">🤝 Patrocinantes del PYP</div><div style="font-size:11px;color:var(--gray2);margin-bottom:6px">Tú vas siempre. Marca a los de tu equipo y el texto pasa a plural automáticamente.</div><div class="mdl-otrosis">${chips}</div></div>`;
}

function rwSetPresuma(ri, val) {
  _RW.cx.presumaVals = _RW.cx.presumaVals || {};
  _RW.cx.presumaVals[`r${ri}`] = val;
  rwSaveDraft();
  rwUpdatePreview();
}

function rwPresumaInputs() {
  const t = tipoById(_RW.tipoDoc);
  const pp = ((t && t.partes) || []).find((p) => p.key === 'presuma' && p.on !== false);
  if (!pp || !(pp.rows || []).length) return '';
  const manuales = (pp.rows || []).map((r, ri) => ({ r, ri })).filter((x) => !x.r.token);
  if (!manuales.length) return '';
  const pv = _RW.cx.presumaVals || {};
  return `<div class="rw-presuma-box"><div class="partes-h">📋 Datos del recuadro (presuma)</div>
    ${manuales.map(({ r, ri }) => `<div class="form-row" style="margin-bottom:8px"><label class="form-label">${escapeHtml(r.label || (`Campo ${ri + 1}`))}</label><input class="form-input" value="${escapeHtml(pv[`r${ri}`] || '')}" oninput="rwSetPresuma(${ri},this.value)"></div>`).join('')}</div>`;
}
