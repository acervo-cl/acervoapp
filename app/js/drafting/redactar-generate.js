let _rwActiveBody = null;
let _rwRepagT = null;

function pageSheetFlexStyle(fmt) {
  const d = pageDims(fmt.pageSize);
  const mem = STATE.membrete || {};
  const bt = (mem.bodyTopMm != null ? Number(mem.bodyTopMm) : fmt.mTop);
  const bb = (mem.bodyBottomMm != null ? (d[1] - Number(mem.bodyBottomMm)) : fmt.mBottom);
  return `width:${d[0]}mm;height:${d[1]}mm;box-sizing:border-box;overflow:hidden;position:relative;`
    + `padding:${bt}mm ${fmt.mRight}mm ${bb}mm ${fmt.mLeft}mm;background:#fff;color:#111;`
    + `font-family:'${fmt.font || 'Times New Roman'}',Georgia,serif;font-size:${fmt.size || 12}pt;line-height:${fmt.lineHeight || 1.5};text-align:${fmt.align || 'justify'}`;
}

function rwNormalizeBlocks(container) {
  const frag = document.createDocumentFragment();
  let cur = null;
  const isBlock = (el) => ['DIV', 'P', 'TABLE', 'UL', 'OL', 'H1', 'H2', 'H3', 'BLOCKQUOTE'].includes(el.tagName);
  const blank = () => {
    const d = document.createElement('div');
    d.innerHTML = '<br>';
    return d;
  };
  const flush = () => {
    if (cur) {
      frag.appendChild(cur);
      cur = null;
    }
  };
  [...container.childNodes].forEach((n) => {
    if (n.nodeType === 1 && n.tagName === 'BR') {
      if (cur) flush();
      else frag.appendChild(blank());
      return;
    }
    if (n.nodeType === 1 && isBlock(n)) {
      flush();
      frag.appendChild(n);
      return;
    }
    if (!cur) cur = document.createElement('div');
    cur.appendChild(n);
  });
  flush();
  container.innerHTML = '';
  container.appendChild(frag);
}

function rwLayoutSheets(holder, blocks, caret) {
  const fmt = _RW.fmt || resolveFmt(null);
  const d = pageDims(fmt.pageSize);
  const MM = 3.7795275591;
  const conM = _RW.conMembrete !== false && hayMembrete();
  const meas = document.createElement('div');
  meas.style.cssText = `position:fixed;left:-99999px;top:0;width:${d[0] - fmt.mLeft - fmt.mRight}mm;visibility:hidden;font-family:'${fmt.font || 'Times New Roman'}',Georgia,serif;font-size:${fmt.size || 12}pt;line-height:${fmt.lineHeight || 1.5};text-align:${fmt.align || 'justify'};color:#111`;
  document.body.appendChild(meas);
  blocks.forEach((b) => meas.appendChild(b));
  const hs = blocks.map((b) => b.getBoundingClientRect().height);
  meas.remove();
  const _mem = STATE.membrete || {};
  const _bt = (_mem.bodyTopMm != null) ? Number(_mem.bodyTopMm) : fmt.mTop;
  const _bbot = (_mem.bodyBottomMm != null) ? Number(_mem.bodyBottomMm) : (d[1] - fmt.mBottom);
  const U = (_bbot - _bt) * MM;
  const pgPx = (fmt.paraGap || 0) * MM;
  const pages = [[]];
  let used = 0;
  blocks.forEach((b, i) => {
    const h = hs[i] + pgPx;
    if (used > 0 && used + h > U + 0.5) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(b);
    used += h;
  });
  holder.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'rw-pages-wrap';
  pages.forEach((pg) => {
    const sh = document.createElement('div');
    sh.className = 'rw-page-sheet';
    sh.setAttribute('style', pageSheetFlexStyle(fmt));
    const body = document.createElement('div');
    body.className = 'rw-sheet-body';
    body.contentEditable = 'true';
    body.spellcheck = false;
    body.style.setProperty('--fi', `${fmt.firstIndent || 0}mm`);
    body.style.setProperty('--pg', `${fmt.paraGap || 0}mm`);
    body.addEventListener('input', rwOnEditInput);
    body.addEventListener('focusin', () => { _rwActiveBody = body; });
    pg.forEach((b) => body.appendChild(b));
    sh.appendChild(body);
    if (conM) {
      sh.appendChild(membreteHeadEl(fmt));
      sh.appendChild(membreteFootEl(fmt));
    }
    wrap.appendChild(sh);
  });
  holder.appendChild(wrap);
  rwFitWrap();
  if (caret && caret.node) {
    try {
      const sel = window.getSelection();
      const r = document.createRange();
      const max = (caret.node.nodeType === 3) ? caret.node.nodeValue.length : caret.node.childNodes.length;
      r.setStart(caret.node, Math.min(caret.off, max));
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      const bd = (caret.node.nodeType === 3 ? caret.node.parentElement : caret.node).closest('.rw-sheet-body');
      if (bd) {
        _rwActiveBody = bd;
        bd.focus();
      }
    } catch (e) {}
  }
}

function rwFitWrap() {
  requestAnimationFrame(() => {
    const stage = document.getElementById('rw-genstage');
    const holder = document.getElementById('rw-pages-holder');
    if (!stage || !holder) return;
    const wrap = holder.querySelector('.rw-pages-wrap');
    if (!wrap) return;
    wrap.style.transform = 'none';
    const cs = getComputedStyle(stage);
    const avail = stage.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
    const pw = wrap.offsetWidth || 800;
    const scale = Math.min(1, avail / pw);
    wrap.style.transform = `scale(${scale})`;
    holder.style.width = `${pw * scale}px`;
    holder.style.height = `${wrap.offsetHeight * scale}px`;
  });
}

function rwGenSyncHTML() {
  const holder = document.getElementById('rw-pages-holder');
  if (!holder) return;
  const bodies = holder.querySelectorAll('.rw-sheet-body');
  if (bodies.length) _RW.genHTML = [...bodies].map((b) => b.innerHTML).join('');
}

function rwOnEditInput() {
  rwGenSyncHTML();
  clearTimeout(_rwRepagT);
  _rwRepagT = setTimeout(rwRepaginate, 220);
}

function rwRepaginate() {
  const holder = document.getElementById('rw-pages-holder');
  if (!holder) return;
  const sel = window.getSelection();
  let caret = null;
  if (sel.rangeCount) {
    const r = sel.getRangeAt(0);
    if (holder.contains(r.startContainer)) caret = { node: r.startContainer, off: r.startOffset };
  }
  const blocks = [];
  holder.querySelectorAll('.rw-sheet-body').forEach((b) => { [...b.children].forEach((ch) => blocks.push(ch)); });
  if (!blocks.length) {
    const e = document.createElement('div');
    e.innerHTML = '<br>';
    blocks.push(e);
  }
  rwLayoutSheets(holder, blocks, caret);
}

function rwRenderEditor() {
  const holder = document.getElementById('rw-pages-holder');
  if (!holder) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = _RW.genHTML || ''; // xss-reviewed: generated drafting HTML comes from internal templates
  rwNormalizeBlocks(tmp);
  let blocks = [...tmp.children];
  if (!blocks.length) {
    const e = document.createElement('div');
    e.innerHTML = '<br>';
    blocks = [e];
  }
  rwLayoutSheets(holder, blocks, null);
}

function rwStepGenerar() {
  if (!_RW.escs.length) return '<div style="color:var(--gray2)">No elegiste ningún modelo. <button class="btn-ghost" onclick="rwGo(-1)">← Volver</button></div>';
  if (!_RW.fmt) _RW.fmt = resolveFmt(MODELOS.find((m) => m.id === (_RW.escs[0] || {}).modeloId));
  if (_RW.conMembrete === undefined) _RW.conMembrete = true;
  const f = _RW.fmt;
  if (_RW.genHTML == null) _RW.genHTML = rwPreviewHTML();
  const fonts = ['Times New Roman', 'Georgia', 'Arial', 'Calibri', 'Verdana', 'Courier New'];
  const membreteChk = `<label class="rw-check" style="margin:0 0 6px"><input type="checkbox" ${_RW.conMembrete !== false ? 'checked' : ''} onchange="rwToggleMembrete(this.checked)"> Membrete y pie en cada página${hayMembrete() ? '' : ' <span style="font-size:11px;color:var(--gray2)">(configúralos en tu perfil)</span>'}</label>`;
  const toolbar = `<div class="rw-fmtbar" onmousedown="if(event.target.closest('button'))event.preventDefault()">
    <select title="Tipografía" onchange="rwSetDocFmt('font',this.value)">${fonts.map((n) => `<option value="${n}" ${n === f.font ? 'selected' : ''}>${n.split(' ')[0]}</option>`).join('')}</select>
    <button type="button" onclick="rwSizeDelta(-1)" title="Menos tamaño">A−</button>
    <button type="button" onclick="rwSizeDelta(1)" title="Más tamaño">A+</button>
    <select title="Interlineado" onchange="rwSetDocFmt('lineHeight',parseFloat(this.value))">${[['1', '1,0'], ['1.5', '1,5'], ['2', '2,0']].map(([v, l]) => `<option value="${v}" ${String(f.lineHeight || 1.5) === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <span class="rw-fmtsep"></span>
    <button type="button" onclick="rwFmtCmd('bold')" title="Negrita"><b>B</b></button>
    <button type="button" onclick="rwFmtCmd('italic')" title="Cursiva"><i>I</i></button>
    <button type="button" onclick="rwFmtCmd('underline')" title="Subrayado"><u>U</u></button>
    <span class="rw-fmtsep"></span>
    <button type="button" onclick="rwFmtCmd('justifyLeft')" title="Izquierda">⬅</button>
    <button type="button" onclick="rwFmtCmd('justifyCenter')" title="Centrar">↔</button>
    <button type="button" onclick="rwFmtCmd('justifyRight')" title="Derecha">➡</button>
    <button type="button" onclick="rwFmtCmd('justifyFull')" title="Justificar">☰</button>
    <span class="rw-fmtsep"></span>
    <button type="button" onclick="rwInsertTab()" title="Sangría (tab) en el cursor">⇥</button>
  </div>`;
  const masivo = (_RW.masivoIds && _RW.masivoIds.length) || 0;
  const banner = masivo ? `<div class="rw-presuma-box" style="border-color:rgba(45,212,191,.4)"><div style="font-size:12.5px"><b>📚 Redacción masiva:</b> se generará para <b>${masivo} causa(s)</b>, una copia por cada una (con su tribunal, rol, carátula y cliente). Abajo ves la vista previa con la <b>primera causa</b>. <a style="color:var(--gold3);cursor:pointer" onclick="openMasivoPicker()">cambiar causas</a></div></div>` : '';
  const footer = masivo
    ? `<div class="modal-footer"><button class="btn-ghost" onclick="rwGo(-1)">← Atrás</button><button class="btn-ghost" onclick="rwGenerar('editar')">💾 Guardar en cada causa</button><button class="btn-gold" onclick="rwGenerar('pdf')">📄 Generar y descargar (${masivo})</button></div>`
    : `<div class="modal-footer"><button class="btn-ghost" onclick="rwGo(-1)">← Atrás</button><button class="btn-ghost" onclick="rwGenerar('editar')">📝 Dejar editable en la causa</button><button class="btn-gold" onclick="rwGenerar('pdf')">📄 Generar PDF</button></div>`;
  return `<div style="font-size:12px;color:var(--gray2);margin-bottom:6px">${masivo ? 'La edición manual aquí no se aplica a las demás causas: cada una se arma con sus propios datos.' : 'Edítalo aquí: las páginas se acomodan solas al escribir y el membrete/pie se repiten en cada hoja.'}</div>
    ${banner}
    ${membreteChk}
    ${toolbar}
    <div class="me-preview rw-genstage" id="rw-genstage"><div class="me-paper-holder" id="rw-pages-holder"></div></div>
    ${footer}`;
}

function rwActiveBody() {
  return (_rwActiveBody && document.body.contains(_rwActiveBody)) ? _rwActiveBody : document.querySelector('#rw-pages-holder .rw-sheet-body');
}

function rwFmtCmd(cmd, val) {
  const b = rwActiveBody();
  if (!b) return;
  b.focus();
  try {
    document.execCommand('styleWithCSS', false, true);
  } catch (e) {}
  document.execCommand(cmd, false, val || null);
  rwOnEditInput();
}

function rwInsertTab() {
  _insertTabSpan(rwActiveBody(), (_RW.fmt && _RW.fmt.indent) || 12.5);
  rwOnEditInput();
}

function rwSetDocFmt(k, v) {
  rwGenSyncHTML();
  _RW.fmt = Object.assign({}, resolveFmt(null), _RW.fmt || {});
  _RW.fmt[k] = v;
  rwRenderEditor();
}

function rwSizeDelta(d) {
  const cur = (_RW.fmt && _RW.fmt.size) || 12;
  rwSetDocFmt('size', Math.max(8, Math.min(20, cur + d)));
}

function rwToggleMembrete(on) {
  rwGenSyncHTML();
  _RW.conMembrete = on;
  rwRenderEditor();
}

function _masivoPartesDe(e) {
  const o = {};
  if (Array.isArray(e.partes)) e.partes.forEach((p) => {
    if (p && p.personaId) {
      const k = p.rol || 'demandante';
      if (!o[k]) o[k] = p.personaId;
    }
  });
  return o;
}

function rwGenerarMasivo(modo) {
  const ids = _RW.masivoIds || [];
  if (!ids.length) {
    toast('No hay causas seleccionadas', 'error');
    return;
  }
  if (!_RW.escs.length) {
    toast('Elige al menos un modelo', 'error');
    return;
  }
  const ppal = MODELOS.find((x) => x.id === _RW.escs[0].modeloId);
  const f = _RW.fmt ? Object.assign({}, _RW.fmt) : resolveFmt(ppal);
  const conMembrete = _RW.conMembrete !== false;
  const _gn = new Date();
  const gt = (base) => `${base} · ${_gn.toLocaleDateString('es-CL')} ${_gn.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
  const created = [];
  ids.forEach((cid, k) => {
    const e = EXPEDIENTES.find((x) => x.id === cid);
    if (!e) return;
    const cx = cxFromExpediente(e);
    cx.tienePoder = _RW.cx.tienePoder;
    cx.mandato = _RW.cx.mandato;
    if (_RW.cx.rolProcesal) cx.rolProcesal = _RW.cx.rolProcesal;
    cx.esCAJ = _RW.cx.esCAJ;
    const pp = _masivoPartesDe(e);
    if (Object.keys(pp).length) cx.partes = pp;
    const texto = generarEscritoTexto(cx, _RW.escs);
    const id = `xd${Date.now()}${k}${Math.floor(Math.random() * 9999)}`;
    EXDOCS.push({ id, expediente: cid, title: gt(ppal ? ppal.nombre : 'Escrito'), kind: 'exescrito', type: 'Texto', redactado: false, tipoDoc: _RW.tipoDoc || 'escrito', conMembrete, fmt: Object.assign({}, f), content: docTextToHtml(texto), created: Date.now(), updated: Date.now() });
    created.push({ id, causa: causaLabel(e) });
  });
  if (!created.length) {
    toast('No se generó ninguno (revisa las causas)', 'error');
    return;
  }
  STATE.redaccionDraft = null;
  saveState();
  closeAllModals();
  _RW = null;
  toast(`${created.length} escrito(s) generado(s), uno por causa ✓`, 'success');
  _rwMasivoResult(created, modo === 'pdf');
}

function _rwMasivoResult(created, autoPdf) {
  const rows = created.map((c) => `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid rgba(255,255,255,.06)"><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">${escapeHtml(c.causa)}</div></div><button class="btn-ghost" style="padding:6px 12px;font-size:12px" onclick="printRedaccion('${c.id}','share')">📄 PDF</button><button class="btn-ghost" style="padding:6px 10px;font-size:12px" onclick="openExdoc('${c.id}')">Abrir</button></div>`).join('');
  const idsJson = JSON.stringify(created.map((c) => c.id));
  document.getElementById('import-body').innerHTML = `<div class="modal-title">✅ ${created.length} escrito(s) generado(s)</div>
    <div style="font-size:12.5px;color:var(--gray2);margin-bottom:6px">Cada uno quedó guardado en el historial de su causa. Descarga los PDF para presentar.</div>
    <div style="max-height:46vh;overflow:auto">${rows}</div>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cerrar</button><button class="btn-gold" onclick='_masivoPdfAll(${idsJson})'>📄 Descargar todos los PDF</button></div>`;
  openModal('modal-import');
  if (autoPdf) setTimeout(() => _masivoPdfAll(created.map((c) => c.id)), 300);
}

async function _masivoPdfAll(ids) {
  const ok = await ensurePdfLibs();
  if (!ok) {
    toast('Sin conexión para generar los PDF', 'error');
    return;
  }
  toast(`Generando ${ids.length} PDF…`);
  for (const id of ids) {
    const x = EXDOCS.find((d) => d.id === id);
    if (!x) continue;
    const f = Object.assign({}, DEFAULT_FMT, STATE.redFormat || {}, x.fmt || {});
    const fname = (x.title || 'documento').replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.pdf';
    // eslint-disable-next-line no-await-in-loop
    await new Promise((res) => { try { pdfTextoReal(x, f, null, (blob) => { savePdfBlob(blob, fname).then(res).catch(res); }).catch(res); } catch (_) { res(); } });
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 450));
  }
  toast('PDF listos ✓', 'success');
}

function rwGenerar(modo) {
  modo = modo || 'editar';
  if (_RW.masivoIds && _RW.masivoIds.length) return rwGenerarMasivo(modo);
  if (!_RW.escs.length) {
    toast('Elige al menos un modelo', 'error');
    return;
  }
  rwGenSyncHTML();
  const tdoc = tipoById(_RW.tipoDoc);
  const documental = (tdoc && (tdoc.motor || 'judicial') === 'documental');
  const ppal = MODELOS.find((x) => x.id === _RW.escs[0].modeloId);
  const f = _RW.fmt ? Object.assign({}, _RW.fmt) : resolveFmt(ppal);
  const conMembrete = _RW.conMembrete !== false;
  const _gn = new Date();
  const genTitulo = (base) => `${base} · ${_gn.toLocaleDateString('es-CL')} ${_gn.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
  const cuerpoHTML = (texto) => (_RW.genHTML != null) ? _RW.genHTML : docTextToHtml(texto);
  if (documental) {
    const texto = generarEscritoTexto(_RW.cx, _RW.escs);
    const clientes = Object.values(_RW.cx.partes || {}).filter(Boolean);
    const id = `xd${Date.now()}`;
    EXDOCS.push({ id, expediente: '', clientes, title: genTitulo(ppal ? ppal.nombre : 'Documento'), kind: 'exescrito', type: 'Texto', redactado: true, tipoDoc: _RW.tipoDoc, conMembrete, fmt: Object.assign({}, f), content: cuerpoHTML(texto), created: Date.now(), updated: Date.now() });
    STATE.redaccionDraft = null;
    saveState();
    closeAllModals();
    _RW = null;
    if (modo === 'pdf') {
      toast('Documento generado', 'success');
      printRedaccion(id);
    } else {
      toast('Guardado editable', 'success');
      openExdoc(id);
    }
    return;
  }
  if (!_RW.cx.expId) {
    const _cli = findCliente(_RW.cx.clienteId);
    const _nom = _RW.cx.caratula || (_cli ? (_cli.nombre + (_RW.tipoDoc === 'demanda' ? ' (demanda)' : '')) : 'Nueva causa');
    const e = { id: `ex${Date.now()}`, created: Date.now(), updated: Date.now(), name: _nom, rol: _RW.cx.rol || '', tribunal: _RW.cx.tribunal || '', tipo: _RW.cx.area || _RW.cx.tipo || '', materia: _RW.cx.materia || '', clienteId: _RW.cx.clienteId || '' };
    e.partes = Object.keys(_RW.cx.partes || {}).filter((k) => _RW.cx.partes[k]).map((k) => ({ personaId: _RW.cx.partes[k], rol: k.replace(/\d+$/, '') }));
    EXPEDIENTES.push(e);
    _RW.cx.expId = e.id;
  }
  const exp = EXPEDIENTES.find((x) => x.id === _RW.cx.expId);
  if (exp) {
    exp.clienteId = _RW.cx.clienteId || exp.clienteId || '';
    if (_RW.cx.tribunal) exp.tribunal = _RW.cx.tribunal;
    if (_RW.cx.rol) exp.rol = _RW.cx.rol;
    if (_RW.cx.materia && !exp.materia) exp.materia = _RW.cx.materia;
    exp.tienePoder = _RW.cx.tienePoder;
    exp.rolProcesal = _RW.cx.rolProcesal;
    exp.esCAJ = _RW.cx.esCAJ;
    exp.red = { clienteId: _RW.cx.clienteId, tienePoder: _RW.cx.tienePoder, rolProcesal: _RW.cx.rolProcesal, esCAJ: _RW.cx.esCAJ };
    exp.updated = Date.now();
  }
  if (exp && !exp.name && _RW.cx.caratula) exp.name = _RW.cx.caratula;
  const texto = generarEscritoTexto(_RW.cx, _RW.escs);
  const id = `xd${Date.now()}`;
  EXDOCS.push({ id, expediente: _RW.cx.expId, title: genTitulo(ppal ? ppal.nombre : 'Escrito'), kind: 'exescrito', type: 'Texto', redactado: true, tipoDoc: _RW.tipoDoc || 'escrito', conMembrete, fmt: Object.assign({}, f), content: cuerpoHTML(texto), created: Date.now(), updated: Date.now() });
  STATE.redaccionDraft = null;
  saveState();
  closeAllModals();
  const expId = _RW.cx.expId;
  const esDem = _RW.tipoDoc === 'demanda';
  _RW = null;
  if (modo === 'pdf') {
    toast(esDem ? 'Demanda generada y guardada en la causa' : 'Documento generado', 'success');
    printRedaccion(id);
    if (esDem) openExpediente(expId);
  } else {
    const d = EXDOCS.find((x) => x.id === id);
    if (d) {
      d.redactado = false;
      d.updated = Date.now();
    }
    saveState();
    toast(expId ? 'Guardado en la causa ✓' : 'Guardado editable', 'success');
    openExdoc(id);
  }
}
