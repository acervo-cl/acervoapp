function renderKanban() {
  const cols = [
    { key: 'pending', label: 'POR LEER', color: 'var(--gray2)', bg: 'rgba(255,255,255,.08)' },
    { key: 'progress', label: 'EN PROGRESO', color: 'var(--gold)', bg: 'rgba(201,168,76,.12)' },
    { key: 'done', label: 'COMPLETADO ✓', color: 'var(--success)', bg: 'rgba(45,212,191,.12)' },
  ];
  const SCOL = { civil: '#3B82F6', penal: '#EF4444', procesal: '#8B5CF6', laboral: '#10B981', mercantil: '#F59E0B', const: '#EC4899', admin: '#06B6D4' };
  document.getElementById('kanban-board').innerHTML = cols.map(col => {
    const docs = DOCUMENTS.filter(d => d.status === col.key);
    const cards = docs.map(d => {
      const s = SUBJECTS.find(x => x.id === d.subject);
      const sc = SCOL[d.subject] || '#666';
      return `<div class="kanban-card" onclick="bookTap('${d.id}',this)" ondblclick="openReader('${d.id}')" style="border-color:${col.key !== 'pending' ? 'rgba(201,168,76,.15)' : ''}">
        <div class="kanban-card-title">${d.title}</div>
        <div class="kanban-card-sub">${s ? s.name : ''} · ${d.pages} págs</div>
        <div class="kanban-card-footer">
          <span style="font-size:10px;color:${sc}">● ${s ? s.name.split(' ').pop() : ''}</span>
          ${d.progress > 0 ? `<span style="font-size:11px;color:${col.key === 'done' ? 'var(--success)' : 'var(--gold)'};font-weight:700">${col.key === 'done' ? '✓ ' : ''}${d.progress}%</span>` : ''}
        </div>
      </div>`;
    }).join('');
    return `<div class="kanban-col">
      <div class="kanban-col-header" style="color:${col.color}">
        ${col.label}<div class="kanban-count" style="background:${col.bg};color:${col.color}">${docs.length}</div>
      </div>
      <div class="kanban-cards">${cards}</div>
    </div>`;
  }).join('');
}

function renderFavs() {
  const favDocs = DOCUMENTS.filter(d => STATE.favorites.has(d.id));
  const grid = document.getElementById('favs-grid');
  if (!favDocs.length) {
    grid.innerHTML = '<div class="favs-empty"><div>★</div><p>Marca documentos como favoritos con el ★<br>para acceder rápido a ellos aquí.</p></div>';
    return;
  }
  grid.innerHTML = favDocs.map(d => docCard(d)).join('');
}

function renderApuntes() {
  const host = document.getElementById('apuntes-list'); if (!host) return;
  const list = APUNTES.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
  if (!list.length) {
    host.innerHTML = '<div class="favs-empty" style="cursor:pointer" onclick="newApunte()"><div>📝</div><p>Aún no tienes apuntes.<br><b>Haz clic aquí</b> para crear el primero.</p></div>';
    return;
  }
  host.innerHTML = '<div class="apunte-card apunte-card-new" onclick="newApunte()"><div class="apunte-card-main"><div class="apunte-card-title">＋ Nuevo apunte</div><div class="apunte-card-snip" style="opacity:.6">Haz clic para empezar a escribir</div></div></div>' + list.map(a => `
    <div class="apunte-card" onclick="openReader('${a.id}')">
      <div class="apunte-card-main">
        <div class="apunte-card-title">${escapeHtml(a.title || 'Apunte sin título')}</div>
        <div class="apunte-card-snip">${escapeHtml(apunteSnippet(a.content)) || '<span style="opacity:.5">(vacío)</span>'}</div>
      </div>
      <div class="apunte-card-meta">${fmtDate(a.updated || a.created)}</div>
      <button class="apunte-card-del" title="Borrar" onclick="event.stopPropagation();deleteApunte('${a.id}')">🗑</button>
    </div>`).join('');
}

function newApunte() {
  if (STATE.viewingUid && !STATE.editOther) { toast('Estás viendo otra biblioteca en solo lectura', 'error'); return; }
  const now = Date.now();
  const a = { id: 'ap' + now, kind: 'apunte', title: 'Apunte sin título', content: '', subject: '', tags: [], created: now, updated: now };
  APUNTES.push(a);
  saveState(); buildSearchIndex();
  openReader(a.id);
}

function deleteApunte(id) {
  const a = APUNTES.find(x => x.id === id); if (!a) return;
  if (!confirm('¿Borrar este apunte?')) return;
  const anns = ANNOTATIONS.filter(z => z.docId === id);
  trashAdd('apunte', a.title || 'Apunte', { apunte: a, anns });
  const i = APUNTES.findIndex(x => x.id === id);
  if (i >= 0) APUNTES.splice(i, 1);
  for (let j = ANNOTATIONS.length - 1; j >= 0; j--) { if (ANNOTATIONS[j].docId === id) ANNOTATIONS.splice(j, 1); }
  saveState(); buildSearchIndex(); renderApuntes();
  toast('Apunte movido a la papelera 🗑');
}
