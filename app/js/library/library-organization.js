let activeFilter = 'all';
let _libList = '', _libEstado = '', _libSort = 'manual', _libAutor = '', _libTag = '', _libFav = false;
let openFolderSubject = null;

function getSubjectStatus(subId) {
  const docs = DOCUMENTS.filter(d => d.subject === subId);
  if (!docs.length) return 'pending';
  if (docs.every(d => d.status === 'done')) return 'done';
  if (docs.some(d => d.status === 'progress' || d.status === 'done')) return 'progress';
  return 'pending';
}

function renderFolders(filter) {
  if (filter !== undefined) activeFilter = filter;
  const grid = document.getElementById('folders-grid');
  let subjects = SUBJECTS;
  if (activeFilter === 'done') subjects = subjects.filter(s => s.progress === 100);
  else if (activeFilter === 'progress') subjects = subjects.filter(s => s.progress > 0 && s.progress < 100);
  else if (activeFilter === 'pending') subjects = subjects.filter(s => s.progress === 0);

  grid.innerHTML = subjects.map(s => {
    const count = DOCUMENTS.filter(d => d.subject === s.id).length;
    const progLabel = s.progress === 100 ? `<span style="color:${s.color}">✅ Completado</span>`
      : s.progress > 0 ? `<span style="color:var(--gold)">🔵 En progreso</span>`
        : `<span style="color:var(--gray2)">⭕ Pendiente</span>`;
    const adminBtns = canManageAreas() ? `<div class="card-admin-btns">
        <button class="card-edit-btn" onclick="event.stopPropagation();openEditSubject('${s.id}')">✏</button>
        <button class="card-del-btn" onclick="event.stopPropagation();confirmDelete('subject','${s.id}')">🗑</button>
      </div>` : '';
    return `
      <div class="folder-card" style="border-top:3px solid ${s.color}" onclick="openFolderDocs('${s.id}')">
        ${adminBtns}
        <div class="folder-icon">${s.icon}</div>
        <div class="folder-name">${s.name}</div>
        <div class="folder-count">${count} documentos</div>
        <div class="folder-progress-bar"><div class="folder-progress-fill" style="background:${s.color};width:${s.progress}%"></div></div>
        <div class="folder-progress-label">${progLabel}<span>${s.progress}%</span></div>
      </div>`;
  }).join('');
}

function filterFolders(f, btn) {
  activeFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderFolders();
}

function openFolderDocs(subjectId) {
  openFolderSubject = subjectId;
  const s = SUBJECTS.find(x => x.id === subjectId);
  const all = DOCUMENTS.filter(d => d.subject === subjectId);
  const section = document.getElementById('folder-docs-section');
  if (!all.length) { section.innerHTML = ''; return; }
  const addBtn = canAddBooks() ? `<button class="btn-gold" style="font-size:12px;padding:6px 12px" onclick="quickAddBook('${subjectId}')">+ Agregar</button>` : '';
  section.innerHTML = `
    <div class="content-header" style="margin-bottom:14px">
      <div class="docs-section-title">${s.icon} ${s.name} — Documentos</div>${addBtn}
    </div>
    ${libFilterBar()}
    <div class="docs-grid" id="folder-docs-grid"></div>`;
  updateFolderGrid();
}

function applyLibFilters(docs) {
  let r = docs.slice();
  if (_libEstado) r = r.filter(d => (d.status || 'pending') === _libEstado);
  if (_libFav) r = r.filter(d => STATE.favorites.has(d.id));
  if (_libList) { const l = rlById(_libList); r = r.filter(d => l && l.libros.includes(d.id)); }
  if (_libAutor) { const q = _normMatch(_libAutor); r = r.filter(d => _normMatch(d.author || '').includes(q)); }
  if (_libTag) { const q = _normMatch(_libTag); r = r.filter(d => (d.tags || []).some(t => _normMatch(t).includes(q))); }
  if (_libSort === 'titulo') r.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  else if (_libSort === 'autor') r.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
  else if (_libSort === 'progreso') r.sort((a, b) => (b.progress || 0) - (a.progress || 0));
  else if (_libSort === 'reciente') r.sort((a, b) => String(b.id).localeCompare(String(a.id)));
  return r;
}

function libFilterBar() {
  const lists = (STATE.readingLists || []);
  const listSel = lists.length ? `<select class="form-select" style="width:auto;font-size:12px;padding:6px 9px" onchange="_libList=this.value;openFolderDocs(openFolderSubject)"><option value="">📑 Todas las listas</option>${lists.map(l => `<option value="${l.id}" ${_libList === l.id ? 'selected' : ''}>${escapeHtml(l.nombre)}</option>`).join('')}</select>` : '';
  const sortOpt = [['manual', 'Orden manual'], ['titulo', 'Título'], ['autor', 'Autor'], ['progreso', 'Progreso'], ['reciente', 'Reciente']].map(([v, l]) => `<option value="${v}" ${_libSort === v ? 'selected' : ''}>↕ ${l}</option>`).join('');
  return `<div class="grid-filters" style="align-items:center;gap:8px;margin-bottom:14px">
    <select class="form-select" style="width:auto;font-size:12px;padding:6px 9px" onchange="_libSort=this.value;openFolderDocs(openFolderSubject)">${sortOpt}</select>
    <select class="form-select" style="width:auto;font-size:12px;padding:6px 9px" onchange="_libEstado=this.value;openFolderDocs(openFolderSubject)">
      <option value="" ${!_libEstado ? 'selected' : ''}>Todo estado</option>
      <option value="pending" ${_libEstado === 'pending' ? 'selected' : ''}>⭕ Pendiente</option>
      <option value="progress" ${_libEstado === 'progress' ? 'selected' : ''}>🔵 En progreso</option>
      <option value="done" ${_libEstado === 'done' ? 'selected' : ''}>✅ Leído</option>
    </select>
    <button class="filter-chip ${_libFav ? 'active' : ''}" onclick="_libFav=!_libFav;openFolderDocs(openFolderSubject)">★ Favoritos</button>
    ${listSel}
    <input class="form-input" style="width:120px;font-size:12px;padding:6px 9px" placeholder="Autor…" value="${escapeHtml(_libAutor)}" oninput="_libAutor=this.value;updateFolderGrid()">
    <input class="form-input" style="width:120px;font-size:12px;padding:6px 9px" placeholder="Etiqueta…" value="${escapeHtml(_libTag)}" oninput="_libTag=this.value;updateFolderGrid()">
  </div>`;
}

function updateFolderGrid() {
  const g = document.getElementById('folder-docs-grid'); if (!g || !openFolderSubject) return;
  const docs = applyLibFilters(DOCUMENTS.filter(d => d.subject === openFolderSubject));
  g.innerHTML = docs.length ? docs.map(d => docCard(d)).join('') : '<div style="color:var(--gray2);padding:14px">Sin resultados con estos filtros.</div>';
}

function showCtx(e, items) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const m = document.getElementById('app-ctxmenu'); if (!m) return;
  m.innerHTML = items.map(it => it.sep ? '<div class="ctx-sep"></div>' : (it.head != null ? `<div class="ctx-head">${escapeHtml(it.head)}</div>` : `<button class="${it.danger ? 'danger' : ''}">${it.icon || ''} ${escapeHtml(it.label)}</button>`)).join('');
  const btns = [...m.querySelectorAll('button')]; let bi = 0;
  items.forEach(it => { if (it.sep || it.head != null) return; const b = btns[bi++]; b.onclick = ev => { ev.stopPropagation(); closeCtx(); it.onclick && it.onclick(); }; });
  m.classList.add('open');
  const mw = m.offsetWidth || 200, mh = m.offsetHeight || 10;
  m.style.left = Math.max(8, Math.min(e.clientX, window.innerWidth - mw - 8)) + 'px';
  m.style.top = Math.max(8, Math.min(e.clientY, window.innerHeight - mh - 8)) + 'px';
}

function closeCtx() { const m = document.getElementById('app-ctxmenu'); if (m) m.classList.remove('open'); }
document.addEventListener('mousedown', e => { const m = document.getElementById('app-ctxmenu'); if (m && m.classList.contains('open') && !m.contains(e.target)) closeCtx(); });
document.addEventListener('scroll', () => closeCtx(), true);

function rlById(id) { return (STATE.readingLists || []).find(l => l.id === id); }
function createReadingList(name) { name = (name || '').trim(); if (!name) return null; const l = { id: 'rl' + Date.now() + Math.floor(Math.random() * 9999), nombre: name, icono: '📑', color: '#C9A84C', libros: [] }; STATE.readingLists.push(l); saveState(); return l; }
function deleteReadingList(id) { if (!confirm('¿Borrar esta lista? (los libros no se eliminan)')) return; STATE.readingLists = STATE.readingLists.filter(l => l.id !== id); if (_libList === id) _libList = ''; saveState(); refreshLibrary(); }
function toggleBookInList(bookId, listId) { const l = rlById(listId); if (!l) return; const i = l.libros.indexOf(bookId); if (i >= 0) l.libros.splice(i, 1); else l.libros.push(bookId); saveState(); }
function openAddToLists(bookId) {
  const d = findDoc(bookId); const lists = STATE.readingLists || [];
  const rows = lists.length ? lists.map(l => `<label class="perm-check"><input type="checkbox" ${l.libros.includes(bookId) ? 'checked' : ''} onchange="toggleBookInList('${bookId}','${l.id}')"> ${l.icono || '📑'} ${escapeHtml(l.nombre)}</label>`).join('') : '<div style="font-size:12px;color:var(--gray2)">Aún no tienes listas. Crea una abajo.</div>';
  document.getElementById('lists-body').innerHTML = `<div class="modal-title">📑 Añadir a lista</div>
    <div style="font-size:12px;color:var(--gray2);margin-bottom:10px">“${escapeHtml(d ? d.title : '')}”</div>
    <div style="display:flex;flex-direction:column;gap:6px;max-height:38vh;overflow:auto">${rows}</div>
    <div class="form-row" style="margin-top:12px"><label class="form-label">Nueva lista</label>
      <div style="display:flex;gap:8px"><input class="form-input" id="new-list-name" placeholder="Ej: Examen de grado" style="flex:1" onkeydown="if(event.key==='Enter')createListAndAdd('${bookId}')"><button class="btn-gold" onclick="createListAndAdd('${bookId}')">Crear</button></div></div>
    <div class="modal-footer"><button class="btn-gold" onclick="closeAllModals();refreshLibrary()">Listo</button></div>`;
  openModal('modal-lists');
}
function createListAndAdd(bookId) { const el = document.getElementById('new-list-name'); const l = createReadingList(el ? el.value : ''); if (l) { l.libros.push(bookId); saveState(); openAddToLists(bookId); } else toast('Escribe un nombre', 'error'); }

function bookCtx(e, id) {
  const d = findDoc(id); if (!d) return;
  const items = [{ head: d.title || 'Libro' }, { icon: '📖', label: 'Abrir', onclick: () => openReader(id) }];
  if (!isMobile()) items.push({ icon: '🗂', label: 'Abrir en pestaña nueva', onclick: () => { _tabNew = true; openReader(id); } });
  if (canEditDoc(d)) items.push({ icon: '✏️', label: 'Editar', onclick: () => openEditDoc(id) });
  items.push({ icon: STATE.favorites.has(id) ? '★' : '☆', label: STATE.favorites.has(id) ? 'Quitar de favoritos' : 'Marcar favorito', onclick: () => { toggleFav(id); refreshLibrary(); } });
  items.push({ icon: '📑', label: 'Añadir a lista…', onclick: () => openAddToLists(id) });
  if (!isMobile()) {
    if (d.shared && !d.baseLib) items.push({ icon: '🤝', label: 'Ver / compartir mis notas…', onclick: () => openDocShare(id) });
    else if (!d.shared) items.push({ icon: '🤝', label: (_sharedDocIds.has(id) ? 'Gestionar acceso…' : 'Compartir con colegas…'), onclick: () => openDocShare(id) });
  }
  if (STATE.isAdmin && !d.shared) { items.push({ sep: true }); items.push({ icon: '📚', label: (d.baseLib ? 'Quitar de la biblioteca base' : 'Agregar a la biblioteca base del estudio'), onclick: () => toggleBaseBook(id) }); }
  if (d.shared && d.sharedDoc) { items.push({ sep: true }); items.push({ icon: '🚫', label: 'Quitar de mi biblioteca', danger: true, onclick: () => leaveSharedBook(id) }); }
  else if (canDeleteDoc(d)) { items.push({ sep: true }); items.push({ icon: '🗑', label: 'Borrar', danger: true, onclick: () => confirmDelete('doc', id) }); }
  showCtx(e, items);
}

function refreshLibrary() { try { renderShelf(); } catch (_) {} try { renderFolders(); } catch (_) {} try { if (openFolderSubject) openFolderDocs(openFolderSubject); } catch (_) {} try { renderList && renderList(); } catch (_) {} }

function docCard(d) {
  const tagCls = d.status === 'done' ? 'tag-done' : d.status === 'progress' ? 'tag-progress' : 'tag-pending';
  const tagLabel = d.status === 'done' ? '✅ Leído' : d.status === 'progress' ? '🔵 En progreso' : '⭕ Pendiente';
  const favIco = STATE.favorites.has(d.id) ? '★' : '☆';
  const canE = canEditDoc(d), canD = canDeleteDoc(d);
  const adminBtns = canE ? `<div class="card-admin-btns">
    <button class="card-edit-btn" onclick="event.stopPropagation();openEditDoc('${d.id}')">✏</button>
  </div>` : '';
  return `<div class="doc-card" onclick="bookTap('${d.id}',this)" ondblclick="openReader('${d.id}')" oncontextmenu="bookCtx(event,'${d.id}')" title="Un clic: seleccionar · doble clic: abrir">
    ${adminBtns}
    ${canD ? ((d.shared && d.sharedDoc) ? `<button class="doc-del" title="Quitar de mi biblioteca" onclick="event.stopPropagation();leaveSharedBook('${d.id}')">🚫</button>` : `<button class="doc-del" title="Borrar" onclick="event.stopPropagation();confirmDelete('doc','${d.id}')">🗑</button>`) : ''}
    <button class="fav-btn ${STATE.favorites.has(d.id) ? 'active' : ''}" onclick="event.stopPropagation();toggleFav('${d.id}')" title="Favorito">${favIco}</button>
    <div class="doc-icon">📄</div>
    <div class="doc-name">${d.title}</div>
    <div class="doc-meta">${d.pages} págs · ${d.type}</div>
    <div class="doc-tag ${tagCls}">${tagLabel}</div>
  </div>`;
}
