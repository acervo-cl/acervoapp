const _COMP_TOKS = [['{{abogado}}', 'Abogado'], ['{{calidad}}', 'Calidad'], ['{{rol}}', 'Rol'], ['{{cliente}}', 'Cliente (indiv.)']];
const _CAUSA_TOKS = [['{{rol}}', 'Rol'], ['{{caratula}}', 'Carátula'], ['{{submateria}}', 'Submateria'], ['{{tribunal}}', 'Tribunal'], ['{{materia}}', 'Materia']];
const _INDIV_TOKS = [['{{nombre}}', 'Nombre'], ['{{rut}}', 'RUT'], ['{{nacionalidad}}', 'Nacion.'], ['{{estadoCivil}}', 'Est. civil'], ['{{profesion}}', 'Profesión'], ['{{domicilio}}', 'Domicilio'], ['{{don}}', 'don/doña'], ['{{domiciliado}}', 'domiciliado/a'], ['{{representante}}', 'Represent.']];

function openCompareceEditor() {
  if (!_needAdminForms()) return;
  const host = document.getElementById('comparece-body');
  if (!host) return;
  const T = compareceTpl();
  host.innerHTML = `<div class="modal-title">🧑‍⚖️ Textos de comparecencia</div>
    <div style="font-size:12px;color:var(--gray2);margin-bottom:10px">Quién comparece, según el caso. Usa <code>{{abogado}}</code> (tu nombre), <code>{{calidad}}</code> (abogado/apoderado/habilitado en derecho, según tu perfil), <code>{{rol}}</code> (demandante…) y <code>{{cliente}}</code> (individualización completa del cliente).</div>
    <div style="font-size:11px;color:var(--gold3);background:rgba(201,168,76,.08);border-radius:8px;padding:7px 10px;margin-bottom:8px">✍️ Selecciona el texto y aprieta <b>B</b> (o <b>Ctrl/⌘+B</b>) para ponerlo en <b>negrita</b>. Se guarda y se ve así en los escritos.</div>
    <div class="form-row"><label class="form-label">Escrito CON poder (comparece el abogado)</label>${_richBar('cp-poder', _COMP_TOKS)}<div class="form-textarea ce-rich" id="cp-poder" contenteditable="true" data-ph="Texto…">${_marksToHtml(T.poder)}</div></div>
    <div class="form-row"><label class="form-label">Demanda CON mandato (comparece el abogado)</label>${_richBar('cp-mandato', _COMP_TOKS)}<div class="form-textarea ce-rich" id="cp-mandato" contenteditable="true" data-ph="Texto…">${_marksToHtml(T.mandato)}</div></div>
    <div class="form-row"><label class="form-label">Comparece el CLIENTE (sin poder / sin mandato)</label>${_richBar('cp-cliente', _COMP_TOKS)}<div class="form-textarea ce-rich" id="cp-cliente" contenteditable="true" data-ph="Texto…">${_marksToHtml(T.cliente)}</div>
      <div style="font-size:11px;color:var(--gray2);margin-top:4px">El <code>{{cliente}}</code> inserta la <b>individualización completa</b>. ¿Cómo se arma (y el nombre en negrita)? <a style="color:var(--gold3);cursor:pointer" onclick="openIndivEditor()">🧾 Editar forma de individualizar →</a></div></div>
    <div class="form-row"><label class="form-label">Párrafo de la causa (qué datos aparecen y cuáles en negrita)</label>${_richBar('cp-causa', _CAUSA_TOKS)}<div class="form-textarea ce-rich" id="cp-causa" contenteditable="true" data-ph="${escapeHtml(CAUSA_DEFAULT)}">${_marksToHtml(causaTplStr())}</div>
      <div style="font-size:11px;color:var(--gray2);margin-top:3px">Segmentos separados por <b>|</b> (se omiten si el dato está vacío). Datos: <code>{{rol}}</code> <code>{{caratula}}</code> <code>{{submateria}}</code> <code>{{tribunal}}</code> <code>{{materia}}</code>. Para <b>negrita</b> envuelve con <code>[[B]]…[[/B]]</code>. Ej: <code>causa Rol [[B]]{{rol}}[[/B]]</code></div></div>
    <label class="rw-check" style="margin:8px 0"><input type="checkbox" ${STATE.nombreMayusNegrita !== false ? 'checked' : ''} onchange="STATE.nombreMayusNegrita=this.checked;saveState();toast(this.checked?'Nombres en MAYÚSCULA y negrita':'Nombres normales')"> Los <b>nombres</b> de comparecientes van en <b>MAYÚSCULA y negrita</b> en los documentos</label>
    <div class="modal-footer"><button class="btn-ghost" onclick="STATE.compareceTpl=null;saveState();openCompareceEditor()">↺ Por defecto</button><button class="btn-ghost" onclick="openModelosPanel()">Cancelar</button><button class="btn-gold" onclick="saveCompareceEditor()">Guardar</button></div>`;
  openModal('modal-comparece');
}

function saveCompareceEditor() {
  if (!_needAdminForms()) return;
  const g = (id) => {
    const el = document.getElementById(id);
    return el ? _htmlToMarks(el).trim() : '';
  };
  STATE.compareceTpl = {
    poder: g('cp-poder') || COMPARECE_DEFAULT.poder,
    mandato: g('cp-mandato') || COMPARECE_DEFAULT.mandato,
    cliente: g('cp-cliente') || COMPARECE_DEFAULT.cliente,
  };
  STATE.causaTpl = g('cp-causa') || null;
  saveState();
  toast('Textos de comparecencia guardados', 'success');
  openModelosPanel();
}

function openImportModelos() {
  if (!_needAdminForms()) return;
  const host = document.getElementById('import-mdl-body');
  if (!host) return;
  const tipos = TIPOSDOC.map((t) => `<option value="${t.id}" ${_mdlCat === t.id ? 'selected' : ''}>${t.icono || ''} ${escapeHtml(t.nombre)}</option>`).join('');
  host.innerHTML = `<div class="modal-title">⬆ Importar modelos (tabla)</div>
    <div style="font-size:12px;color:var(--gray2);margin-bottom:8px">Pega desde Excel/Sheets: <b>una fila por modelo</b>, columnas separadas por <b>tabulación</b>, en este orden:<br><b>Nombre · Cabecera · Cuerpo · Pie · Variables</b>.<br>Para un salto de línea dentro de una celda escribe <code>\\n</code>. Variables = nombres separados por coma (ej. <code>ciudad, fecha, monto</code>). Puedes incluir una fila de títulos (se ignora).</div>
    <div class="form-row"><label class="form-label">Crear dentro del tipo</label><select class="form-select" id="imp-tipo">${tipos}</select></div>
    <textarea id="imp-ta" class="form-textarea" style="min-height:200px;font-family:monospace;font-size:12px" placeholder="Téngase presente⇥EN LO PRINCIPAL: téngase presente⇥Que, por este acto, vengo en…⇥tener presente lo expuesto⇥"></textarea>
    <div class="modal-footer"><button class="btn-ghost" onclick="openModelosPanel()">Cancelar</button><button class="btn-gold" onclick="doImportModelos()">Importar</button></div>`;
  openModal('modal-import-mdl');
}

function doImportModelos() {
  if (!_needAdminForms()) return;
  const tipoId = val('imp-tipo') || 'escrito';
  const ta = document.getElementById('imp-ta');
  if (!ta) return;
  const lines = ta.value.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim());
  if (!lines.length) {
    toast('Pega al menos una fila', 'error');
    return;
  }
  let rows = lines;
  if (/^nombre\b/i.test((lines[0].split('\t')[0] || '').trim())) rows = lines.slice(1);
  const tp = tipoById(tipoId) || { motor: 'judicial' };
  let n = 0;
  rows.forEach((line) => {
    const c = line.split('\t');
    const nombre = (c[0] || '').trim();
    if (!nombre) return;
    const dec = (s) => (s || '').trim().replace(/\\n/g, '\n');
    const cab = dec(c[1]);
    const cuerpo = dec(c[2]);
    const pie = dec(c[3]);
    const vraw = (c[4] || '').trim();
    const variables = vraw
      ? vraw.split(/[,;]/).map((s) => s.trim()).filter(Boolean).map((nm) => ({ id: nm.replace(/\s+/g, '_').toLowerCase(), label: nm, tipo: 'input', placeholder: '' }))
      : [];
    MODELOS.push({ id: `m${Date.now()}${Math.floor(Math.random() * 99999)}`, tipoId, categoria: tipoId, nombre, cabecera: cab, suma: cab, cuerpo, pie, portanto: pie, materia: 'general', esOtrosi: false, otrosiesDefault: [], roles: [], variables, usaMembrete: !!tp.usaMembrete });
    n += 1;
  });
  if (!n) {
    toast('No se reconocieron filas', 'error');
    return;
  }
  saveState();
  closeAllModals();
  _mdlCat = tipoId;
  openModelosPanel();
  toast(`${n} modelo(s) importado(s)`, 'success');
}

function tipoOfModel(m) {
  return tipoById(m.tipoId || m.categoria || 'escrito');
}

function piezasDeTipo(id) {
  return MODELOS.filter((m) => (m.tipoId || m.categoria || 'escrito') === id);
}

function ensureModelos() {
  const removedTypes = new Set(Array.isArray(STATE.removedTiposDoc) ? STATE.removedTiposDoc : []);
  if (!MODELOS.length) {
    MODELOS_DEFAULT.forEach((m) => {
      const typeId = m.tipoId || m.categoria || 'escrito';
      if (!removedTypes.has(typeId)) MODELOS.push(JSON.parse(JSON.stringify(m)));
    });
  }
  MODELOS.forEach((m) => {
    if (!m.categoria) m.categoria = 'escrito';
    if (m.cabecera === undefined) m.cabecera = m.suma || m.encabezado || '';
    if (m.pie === undefined) m.pie = m.portanto || '';
    if (m.cuerpo === undefined) m.cuerpo = '';
  });
  MODELOS_DEFAULT.forEach((d) => {
    const typeId = d.tipoId || d.categoria || 'escrito';
    if (!removedTypes.has(typeId) && !MODELOS.some((m) => m.id === d.id)) {
      MODELOS.push(JSON.parse(JSON.stringify(d)));
    }
  });
  const pyp = MODELOS.find((m) => m.id === 'pyp');
  if (pyp && !pyp.esPatrocinio) {
    pyp.esPatrocinio = true;
    if (!pyp.cuerpoPlural) {
      pyp.cuerpo = 'Que, por este acto, confiero patrocinio y poder al abogado {{abogados}}.';
      pyp.cuerpoPlural = 'Que, por este acto, confiero patrocinio y poder a los abogados {{abogados}}.';
    }
  }
  ensureTiposDoc();
}

function openIndivEditor() {
  if (!_needAdminForms()) return;
  const T = indivTpl();
  document.getElementById('indiv-body').innerHTML = `<div class="modal-title">🧾 Forma de individualizar</div>
    <div style="font-size:12px;color:var(--gray2);line-height:1.65;margin-bottom:12px">Así se arma la <b>individualización completa</b> de cada persona en tus escritos (botón 🧾). Separa cada dato con <code>|</code>: si un dato viene vacío, ese trozo <b>se omite solo</b>.<br>
      Datos: <code>{{nombre}}</code> <code>{{rut}}</code> <code>{{nacionalidad}}</code> <code>{{estadoCivil}}</code> <code>{{profesion}}</code> <code>{{domicilio}}</code> <code>{{giro}}</code> <code>{{representante}}</code> <code>{{rutRepresentante}}</code> <code>{{cargoRepresentante}}</code> · según género: <code>{{don}}</code> <code>{{domiciliado}}</code> <code>{{el}}</code> <code>{{hijo}}</code> <span style="color:var(--gray2)">(hijo/hija — para el niño/a, en vez de don/doña)</span></div>
    <div style="font-size:11.5px;color:var(--gold3);margin-bottom:8px">💡 Para poner el <b>nombre en negrita</b>: selecciona <code>{{nombre}}</code> y aprieta <b>B</b> en la barra de formato. Queda <code>[[B]]{{nombre}}[[/B]]</code>.</div>
    <div class="form-row"><label class="form-label">👤 Persona natural</label>${_fmtBar('iv-natural', _INDIV_TOKS)}<textarea class="form-textarea" id="iv-natural" style="min-height:58px;font-size:12.5px">${escapeHtml(T.natural)}</textarea></div>
    <div class="form-row"><label class="form-label">🏢 Persona jurídica</label>${_fmtBar('iv-juridica', _INDIV_TOKS)}<textarea class="form-textarea" id="iv-juridica" style="min-height:58px;font-size:12.5px">${escapeHtml(T.juridica)}</textarea></div>
    <div class="form-row"><label class="form-label">🧒 Niño/a <span style="color:var(--gray2);font-weight:400">(sin representante: a la madre/padre lo individualizas aparte)</span></label>${_fmtBar('iv-nino', _INDIV_TOKS)}<textarea class="form-textarea" id="iv-nino" style="min-height:58px;font-size:12.5px">${escapeHtml(T.nino)}</textarea></div>
    <div class="form-row"><label class="form-label">⚖️ Abogado/a <span style="color:var(--gray2);font-weight:400">(cómo TÚ te individualizas en la comparecencia · usa <code>{{cargo}}</code> = abogado/apoderado, de tu Perfil)</span></label>${_fmtBar('iv-abogado', _INDIV_TOKS)}<textarea class="form-textarea" id="iv-abogado" style="min-height:58px;font-size:12.5px">${escapeHtml(T.abogado)}</textarea></div>
    <div class="modal-footer" style="justify-content:space-between"><button class="btn-ghost" onclick="STATE.indivTpl=null;saveState();openIndivEditor()">↺ Por defecto</button><span style="display:flex;gap:8px"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" onclick="saveIndivEditor()">Guardar</button></span></div>`;
  openModal('modal-indiv');
}

function saveIndivEditor() {
  if (!_needAdminForms()) return;
  const g = (id) => ((document.getElementById(id) || {}).value || '').trim();
  STATE.indivTpl = { natural: g('iv-natural'), juridica: g('iv-juridica'), nino: g('iv-nino'), abogado: g('iv-abogado') };
  saveState();
  toast('Forma de individualizar guardada', 'success');
  closeAllModals();
}

let _mdlCat = 'escrito';

function openModelosPanel() {
  ensureModelos();
  if (!tipoById(_mdlCat)) _mdlCat = (TIPOSDOC[0] || {}).id;
  renderModelos();
  openModal('modal-modelos');
}

function renderModelos() {
  ensureTiposDoc();
  const host = document.getElementById('modelos-body');
  if (!host) return;
  if (!tipoById(_mdlCat)) _mdlCat = (TIPOSDOC[0] || {}).id;
  const adm = canEditForms();
  const tabs = TIPOSDOC.map((t) => `<button class="rw-pill ${_mdlCat === t.id ? 'on' : ''}" onclick="_mdlCat='${t.id}';renderModelos()">${t.icono || ''} ${escapeHtml(t.nombre)}</button>`).join('') + (adm ? '<button class="rw-pill" onclick="editTipoDoc(null)" title="Agregar tipo de documento">＋ Tipo</button>' : '');
  const tipo = tipoById(_mdlCat);
  if (!tipo) {
    host.innerHTML = `<div class="redactar-tabs" style="flex-wrap:wrap">${tabs}</div><div style="padding:24px 8px;color:var(--gray2)">No hay tipos de documento. Crea uno para empezar.</div>`;
    return;
  }
  const doc = (tipo.motor || 'judicial') === 'documental';
  const list = piezasDeTipo(tipo.id);
  const cards = list.map((m) => {
    const isDefault = MODELOS_DEFAULT.some((d) => d.id === m.id);
    const resumen = doc ? ((m.roles || []).map((r) => r.label).filter(Boolean).join(' · ') || 'Sin roles definidos') : `Cabecera: ${m.cabecera || m.suma || '—'}`;
    const vars = (m.variables || []).map((v) => `[${v.id}]`).join(', ');
    const otrosiTag = (m.otrosiesDefault || []).length ? `<span class="mdl-tag">+${m.otrosiesDefault.length} otrosíes</span>` : '';
    const dragAttrs = adm ? `draggable="true" ondragstart="mdlDragStart(event,'${m.id}')" ondragover="event.preventDefault();this.classList.add('mdl-over')" ondragleave="this.classList.remove('mdl-over')" ondrop="this.classList.remove('mdl-over');mdlDrop('${m.id}')"` : '';
    const oculto = m.paraTodos === false;
    return `<div class="mdl-card${oculto ? ' mdl-hidden' : ''}" ${dragAttrs}>
      ${adm ? '<span class="mdl-grip" title="Arrastra para reordenar">⠿</span>' : ''}
      <div style="flex:1">
        <div class="mdl-name">${escapeHtml(m.nombre)} ${m.esOtrosi ? '<span class="mdl-tag">otrosí</span>' : ''}${otrosiTag}${m.usaMembrete ? '<span class="mdl-tag">membrete</span>' : ''}${oculto ? '<span class="mdl-tag" style="background:rgba(255,120,120,.16);color:#f9a">solo admin</span>' : ''}</div>
        <div class="mdl-suma">${escapeHtml(resumen)}</div>
        ${vars ? `<div class="mdl-vars">Variables: ${escapeHtml(vars)}</div>` : ''}
      </div>
      ${adm ? `<div style="display:flex;gap:6px;align-items:center">
        <button class="btn-ghost" onclick="toggleModeloParaTodos('${m.id}')" title="${oculto ? 'Ahora solo lo ves tú (admin). Clic para mostrarlo a la comunidad.' : 'Lo ve toda la comunidad. Clic para dejarlo solo para el admin.'}">${oculto ? '🔒 Solo admin' : '🌐 Comunidad'}</button>
        <button class="btn-ghost" onclick="editModelo('${m.id}')">Editar</button>
        ${isDefault ? '' : `<button class="btn-ghost" style="color:var(--danger)" onclick="deleteModelo('${m.id}')">Borrar</button>`}
      </div>` : ''}
    </div>`;
  }).join('') || `<div style="color:var(--gray2);padding:10px 0">Sin ${escapeHtml((tipo.piezaLabel || 'piezas').toLowerCase())} aún.${adm ? ' Usa ＋.' : ''}</div>`;
  const tipohead = `<div class="mdl-tipohead">
    <div><b>${tipo.icono || ''} ${escapeHtml(tipo.nombre)}</b> <span style="font-size:11px;color:var(--gray2)">· motor ${escapeHtml(tipo.motor || 'judicial')} · piezas: ${escapeHtml(tipo.piezaLabel || '')}</span></div>
    ${adm ? `<div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn-ghost" onclick="toggleTipoParaTodos('${tipo.id}')" title="${tipo.paraTodos ? 'Lo ve toda la comunidad. Clic para dejarlo solo para ti (pruebas).' : 'Solo lo ves tú. Clic para liberarlo a la comunidad.'}">${tipo.paraTodos ? '🌐 Comunidad' : '🔒 Solo yo'}</button>
      <button class="btn-ghost" onclick="editEstructura('${tipo.id}')">✎ Estructura</button>
      <button class="btn-ghost" onclick="editTipoDoc('${tipo.id}')">⚙️ Tipo</button>
      <button class="btn-gold" onclick="editModelo(null)">＋ ${escapeHtml(tipo.piezaLabel || 'Pieza')}</button>
    </div>` : '<div style="font-size:11px;color:var(--gray2)">Solo lectura</div>'}</div>`;
  host.innerHTML = `<div class="redactar-tabs" style="flex-wrap:wrap">${tabs}</div>${tipohead}${cards}`;
}
