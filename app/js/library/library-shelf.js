const BOOK_COLORS = { civil: '#3B82F6', penal: '#EF4444', procesal: '#8B5CF6', laboral: '#10B981', mercantil: '#F59E0B', const: '#EC4899', admin: '#06B6D4' };
let _shelfQuery = '', _shelfFilter = 'all', _shelfSort = 'manual';

function orderedDocs(list) {
  if (!STATE.docOrder || !STATE.docOrder.length) return list;
  return list.slice().sort((a, b) => {
    const ia = STATE.docOrder.indexOf(a.id), ib = STATE.docOrder.indexOf(b.id);
    return (ia < 0 ? 9999 : ia) - (ib < 0 ? 9999 : ib);
  });
}

function shelfVisibleDocs() {
  const q = _shelfQuery.trim().toLowerCase();
  let docs = DOCUMENTS.filter(d => {
    if (_shelfFilter === 'favorites' && !STATE.favorites.has(d.id)) return false;
    if (_shelfFilter !== 'all' && _shelfFilter !== 'favorites' && (d.status || 'pending') !== _shelfFilter) return false;
    if (!q) return true;
    return [d.title, d.author, d.summary, ...(d.tags || [])].filter(Boolean).join(' ').toLowerCase().includes(q);
  });
  if (_shelfSort === 'title') docs.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  else if (_shelfSort === 'author') docs.sort((a, b) => (a.author || '').localeCompare(b.author || '') || (a.title || '').localeCompare(b.title || ''));
  else if (_shelfSort === 'progress') docs.sort((a, b) => (b.progress || 0) - (a.progress || 0) || (a.title || '').localeCompare(b.title || ''));
  else if (_shelfSort === 'recent') docs.sort((a, b) => String(b.updated || b.created || b.id).localeCompare(String(a.updated || a.created || a.id)));
  else docs = orderedDocs(docs);
  return docs;
}
function _refreshShelfView() {
  if (_libSelMode) {
    const visible = new Set(shelfVisibleDocs().map(d => d.id));
    _libSel.forEach(id => { if (!visible.has(id)) _libSel.delete(id); });
  }
  renderShelf();
  _libSelBar();
}
function setShelfQuery(value) { _shelfQuery = value || ''; _refreshShelfView(); }
function setShelfFilter(value) { _shelfFilter = value || 'all'; _refreshShelfView(); }
function setShelfSort(value) { _shelfSort = value || 'manual'; _refreshShelfView(); }

function renderShelf() {
  const docs = shelfVisibleDocs();
  const wrap = document.getElementById('shelf-wrapper');
  let html = '';
  if (!docs.length) {
    html = DOCUMENTS.length
      ? '<div class="favs-empty"><div>🔎</div><p>No hay libros que coincidan con el filtro actual.</p></div>'
      : '<div class="favs-empty"><div>📚</div><p>Aún no hay libros. Agrégalos como admin con "+ Agregar Libro".</p></div>';
  } else {
    const perShelf = 8;
    for (let i = 0; i < docs.length; i += perShelf) {
      const chunk = docs.slice(i, i + perShelf);
      html += `<span class="shelf-section-label">Estante ${i / perShelf + 1}</span><div class="shelf"><div class="shelf-row">`;
      chunk.forEach(d => {
        const s = SUBJECTS.find(x => x.id === d.subject);
        const h = 70 + Math.floor((d.pages || 30) / 3);
        const w = 26 + Math.floor((d.pages || 30) / 10);
        const color = (s && s.color) || BOOK_COLORS[d.subject] || '#666';
        const progIco = d.status === 'done' ? '✅' : d.status === 'progress' ? '🔵' : '⭕';
        html += `
          <div class="book${_libSelMode && _libSel.has(d.id) ? ' sel-on' : ''}" draggable="true" data-id="${d.id}"
               ondragstart="bookDragStart(event,'${d.id}')" ondragend="bookDragEnd(event)"
               ondragover="bookDragOver(event,this)" ondragleave="this.classList.remove('drag-over')"
               ondrop="bookDrop(event,'${d.id}')" oncontextmenu="bookCtx(event,'${d.id}')" onclick="bookTap('${d.id}',this)" title="Un clic: seleccionar · doble clic: abrir · clic derecho: opciones">
            <div class="book-tooltip"><div class="tt-title">${d.title}</div><div class="tt-prog">${progIco} ${d.progress}%</div></div>
            <div class="book-spine" style="background:${color};height:${h}px;width:${w}px;color:#fff;opacity:${d.progress === 0 ? .55 : 1}">${d.title.split(' ')[0]}</div>
            <div class="book-prog"><div class="book-prog-fill" style="width:${d.progress}%"></div></div>
          </div>`;
      });
      html += '</div></div>';
    }
  }
  html += renderSharedShelfIndexes();
  wrap.innerHTML = html;
  const pane = document.getElementById('shelf-preview');
  if (pane && !pane.dataset.docid) pane.innerHTML = PREVIEW_PLACEHOLDER;
}

function renderSharedShelfIndexes() {
  const indexes = (typeof _sharedShelfIndexes !== 'undefined' && Array.isArray(_sharedShelfIndexes)) ? _sharedShelfIndexes : [];
  return indexes.map(index => {
    const books = Array.isArray(index.books) ? index.books : [];
    const chips = books.slice(0, 8).map(book => `<span class="shelf-shared-index-book">${escapeHtml(book.title || 'Libro')}</span>`).join('');
    const more = books.length > 8 ? `<span class="shelf-shared-index-book">+${books.length - 8} más</span>` : '';
    return `<div class="shelf-shared-index">
      <div class="shelf-shared-index-head"><div><div class="shelf-shared-index-title">📚 ${escapeHtml(index.title || 'Estantería compartida')}</div><div class="shelf-shared-index-meta">${books.length} libro(s) · solo índice y marcadores de temas</div></div><button class="btn-gold" style="padding:7px 11px;font-size:12px" onclick="openSharedShelfIndex('${escapeHtml(index.id)}')">Ver índice</button></div>
      <div class="shelf-shared-index-books">${chips}${more}</div>
    </div>`;
  }).join('');
}

function openSharedShelfIndex(id) {
  const index = (typeof _sharedShelfIndexes !== 'undefined' ? _sharedShelfIndexes : []).find(x => x.id === id);
  const body = document.getElementById('shelf-view-body');
  if (!index || !body) return;
  const books = Array.isArray(index.books) ? index.books : [];
  const rows = books.length ? books.map(book => {
    const local = typeof findDoc === 'function' ? findDoc(book.id) : null;
    const topics = Array.isArray(book.topics) && book.topics.length ? `<div style="font-size:11px;color:var(--gray2);margin-top:3px">📑 ${book.topics.map(x => escapeHtml(x.label)).join(' · ')}</div>` : '';
    const action = local ? `<button class="btn-ghost" style="padding:5px 9px;font-size:11px" onclick="closeAllModals();openReader('${escapeHtml(book.id)}')">Abrir</button>` : '<span style="font-size:11px;color:var(--gray2)">Solo índice</span>';
    return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid rgba(255,255,255,.06)"><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">${escapeHtml(book.title || 'Libro')}</div><div style="font-size:11px;color:var(--gray2)">${escapeHtml([book.author, book.subject].filter(Boolean).join(' · '))}</div>${topics}</div>${action}</div>`;
  }).join('') : '<div style="font-size:12px;color:var(--gray2);padding:10px 0">La estantería no tenía libros al momento de compartirla.</div>';
  body.innerHTML = `<div class="modal-title">📚 ${escapeHtml(index.title || 'Estantería compartida')}</div><div style="font-size:12px;color:var(--gray2);margin:-7px 0 12px">Este índice muestra títulos, orden y marcadores. El contenido solo se puede abrir si el libro también fue compartido.</div><div>${rows}</div><div class="modal-footer"><button class="btn-gold" onclick="closeAllModals()">Cerrar</button></div>`;
  openModal('modal-shelf-view');
}

async function openShelfIndexShare() {
  const body = document.getElementById('shelf-share-body');
  if (!body) return;
  body.innerHTML = '<div style="color:var(--gray2);padding:8px">Cargando…</div>';
  openModal('modal-shelf-share');
  if (typeof sb === 'undefined' || !sb || !STATE.uid) { body.innerHTML = '<div style="color:var(--warn)">Necesitas sesión en la nube para compartir.</div>'; return; }
  if (!STATE.profiles || !STATE.profiles.length) { try { const { data } = await sb.from('profiles').select('id,email,display_name,role').order('email'); STATE.profiles = data || []; } catch (_) {} }
  const id = typeof _sharedShelfId === 'function' ? _sharedShelfId() : '';
  const isShared = !!(typeof _mySharedShelfIndex !== 'undefined' && _mySharedShelfIndex);
  let members = [];
  if (isShared) { try { const { data } = await sb.from('shared_doc_members').select('*').eq('doc_id', id); members = data || []; } catch (_) {} }
  const others = socialCollaborators().filter(p => p && p.id && p.id !== STATE.uid && !members.find(m => m.user_id === p.id));
  const memberRows = members.filter(m => m.user_id !== STATE.uid).map(m => `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.06)"><span style="flex:1;font-size:13px">${escapeHtml(memberEmail(m))}</span><button class="btn-ghost" style="color:var(--danger);padding:5px 8px" onclick="removeShelfIndexMember('${id}','${escapeHtml(m.user_id)}')">✕</button></div>`).join('') || '<div style="font-size:12px;color:var(--gray2)">Aún sin lectores.</div>';
  const inviteRow = others.length ? `<div class="form-row" style="margin-top:12px"><label class="form-label">Dar acceso a un colaborador</label><div style="display:flex;gap:8px;flex-wrap:wrap"><select class="form-select" id="shelf-invite-user" style="flex:1;min-width:150px">${others.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.display_name || p.email || '')}</option>`).join('')}</select><button class="btn-gold" onclick="inviteShelfIndexMember('${id}')">Compartir</button></div></div>` : '<div style="font-size:12px;color:var(--gray2);margin-top:12px">No tienes colaboradores disponibles. Agrégalos en 🤝 Mi equipo.</div>';
  body.innerHTML = `<div class="modal-title">🤝 Compartir índice de estantería</div><div style="font-size:13px;color:var(--gray2);margin-bottom:12px">Compartiré los títulos, autores, materias, orden y marcadores de temas. No se comparten archivos ni el contenido privado de los libros.</div>${isShared ? `<div class="partes-h">Colegas con acceso</div>${memberRows}${inviteRow}<div class="modal-footer" style="justify-content:space-between"><button class="btn-ghost" style="color:var(--danger)" onclick="unshareShelfIndex()">Dejar de compartir</button><button class="btn-gold" onclick="pushSharedShelfIndex().then(()=>toast('Índice actualizado','success'))">💾 Actualizar índice</button></div>` : `<div class="form-row"><label class="form-label">Compartir con</label>${others.length ? `<div style="display:flex;flex-direction:column;gap:6px">${others.map(p => `<label class="perm-check"><input type="checkbox" class="shelf-share-user" value="${escapeHtml(p.id)}"> ${escapeHtml(p.display_name || p.email || '')}</label>`).join('')}</div>` : '<div style="font-size:12px;color:var(--gray2)">No tienes colaboradores disponibles. Agrégalos en 🤝 Mi equipo.</div>'}</div><div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" ${others.length ? '' : 'disabled'} onclick="shareShelfIndex()">🤝 Compartir índice</button></div>`}`;
}

async function shareShelfIndex() {
  const userIds = [...document.querySelectorAll('.shelf-share-user:checked')].map(x => x.value);
  if (!userIds.length) { toast('Elige al menos un colega', 'error'); return; }
  const ok = await pushSharedShelfIndex();
  if (!ok) return;
  const id = _sharedShelfId();
  try {
    const owner = await sb.from('shared_doc_members').upsert({ doc_id:id, user_id:STATE.uid, email:STATE.user || '', role:'owner' });
    if (owner.error) throw owner.error;
    const { error: removed } = await sb.from('shared_doc_members').delete().eq('doc_id', id).neq('user_id', STATE.uid);
    if (removed) throw removed;
    const { error } = await sb.from('shared_doc_members').insert(userIds.map(userId => ({ doc_id:id, user_id:userId, email:((STATE.profiles || []).find(p => p.id === userId) || {}).email || '', role:'viewer' })));
    if (error) throw error;
    toast('Índice compartido', 'success');
    openShelfIndexShare();
  } catch (e) { toast('No se pudo compartir el índice: ' + (e.message || e), 'error'); }
}

async function inviteShelfIndexMember(id) {
  const uid = (document.getElementById('shelf-invite-user') || {}).value;
  if (!uid) { toast('Elige un colega', 'error'); return; }
  const email = ((STATE.profiles || []).find(p => p.id === uid) || {}).email || '';
  try { const { error } = await sb.from('shared_doc_members').upsert({ doc_id:id, user_id:uid, email, role:'viewer' }); if (error) throw error; toast('Invitado', 'success'); openShelfIndexShare(); }
  catch (e) { toast('No se pudo invitar: ' + (e.message || e), 'error'); }
}

async function removeShelfIndexMember(id, uid) {
  try { const { error } = await sb.from('shared_doc_members').delete().eq('doc_id', id).eq('user_id', uid); if (error) throw error; openShelfIndexShare(); }
  catch (e) { toast('No se pudo quitar el acceso: ' + (e.message || e), 'error'); }
}

const PREVIEW_PLACEHOLDER = '<div class="preview-placeholder"><div>📖</div><p>Selecciona un libro del estante<br>para ver su vista previa aquí.</p></div>';

function previewBook(id) {
  const d = DOCUMENTS.find(x => x.id === id); if (!d) return;
  const s = SUBJECTS.find(x => x.id === d.subject);
  const color = (s && s.color) || BOOK_COLORS[d.subject] || '#666';
  const pane = document.getElementById('shelf-preview');
  const favLabel = STATE.favorites.has(id) ? '★ En favoritos' : '☆ Favorito';
  const excerpt = (d.content || '').slice(0, 420);
  pane.dataset.docid = id;
  const canDel = canDeleteDoc(d);
  pane.innerHTML = `
    ${canDel ? `<button class="preview-del" title="Eliminar libro" onclick="confirmDelete('doc','${id}')">🗑</button>` : ''}
    <div class="preview-head">
      <div class="preview-cover" style="background:${color}">${(d.title[0] || '📄').toUpperCase()}</div>
      <div>
        <div class="preview-title">${d.title}</div>
        <div class="preview-sub">${s ? s.icon + ' ' + s.name : ''}</div>
        ${d.author ? `<div class="preview-author">✍️ ${escapeHtml(d.author)}</div>` : ''}
      </div>
    </div>
    ${d.summary ? `<div class="reader-summary-box" style="margin:14px 0"><strong>Resumen</strong>${d.summary}</div>` : '<div style="height:14px"></div>'}
    <div class="reader-tags" style="margin-bottom:12px">${(d.tags || []).map(t => `<span class="reader-tag">#${t}</span>`).join('')}</div>
    ${excerpt ? `<div class="preview-excerpt">${excerpt}${(d.content || '').length > 420 ? '…' : ''}</div>` : '<div class="preview-excerpt" style="color:var(--gray2)">Sin texto para previsualizar.</div>'}
    <button class="btn-gold" style="width:100%;margin-top:16px" onclick="openReader('${id}')">📖 Abrir en el lector</button>
    <button class="btn-ghost" style="width:100%;margin-top:8px" onclick="toggleFav('${id}')">${favLabel}</button>
  `;
}

let dragBookId = null, bookDragged = false;
function bookClick(id) { if (!bookDragged) previewBook(id); }

function _removeBookFromLib(d) {
  if (!d) return false;
  if (d.shared && d.sharedDoc) { _leaveSharedCloud(d.id); }
  else if (d.baseLib) { STATE.hiddenBooks = STATE.hiddenBooks || []; if (!STATE.hiddenBooks.includes(d.id)) STATE.hiddenBooks.push(d.id); }
  else { try { trashAdd('libro', d.title || 'Libro', { doc: d, order: STATE.docOrder.includes(d.id), mm: mmPos[d.id] || null, book: STATE.bookPos[d.id] || null }); } catch (_) {} }
  const i = DOCUMENTS.findIndex(x => x.id === d.id); if (i >= 0) DOCUMENTS.splice(i, 1);
  STATE.docOrder = STATE.docOrder.filter(x => x !== d.id); try { delete mmPos[d.id]; } catch (_) {} try { delete STATE.bookPos[d.id]; } catch (_) {}
  return true;
}

async function _leaveSharedCloud(id) {
  try { if (typeof sb !== 'undefined' && sb && STATE.uid) { await sb.from('shared_doc_members').delete().eq('doc_id', id).eq('user_id', STATE.uid); _sharedDocIds.delete(id); } } catch (e) { console.warn('leave shared', e); }
}

function leaveSharedBook(id) {
  const d = findDoc(id) || _findAnyDoc(id); if (!d) return;
  if (!confirm('¿Quitar este libro compartido de tu biblioteca?\nSolo desaparece para ti; el dueño y los demás lo conservan.')) return;
  _removeBookFromLib(d);
  saveState(); try { buildSearchIndex(); } catch (_) {} toast('Quitado de tu biblioteca', 'success'); renderAll();
}

function emptyLibrary() {
  const own = DOCUMENTS.filter(d => canDeleteDoc(d) && !(d.shared && !d.baseLib));
  if (!own.length) { toast('Tu biblioteca ya está vacía', 'error'); return; }
  if (!confirm(`¿Vaciar tu biblioteca? Se quitarán ${own.length} libro(s) (los tuyos van a la papelera; los de la biblioteca base solo se ocultan).`)) return;
  own.forEach(d => _removeBookFromLib(d));
  saveState(); try { buildSearchIndex(); } catch (_) {} toast('Biblioteca vaciada 🗑', 'success'); renderAll();
}

let _bookTapId = null, _bookTapT = 0;
let _libSelMode = false, _libSel = new Set();
function toggleLibSel() { _libSelMode = !_libSelMode; _libSel.clear(); document.body.classList.toggle('lib-sel', _libSelMode); _libSelBar(); try { refreshLibrary(); } catch (_) {} }
function selectAllLib() {
  const docs = shelfVisibleDocs();
  if (!docs.length) { toast('No hay libros visibles para seleccionar', 'error'); return; }
  _libSelMode = true;
  _libSel.clear();
  docs.forEach(d => _libSel.add(d.id));
  document.body.classList.add('lib-sel');
  _libSelBar();
  try { refreshLibrary(); } catch (_) {}
}
function _libSelBar() {
  let bar = document.getElementById('lib-sel-bar');
  if (!_libSelMode) { if (bar) bar.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'lib-sel-bar'; bar.style.cssText = 'position:fixed;bottom:22px;left:50%;transform:translateX(-50%);z-index:5000;display:flex;gap:10px;align-items:center;background:var(--navy2);border:1px solid rgba(201,168,76,.35);border-radius:12px;padding:10px 16px;box-shadow:0 20px 50px rgba(0,0,0,.55)'; document.body.appendChild(bar); }
  const n = _libSel.size;
  bar.innerHTML = `<span style="font-size:13px;font-weight:600">${n} seleccionado${n === 1 ? '' : 's'}</span><button class="btn-ghost" style="padding:6px 12px" onclick="selectAllLib()">☑ Seleccionar todo</button><button class="btn-ghost" style="padding:6px 12px" ${n ? '' : 'disabled'} onclick="toggleLibSelectedFavorites()">⭐ Favoritos</button><button class="btn-ghost" style="padding:6px 12px" ${n ? '' : 'disabled'} onclick="addLibSelectedToList()">📑 Agregar a lista</button><button class="btn-gold" style="padding:6px 12px" ${n ? '' : 'disabled'} onclick="shareLibSelected()">🤝 Compartir</button><button class="btn-ghost" style="color:var(--danger);padding:6px 12px" ${n ? '' : 'disabled'} onclick="deleteLibSelected()">🗑 Borrar</button><button class="btn-ghost" style="padding:6px 12px" onclick="toggleLibSel()">Cancelar</button>`;
}
function _selectedLibDocs() { return [..._libSel].map(id => findDoc(id)).filter(Boolean); }
function toggleLibSelectedFavorites() {
  const docs = _selectedLibDocs(); if (!docs.length) { toast('Selecciona al menos un libro', 'error'); return; }
  const allFav = docs.every(d => STATE.favorites.has(d.id));
  docs.forEach(d => allFav ? STATE.favorites.delete(d.id) : STATE.favorites.add(d.id));
  saveState(); refreshLibrary(); _libSelBar();
  toast(allFav ? 'Libros quitados de favoritos' : 'Libros agregados a favoritos', 'success');
}
function addLibSelectedToList() {
  const docs = _selectedLibDocs(); const lists = STATE.readingLists || [];
  if (!docs.length) { toast('Selecciona al menos un libro', 'error'); return; }
  if (!lists.length) { toast('Primero crea una lista desde un libro', 'error'); return; }
  const rows = lists.map(l => `<button class="btn-ghost" style="width:100%;justify-content:flex-start;padding:10px 12px" onclick="doAddLibSelectedToList('${l.id}')">${l.icono || '📑'} ${escapeHtml(l.nombre)}</button>`).join('');
  document.getElementById('import-body').innerHTML = `<div class="modal-title">📑 Agregar ${docs.length} libro(s) a una lista</div>
    <div style="font-size:12.5px;color:var(--gray2);margin-bottom:10px">Elige una lista de lectura. Los libros se mantienen también en sus otras listas.</div>
    <div style="display:flex;flex-direction:column;gap:7px;max-height:42vh;overflow:auto">${rows}</div>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button></div>`;
  openModal('modal-import');
}
function doAddLibSelectedToList(listId) {
  const list = rlById(listId); if (!list) return;
  const docs = _selectedLibDocs();
  docs.forEach(d => { if (!list.libros.includes(d.id)) list.libros.push(d.id); });
  saveState(); closeAllModals(); refreshLibrary(); _libSelBar();
  toast(docs.length + ' libro(s) agregado(s) a la lista', 'success');
}
function shareLibSelected() {
  const docs = [..._libSel].map(id => findDoc(id)).filter(d => d && !d.shared && !d.sharedDoc);
  if (!docs.length) { toast('No hay libros propios para compartir', 'error'); return; }
  if (typeof sb === 'undefined' || !sb || !STATE.uid) { toast('Necesitas sesión en la nube para compartir', 'error'); return; }
  const cols = socialCollaborators().filter(p => p && p.id && p.id !== STATE.uid);
  if (!cols.length) { toast('No tienes colaboradores todavía. Agrégalos en 🤝 Mi equipo.', 'error'); return; }
  const opts = cols.map(p => `<label style="display:flex;gap:9px;align-items:center;padding:9px 6px;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer"><input type="checkbox" class="lib-share-user" value="${p.id}" style="width:16px;height:16px"> ${escapeHtml(p.display_name || p.email || '')}</label>`).join('');
  document.getElementById('import-body').innerHTML = `<div class="modal-title">🤝 Compartir ${docs.length} libro(s)</div>
    <div style="font-size:12.5px;color:var(--gray2);margin-bottom:10px">Elige los colegas que podrán ver los libros seleccionados en modo lectura.</div>
    <div style="max-height:42vh;overflow:auto">${opts}</div>
    <label class="rw-check" style="margin-top:10px"><input type="checkbox" id="lib-share-notes" checked> Incluir mis notas</label>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" onclick="doShareLibSelected()">Compartir</button></div>`;
  openModal('modal-import');
}
async function doShareLibSelected() {
  const userIds = [...document.querySelectorAll('.lib-share-user:checked')].map(x => x.value);
  if (!userIds.length) { toast('Elige al menos un colega', 'error'); return; }
  const docs = [..._libSel].map(id => findDoc(id)).filter(d => d && !d.shared && !d.sharedDoc);
  const withNotes = !!document.getElementById('lib-share-notes')?.checked;
  let ok = 0;
  for (const d of docs) {
    d._shareNotes = withNotes;
    if (!await pushSharedDoc(d.id)) continue;
    try {
      const { error } = await sb.from('shared_doc_members').upsert({ doc_id: d.id, user_id: STATE.uid, email: STATE.user || '', role: 'owner' });
      if (error) throw error;
      const { error: memberError } = await sb.from('shared_doc_members').upsert(userIds.map(userId => ({ doc_id: d.id, user_id: userId, email: ((STATE.profiles || []).find(p => p.id === userId) || {}).email || '', role: 'viewer' })));
      if (memberError) throw memberError;
      _sharedDocIds.add(d.id);
      ok++;
    } catch (e) { toast('No se pudo compartir "' + (d.title || 'libro') + '": ' + (e.message || e), 'error'); }
  }
  saveState();
  closeAllModals();
  toggleLibSel();
  toast(ok + ' libro(s) compartido(s)', ok ? 'success' : 'error');
}
function deleteLibSelected() {
  const ids = [..._libSel].filter(id => { const d = findDoc(id); return d && canDeleteDoc(d); });
  if (!ids.length) { toast('Nada que borrar (o no son tuyos)', 'error'); return; }
  if (!confirm(`¿Quitar ${ids.length} libro(s)? (los tuyos van a la papelera; los de la base solo se ocultan)`)) return;
  ids.forEach(id => { const d = DOCUMENTS.find(x => x.id === id); if (d) _removeBookFromLib(d); });
  saveState(); try { buildSearchIndex(); } catch (_) {} toast(ids.length + ' libro(s) quitado(s) 🗑', 'success'); toggleLibSel();
}
function bookTap(id, el) {
  if (bookDragged) return;
  if (_libSelMode) { if (_libSel.has(id)) { _libSel.delete(id); el && el.classList.remove('sel-on'); } else { _libSel.add(id); el && el.classList.add('sel-on'); } _libSelBar(); return; }
  const now = Date.now();
  if (_bookTapId === id && now - _bookTapT < 430) { _bookTapId = null; _bookTapT = 0; openReader(id); return; }
  _bookTapId = id; _bookTapT = now;
  document.querySelectorAll('.doc-card.sel-on,.book.sel-on').forEach(c => c.classList.remove('sel-on'));
  if (el && el.classList) el.classList.add('sel-on');
  if (document.getElementById('shelf-preview')) previewBook(id);
}
function bookDragStart(e, id) { dragBookId = id; bookDragged = true; e.dataTransfer.effectAllowed = 'move'; }
function bookDragEnd() { setTimeout(() => bookDragged = false, 50); dragBookId = null; }
function bookDragOver(e, el) { e.preventDefault(); el.classList.add('drag-over'); }
function bookDrop(e, targetId) {
  e.preventDefault();
  if (!dragBookId || dragBookId === targetId) return;
  let order = (STATE.docOrder && STATE.docOrder.length) ? STATE.docOrder.slice() : orderedDocs(DOCUMENTS).map(d => d.id);
  DOCUMENTS.forEach(d => { if (!order.includes(d.id)) order.push(d.id); });
  order = order.filter(x => x !== dragBookId);
  order.splice(order.indexOf(targetId), 0, dragBookId);
  STATE.docOrder = order;
  saveState(); renderShelf();
  toast('Libro reordenado', 'success');
}
