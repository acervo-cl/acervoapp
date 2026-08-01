// FLASHCARDS + REPASO ESPACIADO
// ════════════════════════════════════════
function isDue(c){ const t=new Date().toISOString().slice(0,10); return !c.due || c.due<=t; }
function dueCount(cards){ return cards.filter(c=>!c.known&&isDue(c)).length; }   // las "ya me las sé" no cuentan como pendientes
// ── Mazos (colecciones propias de flashcards; se comparten como "paquetes") ──
function mazoOf(id){ return (STATE.mazos||[]).find(m=>m.id===id); }
// Una tarjeta puede estar en VARIOS mazos (como una canción en varias playlists). Migra el viejo c.mazo (uno) a c.mazos (lista).
function cardMazos(c){ if(Array.isArray(c.mazos)) return c.mazos; if(c.mazo){ c.mazos=[c.mazo]; delete c.mazo; return c.mazos; } c.mazos=[]; return c.mazos; }
function mazoCards(mid){ return STATE.flashcards.filter(c=>cardMazos(c).includes(mid)); }
let _mazoView=null, _mazoCtx=null;   // _mazoView: mazo abierto en detalle · _mazoCtx: mazo al crear tarjeta nueva

function genFlashcards() {
  let added = 0;
  ANNOTATIONS.forEach(a => {
    if (STATE.flashcards.some(c=>c.srcAnn===a.id)) return;
    const d = DOCUMENTS.find(x=>x.id===a.docId);
    const front = a.quote ? `¿Qué recuerdas sobre: "${a.quote.slice(0,70)}${a.quote.length>70?'…':''}"?` : ('Nota de: '+(d?d.title:'documento'));
    STATE.flashcards.push({id:'fc'+Date.now()+Math.random().toString(36).slice(2,6), docId:a.docId, subject:d?d.subject:null, front, back:a.text, ease:2.5, interval:0, due:'', reps:0, srcAnn:a.id});
    added++;
  });
  saveState(); renderFlashcards();
  toast(added ? `${added} tarjeta(s) generada(s)` : 'No hay anotaciones nuevas para convertir', added?'success':'');
}

function renderFlashcards() {
  if(_mazoView){ if(mazoOf(_mazoView)){ renderMazo(_mazoView); return; } _mazoView=null; }
  const body = document.getElementById('flashcards-body'); if(!body) return;
  const all = STATE.flashcards;
  const mazos = STATE.mazos||[];
  if (!all.length && !mazos.length) { body.innerHTML = '<div class="favs-empty"><div>🃏</div><p>Aún no hay tarjetas.<br>Genera desde tus anotaciones, crea una nueva o arma un <b>mazo</b>.</p><button class="btn-gold" style="margin-top:12px" onclick="newMazo()">📚 Crear mazo</button></div>'; return; }
  const due = dueCount(all);
  const decks = SUBJECTS.map(s=>{ const cards=all.filter(c=>c.subject===s.id); return {s, n:cards.length, due:dueCount(cards)}; }).filter(x=>x.n);
  const noSub = all.filter(c=>!c.subject || !SUBJECTS.find(s=>s.id===c.subject));
  const mazosHTML = `
    <div class="content-title" style="font-size:15px;margin:10px 0 10px;display:flex;align-items:center;gap:10px">📚 Mis mazos <button class="btn-ghost" style="font-size:12px;padding:4px 11px" onclick="newMazo()">+ Nuevo mazo</button></div>
    <div class="folders-grid">
      ${mazos.map(m=>{ const cs=mazoCards(m.id); const d=dueCount(cs); const kn=cs.filter(c=>c.known).length; return `<div class="folder-card" style="border-top:3px solid ${m.color||'var(--gold)'}" onclick="openMazo('${m.id}')">
        <div class="folder-icon">${m.icon||'📚'}</div><div class="folder-name">${escapeHtml(m.name)}</div>
        <div class="folder-count">${cs.length} tarjeta(s)${d?' · <span class="text-gold">'+d+' por repasar</span>':(cs.length?' · al día':'')}${kn?' · '+kn+' ✓':''}${m.from?'<br><span style="opacity:.7">de '+escapeHtml(m.from)+'</span>':''}</div></div>`; }).join('')}
      <div class="folder-card" style="border:1.5px dashed rgba(201,168,76,.4);opacity:.85" onclick="newMazo()"><div class="folder-icon">＋</div><div class="folder-name">Nuevo mazo</div><div class="folder-count">Agrupa tarjetas y compártelas</div></div>
    </div>`;
  if(!all.length){ body.innerHTML = mazosHTML + '<div class="favs-empty" style="margin-top:14px"><div>🃏</div><p>Tus mazos aún no tienen tarjetas.</p></div>'; return; }
  body.innerHTML = `
    <div class="stats-bar" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card"><div class="stat-label">Tarjetas</div><div class="stat-value">${all.length}</div></div>
      <div class="stat-card"><div class="stat-label">Pendientes hoy</div><div class="stat-value text-gold">${due}</div></div>
      <div class="stat-card"><div class="stat-label">🔥 Racha</div><div class="stat-value">${(STATE.streak&&STATE.streak.count)||0}</div><div class="stat-detail">día(s) seguidos</div></div>
      <div class="stat-card" style="cursor:pointer;border-color:rgba(45,212,191,.4)" onclick="startDayReview()"><div class="stat-label">Repaso del día</div><div class="stat-value" style="font-size:18px;color:var(--success)">▶ Empezar</div><div class="stat-detail">${due} pendiente(s)</div></div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;justify-content:flex-end;margin:4px 0 2px;font-size:12px;color:var(--gray2)">Por sesión:
      <select onchange="STATE.studyMax=+this.value;saveState()" style="font-size:12px;padding:4px 7px;border-radius:6px">
        ${[[0,'Todas'],[10,'10'],[20,'20'],[30,'30'],[50,'50']].map(([v,l])=>`<option value="${v}" ${(STATE.studyMax||0)===v?'selected':''}>${l}</option>`).join('')}
      </select></div>
    ${mazosHTML}
    ${decks.length?`<div class="content-title" style="font-size:15px;margin:14px 0 10px">Por materia</div>
    <div class="folders-grid">
      ${decks.map(x=>`<div class="folder-card" style="border-top:3px solid ${x.s.color}" onclick="startStudy('${x.s.id}')">
        <div class="folder-icon">${x.s.icon}</div><div class="folder-name">${x.s.name}</div>
        <div class="folder-count">${x.n} tarjetas · ${x.due} por repasar</div></div>`).join('')}
      ${noSub.length?`<div class="folder-card" onclick="startStudy('__none__')"><div class="folder-icon">🃏</div><div class="folder-name">Sin materia</div><div class="folder-count">${noSub.length} tarjetas</div></div>`:''}
    </div>`:''}
    <div class="content-title" style="font-size:15px;margin:14px 0 12px">Todas las tarjetas</div>
    <div class="docs-grid">${all.map(cardMgrHTML).join('')}</div>`;
}
function cardMgrHTML(c) {
  const s = SUBJECTS.find(x=>x.id===c.subject);
  if(_fcSelMode){
    const on=_fcSel.has(c.id);
    return `<div class="doc-card${on?' sel-on':''}" style="cursor:pointer" onclick="toggleFcOne('${c.id}',this)">
      <div style="position:absolute;top:8px;right:9px;font-size:15px">${on?'☑':'⬜'}</div>
      <div class="doc-name">${escapeHtml(c.front).slice(0,80)}</div>
      <div class="doc-meta">${s?s.icon+' '+s.name:'Sin materia'} · ${isDue(c)?'<span class="text-gold">por repasar</span>':'al día'}</div>
    </div>`;
  }
  return `<div class="doc-card" style="cursor:default">
    <div class="doc-name">${escapeHtml(c.front).slice(0,80)}</div>
    <div class="doc-meta">${s?s.icon+' '+s.name:'Sin materia'} · ${isDue(c)?'<span class="text-gold">por repasar</span>':'al día'}</div>
    <div style="display:flex;gap:6px"><button class="card-edit-btn" onclick="editCard('${c.id}')">✏</button><button class="card-del-btn" onclick="delCard('${c.id}')">🗑</button></div>
  </div>`;
}
// ════════ MAZOS: detalle, estudio, triaje "las que me sé / no me sé" ════════
const MAZO_ICONS=['📚','🃏','⚖️','📖','🧠','🏛️','📕','📗','📘','📙','🔖','🎓','📝','⭐','🔥','💡','🗂️','📌'];
const MAZO_COLORS=['#c9a84c','#2dd4bf','#b58af0','#f0a05a','#5aa0f0','#f05a7a','#7ad46a','#e0c94c'];
function openMazo(mid){ _mazoView=mid; if(_fcSelMode) toggleFcSel(); renderMazo(mid); const b=document.getElementById('flashcards-body'); if(b) b.scrollIntoView({block:'start'}); }
function backToFlash(){ _mazoView=null; renderFlashcards(); }
function renderMazo(mid){
  const m=mazoOf(mid); const body=document.getElementById('flashcards-body'); if(!m||!body){ _mazoView=null; renderFlashcards(); return; }
  const cs=mazoCards(mid);
  const studiable=cs.filter(c=>!c.known), known=cs.filter(c=>c.known);
  const due=dueCount(cs);
  body.innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin:2px 0 4px;flex-wrap:wrap">
      <button class="btn-ghost" style="padding:6px 11px" onclick="backToFlash()">← Mazos</button>
      <div style="font-size:20px">${m.icon||'📚'}</div>
      <div style="font-weight:700;font-size:17px;min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(m.name)}</div>
    </div>
    ${m.from?`<div style="font-size:12px;color:var(--gray2);margin:0 2px 8px">Paquete de ${escapeHtml(m.from)}</div>`:''}
    <div style="display:flex;gap:7px;flex-wrap:wrap;margin:0 0 12px">
      <button class="btn-ghost" style="padding:6px 11px" onclick="editMazo('${mid}')">✏ Editar</button>
      <button class="btn-ghost" style="padding:6px 11px" onclick="shareMazo('${mid}')">🤝 Compartir</button>
      <button class="btn-ghost" style="padding:6px 11px;color:var(--danger)" onclick="delMazo('${mid}')">🗑 Eliminar</button>
    </div>
    <div class="stats-bar" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card"><div class="stat-label">Tarjetas</div><div class="stat-value">${cs.length}</div></div>
      <div class="stat-card"><div class="stat-label">Por repasar</div><div class="stat-value text-gold">${due}</div></div>
      <div class="stat-card"><div class="stat-label">✓ Me las sé</div><div class="stat-value" style="color:var(--success)">${known.length}</div></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 6px">
      <button class="btn-gold" onclick="startMazo('${mid}')">▶ Estudiar${due?` (${due})`:''}</button>
      <button class="btn-ghost" onclick="startMazoTriage('${mid}')">🎯 Repaso rápido</button>
      <button class="btn-ghost" onclick="addCardToMazo('${mid}')">+ Tarjeta</button>
    </div>
    <div style="font-size:12px;color:var(--gray2);margin:6px 2px 10px">Marca <b>✓ Me la sé</b> para sacarla del repaso, o <b>📖 Estudiarla</b> para volver a incluirla.</div>
    ${cs.length?`<div class="docs-grid">${cs.map(mazoCardHTML).join('')}</div>`:'<div class="favs-empty"><div>🃏</div><p>Este mazo aún no tiene tarjetas.</p></div>'}`;
}
function mazoCardHTML(c){
  const s=SUBJECTS.find(x=>x.id===c.subject);
  return `<div class="doc-card" style="cursor:default${c.known?';opacity:.62':''}">
    <div class="doc-name">${escapeHtml(c.front).slice(0,80)}</div>
    <div class="doc-meta">${c.known?'<span style="color:var(--success)">✓ ya me la sé</span>':(isDue(c)?'<span class="text-gold">por repasar</span>':'al día')}${s?' · '+s.icon+' '+s.name:''}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="card-edit-btn" style="${c.known?'':'color:var(--success);border-color:rgba(45,212,191,.4)'}" onclick="toggleKnown('${c.id}')">${c.known?'📖 Estudiarla':'✓ Me la sé'}</button>
      <button class="card-edit-btn" onclick="editCard('${c.id}')">✏</button>
      <button class="card-del-btn" onclick="removeFromMazo('${c.id}')" title="Quitar del mazo">✕</button>
    </div>
  </div>`;
}
function toggleKnown(id){ const c=STATE.flashcards.find(x=>x.id===id); if(!c) return; c.known=!c.known; if(!c.known) c.due=''; saveState(); if(_mazoView) renderMazo(_mazoView); toast(c.known?'✓ Marcada como sabida':'📖 Vuelve al repaso','success'); }
function removeFromMazo(id){ const c=STATE.flashcards.find(x=>x.id===id); if(!c||!_mazoView) return; c.mazos=cardMazos(c).filter(m=>m!==_mazoView); saveState(); renderMazo(_mazoView); toast('Quitada de este mazo (sigue en tus tarjetas y otros mazos)'); }
function addCardToMazo(mid){ _mazoCtx=mid; openAddCard(); _mazoCtx=null; }
// Estudiar un mazo: solo las estudiables (no las "ya me las sé"), pendientes primero
function startMazo(mid){
  const pool=mazoCards(mid).filter(c=>!c.known);
  if(!pool.length){ toast('No hay tarjetas para estudiar en este mazo','error'); return; }
  let q=pool.filter(isDue);
  if(!q.length){ if(!confirm('Nada pendiente hoy en este mazo. ¿Repasar todas igual?')) return; q=pool; }
  q=shuffle(q.slice()); const max=STATE.studyMax||0; if(max>0&&q.length>max) q=q.slice(0,max);
  studyQueue=q; studyIdx=0; showStudyCard();
}
// Triaje: pasa tarjeta por tarjeta marcando "me la sé" / "estudiarla" (rápido, sin afectar la racha)
let _triageQ=[], _triageIdx=0, _triageMid=null;
function startMazoTriage(mid){
  const cs=mazoCards(mid); if(!cs.length){ toast('Este mazo no tiene tarjetas','error'); return; }
  _triageQ=cs.slice(); _triageIdx=0; _triageMid=mid; _triageShow();
}
function _triageShow(){
  const ov=document.getElementById('triage-overlay'); if(!ov) return;
  if(_triageIdx>=_triageQ.length){ ov.classList.remove('open'); if(_mazoView) renderMazo(_mazoView); toast('Repaso rápido terminado 🎯','success'); return; }
  const c=_triageQ[_triageIdx];
  document.getElementById('triage-progress').textContent=`${_triageIdx+1} / ${_triageQ.length}`;
  document.getElementById('triage-front').innerHTML=escapeHtml(c.front);
  document.getElementById('triage-back').innerHTML=escapeHtml(c.back);
  document.getElementById('triage-back-wrap').style.display='none';
  document.getElementById('triage-show').style.display='block';
  document.getElementById('triage-btns').style.display='none';
  ov.classList.add('open');
}
function triageReveal(){ document.getElementById('triage-back-wrap').style.display='block'; document.getElementById('triage-show').style.display='none'; document.getElementById('triage-btns').style.display='flex'; }
function triageMark(known){
  const c=_triageQ[_triageIdx]; if(c){ c.known=!!known; if(!known) c.due=''; }
  _triageIdx++; saveState(); _triageShow();
}
function closeTriage(){ document.getElementById('triage-overlay').classList.remove('open'); if(_mazoView) renderMazo(_mazoView); }
// Crear / editar mazo
let _editMazoId=null;
function newMazo(){ _editMazoId=null; _openMazoModal({name:'',icon:'📚',color:MAZO_COLORS[0]}); }
function editMazo(mid){ const m=mazoOf(mid); if(!m) return; _editMazoId=mid; _openMazoModal(m); }
function _openMazoModal(m){
  document.getElementById('import-body').innerHTML=`<div class="modal-title">${_editMazoId?'Editar mazo':'📚 Nuevo mazo'}</div>
    <div class="form-row"><label class="form-label">Nombre</label><input class="form-input" id="mz-name" value="${escapeHtml(m.name||'')}" placeholder="Ej: Derecho Procesal — Prueba"></div>
    <div class="form-row"><label class="form-label">Ícono</label><div id="mz-icons" style="display:flex;flex-wrap:wrap;gap:6px">${MAZO_ICONS.map(ic=>`<button type="button" class="mz-ic${ic===(m.icon||'📚')?' on':''}" data-ic="${ic}" onclick="_pickMzIc(this)" style="font-size:19px;width:40px;height:40px;border-radius:9px;border:1.5px solid ${ic===(m.icon||'📚')?'var(--gold)':'rgba(201,168,76,.2)'};background:${ic===(m.icon||'📚')?'rgba(201,168,76,.15)':'transparent'};cursor:pointer">${ic}</button>`).join('')}</div></div>
    <div class="form-row"><label class="form-label">Color</label><div id="mz-colors" style="display:flex;gap:8px">${MAZO_COLORS.map(co=>`<button type="button" class="mz-co${co===(m.color||MAZO_COLORS[0])?' on':''}" data-co="${co}" onclick="_pickMzCo(this)" style="width:30px;height:30px;border-radius:50%;background:${co};border:3px solid ${co===(m.color||MAZO_COLORS[0])?'#fff':'transparent'};cursor:pointer"></button>`).join('')}</div></div>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" onclick="saveMazo()">Guardar</button></div>`;
  openModal('modal-import');
}
function _pickMzIc(el){ el.parentElement.querySelectorAll('.mz-ic').forEach(b=>{ b.style.border='1.5px solid rgba(201,168,76,.2)'; b.style.background='transparent'; b.classList.remove('on'); }); el.style.border='1.5px solid var(--gold)'; el.style.background='rgba(201,168,76,.15)'; el.classList.add('on'); }
function _pickMzCo(el){ el.parentElement.querySelectorAll('.mz-co').forEach(b=>{ b.style.border='3px solid transparent'; b.classList.remove('on'); }); el.style.border='3px solid #fff'; el.classList.add('on'); }
function saveMazo(){
  const name=(document.getElementById('mz-name').value||'').trim(); if(!name){ toast('Ponle un nombre al mazo','error'); return; }
  const icEl=document.querySelector('#mz-icons .mz-ic.on'), coEl=document.querySelector('#mz-colors .mz-co.on');
  const icon=icEl?icEl.dataset.ic:'📚', color=coEl?coEl.dataset.co:MAZO_COLORS[0];
  STATE.mazos=STATE.mazos||[];
  if(_editMazoId){ const m=mazoOf(_editMazoId); if(m) Object.assign(m,{name,icon,color}); }
  else { const id='mz'+Date.now(); STATE.mazos.push({id,name,icon,color}); _mazoView=id; }
  closeAllModals(); saveState(); if(_mazoView) renderMazo(_mazoView); else renderFlashcards(); toast('Mazo guardado 📚','success');
}
function delMazo(mid){
  const m=mazoOf(mid); if(!m) return; const n=mazoCards(mid).length;
  if(!confirm(`¿Eliminar el mazo "${m.name}"?\nLas ${n} tarjeta(s) NO se borran, solo salen de este mazo.`)) return;
  STATE.flashcards.forEach(c=>{ if(cardMazos(c).includes(mid)) c.mazos=cardMazos(c).filter(x=>x!==mid); });
  STATE.mazos=(STATE.mazos||[]).filter(x=>x.id!==mid);
  _mazoView=null; saveState(); renderFlashcards(); toast('Mazo eliminado (las tarjetas se conservan)','success');
}
// Compartir un mazo como PAQUETE: el colega lo recibe listo (mazo + todas sus tarjetas) para usar y acomodar
function shareMazo(mid){
  const m=mazoOf(mid); if(!m) return; const cs=mazoCards(mid);
  if(!cs.length){ toast('El mazo no tiene tarjetas para compartir','error'); return; }
  if(typeof sb==='undefined'||!sb||!STATE.uid){ toast('Necesitas sesión en la nube para compartir','error'); return; }
  const cols=socialCollaborators().filter(p=>p&&p.id&&p.id!==STATE.uid);
  if(!cols.length){ toast('No tienes colaboradores todavía. Agrégalos en 🌐 Social.','error'); return; }
  const opts=cols.map(p=>`<label style="display:flex;gap:9px;align-items:center;padding:9px 6px;border-bottom:1px solid rgba(201,168,76,.1);cursor:pointer"><input type="checkbox" class="mz-share-u" value="${p.id}" style="width:16px;height:16px"> ${escapeHtml(p.display_name||p.email||'')}</label>`).join('');
  document.getElementById('import-body').innerHTML=`<div class="modal-title">🤝 Compartir paquete «${escapeHtml(m.name)}»</div>
    <div style="font-size:12.5px;color:var(--gray2);margin-bottom:10px">Se envía una copia del mazo con sus ${cs.length} tarjeta(s). El colega lo recibe como paquete listo para usar y acomodar (no ves su avance).</div>
    <div style="max-height:42vh;overflow:auto">${opts}</div>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" onclick="doShareMazo('${mid}')">Compartir</button></div>`;
  openModal('modal-import');
}
async function doShareMazo(mid){
  const m=mazoOf(mid); if(!m) return;
  const us=[...document.querySelectorAll('.mz-share-u:checked')].map(x=>x.value);
  if(!us.length){ toast('Elige al menos un colega','error'); return; }
  const cards=mazoCards(mid).map(c=>({front:c.front||'', back:c.back||'', subject:c.subject||null}));
  const id='fp_'+Date.now();
  try{
    const {error}=await sb.from('shared_docs').insert({id, owner_id:STATE.uid, kind:'flashpack', data:{cards, mazo:{name:m.name,icon:m.icon,color:m.color}, from:STATE.user||'', when:new Date().toISOString()}, updated_at:new Date().toISOString()});
    if(error) throw error;
    const {error:e2}=await sb.from('shared_doc_members').insert(us.map(u=>({doc_id:id, user_id:u, email:((STATE.profiles||[]).find(p=>p.id===u)||{}).email||'', role:'viewer'})));
    if(e2) throw e2;
    toast(`Paquete «${m.name}» compartido con ${us.length} colega(s) 📚`,'success'); closeAllModals();
  }catch(e){ toast('No se pudo compartir: '+(e.message||''),'error'); }
}
// ── Selección múltiple de flashcards (eliminar / compartir / editar) ──
let _fcSelMode=false, _fcSel=new Set();
function toggleFcSel(){ _fcSelMode=!_fcSelMode; _fcSel.clear(); const b=document.getElementById('fc-sel-btn'); if(b){ b.textContent=_fcSelMode?'✕ Salir':'☑ Seleccionar'; b.classList.toggle('active',_fcSelMode); } renderFlashcards(); _fcSelBar(); }
function toggleFcOne(id,el){ if(_fcSel.has(id)){ _fcSel.delete(id); el&&el.classList.remove('sel-on'); } else { _fcSel.add(id); el&&el.classList.add('sel-on'); } if(el){ const box=el.querySelector('div'); if(box) box.textContent=_fcSel.has(id)?'☑':'⬜'; } _fcSelBar(); }
function _fcSelBar(){
  let bar=document.getElementById('fc-sel-bar');
  if(!_fcSelMode){ if(bar) bar.remove(); return; }
  if(!bar){ bar=document.createElement('div'); bar.id='fc-sel-bar'; bar.style.cssText='position:fixed;bottom:22px;left:50%;transform:translateX(-50%);z-index:5000;display:flex;gap:10px;align-items:center;background:var(--navy2);border:1px solid rgba(201,168,76,.35);border-radius:12px;padding:10px 16px;box-shadow:0 20px 50px rgba(0,0,0,.55)'; document.body.appendChild(bar); }
  const n=_fcSel.size;
  bar.innerHTML=`<span style="font-size:13px;font-weight:600">${n} seleccionada${n===1?'':'s'}</span>`
    + (n===1?`<button class="btn-ghost" style="padding:6px 12px" onclick="editFcSelected()">✏️ Editar</button>`:'')
    + `<button class="btn-ghost" style="padding:6px 12px" onclick="moveFcToMazo()"${n?'':' disabled'}>📚 Agregar a mazo</button>`
    + `<button class="btn-ghost" style="padding:6px 12px" onclick="shareFcSelected()"${n?'':' disabled'}>🤝 Compartir</button>`
    + `<button class="btn-ghost" style="color:var(--danger);padding:6px 12px" onclick="deleteFcSelected()"${n?'':' disabled'}>🗑 Eliminar</button>`
    + `<button class="btn-ghost" style="padding:6px 12px" onclick="toggleFcSel()">Cancelar</button>`;
}
function editFcSelected(){ const id=[..._fcSel][0]; if(id) editCard(id); }
// Mover las tarjetas seleccionadas a un mazo (o crear uno nuevo)
function moveFcToMazo(){
  const ids=[..._fcSel]; if(!ids.length){ toast('Selecciona tarjetas','error'); return; }
  const opts=(STATE.mazos||[]).map(m=>`<button class="btn-ghost" style="justify-content:flex-start;padding:11px 12px;text-align:left" onclick="_doMoveFcToMazo('${m.id}')">${m.icon||'📚'} ${escapeHtml(m.name)}</button>`).join('');
  document.getElementById('import-body').innerHTML=`<div class="modal-title">📚 Agregar ${ids.length} tarjeta(s) a…</div>
    <div style="font-size:12px;color:var(--gray2);margin:-4px 0 8px">Se suman al mazo (siguen en los demás mazos donde estén).</div>
    <div style="display:flex;flex-direction:column;gap:7px;max-height:44vh;overflow:auto;margin-bottom:8px">${opts||'<div style="font-size:13px;color:var(--gray2);padding:6px 2px">No tienes mazos todavía.</div>'}</div>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-ghost" onclick="_doMoveFcToMazo('__none__')">Quitar de todos</button><button class="btn-gold" onclick="_moveFcNewMazo()">+ Nuevo mazo</button></div>`;
  openModal('modal-import');
}
function _doMoveFcToMazo(mid){
  const ids=[..._fcSel];
  STATE.flashcards.forEach(c=>{ if(!_fcSel.has(c.id)) return; const arr=cardMazos(c);
    if(mid==='__none__'){ c.mazos=[]; }
    else if(!arr.includes(mid)){ arr.push(mid); } });
  closeAllModals(); saveState(); toast(`${ids.length} tarjeta(s) ${mid==='__none__'?'quitada(s) de sus mazos':'agregada(s) al mazo'} 📚`,'success'); toggleFcSel();
  if(_mazoView) renderMazo(_mazoView);
}
let _pendMoveIds=null;
function _moveFcNewMazo(){ _pendMoveIds=[..._fcSel]; _editMazoId=null; _openMazoModal({name:'',icon:'📚',color:MAZO_COLORS[0]}); const f=document.querySelector('#modal-import .modal-footer .btn-gold'); if(f) f.setAttribute('onclick','saveMazoAndMove()'); }
function saveMazoAndMove(){
  const name=(document.getElementById('mz-name').value||'').trim(); if(!name){ toast('Ponle un nombre al mazo','error'); return; }
  const icEl=document.querySelector('#mz-icons .mz-ic.on'), coEl=document.querySelector('#mz-colors .mz-co.on');
  const id='mz'+Date.now(); STATE.mazos=STATE.mazos||[]; STATE.mazos.push({id,name,icon:icEl?icEl.dataset.ic:'📚',color:coEl?coEl.dataset.co:MAZO_COLORS[0]});
  (_pendMoveIds||[]).forEach(cid=>{ const c=STATE.flashcards.find(x=>x.id===cid); if(c && !cardMazos(c).includes(id)) c.mazos.push(id); });
  _pendMoveIds=null; closeAllModals(); saveState(); toast('Mazo creado con las tarjetas 📚','success'); if(_fcSelMode) toggleFcSel(); renderFlashcards();
}
function deleteFcSelected(){
  const ids=[..._fcSel]; if(!ids.length){ toast('Selecciona al menos una','error'); return; }
  if(!confirm(`¿Eliminar ${ids.length} tarjeta(s)?`)) return;
  STATE.flashcards=STATE.flashcards.filter(c=>!_fcSel.has(c.id));
  saveState(); toast(ids.length+' tarjeta(s) eliminada(s) 🗑','success'); toggleFcSel();
}
// Compartir las tarjetas seleccionadas: se envía una COPIA a los colegas elegidos (las estudian en su cuenta)
function shareFcSelected(){
  const ids=[..._fcSel]; if(!ids.length){ toast('Selecciona tarjetas','error'); return; }
  if(typeof sb==='undefined'||!sb||!STATE.uid){ toast('Necesitas sesión en la nube para compartir','error'); return; }
  const cols=socialCollaborators().filter(p=>p&&p.id&&p.id!==STATE.uid);
  if(!cols.length){ toast('No tienes colaboradores todavía. Agrégalos en 🌐 Social.','error'); return; }
  const opts=cols.map(p=>`<label style="display:flex;gap:9px;align-items:center;padding:9px 6px;border-bottom:1px solid rgba(201,168,76,.1);cursor:pointer"><input type="checkbox" class="fc-share-u" value="${p.id}" style="width:16px;height:16px"> ${escapeHtml(p.display_name||p.email||'')}</label>`).join('');
  document.getElementById('import-body').innerHTML=`<div class="modal-title">🤝 Compartir ${ids.length} tarjeta(s)</div>
    <div style="font-size:12.5px;color:var(--gray2);margin-bottom:10px">Elige a quién enviarle una copia. La estudiará en su propia cuenta (no ves su avance).</div>
    <div style="max-height:42vh;overflow:auto">${opts}</div>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" onclick="doShareFc()">Compartir</button></div>`;
  openModal('modal-import');
}
async function doShareFc(){
  const us=[...document.querySelectorAll('.fc-share-u:checked')].map(x=>x.value);
  if(!us.length){ toast('Elige al menos un colega','error'); return; }
  const cards=STATE.flashcards.filter(c=>_fcSel.has(c.id)).map(c=>({front:c.front||'', back:c.back||'', subject:c.subject||null}));
  const id='fp_'+Date.now();
  try{
    const {error}=await sb.from('shared_docs').insert({id, owner_id:STATE.uid, kind:'flashpack', data:{cards, from:STATE.user||'', when:new Date().toISOString()}, updated_at:new Date().toISOString()});
    if(error) throw error;
    const {error:e2}=await sb.from('shared_doc_members').insert(us.map(u=>({doc_id:id, user_id:u, email:((STATE.profiles||[]).find(p=>p.id===u)||{}).email||'', role:'viewer'})));
    if(e2) throw e2;
    toast(`${cards.length} tarjeta(s) compartida(s) con ${us.length} colega(s)`,'success'); closeAllModals(); toggleFcSel();
  }catch(e){ toast('No se pudo compartir: '+(e.message||''),'error'); }
}
// Recepción: importa UNA sola vez las tarjetas de un pack compartido a mi propia colección
function _importFlashpack(r){
  STATE.importedPacks=STATE.importedPacks||[];
  if(STATE.importedPacks.includes(r.id)) return 0;
  const data=r.data||{}; const cards=data.cards||[]; const from=data.from||'';
  let mid=null;
  if(data.mazo && data.mazo.name){   // paquete → llega como mazo listo
    STATE.mazos=STATE.mazos||[]; mid='mz'+Date.now()+Math.random().toString(36).slice(2,5);
    STATE.mazos.push({id:mid, name:data.mazo.name, icon:data.mazo.icon||'📚', color:data.mazo.color||'#c9a84c', from});
  }
  cards.forEach(c=>STATE.flashcards.push({id:'fc'+Date.now()+Math.random().toString(36).slice(2,6), docId:null, subject:c.subject||null, mazos:mid?[mid]:[], front:c.front||'', back:c.back||'', ease:2.5, interval:0, due:'', reps:0, sharedFrom:from}));
  STATE.importedPacks.push(r.id); return cards.length;
}

let studyQueue = [], studyIdx = 0;
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
let _studyReveal=false;
function startStudy(filter) {
  let pool;
  if (filter==='__none__') pool = STATE.flashcards.filter(c=>!c.subject||!SUBJECTS.find(s=>s.id===c.subject));
  else pool = STATE.flashcards.filter(c=>!filter || c.subject===filter);
  if (!pool.length) { toast('No hay tarjetas en este grupo','error'); return; }
  let q = pool.filter(isDue);
  if (!q.length) { if(!confirm('No hay tarjetas pendientes hoy. ¿Repasar todas igual?')) return; q = pool; }
  q = shuffle(q.slice());
  const max = STATE.studyMax||0; if(max>0 && q.length>max) q = q.slice(0,max);   // cuántas por sesión
  studyQueue = q; studyIdx = 0;
  showStudyCard();
}
// Repaso del día: junta TODO lo pendiente de todas las materias en una sola sesión
function startDayReview(){
  const due = STATE.flashcards.filter(isDue);
  if(!due.length){ toast('¡Nada pendiente hoy! 🎉 Vas al día','success'); return; }
  let q = shuffle(due.slice()); const max = STATE.studyMax||0; if(max>0 && q.length>max) q=q.slice(0,max);
  studyQueue = q; studyIdx = 0; showStudyCard();
}
function _fmtIv(d){ return d<=0?'hoy':(d===1?'1 día':(d<30?d+' días':(d<365?Math.round(d/30)+' mes(es)':Math.round(d/365)+' año(s)'))); }
// Intervalos que daría cada grado (para mostrarlos en los botones)
function _srsPreview(c){
  const ease=c.ease||2.5, iv=c.interval||0;
  return { again:0,
    hard: iv?Math.max(1,Math.round(iv*1.2)):1,
    good: iv?Math.round(iv*ease):1,
    easy: iv?Math.round(iv*ease*1.35):3 };
}
function showStudyCard() {
  const ov = document.getElementById('study-overlay');
  if (studyIdx >= studyQueue.length) { ov.classList.remove('open'); renderFlashcards(); renderRail(); toast('¡Repaso completado! 🎉','success'); return; }
  const c = studyQueue[studyIdx];
  _studyReveal=false;
  const cardEl=document.getElementById('study-card'); if(cardEl){ cardEl.style.transition='none'; cardEl.style.transform=''; cardEl.style.opacity=''; requestAnimationFrame(()=>{ cardEl.style.transition=''; }); }
  document.getElementById('study-progress').textContent = `${studyIdx+1} / ${studyQueue.length}`;
  document.getElementById('study-front').innerHTML = escapeHtml(c.front);
  document.getElementById('study-back').innerHTML = escapeHtml(c.back);
  document.getElementById('study-back-wrap').style.display = 'none';
  document.getElementById('study-show-btn').style.display = 'block';
  document.getElementById('study-grades').style.display = 'none';
  const tip=document.getElementById('study-tip'); if(tip) tip.textContent = isMobile()?'Toca la tarjeta para ver la respuesta':'Toca la tarjeta o «Mostrar respuesta»';
  ov.classList.add('open'); _initStudyGestures(); _maybeSwipeTip();
}
// Muestra una sola vez cómo se repasa deslizando (solo en móvil)
function _maybeSwipeTip(){ if(!isMobile() || STATE.seenSwipeTip) return; setTimeout(()=>{ if(document.getElementById('study-overlay').classList.contains('open')) openModal('modal-swipe'); },350); }
function closeSwipeTip(){ STATE.seenSwipeTip=true; saveState(); closeAllModals(); }
let _studySwipeT=0, _studyGInit=false;
function studyTapFlip(){ if(Date.now()-_studySwipeT<450) return; if(!_studyReveal) revealCard(); }
// Navegar sin calificar (deslizar horizontal, como apps de citas): → siguiente · ← anterior
function studyNext(){ if(studyIdx<studyQueue.length-1){ studyIdx++; showStudyCard(); } else { toast('Es la última tarjeta'); } }
function studyPrev(){ if(studyIdx>0){ studyIdx--; showStudyCard(); } else { toast('Es la primera tarjeta'); } }
function _swipeAnim(card,dir){ const map={right:'translateX(120%)',left:'translateX(-120%)',up:'translateY(-120%)',down:'translateY(120%)'}; card.style.transition='transform .18s ease,opacity .18s ease'; card.style.transform=map[dir]||''; card.style.opacity='0'; setTimeout(()=>{ card.style.transition=''; card.style.transform=''; card.style.opacity=''; },200); }
// Gestos (móvil): → siguiente · ← atrás · ↑ me la sé (buena) · ↓ no me la sé (mala)
function _initStudyGestures(){
  if(_studyGInit) return; const card=document.getElementById('study-card'); if(!card) return; _studyGInit=true;
  let x0=null,y0=null;
  card.addEventListener('touchstart',e=>{ if(e.touches.length!==1)return; x0=e.touches[0].clientX; y0=e.touches[0].clientY; },{passive:true});
  card.addEventListener('touchend',e=>{ if(x0==null)return; const t=e.changedTouches[0]; const dx=t.clientX-x0, dy=t.clientY-y0; x0=null;
    if(Math.max(Math.abs(dx),Math.abs(dy))<45) return;    // fue un toque → lo maneja onclick
    _studySwipeT=Date.now();
    if(Math.abs(dx)>Math.abs(dy)){                        // horizontal → navegar
      _swipeAnim(card, dx>0?'right':'left'); setTimeout(()=>{ dx>0?studyNext():studyPrev(); },140);
    } else {                                              // vertical → calificar
      if(!_studyReveal){ revealCard(); return; }          // primero muestra la respuesta
      _swipeAnim(card, dy<0?'up':'down'); setTimeout(()=>gradeCard(dy<0?'good':'again'),140);   // ↑ buena · ↓ mala
    }
  },{passive:true});
}
function revealCard() {
  if(_studyReveal) return; _studyReveal=true;
  const c=studyQueue[studyIdx]; if(!c) return;
  const p=_srsPreview(c);
  const set=(id,d)=>{ const e=document.getElementById(id); if(e) e.textContent=_fmtIv(d); };
  set('gw-again',p.again); set('gw-hard',p.hard); set('gw-good',p.good); set('gw-easy',p.easy);
  document.getElementById('study-back-wrap').style.display = 'block';
  document.getElementById('study-show-btn').style.display = 'none';
  document.getElementById('study-grades').style.display = 'flex';
  const tip=document.getElementById('study-tip'); if(tip) tip.textContent = isMobile()?'Desliza ↑ la sabía · ↓ no la sabía · → siguiente · ← atrás':'';
}
function gradeCard(grade) {
  const c = studyQueue[studyIdx]; if(!c) return;
  const ease=c.ease||2.5, iv=c.interval||0; let nease=ease, niv;
  if (grade==='again'){ nease=Math.max(1.3,ease-0.2); niv=0; }
  else if (grade==='hard'){ nease=Math.max(1.3,ease-0.15); niv=iv?Math.max(1,Math.round(iv*1.2)):1; }
  else if (grade==='good'){ niv=iv?Math.round(iv*ease):1; }
  else { nease=ease+0.15; niv=iv?Math.round(iv*ease*1.35):3; }
  c.ease=nease; c.interval=niv; c.reps=(c.reps||0)+1;
  const due=new Date(); due.setDate(due.getDate()+niv); c.due=due.toISOString().slice(0,10);
  markStudyDay(); saveState();
  if(grade==='again') studyQueue.push(c);   // repite en esta misma sesión
  studyIdx++; showStudyCard();
}
// Racha de estudio: días seguidos repasando
function markStudyDay(){
  const t=_todayISO(); STATE.streak=STATE.streak||{last:'',count:0};
  if(STATE.streak.last===t) return;
  const y=new Date(); y.setDate(y.getDate()-1); const yiso=y.toISOString().slice(0,10);
  STATE.streak.count = (STATE.streak.last===yiso) ? (STATE.streak.count+1) : 1;
  STATE.streak.last=t;
}
function closeStudy(){ document.getElementById('study-overlay').classList.remove('open'); renderFlashcards(); }

let editingCardId = null;
function populateSubjectSelect2(t){ document.getElementById(t).innerHTML = '<option value="">Sin materia</option>'+SUBJECTS.map(s=>`<option value="${s.id}">${s.icon} ${s.name}</option>`).join(''); }
function populateMazoChecks(sel){ const el=document.getElementById('fc-mazos'); if(!el) return; const s=new Set(sel||[]); const mz=STATE.mazos||[];
  el.innerHTML = mz.length ? mz.map(m=>`<label class="mz-chip" style="display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:20px;border:1.5px solid ${s.has(m.id)?(m.color||'var(--gold)'):'rgba(201,168,76,.22)'};background:${s.has(m.id)?'rgba(201,168,76,.14)':'transparent'};cursor:pointer;font-size:13px"><input type="checkbox" class="fc-mz-c" value="${m.id}" ${s.has(m.id)?'checked':''} onchange="_syncMzChip(this)" style="width:15px;height:15px">${m.icon||'📚'} ${escapeHtml(m.name)}</label>`).join('') : '<span style="font-size:12.5px;color:var(--gray2)">No tienes mazos aún. Créalos en Flashcards → + Nuevo mazo.</span>';
}
function _syncMzChip(cb){ const l=cb.closest('.mz-chip'); if(!l) return; if(cb.checked){ l.style.border='1.5px solid var(--gold)'; l.style.background='rgba(201,168,76,.14)'; } else { l.style.border='1.5px solid rgba(201,168,76,.22)'; l.style.background='transparent'; } }
function openAddCard(){ editingCardId=null; document.getElementById('modal-card-title').textContent='Nueva tarjeta'; document.getElementById('fc-front').value=''; document.getElementById('fc-back').value=''; populateSubjectSelect2('fc-subject'); populateMazoChecks(_mazoCtx?[_mazoCtx]:[]); openModal('modal-card'); }
function editCard(id){ const c=STATE.flashcards.find(x=>x.id===id); if(!c)return; editingCardId=id; document.getElementById('modal-card-title').textContent='Editar tarjeta'; document.getElementById('fc-front').value=c.front; document.getElementById('fc-back').value=c.back; populateSubjectSelect2('fc-subject'); document.getElementById('fc-subject').value=c.subject||''; populateMazoChecks(cardMazos(c).slice()); openModal('modal-card'); }
function saveCard(){
  const front=document.getElementById('fc-front').value.trim(), back=document.getElementById('fc-back').value.trim();
  if(!front||!back){toast('Completa frente y reverso','error');return;}
  const subject=document.getElementById('fc-subject').value||null;
  const mazos=[...document.querySelectorAll('.fc-mz-c:checked')].map(x=>x.value);
  if(editingCardId){ const c=STATE.flashcards.find(x=>x.id===editingCardId); if(c) Object.assign(c,{front,back,subject,mazos}); }
  else STATE.flashcards.push({id:'fc'+Date.now(),docId:null,subject,mazos,front,back,ease:2.5,interval:0,due:'',reps:0});
  closeAllModals(); saveState(); if(_mazoView) renderMazo(_mazoView); else renderFlashcards(); toast('Tarjeta guardada','success');
}
function delCard(id){ STATE.flashcards=STATE.flashcards.filter(c=>c.id!==id); saveState(); renderFlashcards(); toast('Tarjeta eliminada'); }
function fcSwap(){ const f=document.getElementById('fc-front'), b=document.getElementById('fc-back'); const t=f.value; f.value=b.value; b.value=t; }
// ── Importar flashcards masivas (pegar desde Excel: Materia · Pregunta · Respuesta) ──
let _fcImport=[], _fcNewSubs=[];
function _matchSubject(name){ if(!name) return null; const n=_normMatch(name); return SUBJECTS.find(x=>String(x.id)!=='__shared__' && _normMatch(x.name)===n)||null; }
function openImportFlashcards(){
  document.getElementById('import-body').innerHTML=`<div class="modal-title">⬆ Importar flashcards</div>
    <div style="font-size:13px;color:var(--gray2);line-height:1.6;margin-bottom:10px">Pega filas copiadas de Excel/Sheets con <b>3 columnas: Materia · Pregunta · Respuesta</b>. Cada fila = una tarjeta. La 1ª fila puede ser encabezado. Si la materia no existe, se crea.</div>
    <textarea class="form-textarea" id="import-ta" style="min-height:150px;font-family:monospace;font-size:12px" placeholder="Materia	Pregunta	Respuesta&#10;Civil	¿Qué es la tradición?	Modo de adquirir el dominio…"></textarea>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" onclick="previewImportFlashcards()">Previsualizar →</button></div>`;
  openModal('modal-import');
}
function previewImportFlashcards(){
  const text=(document.getElementById('import-ta')||{}).value||'';
  const grid=splitRows(text).map(splitCells);
  if(!grid.length){ toast('Pega primero las filas','error'); return; }
  const h=(grid[0]||[]).map(_normMatch);
  const hasHeader = h.includes('materia')||h.includes('asignatura')||h.includes('ramo')||h.includes('pregunta')||h.includes('respuesta');
  const start=hasHeader?1:0;
  _fcImport=[];
  for(let i=start;i<grid.length;i++){
    const c=grid[i]; const materia=(c[0]||'').trim(), front=(c[1]||'').trim(), back=(c[2]||'').trim();
    if(!front||!back) continue;
    _fcImport.push({materia, front, back});
  }
  if(!_fcImport.length){ toast('No se reconocieron tarjetas. Revisa que haya pregunta y respuesta.','error'); return; }
  const seen=new Set(); _fcNewSubs=[];
  _fcImport.forEach(f=>{ if(f.materia && !_matchSubject(f.materia)){ const k=_normMatch(f.materia); if(!seen.has(k)){ seen.add(k); _fcNewSubs.push(f.materia); } } });
  const rowsHtml=_fcImport.slice(0,50).map((f,i)=>{ const ex=_matchSubject(f.materia); const mat=f.materia?(ex?escapeHtml(ex.name):'<span style="color:var(--warn)">nueva: '+escapeHtml(f.materia)+'</span>'):'<span style="color:var(--gray2)">—</span>'; return `<tr><td>${i+1}</td><td>${mat}</td><td>${escapeHtml(f.front).slice(0,60)}</td><td>${escapeHtml(f.back).slice(0,60)}</td></tr>`; }).join('');
  document.getElementById('import-body').innerHTML=`<div class="modal-title">Vista previa — ${_fcImport.length} tarjeta(s)</div>
    ${_fcNewSubs.length?`<div style="font-size:12px;color:var(--warn);margin-bottom:6px">Se crearán ${_fcNewSubs.length} materia(s): ${_fcNewSubs.map(escapeHtml).join(', ')}</div>`:''}
    <div style="max-height:44vh;overflow:auto"><table class="cli-table imp-table"><thead><tr><th>#</th><th>Materia</th><th>Pregunta</th><th>Respuesta</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
    ${_fcImport.length>50?`<div style="font-size:11px;color:var(--gray2);margin-top:4px">…y ${_fcImport.length-50} más</div>`:''}
    <div class="modal-footer"><button class="btn-ghost" onclick="openImportFlashcards()">← Atrás</button><button class="btn-gold" onclick="confirmImportFlashcards()">Importar ${_fcImport.length}</button></div>`;
}
function confirmImportFlashcards(){
  const map={};
  _fcImport.forEach(f=>{ if(!f.materia) return; const k=_normMatch(f.materia); if(map[k]) return;
    let ex=_matchSubject(f.materia);
    if(!ex){ ex={id:'subj'+Date.now()+Math.floor(Math.random()*99999), name:f.materia, icon:'📚', color:'#6366F1', progress:0, desc:''}; SUBJECTS.push(ex); }
    map[k]=ex.id; });
  let n=0;
  _fcImport.forEach(f=>{ const subject=f.materia?map[_normMatch(f.materia)]:null;
    STATE.flashcards.push({id:'fc'+Date.now()+Math.floor(Math.random()*99999), docId:null, subject:subject||null, front:f.front, back:f.back, ease:2.5, interval:0, due:'', reps:0}); n++; });
  _fcImport=[]; _fcNewSubs=[];
  saveState(); closeAllModals(); if(typeof buildSearchIndex==='function') buildSearchIndex(); renderFlashcards();
  toast(n+' flashcard(s) importada(s)','success');
}
// Crear flashcard desde el texto seleccionado (en libro o apunte). Lo seleccionado va al FRENTE
// por defecto; con "⇅ Intercambiar" el usuario decide si era pregunta o respuesta. Materia = la del doc.
function flashcardFromSelection(){
  const txt=(lastSelectionText||'').trim();
  closeTooltip();
  if(txt.length<2){ toast('Selecciona primero un texto','error'); return; }
  editingCardId=null;
  document.getElementById('modal-card-title').textContent='🃏 Nueva flashcard (desde la selección)';
  document.getElementById('fc-front').value=txt;
  document.getElementById('fc-back').value='';
  populateSubjectSelect2('fc-subject');
  const cur=(typeof findDoc==='function') ? findDoc(STATE.currentDocId) : null;
  document.getElementById('fc-subject').value = (cur && cur.subject) ? cur.subject : '';
  openModal('modal-card');
  toast('Lo seleccionado quedó como pregunta. Escribe la respuesta (o usa ⇅).');
}

// ════════════════════════════════════════
// POMODORO + ESTADÍSTICAS
// ════════════════════════════════════════
let pomoTimer=null;
function P(){ return STATE.pomo; }
function pomoSecsForMode(){ const p=P(); return (p.mode==='focus'?p.focusMin:p.mode==='long'?p.longMin:p.breakMin)*60; }
function fmtSec(s){ const m=Math.floor(s/60); return `${m}:${String(Math.max(0,s)%60).padStart(2,'0')}`; }

// Coloca el pomodoro: dentro de la barra (slot central) en PC; flotante en el cuerpo en móvil
function placePomo(){
  const pw=document.getElementById('pomo-wrap'); if(!pw) return;
  const slot=document.querySelector('#main-topbar .topbar-center-slot');
  if(isMobile()){ if(pw.parentElement!==document.body) document.body.appendChild(pw); }
  else if(slot && pw.parentElement!==slot){ slot.appendChild(pw); }
}
function pomoInit(){
  placePomo();
  const p=P();
  const today=new Date().toISOString().slice(0,10);
  if(p.cycleDate!==today){ p.cycle=0; p.cycleDate=today; }
  if(p.running && p.endAt){
    const rem=Math.round((p.endAt-Date.now())/1000);
    if(rem>0){ p.sec=rem; startPomoInterval(); }
    else { p.running=false; p.sec=pomoSecsForMode(); }
  } else if(!p.sec){ p.sec=pomoSecsForMode(); }
  document.body.classList.toggle('focus-mode', !!p.focus_mode && p.running);
  syncPomoUI();
}
function startPomoInterval(){
  clearInterval(pomoTimer);
  pomoTimer=setInterval(()=>{
    const p=P();
    p.sec=Math.round((p.endAt-Date.now())/1000);
    if(p.sec<=0){ pomoComplete(); } else syncPomoUI();
  },500);
}
function pomoStartPause(){
  const p=P();
  if(p.running){ p.running=false; clearInterval(pomoTimer); p.endAt=null; document.body.classList.remove('focus-mode'); }
  else { if(p.sec<=0) p.sec=pomoSecsForMode(); p.running=true; p.endAt=Date.now()+p.sec*1000; startPomoInterval(); if(p.focus_mode) document.body.classList.add('focus-mode'); requestNotifPerm(); }
  saveState(); syncPomoUI();
}
function pomoReset(){ const p=P(); p.running=false; clearInterval(pomoTimer); p.endAt=null; p.sec=pomoSecsForMode(); document.body.classList.remove('focus-mode'); saveState(); syncPomoUI(); toast('Pomodoro reiniciado'); }
function pomoComplete(){
  const p=P(); clearInterval(pomoTimer); p.running=false; p.endAt=null;
  if(p.mode==='focus'){
    logSession(p.focusMin);
    p.cycle=(p.cycle||0)+1; p.cycleDate=new Date().toISOString().slice(0,10);
    p.mode=(p.cycle%4===0)?'long':'break';
    pomoBeep(); pomoNotify('¡Pomodoro completado! 🍅', p.mode==='long'?'Descanso largo merecido 🌴':'Tomá un descanso 🍵');
  } else {
    p.mode='focus';
    pomoBeep(); pomoNotify('Descanso terminado', '¡A enfocarse! 🍅');
  }
  p.sec=pomoSecsForMode();
  document.body.classList.remove('focus-mode');
  saveState(); syncPomoUI();
  if(p.auto) pomoStartPause();
}
function pomoSet(k,v){ const p=P(); p[k]=v; if(!p.running) p.sec=pomoSecsForMode(); saveState(); syncPomoUI(); }
function pomoAdj(k,d){ const p=P(); p[k]=Math.max(1,(p[k]||0)+d); if(!p.running) p.sec=pomoSecsForMode(); saveState(); syncPomoUI(); }
function pomoToggleAuto(){ P().auto=document.getElementById('pomo-auto').checked; saveState(); }
function pomoToggleFocusMode(){ const p=P(); p.focus_mode=document.getElementById('pomo-focusmode').checked; document.body.classList.toggle('focus-mode', p.focus_mode && p.running); saveState(); }
function togglePomoPanel(){ document.getElementById('pomo-panel').classList.toggle('open'); syncPomoUI(); }
function closePomoPanel(){ document.getElementById('pomo-panel').classList.remove('open'); }

function syncPomoUI(){
  const p=P();
  const lbl=p.mode==='focus'?'Enfoque':p.mode==='long'?'Descanso largo':'Descanso';
  const ico=p.mode==='focus'?'🍅':'☕';
  const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  set('pomo-btn', `${ico} ${fmtSec(p.sec)}${p.running?'':' ▶'}`);
  set('pomo-time', fmtSec(p.sec));
  set('pomo-mode', lbl);
  set('pomo-sp', p.running?'⏸ Pausar':'▶ Iniciar');
  set('pomo-fm', p.focusMin); set('pomo-bm', p.breakMin); set('pomo-lm', p.longMin);
  set('pomo-cycle', `🍅 ${p.cycle||0} hoy`);
  set('pomo-streak', `🔥 ${studyStreak()} días`);
  const a=document.getElementById('pomo-auto'); if(a) a.checked=!!p.auto;
  const fm=document.getElementById('pomo-focusmode'); if(fm) fm.checked=!!p.focus_mode;
  const btn=document.getElementById('pomo-btn'); if(btn) btn.classList.toggle('running', p.running);
}
function pomoBeep(){ try{ const ac=new (window.AudioContext||window.webkitAudioContext)(); const o=ac.createOscillator(), g=ac.createGain(); o.connect(g); g.connect(ac.destination); o.type='sine'; o.frequency.value=880; g.gain.setValueAtTime(.001,ac.currentTime); g.gain.exponentialRampToValueAtTime(.3,ac.currentTime+.05); g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.7); o.start(); o.stop(ac.currentTime+.7); }catch(e){} }
function requestNotifPerm(){ try{ if('Notification' in window && Notification.permission==='default') Notification.requestPermission(); }catch(e){} }
function pomoNotify(title,body){ try{ if('Notification' in window && Notification.permission==='granted') new Notification(title,{body}); }catch(e){} toast(title,'success'); }

function studyStreak(){
  const set=new Set(STATE.sessions.map(s=>s.date));
  const iso=x=>x.toISOString().slice(0,10);
  const d=new Date(); d.setHours(0,0,0,0);
  if(!set.has(iso(d))) d.setDate(d.getDate()-1);
  let n=0; while(set.has(iso(d))){ n++; d.setDate(d.getDate()-1); }
  return n;
}
function logSession(min){
  const today=new Date().toISOString().slice(0,10);
  const subj=(STATE.currentDocId?(DOCUMENTS.find(d=>d.id===STATE.currentDocId)||{}).subject:null)||null;
  STATE.sessions.push({date:today, minutes:min, subject:subj});
  saveState();
  renderRail();
  if(document.getElementById('view-progreso')?.classList.contains('active')) renderProgreso();
  if(document.getElementById('view-inicio')?.classList.contains('active')) renderInicio();
}

function renderProgreso(){
  const body=document.getElementById('progreso-body'); if(!body)return;
  const totalMin=STATE.sessions.reduce((a,s)=>a+s.minutes,0);
  const today=new Date().toISOString().slice(0,10);
  const todayMin=STATE.sessions.filter(s=>s.date===today).reduce((a,s)=>a+s.minutes,0);
  const perSub={}; STATE.sessions.forEach(s=>{ const k=s.subject||'__'; perSub[k]=(perSub[k]||0)+s.minutes; });
  const days=[...Array(7)].map((_,i)=>{ const d=new Date(); d.setDate(d.getDate()-(6-i)); return d.toISOString().slice(0,10); });
  const dayMin=days.map(dt=>STATE.sessions.filter(s=>s.date===dt).reduce((a,s)=>a+s.minutes,0));
  const maxDay=Math.max(1,...dayMin);
  body.innerHTML=`
    <div class="stats-bar" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card"><div class="stat-label">Tiempo total</div><div class="stat-value">${(totalMin/60).toFixed(1)}<span style="font-size:14px"> h</span></div></div>
      <div class="stat-card"><div class="stat-label">Hoy</div><div class="stat-value text-gold">${todayMin}<span style="font-size:14px"> min</span></div></div>
      <div class="stat-card"><div class="stat-label">Sesiones</div><div class="stat-value">${STATE.sessions.length}</div></div>
      <div class="stat-card"><div class="stat-label">Tarjetas</div><div class="stat-value">${STATE.flashcards.length}</div></div>
    </div>
    <div class="shelf-wrapper" style="padding:24px;margin-bottom:18px">
      <div class="shelf-section-label">Últimos 7 días (minutos de estudio)</div>
      <div style="display:flex;align-items:flex-end;gap:10px;height:150px;margin-top:12px">
        ${dayMin.map((m,i)=>`<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">
          <div style="font-size:11px;color:var(--gold);margin-bottom:4px">${m||''}</div>
          <div style="width:100%;background:linear-gradient(to top,var(--gold),var(--gold2));border-radius:4px 4px 0 0;height:${Math.round(m/maxDay*100)}%;min-height:${m?6:2}px;opacity:${m?1:.25}"></div>
          <div style="font-size:10px;color:var(--gray2);margin-top:6px">${days[i].slice(5)}</div>
        </div>`).join('')}
      </div>
    </div>
    <div class="shelf-wrapper" style="padding:24px">
      <div class="shelf-section-label">Tiempo por materia</div>
      <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px">
        ${Object.entries(perSub).sort((a,b)=>b[1]-a[1]).map(([k,m])=>{ const s=SUBJECTS.find(x=>x.id===k); return `<div><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>${s?s.icon+' '+s.name:'📌 Sin materia'}</span><span class="text-gold">${m} min</span></div><div class="folder-progress-bar"><div class="folder-progress-fill" style="width:${Math.round(m/Math.max(1,totalMin)*100)}%;background:${s?s.color:'#888'}"></div></div></div>`; }).join('') || '<div style="color:var(--gray2);font-size:13px">Aún no hay sesiones. Inicia el Pomodoro 🍅 de la barra superior mientras estudias y se registrará aquí.</div>'}
      </div>
    </div>`;
}

// ════════════════════════════════════════
// ADMIN MODALS — DOC
// ════════════════════════════════════════
function populateSubjectSelect(targetId) {
  document.getElementById(targetId).innerHTML = SUBJECTS.map(s=>`<option value="${s.id}">${s.icon} ${s.name}</option>`).join('');
}
function populateRelatedSelect(excludeId, selected) {
  selected = selected || [];
  document.getElementById('fd-related').innerHTML = DOCUMENTS.filter(d=>d.id!==excludeId)
    .map(d=>`<option value="${d.id}" ${selected.includes(d.id)?'selected':''}>${d.title}</option>`).join('');
}
function renderRelated(d) {
  const el = document.getElementById('reader-related'); if(!el) return;
  const rel = (d.related||[]).map(id=>DOCUMENTS.find(x=>x.id===id)).filter(Boolean);
  if (!rel.length) { el.innerHTML=''; return; }
  el.innerHTML = '<div style="margin-bottom:16px"><span style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--gray2)">Ver también</span><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">'+
    rel.map(r=>`<span class="reader-tag" style="cursor:pointer" onclick="openReader('${r.id}')">🔗 ${escapeHtml(r.title)}</span>`).join('')+'</div></div>';
}

// ── Alta RÁPIDA de libro: solo nombre + archivo(s) (lo demás se edita después) ──
let _qBook={files:[]};
function quickAddBook(defaultSubject){
  if(!canAddBooks()){ toast('No tienes permiso para agregar libros','error'); return; }
  _qBook={files:[]};
  const old=document.getElementById('quick-book-ov'); if(old) old.remove();
  const subs=SUBJECTS.filter(s=>String(s.id)!=='__shared__');
  const ov=document.createElement('div'); ov.id='quick-book-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(5,10,18,.62);backdrop-filter:blur(3px);z-index:6000;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML=`<div style="background:var(--navy2);border:1px solid rgba(201,168,76,.25);border-radius:16px;max-width:440px;width:100%;padding:20px;box-shadow:0 30px 80px rgba(0,0,0,.6)">
    <div style="font-size:16px;font-weight:800;color:var(--gold3);margin-bottom:12px">📖 Nuevo libro</div>
    <label class="form-label">Nombre del libro *</label>
    <input class="form-input" id="qb-title" placeholder="Ej: Manual de Derecho Penal" style="margin-bottom:10px">
    <label class="form-label">Área</label>
    <select class="form-select" id="qb-subject" style="margin-bottom:10px">${subs.map(s=>`<option value="${s.id}" ${s.id===defaultSubject?'selected':''}>${escapeHtml(s.name)}</option>`).join('')}</select>
    <label class="form-label">Archivo(s) (PDF o imagen) *</label>
    <input id="qb-file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple onchange="quickBookFile(event)" style="font-size:13px;color:var(--gray);padding:8px;border:1px dashed rgba(201,168,76,.35);border-radius:8px;width:100%;background:rgba(255,255,255,.03);cursor:pointer">
    <div id="qb-file-name" style="font-size:12px;color:var(--gray2);margin-top:6px"></div>
    <div style="font-size:11px;color:var(--gray2);margin-top:10px">Puedes elegir <b>varios</b>: cada uno se crea como un libro con el <b>nombre de su archivo</b>. Autor, resumen… se editan luego.</div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
      <button class="btn-ghost" onclick="document.getElementById('quick-book-ov').remove()">Cancelar</button>
      <button class="btn-gold" id="qb-go" onclick="quickSaveBook()">Crear libro</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click',e=>{ if(e.target===ov) ov.remove(); });
  setTimeout(()=>{ const i=document.getElementById('qb-title'); if(i) i.focus(); },40);
}
function quickBookFile(ev){
  const list=[...(ev.target.files||[])]; if(!list.length) return;
  _qBook.files=list;
  const fn=document.getElementById('qb-file-name'); const t=document.getElementById('qb-title');
  if(list.length===1){ if(t && !t.value.trim()) t.value=list[0].name.replace(/\.[^.]+$/,''); if(fn) fn.textContent='📎 '+list[0].name; }
  else { if(fn) fn.textContent='📎 '+list.length+' archivos — cada uno será un libro con su nombre'; if(t){ t.value=''; t.placeholder='(se usa el nombre de cada archivo)'; } }
}
async function quickSaveBook(){
  const files=_qBook.files||[];
  if(!files.length){ toast('Elige al menos un archivo','error'); return; }
  const single=files.length===1;
  const titleField=(document.getElementById('qb-title').value||'').trim();
  if(single && !titleField){ toast('Pon el nombre del libro','error'); return; }
  const subject=document.getElementById('qb-subject').value||((SUBJECTS[0]||{}).id);
  const btn=document.getElementById('qb-go'); if(btn){ btn.disabled=true; btn.textContent='Creando…'; }
  let n=0;
  for(const f of files){
    const ext=(f.name.split('.').pop()||'').toLowerCase(); const kind = ext==='pdf'?'pdf':'image';
    let blob=f, pages=0, pdfText='';
    if(kind==='image'){ try{ blob=await compressIfImage(f)||f; }catch(_){} }
    else if(window.pdfjsLib){ try{ const pdf=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise; pages=pdf.numPages; let txt=''; for(let i=1;i<=Math.min(pdf.numPages,30);i++){ const pg=await pdf.getPage(i); const tc=await pg.getTextContent(); txt+=tc.items.map(it=>it.str).join(' ')+'\n'; } pdfText=txt.trim(); }catch(_){} }
    const id='d'+Date.now()+Math.floor(Math.random()*9999);
    const title = single ? titleField : f.name.replace(/\.[^.]+$/,'');
    const data={ id, title, subject, pages, type:kind==='pdf'?'PDF':'Imagen', status:'pending', summary:'', author:'', content:'', pdfText, tags:[], progress:0, lastAccess:null, annCount:0, fileName:f.name, fileKind:kind, hasFile:true, related:[], owner:STATE.isAdmin?'admin':STATE.user, unlocked:false };
    try{ await putFileBlob(id, blob); DOCUMENTS.push(data); STATE.docOrder.push(id); n++; }catch(err){}
  }
  saveState(); try{buildSearchIndex();}catch(_){}
  const ov=document.getElementById('quick-book-ov'); if(ov) ov.remove();
  toast(n>1?(n+' libros agregados 📖'):'Libro agregado 📖','success');
  renderAll();
}
function openAddDoc(defaultSubject) {
  if(!canAddBooks()){ toast('No tienes permiso para agregar libros','error'); return; }
  STATE.editingDocId = null; STATE.convertingApunteId=null;
  // checkbox "editable por usuarios": solo el admin lo ve, para liberar sus libros
  document.getElementById('fd-unlock-row').style.display = STATE.isAdmin ? '' : 'none';
  document.getElementById('fd-unlocked').checked = false;
  document.getElementById('modal-doc-title').textContent = 'Agregar Documento';
  document.getElementById('fd-delete-btn').style.display = 'none';
  document.getElementById('fd-title').value='';
  document.getElementById('fd-pages').value='';
  document.getElementById('fd-summary').value='';
  document.getElementById('fd-author').value='';
  document.getElementById('fd-content').value='';
  richLoad();
  document.getElementById('fd-tags').value='';
  document.getElementById('fd-status').value='pending';
  document.getElementById('fd-type').value='PDF';
  document.getElementById('fd-file').value=''; document.getElementById('fd-file-name').textContent='';
  pickedFile=null; pickedKind=null; pickedFileName=''; pickedPdfText='';
  populateSubjectSelect('fd-subject');
  populateRelatedSelect(null, []);
  if(defaultSubject) document.getElementById('fd-subject').value=defaultSubject;
  setupShareSection(null);
  openModal('modal-doc');
}

function openEditDoc(docId) {
  const d = DOCUMENTS.find(x=>x.id===docId);
  if(!d) return;
  if(!canEditDoc(d)){ toast('No tienes permiso para editar este libro','error'); return; }
  STATE.editingDocId = docId; STATE.convertingApunteId=null;
  // solo el admin puede liberar/bloquear sus propios libros
  const showUnlock = STATE.isAdmin && isOfficial(d);
  document.getElementById('fd-unlock-row').style.display = showUnlock ? '' : 'none';
  document.getElementById('fd-unlocked').checked = !!d.unlocked;
  document.getElementById('modal-doc-title').textContent = 'Editar Documento';
  document.getElementById('fd-delete-btn').style.display = canEditDoc(d) ? '' : 'none';
  document.getElementById('fd-title').value = d.title;
  document.getElementById('fd-pages').value = d.pages;
  document.getElementById('fd-summary').value = d.summary;
  document.getElementById('fd-author').value = d.author||'';
  document.getElementById('fd-content').value = d.content;
  richLoad();
  document.getElementById('fd-tags').value = (d.tags||[]).join(', ');
  document.getElementById('fd-status').value = d.status;
  document.getElementById('fd-type').value = d.type;
  populateSubjectSelect('fd-subject');
  populateRelatedSelect(d.id, d.related||[]);
  document.getElementById('fd-subject').value = d.subject;
  document.getElementById('fd-file').value=''; pickedFile=null; pickedKind=null; pickedFileName=''; pickedPdfText='';
  document.getElementById('fd-file-name').textContent = d.hasFile ? ('📎 '+(d.fileName||'archivo cargado')+' — sube otro para reemplazar') : '';
  setupShareSection(d);
  openModal('modal-doc');
}

function openEditCurrentDoc() { if(STATE.currentDocId) openEditDoc(STATE.currentDocId); }
function deleteEditingDoc(){ const id=STATE.editingDocId; if(!id)return; closeAllModals(); confirmDelete('doc', id); }

// ── Panel "Compartir" del editor de libros (solo admin) ──
function onShareToggle(){
  const on=document.getElementById('fd-shared').checked;
  document.getElementById('fd-share-opts').style.display = on?'block':'none';
  if(on) onShareScope();
}
function onShareScope(){
  const scope=document.getElementById('fd-share-scope').value;
  document.getElementById('fd-share-users').style.display = scope==='selected'?'flex':'none';
}
function populateShareUsers(selectedIds){
  const box=document.getElementById('fd-share-users'); if(!box) return;
  const sel=new Set(selectedIds||[]);
  const others=(STATE.profiles||[]).filter(p=>p.id!==STATE.uid);
  box.innerHTML = others.length
    ? others.map(p=>`<label class="perm-check"><input type="checkbox" value="${p.id}" ${sel.has(p.id)?'checked':''}> ${escapeHtml(p.email||'')}</label>`).join('')
    : '<div style="font-size:12px;color:var(--gray2)">No hay otros usuarios.</div>';
}
async function setupShareSection(d){
  const row=document.getElementById('fd-share-row'); if(!row) return;
  if(!STATE.isAdmin){ row.style.display='none'; return; }
  row.style.display='';
  if(!STATE.profiles.length){ try{ const {data}=await sb.from('profiles').select('id,email'); STATE.profiles=data||[]; }catch(e){} }
  const isShared = !!(d && d.shared);
  document.getElementById('fd-shared').checked = isShared;
  document.getElementById('fd-share-scope').value = (d && d.scope) || 'all';
  let access=[];
  if(isShared && d.scope==='selected') access=await loadSharedAccess(d.id);
  populateShareUsers(access);
  onShareToggle();
}

function stripHtml(h){ const t=document.createElement('div'); t.innerHTML=h||''; return (t.textContent||t.innerText||'').replace(/\s+/g,' ').trim(); }
function looksLikeHtml(s){ return /<\/?(p|div|h[1-6]|ul|ol|li|strong|em|b|i|u|s|span|br|mark|blockquote|font)\b/i.test(s||''); }
function _goldifyEl_OFF(root){
  if(!root) return;
  root.querySelectorAll('span.gold-caps[data-auto="1"]').forEach(s=>{ if(s.style && s.style.color){ s.classList.remove('gold-caps'); s.removeAttribute('data-auto'); return; }   // el usuario le puso color a mano → dejarlo como span de color normal
    const p=s.parentNode; while(s.firstChild) p.insertBefore(s.firstChild,s); p.removeChild(s); });
  root.normalize&&root.normalize();
  const re=/[A-ZÁÉÍÓÚÑÜ0-9]{2,}(?:[ '’\-]+[A-ZÁÉÍÓÚÑÜ0-9]{2,})*/g;
  const walker=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n){
      if(!n.nodeValue || !/[A-ZÁÉÍÓÚÑÜ]{2,}/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
      if(n.parentNode && n.parentNode.closest && n.parentNode.closest('.gold-caps')) return NodeFilter.FILTER_REJECT;
      // Respetar el color de texto que el usuario puso a mano (no dorar encima)
      let p=n.parentNode; while(p && p!==root){ if(p.style && p.style.color) return NodeFilter.FILTER_REJECT; if(p.tagName==='FONT' && p.getAttribute('color')) return NodeFilter.FILTER_REJECT; p=p.parentNode; }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const targets=[]; let nd; while(nd=walker.nextNode()) targets.push(nd);
  targets.forEach(node=>{
    const text=node.nodeValue; let last=0, any=false, m; const frag=document.createDocumentFragment(); re.lastIndex=0;
    while(m=re.exec(text)){
      if(!/[A-ZÁÉÍÓÚÑÜ]{2,}/.test(m[0])) continue; // descartar solo-números
      any=true;
      if(m.index>last) frag.appendChild(document.createTextNode(text.slice(last,m.index)));
      const span=document.createElement('span'); span.className='gold-caps'; span.dataset.auto='1'; span.textContent=m[0];
      frag.appendChild(span); last=m.index+m[0].length;
    }
    if(any){ if(last<text.length) frag.appendChild(document.createTextNode(text.slice(last))); node.parentNode.replaceChild(frag,node); }
  });
}

async function saveDoc() {
  const title = document.getElementById('fd-title').value.trim();
  if(!title){toast('El título es obligatorio','error');return;}
  const data = {
    title, subject:document.getElementById('fd-subject').value,
    pages:parseInt(document.getElementById('fd-pages').value)||0,
    type:document.getElementById('fd-type').value,
    status:document.getElementById('fd-status').value,
    summary:document.getElementById('fd-summary').value.trim(),
    author:document.getElementById('fd-author').value.trim(),
    content:document.getElementById('fd-content').value.trim(),
    pdfText:'',   // texto extraído del PDF para búsqueda (no se muestra en Contenido)
    tags:document.getElementById('fd-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
    progress:document.getElementById('fd-status').value==='done'?100:document.getElementById('fd-status').value==='progress'?50:0,
    lastAccess:null, annCount:0,
    fileName:null, fileKind:null, hasFile:false,
    related:[...document.getElementById('fd-related').selectedOptions].map(o=>o.value),
  };

  // ───── CONVERTIR APUNTE → LIBRO ─────
  if(STATE.convertingApunteId){
    const apId=STATE.convertingApunteId;
    data.id=apId; data.owner=STATE.isAdmin?'admin':STATE.user;
    data.unlocked=STATE.isAdmin?document.getElementById('fd-unlocked').checked:false;
    const ai=APUNTES.findIndex(x=>x.id===apId); if(ai>=0) APUNTES.splice(ai,1);
    DOCUMENTS.push(data); if(!STATE.docOrder.includes(apId)) STATE.docOrder.push(apId);
    ANNOTATIONS.forEach(a=>{ if(a.docId===apId) a.byAuthor=true; });   // notas → del autor
    STATE.convertingApunteId=null;
    closeAllModals(); saveState(); buildSearchIndex(); renderAll();
    toast('Apunte convertido en libro 📕 (con tus notas del autor ✍️)','success');
    openReader(apId);
    return;
  }

  // (La antigua "difusión de admin" se retiró: compartir libros ahora es peer-to-peer para todos, con 🤝 Compartir.)

  let id;
  if (STATE.editingDocId) {
    id = STATE.editingDocId;
    const idx = DOCUMENTS.findIndex(x=>x.id===id);
    const ex = DOCUMENTS[idx] || {};
    if(!canEditDoc(ex)){ toast('No tienes permiso para editar este libro','error'); return; }
    data.id = id; data.annCount = ex.annCount||0;
    data.owner = ex.owner || (isOfficial(ex)?'admin':STATE.user);   // conservar dueño
    data.unlocked = (STATE.isAdmin && isOfficial(ex)) ? document.getElementById('fd-unlocked').checked : !!ex.unlocked;
    // conservar archivo previo (y su índice de PDF) si no se subió uno nuevo
    if(!pickedFile){ data.fileName=ex.fileName; data.fileKind=ex.fileKind; data.hasFile=ex.hasFile; data.pdfText=ex.pdfText||''; }
  } else {
    if(!canAddBooks()){ toast('No tienes permiso para agregar libros','error'); return; }
    id = 'd'+Date.now(); data.id = id;
    data.owner = STATE.isAdmin ? 'admin' : STATE.user;              // dueño del nuevo libro
    data.unlocked = STATE.isAdmin ? document.getElementById('fd-unlocked').checked : false;
  }
  // guardar archivo subido en IndexedDB
  if(pickedFile){
    try { await putFileBlob(id, pickedFile); data.fileName=pickedFileName; data.fileKind=pickedKind; data.hasFile=true; if(pickedKind==='pdf') data.pdfText=pickedPdfText; }
    catch(err){ toast('No se pudo guardar el archivo: '+err.message,'error'); }
  }
  if (STATE.editingDocId) {
    const idx = DOCUMENTS.findIndex(x=>x.id===id);
    if(idx>=0) DOCUMENTS[idx] = {...DOCUMENTS[idx], ...data};
    toast('Documento actualizado','success');
  } else {
    DOCUMENTS.push(data);
    STATE.docOrder.push(id);
    toast('Documento agregado a la biblioteca','success');
  }
  pickedFile=null; pickedKind=null; pickedFileName=''; pickedPdfText='';
  closeAllModals();
  saveState();
  buildSearchIndex();
  renderAll();
  if(openFolderSubject) openFolderDocs(openFolderSubject);
}

