function deskOpenCausa(id) { openExpediente(id); }
function deskOpenDoc(id) { openReader(id); }
function subColor(id) { const s = SUBJECTS.find(x => x.id === id); return (s && s.color) || '#666'; }
function pomoOpenAndStart() { if (!P().running) pomoStartPause(); document.getElementById('pomo-panel').classList.add('open'); syncPomoUI(); }

function nombreUsuario() {
  const n = ((STATE.perfilAbogado || {}).nombre || '').trim();
  if (n) return n.split(/\s+/)[0];
  return ((STATE.user || '').split('@')[0] || '').replace(/[._-]+/g, ' ').split(' ')[0];
}

function renderInicio() {
  const body = document.getElementById('inicio-body'); if (!body) return;
  const last = DOCUMENTS.find(d => d.id === STATE.lastOpened);
  const totalDocs = DOCUMENTS.length, doneDocs = DOCUMENTS.filter(d => d.status === 'done').length;
  const avg = totalDocs ? Math.round(DOCUMENTS.reduce((a, d) => a + d.progress, 0) / totalDocs) : 0;
  const today = new Date().toISOString().slice(0, 10);
  const todayMin = STATE.sessions.filter(s => s.date === today).reduce((a, s) => a + s.minutes, 0);
  const due = STATE.flashcards.filter(isDue).length;
  const hour = new Date().getHours();
  const _greet = hour < 6 ? { t: 'Buenas noches', e: '🌙' } : hour < 12 ? { t: 'Buenos días', e: '☀️' } : hour < 20 ? { t: 'Buenas tardes', e: '🌤️' } : { t: 'Buenas noches', e: '🌙' };
  const saludo = `${_greet.e} ${_greet.t}`;
  const g = STATE.goal || {};
  let goalTxt = 'Definir meta';
  if (g.date) {
    const days = Math.ceil((new Date(g.date + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000);
    goalTxt = (days > 0 ? days + ' días' : days === 0 ? '¡Hoy!' : 'vencida') + ' · ' + (g.label || 'Meta');
  }
  let cont = '';
  if (last) {
    const c = subColor(last.subject);
    cont = `<div class="dash-cont" onclick="openReader('${last.id}')"><div class="dash-cover" style="background:${c}">${(last.title[0] || '📄').toUpperCase()}</div><div style="min-width:0"><div style="font-size:11px;color:var(--gray2);letter-spacing:1px;text-transform:uppercase">Continuar leyendo</div><div style="font-size:15px;font-weight:700;margin:3px 0">${last.title}</div><div class="reader-prog-bar" style="width:180px"><div class="reader-prog-fill" style="width:${last.progress}%;background:${c}"></div></div></div></div>`;
  }
  const study = accessLevel() === 'study';
  const conts = [];
  if (last) conts.push(`<a onclick="openReader('${last.id}')">${escapeHtml(last.title)}</a>`);
  const recCausas = study ? [] : EXPEDIENTES.filter(e => !e.prep).slice().sort((a, b) => (b.updated || 0) - (a.updated || 0));
  if (!study && recCausas[0]) conts.push(`<a onclick="openExpediente('${recCausas[0].id}')">${escapeHtml(recCausas[0].name || 'Causa')}</a>`);
  if (!study && STATE.redaccionDraft) conts.push(`<a onclick="rwResumeDraft()">Redacción en curso</a>`);
  const contHTML = conts.length ? `<div class="inicio-cont"><span class="lab">Continuar</span>${conts.slice(0, 3).join('<span style="opacity:.5">·</span>')}</div>` : '';

  const libros = DOCUMENTS.filter(d => !d.shared).slice().sort((a, b) => ((b.lastAccess || '') < (a.lastAccess || '') ? -1 : 1));
  const recDocs = (DOCUMENTOS || []).slice().sort((a, b) => (b.created || 0) - (a.created || 0));

  const recItems = [];
  for (let i = 0; i < 2; i++) {
    if (recCausas[i]) recItems.push({ tag: 'Causa', em: '📁', t: recCausas[i].name || 'Causa', s: (findCliente(recCausas[i].clienteId) || {}).nombre || recCausas[i].materia || '', fn: `deskOpenCausa('${recCausas[i].id}')` });
    if (libros[i]) recItems.push({ tag: 'Libro', em: '📖', t: libros[i].title, s: (libros[i].progress || 0) + '%', fn: `deskOpenDoc('${libros[i].id}')` });
    if (recDocs[i]) recItems.push({ tag: 'Doc', em: '📄', t: recDocs[i].title, s: 'PDF', fn: `deskOpenDoc('${recDocs[i].id}')` });
  }
  const recentHTML = recItems.length ? `<div class="inicio-recent">${recItems.map(r => `<div class="ir-cell" onclick="${r.fn}"><span class="ir-tag">${r.tag}</span><div class="ir-em">${r.em}</div><div class="ir-t">${escapeHtml(r.t)}</div><div class="ir-s">${escapeHtml(r.s)}</div></div>`).join('')}</div>` : '';

  const causasHTML = recCausas.length
    ? recCausas.slice(0, 4).map(e => {
      const cli = findCliente(e.clienteId);
      const sub = [e.rit || e.rol, cli ? cli.nombre : '', e.materia].filter(Boolean).map(escapeHtml).join(' · ');
      return `<div class="ic-item" ondblclick="deskOpenCausa('${e.id}')" onclick="deskOpenCausa('${e.id}')"><div class="ic-ic">📁</div><div style="min-width:0"><div class="ic-t">${escapeHtml(causaLabel(e))}</div><div class="ic-s">${sub || '—'}</div></div></div>`;
    }).join('')
    : `<div class="ic-empty">Aún no tienes causas. <a style="color:var(--gold3);cursor:pointer" onclick="openNuevaCarpeta()">Crear una →</a></div>`;

  const librosHTML = libros.length
    ? libros.slice(0, 4).map(d => `<div class="ic-item" onclick="deskOpenDoc('${d.id}')"><div class="ic-ic">📖</div><div style="min-width:0"><div class="ic-t">${escapeHtml(d.title)}</div><div class="ic-s">${d.progress || 0}% · ${escapeHtml((SUBJECTS.find(s => s.id === d.subject) || {}).name || '')}</div></div></div>`).join('')
    : `<div class="ic-empty">Tu biblioteca está vacía.</div>`;

  const docsHTML = recDocs.length
    ? recDocs.slice(0, 4).map(d => `<div class="ic-item" onclick="deskOpenDoc('${d.id}')"><div class="ic-ic">📄</div><div style="min-width:0"><div class="ic-t">${escapeHtml(d.title)}</div><div class="ic-s">PDF</div></div></div>`).join('')
    : `<div class="ic-empty">Sin documentos. <a style="color:var(--gold3);cursor:pointer" onclick="uploadDocumento()">Subir →</a></div>`;

  body.innerHTML = `
    <div class="hero" style="text-align:center;background:none;border:none;padding:26px 0 4px">
      <div class="hero-hi">${saludo}</div>
      <div class="hero-title" style="margin-bottom:18px">Hola, ${escapeHtml(nombreUsuario())} 👋</div>
      <button class="inicio-search" onclick="openSearch()"><span class="mg">⌕</span> Buscar o abrir algo… <kbd>⌘K</kbd></button>
      <div class="quick-actions" style="justify-content:center;margin-top:15px">
        ${study ? '' : `<button class="quick-btn" onclick="openNuevaCarpeta()">＋ Nueva causa</button>
        <button class="quick-btn" onclick="openRedactar(null)">✍️ Redactar</button>`}
        <button class="quick-btn" onclick="goSec('flashcards','estudio')">🃏 Flashcards</button>
        <button class="quick-btn" onclick="goSec('agenda','agenda')">📅 Agenda</button>
        <button class="quick-btn" onclick="uploadDocumento()">⬆ Subir documento</button>
      </div>
      ${contHTML}
    </div>
    ${recentHTML}
    <div class="inicio-cols">
      ${study ? '' : `<div class="inicio-col">
        <div class="ic-head"><span>📁 Causas</span><a onclick="goSec('expedientes','oficina')">ver todas →</a></div>
        ${causasHTML}
      </div>`}
      <div class="inicio-col">
        <div class="ic-head"><span>📖 Libros</span><a onclick="goSec('estante','estudio')">ver todos →</a></div>
        ${librosHTML}
      </div>
      <div class="inicio-col">
        <div class="ic-head"><span>📄 Documentos</span><a onclick="goSec('documentos','estudio')">ver todos →</a></div>
        ${docsHTML}
      </div>
      ${study ? `<div class="inicio-col">
        <div class="ic-head"><span>🃏 Flashcards</span><a onclick="goSec('flashcards','estudio')">ver todas →</a></div>
        ${(STATE.flashcards || []).slice(0, 4).map(c => `<div class="ic-item" onclick="goSec('flashcards','estudio')"><div class="ic-ic">🃏</div><div style="min-width:0"><div class="ic-t">${escapeHtml((c.front || '').slice(0, 50))}</div></div></div>`).join('') || '<div class="ic-empty">Aún no tienes flashcards.</div>'}
      </div>` : ''}
    </div>`;
}
