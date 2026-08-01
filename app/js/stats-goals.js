function openStats() { renderStats(); openModal('modal-stats'); }

function renderStats() {
  const totalDocs = DOCUMENTS.length;
  const doneDocs = DOCUMENTS.filter(d => d.status === 'done').length;
  const doneSubj = SUBJECTS.filter(s => s.progress === 100).length;
  const totalAnn = ANNOTATIONS.length;
  const avgProg = Math.round(DOCUMENTS.reduce((a, d) => a + d.progress, 0) / totalDocs);
  document.getElementById('stats-bar').innerHTML = `
    <div class="stat-card"><div class="stat-label">Materias</div><div class="stat-value">${SUBJECTS.length}</div><div class="stat-detail">${doneSubj} completadas</div></div>
    <div class="stat-card"><div class="stat-label">Documentos</div><div class="stat-value">${totalDocs}</div><div class="stat-detail">${doneDocs} completados</div></div>
    <div class="stat-card"><div class="stat-label">Avance Global</div><div class="stat-value text-gold">${avgProg}%</div><div class="stat-detail">promedio general</div></div>
    <div class="stat-card"><div class="stat-label">Anotaciones</div><div class="stat-value">${totalAnn}</div><div class="stat-detail">en ${new Set(ANNOTATIONS.map(a => a.docId)).size} documentos</div></div>
    ${goalCardHTML()}
  `;
}

function goalCardHTML() {
  const g = STATE.goal || {};
  if (!g.date) return `<div class="stat-card" style="cursor:pointer" onclick="editGoal()"><div class="stat-label">🎯 Meta</div><div class="stat-value" style="font-size:18px;color:var(--gray2)">Definir</div><div class="stat-detail">clic para fijar fecha</div></div>`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(g.date + 'T00:00:00');
  const days = Math.ceil((target - today) / 86400000);
  const txt = days > 0 ? days + (days === 1 ? ' día' : ' días') : days === 0 ? '¡Hoy!' : 'vencido';
  const col = days < 0 ? 'var(--danger)' : days <= 7 ? 'var(--warn)' : 'var(--success)';
  return `<div class="stat-card" style="cursor:pointer" onclick="editGoal()"><div class="stat-label">🎯 ${escapeHtml(g.label || 'Meta')}</div><div class="stat-value" style="color:${col}">${txt}</div><div class="stat-detail">${g.date}</div></div>`;
}

function editGoal() {
  const label = prompt('Nombre de tu meta (ej: Examen de grado):', STATE.goal.label || '');
  if (label === null) return;
  const date = prompt('Fecha meta (formato AAAA-MM-DD):', STATE.goal.date || '');
  if (date === null) return;
  STATE.goal = { label: label.trim(), date: date.trim() };
  saveState(); renderStats();
  toast('Meta actualizada', 'success');
}
