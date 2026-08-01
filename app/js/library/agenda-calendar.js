const EV_TIPOS = { audiencia: ['⚖️', 'Audiencia', '#e0b45a'], examen: ['🎓', 'Examen', '#b58af0'], plazo: ['⏳', 'Plazo', '#e08b8b'], recordatorio: ['📌', 'Recordatorio', '#8fb8e0'] };
function _evTipo(e) { return EV_TIPOS[e && e.tipo] ? e.tipo : 'recordatorio'; }
function _evMeta(e) { return EV_TIPOS[_evTipo(e)]; }
const _MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const _DIASS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
function _todayISO() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function _fmtFecha(iso) { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return iso || ''; return m[3] + '/' + m[2] + '/' + m[1]; }
let FERIADOS_CL = ['2025-01-01', '2025-04-18', '2025-04-19', '2025-05-01', '2025-05-21', '2025-06-20', '2025-06-29', '2025-07-16', '2025-08-15', '2025-09-18', '2025-09-19', '2025-10-12', '2025-10-31', '2025-11-01', '2025-12-08', '2025-12-25',
  '2026-01-01', '2026-04-03', '2026-04-04', '2026-05-01', '2026-05-21', '2026-06-21', '2026-06-29', '2026-07-16', '2026-08-15', '2026-09-18', '2026-09-19', '2026-10-12', '2026-10-31', '2026-11-01', '2026-12-08', '2026-12-25'];
function _isoAdd(iso, dd) { const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); const d = new Date(+m[1], +m[2] - 1, +m[3]); d.setDate(d.getDate() + dd); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function _habilCL(iso) { const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/); if (!m) return false; const d = new Date(+m[1], +m[2] - 1, +m[3]).getDay(); return d !== 0 && d !== 6 && FERIADOS_CL.indexOf(iso) < 0; }
function sumaHabiles(fromISO, n, desdeSiguiente) {
  let iso = fromISO, c = 0;
  if (!desdeSiguiente && _habilCL(iso)) c = 1;
  while (c < n) { iso = _isoAdd(iso, 1); if (_habilCL(iso)) c++; }
  return iso;
}
let _agendaYM = null;
function agendaNav(delta) { if (!_agendaYM) { const d = new Date(); _agendaYM = { y: d.getFullYear(), m: d.getMonth() }; } let m = _agendaYM.m + delta, y = _agendaYM.y; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } _agendaYM = { y, m }; renderAgenda(); }
function agendaHoy() { const d = new Date(); _agendaYM = { y: d.getFullYear(), m: d.getMonth() }; renderAgenda(); }
function _evsDe(iso) { return (STATE.recordatorios || []).filter(e => e.dateEnd ? (e.date <= iso && iso <= e.dateEnd) : e.date === iso).sort((a, b) => ((a.time || '') < (b.time || '') ? -1 : 1)); }
function _dateRange(a, b) { const out = []; let d = new Date(a + 'T00:00:00'); const end = new Date(b + 'T00:00:00'); if (isNaN(d) || isNaN(end)) return [a]; let guard = 0; while (d <= end && guard++ < 400) { out.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')); d.setDate(d.getDate() + 1); } return out; }
function renderAgenda() {
  const host = document.getElementById('agenda-body'); if (!host) return;
  if (!_agendaYM) { const d = new Date(); _agendaYM = { y: d.getFullYear(), m: d.getMonth() }; }
  const { y, m } = _agendaYM;
  const first = new Date(y, m, 1); let wd = (first.getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const hoy = _todayISO();
  let cells = '';
  for (let i = 0; i < wd; i++) cells += '<div class="cal-cell cal-empty"></div>';
  for (let d = 1; d <= days; d++) {
    const iso = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const dow = new Date(y, m, d).getDay();
    const evs = _evsDe(iso);
    const chips = evs.slice(0, 3).map(e => { const mt = _evMeta(e); return `<div class="cal-chip ${e.done ? 'chip-done' : ''}" style="--ec:${mt[2]}" onclick="event.stopPropagation();evClick('${e.id}')" title="${escapeHtml((e.time ? e.time + ' ' : '') + e.text)}">${mt[0]} ${escapeHtml((e.time ? e.time + ' ' : '') + e.text).slice(0, 22)}</div>`; }).join('');
    const more = evs.length > 3 ? `<div class="cal-more">+${evs.length - 3}</div>` : '';
    const cls = [iso === hoy ? 'cal-today' : '', iso === _agendaSel ? 'cal-sel' : '', (dow === 0 || dow === 6) ? 'cal-wknd' : ''].filter(Boolean).join(' ');
    cells += `<div class="cal-cell ${cls}" onclick="agendaSelDay('${iso}')"><div class="cal-num">${d}</div>${chips}${more}</div>`;
  }
  const rowEv = (e, late) => { const mt = _evMeta(e); const c = e.causaId ? EXPEDIENTES.find(x => x.id === e.causaId) : null; const cd = _diasFalta(e.date);
    return `<div class="agp-row ${late ? 'agp-late' : ''} ${e.done ? 'agp-donerow' : ''}" onclick="evClick('${e.id}')"><span class="agp-ic" style="--ec:${mt[2]}">${mt[0]}</span>
      <div style="min-width:0;flex:1"><div class="agp-t">${escapeHtml(e.text)}</div>
      <div class="agp-s">${_fmtFecha(e.date)}${e.time ? ' · ' + escapeHtml(e.time) : ''}${cd ? ' · ' + cd : ''}${c ? ' · ' + escapeHtml((c.name || '').slice(0, 20)) : ''}</div></div>
      <button class="agp-x" onclick="event.stopPropagation();evEdit('${e.id}')" title="Editar">✏</button></div>`; };
  let sideHTML;
  if (_agendaSel) {
    const evs = _evsDe(_agendaSel);
    sideHTML = `<div class="cal-side-h" style="display:flex;justify-content:space-between;align-items:center"><span>${_fmtFecha(_agendaSel)} · ${_diasFalta(_agendaSel) || ''}</span><button class="btn-ghost" style="padding:2px 7px;font-size:11px" onclick="_agendaSel=null;renderAgenda()">‹ ver todo</button></div>
      ${evs.length ? evs.map(e => rowEv(e, e.date < hoy && !e.done)).join('') : '<div style="font-size:13px;color:var(--gray2);padding:8px 4px">Nada este día.</div>'}
      <button class="btn-gold" style="width:100%;margin-top:10px" onclick="openEventEditor('','${_agendaSel}')">＋ Agendar ese día</button>`;
  } else {
    const venc = (STATE.recordatorios || []).filter(e => e.date && e.date < hoy && !e.done).sort((a, b) => ((a.date + (a.time || '')) > (b.date + (b.time || '')) ? -1 : 1)).slice(0, 10);
    const prox = (STATE.recordatorios || []).filter(e => e.date && e.date >= hoy && !e.done).sort((a, b) => ((a.date + (a.time || '')) < (b.date + (b.time || '')) ? -1 : 1)).slice(0, 14);
    sideHTML = `<div class="cal-side-h">Agenda</div>`
      + (venc.length ? `<div class="agp-sub agp-sub-late">Vencidos (${venc.length})</div>` + venc.map(e => rowEv(e, true)).join('') : '')
      + (prox.length ? (venc.length ? '<div class="agp-sub">Próximos</div>' : '') + prox.map(e => rowEv(e, false)).join('') : (venc.length ? '' : '<div style="font-size:13px;color:var(--gray2);padding:10px">Nada próximo. Toca un día para agendar.</div>'));
  }
  host.innerHTML = `<div class="agenda-wrap">
    <div class="cal-main">
      <div class="cal-head"><button class="btn-ghost" onclick="agendaNav(-1)">‹</button>
        <div class="cal-title">${_MESES[m]} ${y}</div>
        <button class="btn-ghost" onclick="agendaNav(1)">›</button>
        <button class="btn-ghost" onclick="agendaHoy()" style="margin-left:8px">Hoy</button></div>
      <div class="cal-grid cal-dow">${_DIASS.map(d => `<div class="cal-dowc">${d}</div>`).join('')}</div>
      <div class="cal-grid">${cells}</div>
      <div class="cal-legend">${Object.keys(EV_TIPOS).map(k => `<span><span class="cal-dot" style="background:${EV_TIPOS[k][2]}"></span>${EV_TIPOS[k][1]}</span>`).join('')}</div>
    </div>
    <div class="cal-side">${sideHTML}</div>
  </div>`;
}
let _agendaSel = null;
function agendaSelDay(iso) { _agendaSel = (_agendaSel === iso) ? null : iso; renderAgenda(); }
function _diasFalta(iso) { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return ''; const d = new Date(+m[1], +m[2] - 1, +m[3]); const t = new Date(); t.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0); const diff = Math.round((d - t) / 86400000); if (diff === 0) return 'hoy'; if (diff === 1) return 'mañana'; if (diff === -1) return 'ayer'; if (diff > 1) return 'en ' + diff + ' días'; return 'hace ' + (-diff) + ' días'; }
function evClick(id) { const e = (STATE.recordatorios || []).find(x => x.id === id); if (!e) return; if (e.causaId && EXPEDIENTES.find(x => x.id === e.causaId)) { openExpediente(e.causaId); } else evEdit(id); }
function evEdit(id) { openEventEditor(id); }
let _evEdit = null;
function openEventEditor(idOrCausa, dateISO, prefillText) {
  let ev = null, presetCausa = '';
  if (idOrCausa && String(idOrCausa).startsWith('rec')) ev = (STATE.recordatorios || []).find(x => x.id === idOrCausa);
  else if (idOrCausa) presetCausa = idOrCausa;
  _evEdit = ev ? { ...ev } : { id: 'rec' + Date.now(), text: (prefillText || ''), date: (dateISO || _todayISO()), time: '', tipo: 'audiencia', causaId: presetCausa, done: false, created: Date.now(), _isNew: true };
  const causas = EXPEDIENTES.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  document.getElementById('event-body').innerHTML = `<div class="modal-title">${_evEdit._isNew ? '＋ Nuevo evento' : 'Editar evento'}</div>
    <div class="form-row"><label class="form-label">Tipo</label>
      <div style="display:flex;gap:7px;flex-wrap:wrap">${Object.keys(EV_TIPOS).map(k => `<button type="button" class="rw-pill ${_evEdit.tipo === k ? 'on' : ''}" onclick="evSetTipo('${k}')">${EV_TIPOS[k][0]} ${EV_TIPOS[k][1]}</button>`).join('')}</div></div>
    <div class="form-row"><label class="form-label">Descripción</label><input class="form-input" id="ev-text" value="${escapeHtml(_evEdit.text || '')}" placeholder="Ej: Audiencia preparatoria"></div>
    <div class="form-row" id="ev-plazo-calc" style="${_evEdit.tipo === 'plazo' ? '' : 'display:none'};background:rgba(224,139,139,.08);border:1px solid rgba(224,139,139,.25);border-radius:9px;padding:9px 10px">
      <label class="form-label">⏳ Calcular por días hábiles (lun-vie, sin feriados)</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:13px">
        <input class="form-input" type="number" id="ev-plazo-n" min="1" style="width:66px" placeholder="N"> días hábiles desde
        <input class="form-input" type="date" id="ev-plazo-desde" value="${escapeHtml(_evEdit.date || _todayISO())}" style="width:auto">
        <button type="button" class="btn-gold" style="padding:5px 11px;font-size:12px" onclick="calcPlazo()">Calcular</button>
      </div>
      <label class="rw-check" style="margin-top:6px"><input type="checkbox" id="ev-plazo-sig" checked> Contar desde el día siguiente (si no, el día indicado es el día 1)</label>
      <div id="ev-plazo-res" style="font-size:12.5px;color:var(--gold);margin-top:5px"></div>
    </div>
    <div class="form-grid">
      <div class="form-row"><label class="form-label">Fecha ${_evEdit.tipo === 'plazo' ? 'de vencimiento' : (_evEdit.dateEnd ? '(desde)' : '')}</label><input class="form-input" type="date" id="ev-date" value="${escapeHtml(_evEdit.date || '')}"></div>
      <div class="form-row" id="ev-time-row" style="${(_evEdit.tipo === 'audiencia' || _evEdit.tipo === 'examen') ? '' : 'display:none'}"><label class="form-label">Hora</label><input class="form-input" type="time" id="ev-time" value="${escapeHtml(_evEdit.time || '')}"></div>
    </div>
    <label class="rw-check" style="margin:2px 0 6px"><input type="checkbox" id="ev-multi" ${_evEdit.dateEnd ? 'checked' : ''} onchange="evToggleMulti(this.checked)"> 📆 Varios días de corrido</label>
    <div id="ev-multi-box" style="${_evEdit.dateEnd ? '' : 'display:none'};background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.18);border-radius:9px;padding:9px 10px;margin-bottom:8px">
      <div class="form-row"><label class="form-label">Hasta (inclusive)</label><input class="form-input" type="date" id="ev-date-end" value="${escapeHtml(_evEdit.dateEnd || _evEdit.date || '')}"></div>
      <div style="font-size:11px;color:var(--gray2);margin:4px 0 5px">¿Cómo lo agrego?</div>
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        <button type="button" class="rw-pill on" id="ev-mode-largo" onclick="evSetMode('largo')">📏 Un evento (dura el rango)</button>
        <button type="button" class="rw-pill" id="ev-mode-cada" onclick="evSetMode('cada')">🔁 Uno en cada día</button>
      </div>
    </div>
    <div class="form-row"><label class="form-label">Causa (opcional)</label>
      <select class="form-select" id="ev-causa"><option value="">— Personal (sin causa) —</option>${causas.map(c => `<option value="${c.id}" ${String(_evEdit.causaId) === String(c.id) ? 'selected' : ''}>${escapeHtml(c.name || 'Sin caratular')}</option>`).join('')}</select></div>
    <div class="modal-footer" style="justify-content:space-between">${_evEdit._isNew ? '<span></span>' : `<button class="btn-ghost" style="color:var(--danger)" onclick="evDelete('${_evEdit.id}')">🗑 Eliminar</button>`}
      <span style="display:flex;gap:8px"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" onclick="saveEvent()">Guardar</button></span></div>`;
  openModal('modal-event');
}
let _evMode = 'largo';
function evToggleMulti(on) { const b = document.getElementById('ev-multi-box'); if (b) b.style.display = on ? '' : 'none'; if (on) { const e = document.getElementById('ev-date-end'), d = document.getElementById('ev-date'); if (e && !e.value && d) e.value = d.value; } }
function evSetMode(m) { _evMode = m; document.getElementById('ev-mode-largo').classList.toggle('on', m === 'largo'); document.getElementById('ev-mode-cada').classList.toggle('on', m === 'cada'); }
function evSetTipo(k) { if (!_evEdit) return; _evEdit.tipo = k; const tr = document.getElementById('ev-time-row'); if (tr) tr.style.display = (k === 'audiencia' || k === 'examen') ? '' : 'none';
  const pc = document.getElementById('ev-plazo-calc'); if (pc) pc.style.display = (k === 'plazo') ? '' : 'none';
  document.querySelectorAll('#event-body .rw-pill').forEach(b => b.classList.toggle('on', b.textContent.trim().endsWith(EV_TIPOS[k][1]))); }
function calcPlazo() {
  const n = parseInt((document.getElementById('ev-plazo-n') || {}).value, 10);
  const desde = (document.getElementById('ev-plazo-desde') || {}).value;
  const sig = !!((document.getElementById('ev-plazo-sig') || {}).checked);
  if (!n || n < 1 || !desde) { toast('Pon los días hábiles y la fecha desde la que corre', 'error'); return; }
  const venc = sumaHabiles(desde, n, sig);
  const d = document.getElementById('ev-date'); if (d) d.value = venc;
  const res = document.getElementById('ev-plazo-res'); if (res) res.innerHTML = '📌 Vence: <b>' + _fmtFecha(venc) + '</b> · ' + (_diasFalta(venc) || '');
  const tx = document.getElementById('ev-text'); if (tx && !tx.value.trim()) tx.value = 'Vence plazo (' + n + ' días hábiles)';
}
function saveEvent() {
  if (!_evEdit) return;
  const g = id => ((document.getElementById(id) || {}).value || '').trim();
  _evEdit.text = g('ev-text'); _evEdit.date = g('ev-date'); _evEdit.time = (_evEdit.tipo === 'audiencia' || _evEdit.tipo === 'examen') ? g('ev-time') : ''; _evEdit.causaId = g('ev-causa');
  if (!_evEdit.text) { toast('Escribe una descripción', 'error'); return; }
  if (!_evEdit.date) { toast('Elige la fecha', 'error'); return; }
  STATE.recordatorios = STATE.recordatorios || [];
  const multi = !!(document.getElementById('ev-multi') || {}).checked;
  const end = g('ev-date-end');
  if (multi) {
    if (!end || end < _evEdit.date) { toast('La fecha "hasta" debe ser igual o posterior a la de inicio', 'error'); return; }
    if (_evMode === 'cada') {
      const isNew = _evEdit._isNew; delete _evEdit._isNew;
      if (!isNew) { const ix = STATE.recordatorios.findIndex(x => x.id === _evEdit.id); if (ix >= 0) STATE.recordatorios.splice(ix, 1); }
      const base = { ...(_evEdit) }; delete base.dateEnd;
      _dateRange(_evEdit.date, end).forEach((ds, ix) => { STATE.recordatorios.push({ ...base, id: 'rec' + Date.now() + ix + Math.floor(Math.random() * 9999), date: ds, dateEnd: undefined, created: Date.now() }); });
      saveState(); closeAllModals(); toast(_dateRange(_evEdit.date, end).length + ' eventos creados', 'success');
      if (document.getElementById('view-agenda') && document.getElementById('view-agenda').classList.contains('active')) renderAgenda();
      renderRail(); return;
    }
    _evEdit.dateEnd = end;
  } else { delete _evEdit.dateEnd; }
  const isNew = _evEdit._isNew; delete _evEdit._isNew;
  const i = STATE.recordatorios.findIndex(x => x.id === _evEdit.id);
  if (i >= 0) STATE.recordatorios[i] = _evEdit; else STATE.recordatorios.push(_evEdit);
  saveState(); closeAllModals(); toast('Evento guardado', 'success');
  if (document.getElementById('view-agenda') && document.getElementById('view-agenda').classList.contains('active')) renderAgenda();
  renderRail();
  if (_curExp && _curExp === _evEdit.causaId) openExpediente(_curExp);
}
function evDelete(id) { const i = (STATE.recordatorios || []).findIndex(x => x.id === id); if (i >= 0) { STATE.recordatorios.splice(i, 1); saveState(); } closeAllModals(); if (document.getElementById('view-agenda') && document.getElementById('view-agenda').classList.contains('active')) renderAgenda(); renderRail(); }
