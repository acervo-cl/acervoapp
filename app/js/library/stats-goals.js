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
  const goalDate = toDateInputValue(g.date) || g.date;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(goalDate + 'T00:00:00');
  const days = Math.ceil((target - today) / 86400000);
  const txt = days > 0 ? days + (days === 1 ? ' día' : ' días') : days === 0 ? '¡Hoy!' : 'vencido';
  const col = days < 0 ? 'var(--danger)' : days <= 7 ? 'var(--warn)' : 'var(--success)';
  return `<div class="stat-card" style="cursor:pointer" onclick="editGoal()"><div class="stat-label">🎯 ${escapeHtml(g.label || 'Meta')}</div><div class="stat-value" style="color:${col}">${txt}</div><div class="stat-detail">${escapeHtml(goalDate)}</div></div>`;
}

function editGoal() {
  const goal = STATE.goal || {};
  const body = document.getElementById('goal-body');
  if (!body) return;
  body.innerHTML = `<div class="modal-title">🎯 Meta de estudio</div>
    <div class="form-row"><label class="form-label">Nombre de la meta</label><input class="form-input" id="goal-label" value="${escapeHtml(goal.label || '')}" placeholder="Ej: Examen de grado"></div>
    <div class="form-row"><label class="form-label">Fecha objetivo</label><input class="form-input" id="goal-date" type="date" value="${escapeHtml(toDateInputValue(goal.date))}"></div>
    <div class="modal-footer"><button class="btn-ghost" onclick="clearGoal()">Quitar meta</button><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" onclick="saveGoal()">Guardar</button></div>`;
  openModal('modal-goal');
}

function saveGoal() {
  const label = (document.getElementById('goal-label') || {}).value || '';
  const date = (document.getElementById('goal-date') || {}).value || '';
  if (!date) { toast('Elige una fecha objetivo', 'error'); return; }
  STATE.goal = { label: label.trim(), date };
  saveState(); closeAllModals(); renderStats(); openModal('modal-stats');
  toast('Meta actualizada', 'success');
}

function clearGoal() {
  STATE.goal = { label: '', date: null };
  saveState(); closeAllModals(); renderStats(); openModal('modal-stats');
  toast('Meta eliminada', 'success');
}
