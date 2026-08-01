function renderList() {
  const SCOL = { civil: '#3B82F6', penal: '#EF4444', procesal: '#8B5CF6', laboral: '#10B981', mercantil: '#F59E0B', const: '#EC4899', admin: '#06B6D4' };
  const rows = DOCUMENTS.map(d => {
    const s = SUBJECTS.find(x => x.id === d.subject);
    const sc = SCOL[d.subject] || '#666';
    const pill = d.status === 'done' ? 'pill-done' : d.status === 'progress' ? 'pill-progress' : 'pill-pending';
    const pillLabel = d.status === 'done' ? 'COMPLETADO' : d.status === 'progress' ? 'EN PROGRESO' : 'PENDIENTE';
    const editBtn = canEditDoc(d) ? `<button class="card-edit-btn" onclick="event.stopPropagation();openEditDoc('${d.id}')" style="width:20px;height:20px;font-size:10px">✏</button>` : '';
    return `<div class="list-row" onclick="bookTap('${d.id}',this)" ondblclick="openReader('${d.id}')">
      <div><span style="color:${sc};font-size:11px;font-weight:600">● ${s ? s.name.split(' ').pop() : ''}</span></div>
      <div class="list-doc">${d.title}<small>${d.pages} págs · ${d.annCount} anotaciones</small></div>
      <div class="progress-mini"><div class="progress-bar-mini"><div class="progress-fill-mini" style="background:${sc};width:${d.progress}%"></div></div><span class="progress-pct" style="color:${d.progress === 100 ? 'var(--success)' : d.progress > 0 ? 'var(--gold)' : 'var(--gray2)'}">${d.progress}%</span></div>
      <div style="font-size:12px;color:var(--gray2)">${d.lastAccess || '—'}</div>
      <div><span class="status-pill ${pill}">${pillLabel}</span></div>
      <div>${editBtn}</div>
    </div>`;
  }).join('');
  document.getElementById('list-table').innerHTML = `
    <div class="list-table-head"><div>Materia</div><div>Documento</div><div>Avance</div><div>Último Acceso</div><div>Estado</div><div></div></div>
    ${rows}`;
}
