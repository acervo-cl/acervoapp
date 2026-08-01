function railDateInfo(dstr) {
  if (!dstr) return { txt: '', cls: '' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dstr + 'T00:00:00'); const diff = Math.round((d - today) / 86400000);
  const txt = d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
  let cls = '', extra = '';
  if (diff < 0) { cls = 'rec-over'; extra = ' (vencido)'; }
  else if (diff === 0) { cls = 'rec-soon'; extra = ' (hoy)'; }
  else if (diff <= 3) { cls = 'rec-soon'; extra = ` (en ${diff}d)`; }
  return { txt: txt + extra, cls };
}

let _railCalOffset = 0;
function railCalMove(d) { _railCalOffset += d; renderRail(); }
function gotoAgenda(iso) {
  if (iso) { const d = new Date(iso + 'T00:00:00'); _agendaYM = { y: d.getFullYear(), m: d.getMonth() }; _agendaSel = iso; }
  STATE.space = 'oficina'; try { closeTooltip(); } catch (_) {}
  switchView('agenda');
}
function railCalDay(ds) {
  const recs = (STATE.recordatorios || []).filter(r => r.date === ds);
  const causas = EXPEDIENTES.filter(e => e.plazo === ds);
  const fecha = new Date(ds + 'T00:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
  if (!recs.length && !causas.length) { toast(fecha, ''); return; }
  toast(fecha + ' — ' + [...recs.map(r => '📌 ' + r.text), ...causas.map(e => '⚖️ ' + (e.name || 'causa'))].join('  ·  '), 'success');
}
function railCalendarHTML() {
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + _railCalOffset);
  const y = base.getFullYear(), m = base.getMonth();
  const startDow = (new Date(y, m, 1).getDay() + 6) % 7;
  const dim = new Date(y, m + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);
  const ev = {};
  (STATE.recordatorios || []).forEach(r => { if (r.date && !r.done) ev[r.date] = (ev[r.date] || 0) + 1; });
  EXPEDIENTES.forEach(e => { if (e.plazo) ev[e.plazo] = (ev[e.plazo] || 0) + 1; });
  const monthName = base.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  const dows = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => `<div class="rc-dow">${d}</div>`).join('');
  let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<div class="rc-cell rc-empty"></div>';
  for (let d = 1; d <= dim; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells += `<div class="rc-cell ${ds === todayStr ? 'rc-today' : ''} ${ev[ds] ? 'rc-has' : ''}" title="${ds}${ev[ds] ? ' · ' + ev[ds] + ' evento(s)' : ''} — doble clic abre la agenda" onclick="railCalDay('${ds}')" ondblclick="gotoAgenda('${ds}')">${d}${ev[ds] ? '<span class="rc-dot"></span>' : ''}</div>`;
  }
  return `<div class="rail-card"><div class="rail-label" style="justify-content:space-between;align-items:center"><span>📅 ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</span><span style="display:flex;gap:3px">${_railCalOffset !== 0 ? `<button class="rc-nav" onclick="_railCalOffset=0;renderRail()" title="Hoy">•</button>` : ''}<button class="rc-nav" onclick="railCalMove(-1)">‹</button><button class="rc-nav" onclick="railCalMove(1)">›</button></span></div>
    <div class="rc-grid">${dows}</div>
    <div class="rc-grid rc-days">${cells}</div></div>`;
}

function renderRail() {
  const r = document.getElementById('right-rail'); if (!r) return;
  const cfg = STATE.railCfg || {};
  const today = new Date().toISOString().slice(0, 10);
  r.style.setProperty('--rail-w', (STATE.railW || 300) + 'px');
  let html = `<div class="rail-grip" id="rail-grip" title="Arrastra para ancho"></div><div class="rail-cfg-row" style="justify-content:space-between"><button class="rail-cfg-btn" onclick="railToggle()" title="Ocultar la barra">⟩</button><button class="rail-cfg-btn" onclick="openRailCfg()" title="Elegir qué ver aquí">⚙️</button></div>`;
  if (cfg.calendario) html += railCalendarHTML();
  if (cfg.redaccion) {
    html += `<div class="rail-card"><div class="rail-label">✍️ Redacción</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="rail-tool" onclick="openRedactar(null)">✍️ Redactar (asistente)</button>
        <button class="rail-tool" onclick="rwLibre()">📄 Hoja libre</button>
        <button class="rail-tool" onclick="openHerramientas(null,'cifras')">🔢 Cifras → palabras</button>
      </div></div>`;
  }
  if (cfg.pendientes) {
    const todos = (STATE.todos || []);
    const pend = todos.filter(t => !t.done).length;
    html += `<div class="rail-card"><div class="rail-label">✅ Pendientes${pend ? ` (${pend})` : ''}</div>
      <div class="rec-add"><input id="todo-text" class="rec-inp" placeholder="Nueva tarea…" onkeydown="if(event.key==='Enter')addTodo()"><button class="rail-cfg-btn" onclick="addTodo()" title="Agregar">＋</button></div>
      ${todos.length ? todos.slice().sort((a, b) => (!!a.done !== !!b.done) ? (a.done ? 1 : -1) : 0).map(t => `<div class="rec-row ${t.done ? 'rec-done' : ''}"><input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTodo('${t.id}')"><div style="flex:1;min-width:0"><div class="rec-txt">${escapeHtml(t.text)}</div></div><button class="rec-del" onclick="delTodo('${t.id}')">✕</button></div>`).join('') : '<div class="rail-item-sub">Sin pendientes 🎉</div>'}</div>`;
  }
  if (cfg.plazos) {
    const hoy = _todayISO();
    html += `<div class="rail-card"><div class="rail-label">⏳ Contador de plazos</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <input id="plz-from" class="rec-inp" type="date" value="${STATE._plzFrom || hoy}" onchange="calcRailPlazo()">
        <div style="display:flex;gap:4px;align-items:center"><input id="plz-n" class="rec-inp" type="number" min="1" value="${STATE._plzN || 5}" style="width:62px" oninput="calcRailPlazo()"><select id="plz-tipo" class="rec-inp" onchange="calcRailPlazo()"><option value="habiles">días hábiles</option><option value="corridos">días corridos</option></select></div>
        <label class="rw-check" style="font-size:11px;color:var(--gray2)"><input type="checkbox" id="plz-sig" onchange="calcRailPlazo()"> desde el día siguiente</label>
        <div id="plz-res" class="rail-item-sub" style="font-weight:600;color:var(--gold)"></div>
      </div></div>`;
  }
  if (cfg.frecuentes) {
    const cnt = {}; EXPEDIENTES.forEach(e => (e.partes || []).forEach(p => { if (p.personaId) cnt[p.personaId] = (cnt[p.personaId] || 0) + 1; }));
    let top = Object.keys(cnt).map(id => ({ id, n: cnt[id], c: findCliente(id) })).filter(x => x.c).sort((a, b) => b.n - a.n).slice(0, 6);
    if (!top.length) top = (CLIENTES || []).slice(0, 6).map(c => ({ id: c.id, n: 0, c }));
    html += `<div class="rail-card"><div class="rail-label">👥 Personas frecuentes</div>${top.length ? top.map(x => `<div class="rail-item" onclick="verCliente('${x.id}')" title="Ver ficha"><div class="rail-dot" style="background:#8fb8e0"></div><div style="min-width:0;flex:1"><div class="rail-item-title">${escapeHtml(x.c.nombre || x.c.name || 'Persona')}</div><div class="rail-item-sub">${x.c.rut ? escapeHtml(x.c.rut) : ''}${x.n ? ` · ${x.n} causa${x.n > 1 ? 's' : ''}` : ''}</div></div><button class="rec-del" onclick="event.stopPropagation();copiarIndiv('${x.id}')" title="Copiar individualización">⧉</button></div>`).join('') : '<div class="rail-item-sub">Aún no agregas personas.</div>'}</div>`;
  }
  if (cfg.copias) {
    const cps = (STATE.copias || []);
    html += `<div class="rail-card"><div class="rail-label">📋 Datos a copiar</div>
      <div class="rec-add" style="flex-direction:column;gap:4px;align-items:stretch">
        <input id="cop-label" class="rec-inp" placeholder="Etiqueta (ej. Mi RUT, Clave socio)">
        <div style="display:flex;gap:4px"><input id="cop-val" class="rec-inp" placeholder="Dato a copiar" style="flex:1" onkeydown="if(event.key==='Enter')addCopia()"><button class="rail-cfg-btn" onclick="addCopia()" title="Agregar">＋</button></div>
      </div>
      ${cps.length ? cps.map(c => `<div class="rec-row"><div style="flex:1;min-width:0"><div class="rec-txt">${escapeHtml(c.label)}</div><div class="rail-item-sub" style="font-family:monospace;overflow:hidden;text-overflow:ellipsis">${escapeHtml(c.value)}</div></div><button class="rec-del" style="color:var(--gold3)" title="Copiar" onclick="copyCopia('${c.id}')">⧉</button><button class="rec-del" title="Quitar" onclick="delCopia('${c.id}')">✕</button></div>`).join('') : '<div class="rail-item-sub">Agrega datos que copias seguido (RUT, clave…). Se guardan solo en tu biblioteca.</div>'}</div>`;
  }
  if (cfg.monitor) {
    const recByExp = {}; (STATE.recordatorios || []).filter(x => !x.done && x.causaId && x.date).forEach(x => { if (!recByExp[x.causaId] || x.date < recByExp[x.causaId]) recByExp[x.causaId] = x.date; });
    const causas = EXPEDIENTES.slice().filter(e => (e.estado || '').toLowerCase() !== 'terminada')
      .sort((a, b) => { const da = recByExp[a.id] || '9999', db = recByExp[b.id] || '9999'; if (da !== db) return da < db ? -1 : 1; return (b.updated || 0) - (a.updated || 0); }).slice(0, 6);
    html += `<div class="rail-card"><div class="rail-label">⚖️ Causas (${EXPEDIENTES.length})</div>${causas.length ? causas.map(e => { const di = recByExp[e.id] ? railDateInfo(recByExp[e.id]) : { txt: (e.plazo || ''), cls: '' }; return `<div class="rail-item" onclick="openExpediente('${e.id}')"><div class="rail-dot" style="background:${e.color || '#e3c074'}"></div><div style="min-width:0"><div class="rail-item-title">${escapeHtml(causaLabel(e))}</div><div class="rail-item-sub ${di.cls}">${escapeHtml(e.estado || '—')}${di.txt ? ' · ' + escapeHtml(di.txt) : ''}</div></div></div>`; }).join('') : '<div class="rail-item-sub">Sin causas activas.</div>'}</div>`;
  }
  if (cfg.recordatorios) {
    const recs = (STATE.recordatorios || []).slice().sort((a, b) => { if (!!a.done !== !!b.done) return a.done ? 1 : -1; return (a.date || '9999') < (b.date || '9999') ? -1 : 1; }).slice(0, 8);
    const causaOpts = EXPEDIENTES.map(e => `<option value="${e.id}">${escapeHtml((e.name || 'Causa').slice(0, 24))}</option>`).join('');
    html += `<div class="rail-card"><div class="rail-label">📌 Recordatorios</div>
      <div class="rec-add"><input id="rec-text" class="rec-inp" placeholder="Recordatorio…"><div style="display:flex;gap:4px"><input id="rec-date" class="rec-inp" type="date"><select id="rec-causa" class="rec-inp"><option value="">Sin causa</option>${causaOpts}</select><button class="rail-cfg-btn" onclick="addRecordatorio()" title="Agregar">＋</button></div></div>
      ${recs.length ? recs.map(x => { const di = railDateInfo(x.date); const e = x.causaId ? EXPEDIENTES.find(p => p.id === x.causaId) : null; return `<div class="rec-row ${x.done ? 'rec-done' : ''}"><input type="checkbox" ${x.done ? 'checked' : ''} onchange="toggleRecord('${x.id}')"><div style="flex:1;min-width:0"><div class="rec-txt">${escapeHtml(x.text)}</div><div class="rail-item-sub ${di.cls}">${di.txt ? escapeHtml(di.txt) : ''}${e ? ' · ' + escapeHtml((e.name || '').slice(0, 18)) : ''}</div></div><button class="rec-del" onclick="delRecord('${x.id}')">✕</button></div>`; }).join('') : '<div class="rail-item-sub">Sin recordatorios.</div>'}</div>`;
  }
  if (cfg.notas) html += `<div class="rail-card"><div class="rail-label">🗒️ Notas</div><textarea id="rail-notes" class="rail-notes" placeholder="Notas rápidas…" oninput="saveRailNotes(this.value)">${escapeHtml(STATE.railNotes || '')}</textarea></div>`;
  if (cfg.hoy) {
    const todayMin = STATE.sessions.filter(s => s.date === today).reduce((a, s) => a + s.minutes, 0);
    const pct = Math.min(100, Math.round(todayMin / 120 * 100));
    html += `<div class="rail-card" style="text-align:center"><div class="rail-label" style="justify-content:center">⏱️ Hoy</div><div class="ring" style="--p:${pct}"><div class="ring-inner"><div class="ring-val">${todayMin}</div><div class="ring-lbl">MIN · 🔥${studyStreak()}</div></div></div></div>`;
  }
  if (cfg.favoritos) {
    const favs = DOCUMENTS.filter(d => STATE.favorites.has(d.id)).slice(0, 5);
    html += `<div class="rail-card"><div class="rail-label">★ Favoritos</div>${favs.length ? favs.map(d => `<div class="rail-item" onclick="openReader('${d.id}')"><div class="rail-dot" style="background:${subColor(d.subject)}"></div><div style="min-width:0"><div class="rail-item-title">${d.title}</div></div></div>`).join('') : '<div class="rail-item-sub">Marcá documentos con ★.</div>'}</div>`;
  }
  if (cfg.repasar) {
    const due = STATE.flashcards.filter(isDue).slice(0, 5);
    html += `<div class="rail-card"><div class="rail-label">🃏 Para repasar (${STATE.flashcards.filter(isDue).length})</div>${due.length ? due.map(c => `<div class="rail-item" onclick="startStudy(null)"><div class="rail-dot" style="background:var(--gold)"></div><div style="min-width:0"><div class="rail-item-title">${escapeHtml(c.front).slice(0, 40)}</div></div></div>`).join('') : '<div class="rail-item-sub">Nada pendiente 🎉</div>'}</div>`;
  }
  r.innerHTML = html;
  if (cfg.plazos) try { calcRailPlazo(); } catch (_) {}
  _railApplyState(); _railWireGrip();
}

function _railApplyState() {
  const r = document.getElementById('right-rail'); if (!r) return;
  r.classList.toggle('collapsed', !!STATE.railOff);
  document.body.classList.toggle('rail-off', !!STATE.railOff);
  r.style.setProperty('--rail-w', (STATE.railW || 300) + 'px');
}
function railToggle() { STATE.railOff = !STATE.railOff; saveState(); _railApplyState(); }
function _railWireGrip() {
  const g = document.getElementById('rail-grip'); const r = document.getElementById('right-rail'); if (!g || !r || g._wired) return; g._wired = true;
  g.addEventListener('pointerdown', e => {
    e.preventDefault(); const sx = e.clientX, sw = r.offsetWidth; try { g.setPointerCapture(e.pointerId); } catch (_) {}
    const mv = ev => { let w = sw + (sx - ev.clientX); w = Math.max(220, Math.min(560, w)); r.style.setProperty('--rail-w', w + 'px'); };
    const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); STATE.railW = r.offsetWidth; saveState(); };
    g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up);
  });
}
function addCopia() { const l = document.getElementById('cop-label'), v = document.getElementById('cop-val'); const label = (l && l.value || '').trim(), value = (v && v.value || '').trim(); if (!label || !value) { toast('Pon etiqueta y dato', 'error'); return; } STATE.copias = STATE.copias || []; STATE.copias.push({ id: 'cp' + Date.now(), label, value }); saveState(); renderRail(); }
function copyCopia(id) { const c = (STATE.copias || []).find(x => x.id === id); if (c) copiarDato(c.value, c.label); }
function delCopia(id) { const i = (STATE.copias || []).findIndex(x => x.id === id); if (i >= 0) { STATE.copias.splice(i, 1); saveState(); renderRail(); } }
function addTodo() { const t = document.getElementById('todo-text'); const text = (t && t.value || '').trim(); if (!text) return; STATE.todos = STATE.todos || []; STATE.todos.unshift({ id: 'td' + Date.now(), text, done: false, created: Date.now() }); saveState(); renderRail(); }
function toggleTodo(id) { const x = (STATE.todos || []).find(t => t.id === id); if (x) { x.done = !x.done; saveState(); renderRail(); } }
function delTodo(id) { const i = (STATE.todos || []).findIndex(t => t.id === id); if (i >= 0) { STATE.todos.splice(i, 1); saveState(); renderRail(); } }
function calcRailPlazo() {
  const f = document.getElementById('plz-from'), n = document.getElementById('plz-n'), tp = document.getElementById('plz-tipo'), sg = document.getElementById('plz-sig'), res = document.getElementById('plz-res');
  if (!f || !res) return;
  const from = f.value || _todayISO(), num = Math.max(1, parseInt(n && n.value, 10) || 1), sig = !!(sg && sg.checked);
  STATE._plzFrom = from; STATE._plzN = num;
  const out = (tp && tp.value === 'corridos') ? _isoAdd(from, sig ? num : num - 1) : sumaHabiles(from, num, sig);
  const dow = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][new Date(out + 'T00:00:00').getDay()];
  res.textContent = 'Vence: ' + _fmtFecha(out) + ' (' + dow + ')';
}
function addRecordatorio() {
  const t = document.getElementById('rec-text'), dt = document.getElementById('rec-date'), cs = document.getElementById('rec-causa');
  const text = (t && t.value || '').trim(); if (!text) { toast('Escribe el recordatorio', 'error'); return; }
  STATE.recordatorios = STATE.recordatorios || [];
  STATE.recordatorios.push({ id: 'rec' + Date.now(), text, date: (dt && dt.value) || '', causaId: (cs && cs.value) || '', done: false, created: Date.now() });
  saveState(); renderRail();
}
function toggleRecord(id) { const x = (STATE.recordatorios || []).find(r => r.id === id); if (x) { x.done = !x.done; saveState(); renderRail(); } }
function delRecord(id) { const i = (STATE.recordatorios || []).findIndex(r => r.id === id); if (i >= 0) { STATE.recordatorios.splice(i, 1); saveState(); renderRail(); } }

let _railNotesT = null;
function saveRailNotes(v) { STATE.railNotes = v; clearTimeout(_railNotesT); _railNotesT = setTimeout(saveState, 400); }
function openRailCfg() {
  const cfg = STATE.railCfg || {};
  const items = [['calendario', '📅 Calendario'], ['redaccion', '✍️ Redacción'], ['pendientes', '✅ Pendientes (to-do)'], ['copias', '📋 Datos a copiar'], ['plazos', '⏳ Contador de plazos'], ['frecuentes', '👥 Personas frecuentes'], ['monitor', '⚖️ Monitor de causas'], ['recordatorios', '📌 Recordatorios'], ['notas', '🗒️ Notas'], ['hoy', '⏱️ Minutos de hoy'], ['favoritos', '★ Favoritos'], ['repasar', '🃏 Para repasar']];
  document.getElementById('railcfg-body').innerHTML = `<div class="modal-title">⚙️ ¿Qué ver en la barra?</div>
    ${items.map(([k, l]) => `<label class="rw-check"><input type="checkbox" ${cfg[k] ? 'checked' : ''} onchange="setRailCfg('${k}',this.checked)"> ${l}</label>`).join('')}
    <div class="modal-footer"><button class="btn-gold" onclick="closeAllModals()">Listo</button></div>`;
  openModal('modal-railcfg');
}
function setRailCfg(k, v) { STATE.railCfg = STATE.railCfg || {}; STATE.railCfg[k] = v; saveState(); renderRail(); }
