function eeTextoDefault(key) {
  if (key === 'comparecencia') return '{{compareciente}} en autos sobre {{causa}}, a U.S., respetuosamente digo:';
  if (key === 'portanto') return 'POR TANTO,\nSOLICITO A U.S., {{portanto}}';
  return '{{contenido}}';
}

function eeHint(key) {
  if (key === 'comparecencia') return 'Usa <code>{{compareciente}}</code> y <code>{{causa}}</code>.';
  if (key === 'portanto') return 'Usa <code>{{portanto}}</code>. Aplica al principal y a cada otrosí.';
  if (key === 'otrosies') return '<code>{{contenido}}</code> = el cuerpo de CADA otrosí (sangría/formato propios).';
  return '<code>{{contenido}}</code> = el contenido de esta parte. Agrega texto o ⇥ antes/después.';
}

let _EE = null;

function editEstructura(tid) {
  if (!_needAdminForms()) return;
  const t = tipoById(tid);
  if (!t) return;
  ensureTiposDoc();
  _EE = { tipoId: tid, partes: JSON.parse(JSON.stringify(t.partes || defaultPartes(t))) };
  renderEstructura();
  openModal('modal-estruct');
}

function eeToggle(i) {
  _EE.partes[i].on = !(_EE.partes[i].on !== false);
  renderEstructura();
}

function eeMove(i, d) {
  const j = i + d;
  if (j < 0 || j >= _EE.partes.length) return;
  const t = _EE.partes[i];
  _EE.partes[i] = _EE.partes[j];
  _EE.partes[j] = t;
  renderEstructura();
}

function eeSetTexto(i, v) {
  _EE.partes[i].texto = v;
  eeUpdatePreview();
}

function eeInsertTab(i) {
  eeInsertText(i, '\t');
}

function eeInsertText(i, txt) {
  const ta = document.getElementById(`ee-txt-${i}`);
  if (!ta) return;
  const s = ta.selectionStart != null ? ta.selectionStart : ta.value.length;
  const e = ta.selectionEnd != null ? ta.selectionEnd : ta.value.length;
  ta.value = ta.value.slice(0, s) + txt + ta.value.slice(e);
  if (_EE.partes[i]) _EE.partes[i].texto = ta.value;
  ta.focus();
  const p = s + txt.length;
  try {
    ta.setSelectionRange(p, p);
  } catch (_) {}
  eeUpdatePreview();
}

// Wraps the selected textarea text with the marker pair used by the preview renderer.
// Keep the selection active so multiple formatting actions can be applied in sequence.
function _taSurround(id, pre, post) {
  const ta = document.getElementById(id);
  if (!ta) return null;
  const start = ta.selectionStart != null ? ta.selectionStart : ta.value.length;
  const end = ta.selectionEnd != null ? ta.selectionEnd : ta.value.length;
  const selected = ta.value.slice(start, end) || 'texto';
  ta.value = ta.value.slice(0, start) + pre + selected + post + ta.value.slice(end);
  ta.focus();
  const nextStart = start + pre.length;
  try {
    ta.setSelectionRange(nextStart, nextStart + selected.length);
  } catch (_) {}
  return ta;
}

function eeFmt(i, kind) {
  const id = `ee-txt-${i}`;
  let ta;
  if (kind === 'b') ta = _taSurround(id, '[[B]]', '[[/B]]');
  else if (kind === 'i') ta = _taSurround(id, '[[I]]', '[[/I]]');
  else if (kind === 'u') ta = _taSurround(id, '[[U]]', '[[/U]]');
  else ta = _taSurround(id, `[[ALIGN:${kind}]]\n`, '\n[[/ALIGN]]');
  if (ta && _EE.partes[i]) {
    _EE.partes[i].texto = ta.value;
    eeUpdatePreview();
  }
}

function eeAddPresRow(i) {
  _EE.partes[i].rows = _EE.partes[i].rows || [];
  _EE.partes[i].rows.push({ label: '', token: '' });
  renderEstructura();
}

function eeSetPresRow(i, j, k, v) {
  if (_EE.partes[i].rows && _EE.partes[i].rows[j]) _EE.partes[i].rows[j][k] = v;
  eeUpdatePreview();
}

function eeDelPresRow(i, j) {
  _EE.partes[i].rows.splice(j, 1);
  renderEstructura();
}

function renderEstructura() {
  const host = document.getElementById('estruct-body');
  if (!host || !_EE) return;
  const t = tipoById(_EE.tipoId) || { nombre: '' };
  const motorDoc = (t.motor || 'judicial') === 'documental';
  const datos = motorDoc
    ? '<div class="mdl-tokens" style="margin-top:4px">Puedes usar datos de las partes (según los roles del modelo): <code>{{arrendador.nombre}}</code> <code>{{abogado.nombre}}</code> <code>{{fecha}}</code></div>'
    : '<div class="mdl-tokens" style="margin-top:4px">Puedes usar datos: <code>{{cliente.nombre}}</code> <code>{{causa.rol}}</code> <code>{{abogado.nombre}}</code> <code>{{fecha}}</code> · y en la comparecencia <code>{{compareciente}}</code> <code>{{causa}}</code> · en el por tanto <code>{{portanto}}</code></div>';
  const rows = _EE.partes.map((pt, i) => {
    const on = pt.on !== false;
    const lab = (motorDoc && PARTES_CAT_DOC[pt.key]) || PARTES_CAT[pt.key] || pt.key;
    let extra = '';
    if (on && pt.key !== 'presuma') {
      const toks = motorDoc ? ['{{fecha}}', '{{abogado.nombre}}'] : ['{{cliente.nombre}}', '{{cliente.rut}}', '{{causa.rol}}', '{{causa.materia}}', '{{fecha}}', '{{abogado.nombre}}'];
      const tokBtns = toks.map((tk) => `<button class="rw-mini ee-tok" onmousedown="event.preventDefault()" onclick="eeInsertText(${i},'${tk}')" title="Insertar ${tk}">${tk}</button>`).join('');
      const fmtBar = `<div id="ee-fmt-${i}" style="display:none;gap:4px;margin:5px 0 3px;align-items:center;flex-wrap:wrap">
        <button class="rw-mini" onmousedown="event.preventDefault()" onclick="eeFmt(${i},'b')" title="Negrita"><b>B</b></button>
        <button class="rw-mini" onmousedown="event.preventDefault()" onclick="eeFmt(${i},'i')" title="Cursiva"><i>I</i></button>
        <button class="rw-mini" onmousedown="event.preventDefault()" onclick="eeFmt(${i},'u')" title="Subrayado"><u>U</u></button>
        <span style="width:1px;height:15px;background:rgba(255,255,255,.15);display:inline-block"></span>
        <button class="rw-mini" onmousedown="event.preventDefault()" onclick="eeFmt(${i},'left')" title="Izquierda">⬅</button>
        <button class="rw-mini" onmousedown="event.preventDefault()" onclick="eeFmt(${i},'center')" title="Centrar">↔</button>
        <button class="rw-mini" onmousedown="event.preventDefault()" onclick="eeFmt(${i},'right')" title="Derecha">➡</button>
        <button class="rw-mini" onmousedown="event.preventDefault()" onclick="eeInsertTab(${i})" title="Sangría">⇥</button>
        <span style="width:1px;height:15px;background:rgba(255,255,255,.15);display:inline-block"></span>${tokBtns}</div>`;
      extra = `<div style="margin-top:6px;display:flex;gap:6px;align-items:center;flex-wrap:wrap"><button class="rw-mini" onclick="const b=document.getElementById('ee-fmt-${i}');b.style.display=(b.style.display==='none'?'flex':'none')" title="Mostrar/ocultar formato">✎ Formato</button><span style="font-size:10px;color:var(--gray2)">${eeHint(pt.key)} · selecciona texto y aplica negrita/centrar… (se ve en la vista previa)</span></div>${fmtBar}
      <textarea class="form-textarea" id="ee-txt-${i}" style="min-height:50px" oninput="eeSetTexto(${i},this.value)">${escapeHtml(pt.texto != null ? pt.texto : eeTextoDefault(pt.key))}</textarea>`;
    }
    if (on && pt.key === 'presuma') {
      const pr = (pt.rows || []).map((r, j) => `<div class="mdl-var-row" style="grid-template-columns:1fr 1fr auto"><input class="form-input" placeholder="Etiqueta (ej. Materia)" value="${escapeHtml(r.label || '')}" oninput="eeSetPresRow(${i},${j},'label',this.value)"><input class="form-input" placeholder="dato {{causa.materia}} o vacío=manual" value="${escapeHtml(r.token || '')}" oninput="eeSetPresRow(${i},${j},'token',this.value)"><button class="rw-mini" onclick="eeDelPresRow(${i},${j})">✕</button></div>`).join('');
      extra = `<div style="margin-top:6px">${pr}<button class="btn-ghost" style="margin-top:4px" onclick="eeAddPresRow(${i})">＋ Fila</button></div>`;
    }
    const alignSel = on ? `<select class="form-select" style="width:auto;padding:3px 6px;font-size:12px" onchange="eeSetAlign(${i},this.value)"><option value="" ${!pt.align ? 'selected' : ''}>⬅ Izq</option><option value="center" ${pt.align === 'center' ? 'selected' : ''}>↔ Centro</option><option value="right" ${pt.align === 'right' ? 'selected' : ''}>➡ Der</option></select>` : '';
    return `<div class="ee-part ${on ? '' : 'ee-off'}">
      <div class="ee-head">
        <label class="rw-check" style="margin:0"><input type="checkbox" ${on ? 'checked' : ''} onchange="eeToggle(${i})"> <b>${escapeHtml(lab)}</b></label>
        <span style="display:flex;gap:4px;align-items:center">${alignSel}<button class="rw-mini" onclick="eeMove(${i},-1)">↑</button><button class="rw-mini" onclick="eeMove(${i},1)">↓</button></span>
      </div>${extra}
    </div>`;
  }).join('');
  host.innerHTML = `<div class="modal-title">✎ Estructura · ${escapeHtml(t.nombre)}</div>
    <div style="font-size:12px;color:var(--gray2);margin-bottom:8px">Activa/desactiva partes, alinéalas (izq/centro/der), edita su texto fijo y ordénalas. ${motorDoc ? 'El encabezado presenta a las partes y el contenido entra en <b>Cláusulas</b>.' : 'El contenido entra en <b>Cuerpo</b> y <b>Otrosíes</b>.'} A la derecha ves cómo queda.</div>
    <div class="me-doc-wrap">
      <div class="me-doc-left">${rows}${datos}</div>
      <div class="me-doc-right"><div class="rw-preview-lbl">Vista previa</div><div class="me-preview" id="ee-preview">${meWrap(eePreview())}</div></div>
    </div>
    <div class="modal-footer"><button class="btn-ghost" onclick="restaurarEstructura()">↺ Original</button><button class="btn-ghost" onclick="openModelosPanel()">Cancelar</button><button class="btn-gold" onclick="saveEstructura()">Guardar estructura</button></div>`;
  meFitPaper('ee-preview');
}

function eeSetAlign(i, v) {
  if (_EE.partes[i]) {
    _EE.partes[i].align = v || undefined;
    renderEstructura();
  }
}

function meWrap(html) {
  return `<div class="me-paper-holder"><div class="me-paper">${html}</div></div>`;
}

function meFitPaper(stageId) {
  requestAnimationFrame(() => {
    const stage = document.getElementById(stageId);
    if (!stage) return;
    const holder = stage.querySelector('.me-paper-holder');
    const paper = stage.querySelector('.me-paper');
    if (!holder || !paper) return;
    paper.style.transform = 'none';
    const cs = getComputedStyle(stage);
    const avail = stage.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
    const pw = paper.offsetWidth || 720;
    const scale = Math.min(1, avail / pw);
    paper.style.transform = `scale(${scale})`;
    holder.style.width = `${pw * scale}px`;
    holder.style.height = `${paper.offsetHeight * scale}px`;
    holder.querySelectorAll('.pg-sep').forEach((e) => e.remove());
    const ph = parseFloat(paper.getAttribute('data-pageh') || 0);
    if (ph) {
      const pageHpx = ph * 3.7795275591;
      const tot = paper.offsetHeight;
      const n = Math.floor((tot - 2) / pageHpx);
      for (let k = 1; k <= n; k += 1) {
        const d = document.createElement('div');
        d.className = 'pg-sep';
        d.style.cssText = `position:absolute;left:0;right:0;top:${pageHpx * k * scale}px;height:0;pointer-events:none;border-top:1px dashed rgba(0,0,0,.45);box-shadow:0 -7px 12px rgba(0,0,0,.12)`;
        holder.appendChild(d);
      }
    }
  });
}

window.addEventListener('resize', () => {
  ['me-preview', 'ee-preview'].forEach((id) => {
    if (document.getElementById(id)) meFitPaper(id);
  });
  if (typeof _RW !== 'undefined' && _RW && document.getElementById('rw-pages-holder')) rwFitWrap();
  if (STATE.currentDocId && document.getElementById('bm-layer')) renderBookmarks();
});

function eeUpdatePreview() {
  const el = document.getElementById('ee-preview');
  if (el) {
    el.innerHTML = meWrap(eePreview());
    meFitPaper('ee-preview');
  }
}

function eePreview() {
  const tipo = tipoById(_EE.tipoId) || { motor: 'judicial' };
  const doc = (tipo.motor || 'judicial') === 'documental';
  const demo = doc
    ? { titulo: 'CONTRATO DE ARRENDAMIENTO\n\nEn Santiago, a «fecha», entre «Arrendador individualizado» y «Arrendatario individualizado», se ha convenido lo siguiente:', cuerpo: 'PRIMERO: «primera cláusula».\n\nSEGUNDO: «segunda cláusula».', pie: '«firma arrendador»                    «firma arrendatario»' }
    : { titulo: 'EN LO PRINCIPAL: «la suma con todas las peticiones».-', tribunal: 'S. J. L.', cuerpo: '«Aquí va el cuerpo de la petición principal».', pie: '«firmas / cierre»' };
  const ptpl = (_EE.partes.find((p) => p.key === 'portanto') || {});
  const ptTpl = ptpl.texto != null ? ptpl.texto : eeTextoDefault('portanto');
  const blocks = [];
  (_EE.partes || []).filter((p) => p.on !== false).forEach((pt) => {
    let txt = '';
    const tpl = pt.texto != null ? pt.texto : eeTextoDefault(pt.key);
    if (pt.key === 'presuma') {
      txt = (pt.rows || []).map((r) => `${r.label}: ${r.token || '«____»'}`).join('\n');
      if (txt) txt = `[[PRESUMA]]\n${txt}\n[[/PRESUMA]]`;
    } else if (pt.key === 'comparecencia') {
      txt = fillMarkers(tpl, { compareciente: '«Compareciente individualizado»', causa: '«causa Rol C-123-2025, caratulada Pérez con Soto»' });
    } else if (pt.key === 'portanto') {
      txt = fillMarkers(tpl, { portanto: '«lo que se solicita»' });
    } else if (pt.key === 'otrosies') {
      txt = `OTROSÍ: ${fillMarkers(tpl, { contenido: '«cuerpo del otrosí»' })}\n\n${fillMarkers(ptTpl, { portanto: '«lo que se pide en el otrosí»' })}`;
    } else {
      txt = fillMarkers(tpl, { contenido: demo[pt.key] || '' });
    }
    if ((txt || '').trim()) {
      if (pt.align && pt.key !== 'presuma') txt = `[[ALIGN:${pt.align}]]\n${txt}\n[[/ALIGN]]`;
      blocks.push(txt);
    }
  });
  const out = blocks.join('\n\n').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => `«${k}»`);
  return docTextToHtml(out) || '<span style="opacity:.5">Estructura vacía…</span>';
}

function saveEstructura() {
  if (!_needAdminForms()) return;
  const t = tipoById(_EE.tipoId);
  if (!t) return;
  t.partes = JSON.parse(JSON.stringify(_EE.partes));
  saveState();
  try {
    if (STATE.isAdmin) {
      _writeMaster();
      _masterSig = JSON.stringify(_masterData());
    }
  } catch (_) {}
  openModelosPanel();
  toast('Estructura guardada · aplicada a la comunidad', 'success');
}

function restaurarEstructura() {
  if (!_needAdminForms()) return;
  const t = tipoById(_EE.tipoId);
  if (!t) return;
  _EE.partes = defaultPartes(t);
  renderEstructura();
}
