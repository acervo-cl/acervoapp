// DOCUMENTOS (biblioteca de PDFs) — Fase A
// ════════════════════════════════════════
function renderDocumentos(){
  const host=document.getElementById('docs-shelf'); if(!host) return;
  const list=DOCUMENTOS.slice().sort((a,b)=>(b.created||0)-(a.created||0));
  if(!list.length){ host.innerHTML='<div class="favs-empty" style="width:100%"><div>📄</div><p>Aún no tienes documentos.<br>Sube un PDF con "＋ Subir PDF".</p></div>'; return; }
  host.innerHTML='';
  list.forEach(x=>{
    const card=document.createElement('div'); card.className='docsheet';
    card.innerHTML=`<div class="docsheet-thumb"></div><div class="docsheet-name">${escapeHtml(x.title||'Documento')}</div><button class="docsheet-del" title="Borrar">🗑</button>`;
    card.querySelector('.docsheet-del').addEventListener('click',e=>{ e.stopPropagation(); deleteDocumento(x.id); });
    card.addEventListener('click',()=>openReader(x.id));
    host.appendChild(card); renderExThumb(x, card.querySelector('.docsheet-thumb'));
  });
}
function uploadDocumento(){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.pdf'; inp.multiple=true;
  inp.onchange=async ev=>{
    for(const f of [...ev.target.files]){
      const id='do'+Date.now()+Math.floor(Math.random()*999);
      try{ await putFileBlob(id,f); }catch(err){ toast('No se pudo guardar el PDF','error'); continue; }
      DOCUMENTOS.push({id, kind:'documento', title:f.name.replace(/\.[^.]+$/,''), type:'PDF', hasFile:true, fileName:f.name, fileKind:'pdf', created:Date.now()});
    }
    saveState(); buildSearchIndex(); renderDocumentos(); toast('Documento(s) subido(s)','success');
  };
  inp.click();
}
function deleteDocumento(id){
  const x=DOCUMENTOS.find(d=>d.id===id); if(!x)return;
  if(!confirm('¿Borrar este documento?')) return;
  const anns=ANNOTATIONS.filter(a=>a.docId===id);
  trashAdd('documento', x.title||'Documento', {documento:x, anns});   // a la papelera (blob se conserva)
  for(let j=ANNOTATIONS.length-1;j>=0;j--) if(ANNOTATIONS[j].docId===id) ANNOTATIONS.splice(j,1);
  const ix=DOCUMENTOS.findIndex(d=>d.id===id); if(ix>=0) DOCUMENTOS.splice(ix,1);
  saveState(); buildSearchIndex(); renderDocumentos(); toast('Documento movido a la papelera 🗑');
}

// ════════════════════════════════════════
// VISTA GENERAL (◎ Mapa) — todo junto, secciones reordenables, pila en abanico
// ════════════════════════════════════════
const USECS={libros:'📚 Libros', expedientes:'📁 Expedientes', documentos:'📄 Documentos'};
function renderUnified(){
  const host=document.getElementById('unified'); if(!host) return;
  let order=STATE.unifiedOrder; if(!Array.isArray(order)||order.length!==3) order=['libros','expedientes','documentos'];
  STATE.unifiedOrder=order;
  host.innerHTML=order.map((sec,idx)=>`
    <div class="usec">
      <div class="usec-head">
        <span class="usec-title">${USECS[sec]}</span>
        <span class="usec-move">
          <button onclick="moveSection(${idx},-1)" ${idx===0?'disabled':''}>▲</button>
          <button onclick="moveSection(${idx},1)" ${idx===order.length-1?'disabled':''}>▼</button>
        </span>
      </div>
      <div class="usec-body" id="ustack-${sec}"></div>
    </div>`).join('');
  fillSec('libros'); fillSec('expedientes'); fillSec('documentos');
}
function fillSec(sec){
  const el=document.getElementById('ustack-'+sec); if(!el) return;
  if(sec==='libros'){
    const docs=orderedDocs(DOCUMENTS);
    if(!docs.length){ el.innerHTML='<div class="usec-empty">Sin libros</div>'; return; }
    el.innerHTML='<div class="shelf"><div class="shelf-row">'+docs.map(d=>{
      const s=SUBJECTS.find(x=>x.id===d.subject); const h=70+Math.floor((d.pages||30)/3); const w=26+Math.floor((d.pages||30)/10);
      const color=(s&&s.color)||BOOK_COLORS[d.subject]||'#666';
      return `<div class="book" onclick="openReader('${d.id}')" ondblclick="openReader('${d.id}')" title="${escapeHtml(d.title||'')}"><div class="book-spine" style="background:${color};height:${h}px;width:${w}px;color:#fff;opacity:${d.progress===0?.55:1}">${escapeHtml((d.title||'').split(' ')[0])}</div></div>`;
    }).join('')+'</div></div>';
  } else if(sec==='documentos'){
    if(!DOCUMENTOS.length){ el.innerHTML='<div class="usec-empty">Sin documentos</div>'; return; }
    el.innerHTML='<div class="docs-shelf" id="udocs-shelf"></div>';
    const sh=document.getElementById('udocs-shelf');
    DOCUMENTOS.slice().sort((a,b)=>(b.created||0)-(a.created||0)).forEach(x=>{
      const card=document.createElement('div'); card.className='docsheet';
      card.innerHTML='<div class="docsheet-thumb"></div><div class="docsheet-name">'+escapeHtml(x.title||'Documento')+'</div>';
      card.addEventListener('click',()=>openReader(x.id)); sh.appendChild(card); renderExThumb(x, card.querySelector('.docsheet-thumb'));
    });
  } else { // expedientes: cajón de archivador (carpetas de canto)
    if(!EXPEDIENTES.length){ el.innerHTML='<div class="usec-empty">Sin expedientes</div>'; return; }
    el.innerHTML='<div class="exp-drawer">'+EXPEDIENTES.map(e=>`<div class="exp-edge" style="--c:${e.color||'#e8c97f'}" onclick="openExpediente('${e.id}')" title="${escapeHtml(e.name||'')}"><span class="exp-edge-tab">${escapeHtml(e.name||'Causa')}</span></div>`).join('')+'</div>';
  }
}
function moveSection(i,dir){ const o=STATE.unifiedOrder||['libros','expedientes','documentos']; const j=i+dir; if(j<0||j>=o.length)return; const t=o[i];o[i]=o[j];o[j]=t; STATE.unifiedOrder=o; saveState(); renderUnified(); }

function toggleFav(docId) {
  if (STATE.favorites.has(docId)) { STATE.favorites.delete(docId); toast('Quitado de favoritos'); }
  else { STATE.favorites.add(docId); toast('★ Agregado a favoritos','success'); }
  saveState();
  renderFavs();
  renderRail();
  // refresh grid view if open
  if (openFolderSubject) openFolderDocs(openFolderSubject);
  const pane = document.getElementById('shelf-preview');
  if (pane && pane.dataset.docid===docId) previewBook(docId);
}

// ── ADMIN LIST ──
function renderAdminList() {
  const SCOL = {civil:'#3B82F6',penal:'#EF4444',procesal:'#8B5CF6',laboral:'#10B981',mercantil:'#F59E0B',const:'#EC4899',admin:'#06B6D4'};
  const rows = DOCUMENTS.map(d => {
    const s = SUBJECTS.find(x=>x.id===d.subject);
    const sc = SCOL[d.subject]||'#666';
    return `<div class="list-row">
      <div><span style="color:${sc};font-size:11px;font-weight:600">● ${s?s.name.split(' ').pop():''}</span></div>
      <div class="list-doc">${d.title}<small>${d.pages} págs · ${d.type}</small></div>
      <div class="progress-mini"><div class="progress-bar-mini"><div class="progress-fill-mini" style="background:${sc};width:${d.progress}%"></div></div><span class="progress-pct">${d.progress}%</span></div>
      <div style="font-size:12px;color:var(--gray2)">${d.lastAccess||'—'}</div>
      <div><span class="status-pill ${d.status==='done'?'pill-done':d.status==='progress'?'pill-progress':'pill-pending'}">${d.status==='done'?'LISTO':d.status==='progress'?'PROGRESO':'PENDIENTE'}</span></div>
      <div style="display:flex;gap:5px">
        <button class="card-edit-btn" onclick="openEditDoc('${d.id}')">✏</button>
        <button class="card-del-btn" onclick="confirmDelete('doc','${d.id}')">🗑</button>
      </div>
    </div>`;
  }).join('');
  const el = document.getElementById('admin-list-table');
  if(el) el.innerHTML = `<div class="list-table-head"><div>Materia</div><div>Documento</div><div>Avance</div><div>Acceso</div><div>Estado</div><div>Acciones</div></div>${rows}`;
  renderUsersAdmin();
}

// ════════════════════════════════════════
// READER
// ════════════════════════════════════════
let _readerCtx='estudio', _readerCtxOverride=null, _showAllNotes=false, _escritoRead=false;
// En un ESCRITO (redacción/libre) las notas se apagan mientras redactas; el botón 👁 pasa a modo lectura
function _notesOff(){ const d=findDoc(STATE.currentDocId); return !!(d && d.kind==='exescrito' && !_escritoRead); }
function toggleEscritoRead(){ if(typeof apuntePersistNow==='function') apuntePersistNow(); _escritoRead=!_escritoRead; openReader(STATE.currentDocId); toast(_escritoRead?'Modo lectura: puedes anotar':'Modo redacción'); }
// Buscar y reemplazar en el editor (reemplaza en los nodos de texto, sin romper el formato)
function findReplaceEscrito(){
  const b=document.getElementById('reader-doc-body'); if(!b) return;
  const q=prompt('Buscar:'); if(!q) return;
  const r=prompt('Reemplazar por (deja vacío para borrar):'); if(r===null) return;
  const walk=document.createTreeWalker(b, NodeFilter.SHOW_TEXT); const nodes=[]; while(walk.nextNode()) nodes.push(walk.currentNode);
  let n=0; nodes.forEach(tn=>{ if(tn.nodeValue.indexOf(q)>=0){ const parts=tn.nodeValue.split(q); n+=parts.length-1; tn.nodeValue=parts.join(r); } });
  if(typeof apuntePersistNow==='function') apuntePersistNow();
  toast(n?(n+' reemplazo(s)'):'No se encontró "'+q+'"', n?'success':'error');
}
// Abrir un Word (.docx) y volcar su texto al editor (usa mammoth, ya cargado)
function importWordToEscrito(){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.docx';
  inp.onchange=async ev=>{ const f=ev.target.files[0]; if(!f) return; toast('Leyendo el Word…');
    if(!window.mammoth){ await waitFor(()=>window.mammoth); }
    try{ const res=await mammoth.convertToHtml({arrayBuffer:await f.arrayBuffer()}); const html=res.value||'';
      const b=document.getElementById('reader-doc-body'); if(!b) return;
      const vacio=!(b.innerText||'').trim();
      if(vacio) b.innerHTML=html; else b.insertAdjacentHTML('beforeend', '<p></p>'+html);   // vacío reemplaza; con contenido, agrega
      if(_apunteDoc && !(_apunteDoc.title||'').trim()||_apunteDoc.title==='Redacción libre'||_apunteDoc.title==='Escrito sin título'){ _apunteDoc.title=f.name.replace(/\.docx$/i,''); }
      if(typeof apuntePersistNow==='function') apuntePersistNow();
      toast('Word cargado — edítalo libremente','success');
    }catch(err){ toast('No se pudo leer el Word','error'); }
  };
  inp.click();
}
// Wrapper multiventana: si ya estás flotando y abres OTRO documento, la ventana actual
// se congela como companion y el nuevo doc entra como ventana viva (se "suma").
function openReader(docId){
  const keep = _readerFloat && _winList.length;
  if(keep && docId && docId!==STATE.currentDocId) _snapshotLiveToCompanion();
  _openReaderCore(docId);
  if(keep){
    const d=findDoc(docId); let w=_winList.find(x=>x.docId===docId);
    if(!w){ w={docId, title:(d&&d.title)||'Documento', icon:_winIcon(d), min:false, geom:_offsetGeom(), snap:null}; _winList.push(w); }
    else { w.snap=null; w.min=false; }
    _enterFloat(w.geom);
    renderCompanions(); renderWinDock();
  } else if(isMobile() && docId){
    _winRegisterMobile(docId);   // móvil: cada documento abierto queda en la barra de pastillas
    _initMobReaderSwipe();
  } else {
    // Libros / documentos de estudio (no de causa): abren FLOTANTES desde el inicio, con fondo borroso (clic fuera cierra)
    const d=findDoc(docId);
    if(d && !d.expediente) _enterFloat(_centeredReaderGeom(), true);
  }
}
function _centeredReaderGeom(){ const vw=innerWidth, vh=innerHeight; const w=Math.min(960, vw-60), h=Math.min(Math.round(vh*0.86), vh-70); return {l:Math.round((vw-w)/2), t:Math.max(56, Math.round((vh-h)/2)), w, h}; }
function _winRegisterMobile(docId){
  const d=findDoc(docId); if(!d) return;
  let w=_winList.find(x=>x.docId===docId);
  if(!w){ w={docId, title:d.title||'Documento', icon:_winIcon(d), min:false, geom:null, snap:null}; _winList.push(w); }
  w.min=false;
  renderWinDock();
}
// Gesto: deslizar hacia abajo la barra del lector = minimizar (móvil)
let _mobSwipeInit=false;
function _initMobReaderSwipe(){
  if(_mobSwipeInit) return; _mobSwipeInit=true;
  const bar=document.querySelector('#reader-screen .reader-topbar'); if(!bar) return;
  let y0=null,x0=null;
  bar.addEventListener('touchstart',e=>{ if(!isMobile()||_readerFloat){ y0=null; return; } if(e.target.closest('button,input,select,a,.reader-actions')) { y0=null; return; } y0=e.touches[0].clientY; x0=e.touches[0].clientX; },{passive:true});
  bar.addEventListener('touchend',e=>{ if(y0==null) return; const t=e.changedTouches[0], dy=t.clientY-y0, dx=Math.abs(t.clientX-x0); if(dy>55 && dy>dx) minimizeReaderWin(); y0=null; },{passive:true});
}
function _openReaderCore(docId) {
  if (docId) STATE.currentDocId = docId;
  const d = findDoc(STATE.currentDocId);
  if (!d) return;
  // Contexto de lectura: una causa (si es doc de causa o se abrió desde una) o 'estudio'
  _readerCtx = _readerCtxOverride || (d.expediente || 'estudio'); _readerCtxOverride=null; _showAllNotes=false;
  _mmUserToggled=false;   // cada documento abre con el visualizador en su estado por defecto (oculto en pop-up)
  STATE.lastOpened = d.id; saveState();
  touchTab('doc', d.id, d.title||'Libro', '📖');
  const s = SUBJECTS.find(x=>x.id===d.subject);
  document.getElementById('reader-title').textContent = `${d.title} — ${s?s.name:''}`;
  document.getElementById('reader-prog-fill').style.width = d.progress+'%';
  document.getElementById('reader-prog-label').textContent = d.progress+'%';

  document.getElementById('reader-text').innerHTML = `
    <div class="reader-chapter">${s?s.icon+' '+s.name:''}</div>
    <div class="reader-heading">${d.title}</div>
    ${d.summary?`<div class="reader-summary-box"><strong>Resumen</strong>${d.summary}</div>`:''}
    ${(d.tags&&d.tags.length)?`<div class="reader-tags">${d.tags.map(t=>`<span class="reader-tag">#${t}</span>`).join('')}</div>`:''}
    <div id="reader-related"></div>
    <div id="reader-bookmarks"></div>
    <div id="reader-doc-body" class="reader-doc-body"><div style="color:var(--gray2);font-size:13px">Cargando documento…</div></div>
  `;

  document.getElementById('reader-screen').classList.toggle('notes-hidden', !!STATE.notesHidden);
  renderNotes();
  renderBookmarks();
  renderRelated(d);
  const area = document.getElementById('reader-text');
  area.onscroll = () => { updateMinimapViewport(); updatePdfPageNum(); clearTimeout(area._st); area._st = setTimeout(()=>{ STATE.lastScroll[STATE.currentDocId]=area.scrollTop; saveState(); }, 400); };

  const isAp = d.kind==='apunte';
  const isEditable = isAp || d.kind==='exescrito';   // apuntes y escritos de expediente se editan en vivo
  const editBtn = document.getElementById('reader-edit-btn');
  if(editBtn) editBtn.style.display = (canEditDoc(d) && !isEditable) ? '' : 'none';
  // editor en vivo: barra de formato; sin barra de %; convertir solo para apuntes
  document.getElementById('apunte-toolbar').style.display = isEditable?'flex':'none';
  document.getElementById('reader-screen').classList.toggle('editable-doc', isEditable);   // habilita el botón "Aa" (formato) en flotante
  // modo de la barra: legal (escritos: sin color, con tipografía/PDF) vs apunte (con color)
  const esLegal = d.kind==='exescrito';
  if(esLegal) _escritoRead=false;   // un escrito abre en modo REDACCIÓN (sin notas); el botón 👁 lo pasa a lectura
  document.querySelectorAll('#apunte-toolbar .tb-leg').forEach(el=>el.style.display = esLegal?'':'none');
  document.querySelectorAll('#apunte-toolbar .tb-color').forEach(el=>el.style.display = esLegal?'none':'');
  // En un ESCRITO redactando: superficie limpia, sin notas
  const escritoEdit = esLegal && !_escritoRead;
  const an=document.getElementById('btn-annotations'); if(an) an.style.display=escritoEdit?'none':'';
  const fn=document.getElementById('btn-free-note'); if(fn) fn.style.display=escritoEdit?'none':'';
  const rb=document.getElementById('leg-read'); if(rb){ rb.classList.toggle('on', esLegal&&_escritoRead); rb.textContent=_escritoRead?'✍️ Redactar':'👁 Lectura'; }
  document.getElementById('btn-convert').style.display = isAp?'':'none';
  const shBtn=document.getElementById('btn-reader-share'); if(shBtn) shBtn.style.display = (d.shared && !d.sharedDoc) ? 'none' : '';   // ocultar en libros de difusión admin
  const ocrBtn=document.getElementById('btn-reader-ocr'); if(ocrBtn) ocrBtn.style.display='none';   // lo muestran renderImage/renderPdf si es imagen/escaneado
  const anBtn=document.getElementById('btn-reader-anexar'); if(anBtn) anBtn.style.display = (d.expediente||d.shared) ? 'none' : '';   // solo docs de estudio se anexan a una causa
  const dlBtn=document.getElementById('btn-reader-download'); if(dlBtn){ const canDl=(d.hasFile||(d.content||'').trim()) && (!d.shared || d.allowDownload); dlBtn.style.display = canDl ? '' : 'none'; }   // descargar: propios siempre; compartidos solo si el dueño lo permitió
  const pn=document.getElementById('pdf-pagenum'); if(pn) pn.style.display='none';   // el número de página solo en PDF
  setFontRowMode('text');   // por defecto tamaño de letra; renderPdf lo cambia a zoom
  const isImage = !!(d.hasFile && d.fileKind==='image');   // foto: sin % ni índice, solo notas
  const pg=document.querySelector('.reader-prog-group'); if(pg) pg.style.display = (isEditable||isImage)?'none':'';
  const idxBtn=document.getElementById('btn-index'); if(idxBtn) idxBtn.style.display = isImage?'none':'';

  showScreen('reader-screen');
  applyReaderMode();                  // pop-up por defecto; ⛶ lo lleva a pantalla completa
  if(isEditable) openApunteBody(d);   // editable en vivo
  else renderDocBody(d);
}
// El lector abre como pop-up centrado (default). ⛶ alterna a pantalla completa. Clic fuera = volver.
let _readerFull=false, _readerFloat=false;
// Limpia el estado/estilos de la ventana flotante (al volver a pop-up, pantalla completa o a la app)
function _clearReaderFloat(){
  const rs=document.getElementById('reader-screen'); if(!rs) return;
  rs.classList.remove('reader-float','rf-drag','fmt-open','win-min');
  rs.style.left=rs.style.top=rs.style.right=rs.style.width=rs.style.height='';
  _readerFloat=false;
  const b=document.getElementById('btn-reader-float'); if(b) b.classList.remove('active');
  const dd=document.getElementById('reader-more-dd'); if(dd) dd.classList.remove('open');
  _hideSnapGhost();
}
// Cierra TODO el espacio de ventanas (lista + compañeros + taskbar). Para anclar/volver a la app.
function _closeAllWins(){ _winList=[]; document.querySelectorAll('.snap-win').forEach(el=>el.remove()); renderWinDock(); }
function applyReaderMode(){
  const rs=document.getElementById('reader-screen'); if(!rs) return;
  const bd=document.getElementById('reader-backdrop');
  _clearReaderFloat();                                // salir de flotante al aplicar pop/full
  rs.classList.toggle('reader-pop', !_readerFull);
  rs.classList.toggle('reader-full', _readerFull);
  if(bd) bd.classList.toggle('on', !_readerFull);   // el fondo (clic fuera=volver) solo en pop-up
  // En pop-up: mantener la APP visible DETRÁS (se ve borrosa tras el backdrop, como en las causas). En pantalla completa, oculta.
  const app=document.getElementById('app-screen'); if(app) app.classList.toggle('active', !_readerFull);
  moveTopbarTo(_readerFull ? 'reader' : 'app');      // en pop-up la barra global queda atrás; solo se ve la barra del lector
  const b=document.getElementById('btn-reader-full'); if(b){ b.textContent=_readerFull?'🗗':'⛶'; b.title=_readerFull?'Salir de pantalla completa':'Pantalla completa'; }
}
function toggleReaderFull(){ _readerFull=!_readerFull; applyReaderMode(); }
// ── Ventana FLOTANTE: el documento queda encima de la causa, movible y redimensionable,
//    SIN fondo modal (la causa detrás sigue clickeable → copiar sus datos y pegarlos aquí). ──
// Pone el lector en modo flotante con una geometría dada (o la recordada). Reutilizable.
function _enterFloat(geom, withBd){
  const rs=document.getElementById('reader-screen'); if(!rs) return;
  const bd=document.getElementById('reader-backdrop');
  _readerFull=false; _readerFloat=true;
  rs.classList.remove('reader-pop','reader-full','win-min');
  rs.classList.add('reader-float');
  if(bd) bd.classList.toggle('on', !!withBd);                          // withBd: fondo borroso + clic fuera cierra
  const app=document.getElementById('app-screen'); if(app) app.classList.add('active');   // la APP queda VISIBLE detrás (nada de pantalla negra: todo flota)
  const ov=document.getElementById('exp-overlay'); if(ov) ov.classList.remove('blurred');   // causa nítida y clickeable
  moveTopbarTo('app');                                                 // la barra global (de la causa) queda visible detrás
  const b=document.getElementById('btn-reader-float'); if(b) b.classList.add('active');
  const bf=document.getElementById('btn-reader-full'); if(bf){ bf.textContent='⛶'; bf.title='Pantalla completa'; }
  if(geom) _applyFloatRect(geom); else _applyFloatGeom();
  _enableReaderDrag(); _enableReaderResize(); applyMinimapState();
}
function toggleReaderFloat(){
  const rs=document.getElementById('reader-screen'); if(!rs) return;
  if(_readerFloat){ _clearReaderFloat(); _closeAllWins(); applyReaderMode(); return; }   // volver a pop-up centrado
  _enterFloat(null);
  _winRegister(STATE.currentDocId);   // registra la ventana en la barra inferior
}
// Guarda/recupera la geometría (posición y tamaño) de la ventana flotante entre aperturas
function _saveFloatGeom(){
  const rs=document.getElementById('reader-screen'); if(!rs||!_readerFloat) return;
  const r=rs.getBoundingClientRect();
  STATE.floatWin={ l:Math.round(r.left), t:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height) };
  const w=_winList.find(x=>x.docId===STATE.currentDocId); if(w) w.geom={...STATE.floatWin};   // recuerda la geom de la ventana viva
  saveState();
}
function _applyFloatGeom(){
  const rs=document.getElementById('reader-screen'); if(!rs) return;
  const g=STATE.floatWin, vw=window.innerWidth, vh=window.innerHeight;
  let w=g?g.w:640, h=g?g.h:Math.round(vh*0.74), l, t;
  w=Math.max(320, Math.min(w, vw-12)); h=Math.max(220, Math.min(h, vh-12));
  if(g){ l=Math.min(Math.max(6,g.l), vw-Math.min(w,160)); t=Math.min(Math.max(6,g.t), vh-46); }
  else { l=vw-w-26; t=72; }
  rs.style.left=l+'px'; rs.style.top=t+'px'; rs.style.right='auto'; rs.style.width=w+'px'; rs.style.height=h+'px';
}
// Encaje (snap): arrastrar contra el borde superior = pantalla completa; contra un lado = esa mitad
function _snapZone(x,y){ const vw=window.innerWidth,M=14; if(y<=M) return 'max'; if(x<=M) return 'left'; if(x>=vw-M) return 'right'; return null; }
function _snapRect(zone){ const vw=window.innerWidth,vh=window.innerHeight,g=8;
  if(zone==='max')  return {l:g,t:g,w:vw-2*g,h:vh-2*g};
  if(zone==='left') return {l:g,t:g,w:Math.round(vw/2-g*1.5),h:vh-2*g};
  if(zone==='right')return {l:Math.round(vw/2+g*0.5),t:g,w:Math.round(vw/2-g*1.5),h:vh-2*g};
  return null; }
function _showSnapGhost(zone){ const gh=document.getElementById('rf-snap-ghost'); if(!gh) return;
  const r=_snapRect(zone); if(!r){ gh.classList.remove('on'); return; }
  gh.style.left=r.l+'px'; gh.style.top=r.t+'px'; gh.style.width=r.w+'px'; gh.style.height=r.h+'px'; gh.classList.add('on'); }
function _hideSnapGhost(){ const gh=document.getElementById('rf-snap-ghost'); if(gh) gh.classList.remove('on'); }
function _applyFloatRect(r){ const rs=document.getElementById('reader-screen'); if(!rs||!r) return;
  rs.style.left=r.l+'px'; rs.style.top=r.t+'px'; rs.style.right='auto'; rs.style.width=r.w+'px'; rs.style.height=r.h+'px'; }
// Doble clic en la barra = maximizar / restaurar
let _floatPrev=null;
function _toggleFloatMax(){
  const rs=document.getElementById('reader-screen'); if(!rs) return;
  const r=rs.getBoundingClientRect(), max=_snapRect('max');
  const isMax = Math.abs(r.width-max.w)<4 && Math.abs(r.height-max.h)<4;
  if(isMax && _floatPrev){ _applyFloatRect(_floatPrev); _floatPrev=null; }
  else { _floatPrev={l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)}; _applyFloatRect(max); }
  _saveFloatGeom();
}
// Arrastre por la barra superior (solo en flotante). No arrastra si tocas un botón/control.
let _rfDragInit=false;
function _enableReaderDrag(){
  if(_rfDragInit) return; _rfDragInit=true;
  const rs=document.getElementById('reader-screen');
  const bar=rs&&rs.querySelector('.reader-topbar'); if(!bar) return;
  let sx=0,sy=0,ox=0,oy=0,dragging=false,zone=null;
  const skip=t=>t.closest('button,input,select,textarea,a,.reader-actions,.reader-prog-group');
  bar.addEventListener('pointerdown', e=>{
    if(!rs.classList.contains('reader-float')) return;
    if(skip(e.target)) return;
    const r=rs.getBoundingClientRect();
    rs.style.left=r.left+'px'; rs.style.top=r.top+'px'; rs.style.right='auto';
    sx=e.clientX; sy=e.clientY; ox=r.left; oy=r.top; dragging=true; zone=null;
    rs.classList.add('rf-drag');
    try{ bar.setPointerCapture(e.pointerId); }catch(_){}
  });
  bar.addEventListener('pointermove', e=>{
    if(!dragging) return;
    let nx=ox+(e.clientX-sx), ny=oy+(e.clientY-sy);
    nx=Math.max(6, Math.min(nx, window.innerWidth  - Math.min(rs.offsetWidth,160)));
    ny=Math.max(6, Math.min(ny, window.innerHeight - 46));
    rs.style.left=nx+'px'; rs.style.top=ny+'px';
    zone=_snapZone(e.clientX, e.clientY); _showSnapGhost(zone);
  });
  const end=e=>{ if(!dragging) return; dragging=false; rs.classList.remove('rf-drag'); _hideSnapGhost();
    try{bar.releasePointerCapture(e.pointerId);}catch(_){}
    if(zone){ _floatPrev=null; _applyFloatRect(_snapRect(zone)); }
    _saveFloatGeom();
  };
  bar.addEventListener('pointerup', end);
  bar.addEventListener('pointercancel', end);
  bar.addEventListener('dblclick', e=>{ if(rs.classList.contains('reader-float') && !skip(e.target)) _toggleFloatMax(); });
}
// Redimensión desde los 4 lados y 4 esquinas
let _rfResizeInit=false;
function _enableReaderResize(){
  if(_rfResizeInit) return; _rfResizeInit=true;
  const rs=document.getElementById('reader-screen'); if(!rs) return;
  rs.querySelectorAll('.rf-resize').forEach(h=>{
    h.addEventListener('pointerdown', e=>{
      if(!rs.classList.contains('reader-float')) return;
      e.preventDefault(); e.stopPropagation();
      const dir=h.dataset.dir||'', r=rs.getBoundingClientRect();
      const st={x:e.clientX,y:e.clientY,l:r.left,t:r.top,w:r.width,h:r.height}, MINW=320, MINH=220;
      rs.classList.add('rf-drag'); rs.style.right='auto';
      try{ h.setPointerCapture(e.pointerId); }catch(_){}
      const move=ev=>{
        let l=st.l,t=st.t,w=st.w,ht=st.h; const dx=ev.clientX-st.x, dy=ev.clientY-st.y;
        if(dir.includes('e')) w=st.w+dx;
        if(dir.includes('s')) ht=st.h+dy;
        if(dir.includes('w')){ w=st.w-dx; l=st.l+dx; }
        if(dir.includes('n')){ ht=st.h-dy; t=st.t+dy; }
        if(w<MINW){ if(dir.includes('w')) l=st.l+(st.w-MINW); w=MINW; }
        if(ht<MINH){ if(dir.includes('n')) t=st.t+(st.h-MINH); ht=MINH; }
        rs.style.left=l+'px'; rs.style.top=t+'px'; rs.style.width=w+'px'; rs.style.height=ht+'px';
      };
      const up=()=>{ document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',up);
        rs.classList.remove('rf-drag'); try{h.releasePointerCapture(e.pointerId);}catch(_){}
        _floatPrev=null; _saveFloatGeom(); };
      document.addEventListener('pointermove',move); document.addEventListener('pointerup',up);
    });
  });
}
// Menú ⋯ (más acciones): junta en flotante los botones ocultos (índice, compartir, etc.) + cerrar
function openReaderMore(ev){
  ev&&ev.stopPropagation();
  let dd=document.getElementById('reader-more-dd');
  if(!dd){ dd=document.createElement('div'); dd.id='reader-more-dd'; dd.className='reader-more-dd'; document.body.appendChild(dd);
    document.addEventListener('click', e=>{ if(!e.target.closest('#reader-more-dd,#btn-reader-more,#rmob-more')) dd.classList.remove('open'); }); }
  if(dd.classList.contains('open')){ dd.classList.remove('open'); return; }
  dd.innerHTML=''; let n=0;
  document.querySelectorAll('#reader-screen .reader-actions .rf-hide').forEach(b=>{
    if(b.style.display==='none') return;
    if(b.id==='btn-index') return;   // el índice tiene su propio botón (📑 rmob-index); no va en el ⋯
    n++;
    const it=document.createElement('button'); it.className='reader-more-item'; it.textContent=b.textContent.trim();
    it.onclick=()=>{ dd.classList.remove('open'); b.click(); };
    dd.appendChild(it);
  });
  if(!n){ const em=document.createElement('div'); em.className='reader-more-empty'; em.textContent='Sin más acciones'; dd.appendChild(em); }
  const cl=document.createElement('button'); cl.className='reader-more-item rmi-close'; cl.textContent='✕ Cerrar documento';
  cl.onclick=()=>{ dd.classList.remove('open'); goToApp(); }; dd.appendChild(cl);
  const btn=(ev&&ev.currentTarget)||document.getElementById('rmob-more')||document.getElementById('btn-reader-more'), r=btn.getBoundingClientRect();
  dd.style.top=(r.bottom+6)+'px'; dd.style.left=Math.max(8, Math.min(r.right-200, window.innerWidth-208))+'px';
  dd.classList.add('open');
}
// Botón "Aa": muestra/oculta la barra de formato dentro de la ventana flotante
function toggleFloatFmt(ev){ ev&&ev.stopPropagation(); const rs=document.getElementById('reader-screen'); if(rs) rs.classList.toggle('fmt-open'); }

// ══ VENTANAS — Fase 2: varias a la vez ══
// Modelo: la ventana VIVA es el #reader-screen (editor real). Las demás son "companions":
// una foto (snapshot HTML seleccionable) que al hacer clic en ✍️ pasa a ser la viva.
let _winList=[];   // [{docId,title,icon,min,geom,snap}]
function _winIcon(d){ return d.kind==='exescrito'?'📝':(d.kind==='apunte'?'🗒️':(d.hasFile&&d.fileKind==='image'?'🖼️':(d.hasFile&&d.fileKind==='pdf'?'📕':'📄'))); }
function _isEditableDoc(d){ return !!(d && (d.kind==='apunte'||d.kind==='exescrito')); }
function _readerGeom(){ const rs=document.getElementById('reader-screen'); const r=rs.getBoundingClientRect(); return {l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)}; }
function _offsetGeom(){ const vw=innerWidth,vh=innerHeight,n=_winList.length; const w=Math.min(560,vw-40),h=Math.round(vh*0.6);
  return {l:Math.max(10,Math.min(46+n*30, vw-w-20)), t:Math.max(10,Math.min(64+n*30, vh-h-70)), w, h}; }
// Congela el contenido renderizado (para PDF: canvas→imagen) en HTML seleccionable
function _captureSnap(){
  const rt=document.getElementById('reader-text'); if(!rt) return '';
  const clone=rt.cloneNode(true);
  const srcC=rt.querySelectorAll('canvas'), clnC=clone.querySelectorAll('canvas');
  clnC.forEach((c,i)=>{ try{ const img=document.createElement('img'); img.src=srcC[i].toDataURL('image/png'); img.style.cssText=c.style.cssText; img.width=c.width; img.height=c.height; img.className=c.className; if(c.parentNode) c.parentNode.replaceChild(img,c); }catch(_){} });
  clone.querySelectorAll('[contenteditable]').forEach(el=>el.removeAttribute('contenteditable'));
  clone.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  clone.querySelectorAll('.note-dot,.postit').forEach(el=>el.remove());
  return clone.innerHTML;
}
function _snapshotLiveToCompanion(){
  const w=_winList.find(x=>x.docId===STATE.currentDocId); if(!w || w.min) return;
  if(_isEditableDoc(findDoc(w.docId))) apuntePersistNow();
  w.snap=_captureSnap(); w.geom=_readerGeom();
}
function _winRegister(docId){
  const d=findDoc(docId); if(!d) return;
  if(!_winList.some(w=>w.docId===docId)) _winList.push({docId, title:d.title||'Documento', icon:_winIcon(d), min:false, geom:null, snap:null});
  renderWinDock(); renderCompanions();
}
function renderWinDock(){
  const dock=document.getElementById('win-dock'); if(!dock) return;
  // Móvil: solo mostrar la bandeja si hay 2+ documentos abiertos (un solo libro NO deja pestaña abajo). PC: en modo flotante.
  const show = _winList.length && ( isMobile() ? (_winList.length>1) : _readerFloat );
  if(!show){ dock.classList.remove('on'); dock.innerHTML=''; return; }
  dock.innerHTML='<span class="wd-label">Ventanas</span>'+_winList.map(w=>{
    const active=(w.docId===STATE.currentDocId && !w.min);
    return `<div class="wd-pill ${w.min?'min':''} ${active?'active':''}" onclick="focusWin('${w.docId}')" title="${escapeHtml(w.title)}">
      <span>${w.icon}</span><span class="wd-pill-t">${escapeHtml(w.title)}</span>
      <button class="wd-pill-x" onclick="event.stopPropagation();closeWin('${w.docId}')" title="Cerrar">✕</button></div>`;
  }).join('');
  dock.classList.add('on');
}
// Dibuja las ventanas-copia (todas menos la viva y las minimizadas)
function renderCompanions(){
  document.querySelectorAll('.snap-win').forEach(el=>el.remove());
  if(!_readerFloat) return;
  _winList.forEach(w=>{
    if(w.docId===STATE.currentDocId || w.min) return;
    const g=w.geom||_offsetGeom(); w.geom=g;
    const win=document.createElement('div'); win.className='snap-win'; win.dataset.doc=w.docId;
    win.style.left=g.l+'px'; win.style.top=g.t+'px'; win.style.width=g.w+'px'; win.style.height=g.h+'px';
    win.innerHTML=`<div class="snap-bar"><span class="snap-grip">⠿</span><span class="snap-title">${w.icon} ${escapeHtml(w.title)}</span>
      <span class="snap-actions"><button class="snap-live" title="Editar / usar esta ventana" onclick="makeLive('${w.docId}')">✍️</button>
      <button title="Minimizar" onclick="minWin('${w.docId}')">—</button>
      <button class="snap-x" title="Cerrar" onclick="closeWin('${w.docId}')">✕</button></span></div>
      <div class="snap-body">${w.snap||'<div style="padding:20px;color:#94A3B8;font-size:13px">(contenido)</div>'}</div>`;
    document.body.appendChild(win);
    _makeSnapInteractive(win);
  });
}
function _winFront(el){ document.querySelectorAll('.snap-win').forEach(w=>w.style.zIndex='452'); if(el) el.style.zIndex='454'; }
function _winSaveGeom(el){ const w=_winList.find(x=>x.docId===el.dataset.doc); if(!w) return; const r=el.getBoundingClientRect(); w.geom={l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)}; }
function _makeSnapInteractive(win){
  ['n','s','e','w','ne','nw','se','sw'].forEach(d=>{ const h=document.createElement('div'); h.className='rf-resize rf-'+d; h.dataset.dir=d; win.appendChild(h); });
  const bar=win.querySelector('.snap-bar');
  _winDragBind(win, bar);
  _winResizeBind(win);
  // Un clic en la ventana la vuelve la principal (editable), sin bajar a la barra de ventanas.
  // Excepción: si estás seleccionando texto (para copiar), no la activa.
  win.addEventListener('click', e=>{ if(e.target.closest('button')) return; const sel=window.getSelection(); if(sel && String(sel).trim().length) return; makeLive(win.dataset.doc); });
}
function _winDragBind(el, handle){
  let sx=0,sy=0,ox=0,oy=0,drag=false;
  handle.addEventListener('pointerdown', e=>{
    if(e.target.closest('button')) return;
    _winFront(el);
    const r=el.getBoundingClientRect(); el.style.left=r.left+'px'; el.style.top=r.top+'px'; el.style.right='auto';
    sx=e.clientX; sy=e.clientY; ox=r.left; oy=r.top; drag=true;
    try{ handle.setPointerCapture(e.pointerId); }catch(_){}
  });
  handle.addEventListener('pointermove', e=>{ if(!drag) return;
    let nx=Math.max(6,Math.min(ox+(e.clientX-sx), innerWidth-120)), ny=Math.max(6,Math.min(oy+(e.clientY-sy), innerHeight-46));
    el.style.left=nx+'px'; el.style.top=ny+'px'; });
  const end=e=>{ if(!drag) return; drag=false; _winSaveGeom(el); try{ handle.releasePointerCapture(e.pointerId); }catch(_){} };
  handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
}
function _winResizeBind(el){
  el.querySelectorAll('.rf-resize').forEach(h=>{
    h.addEventListener('pointerdown', e=>{
      e.preventDefault(); e.stopPropagation(); _winFront(el);
      const dir=h.dataset.dir||'', r=el.getBoundingClientRect();
      const st={x:e.clientX,y:e.clientY,l:r.left,t:r.top,w:r.width,h:r.height}, MINW=260, MINH=160;
      try{ h.setPointerCapture(e.pointerId); }catch(_){}
      const move=ev=>{ let l=st.l,t=st.t,w=st.w,ht=st.h; const dx=ev.clientX-st.x, dy=ev.clientY-st.y;
        if(dir.includes('e')) w=st.w+dx; if(dir.includes('s')) ht=st.h+dy;
        if(dir.includes('w')){ w=st.w-dx; l=st.l+dx; } if(dir.includes('n')){ ht=st.h-dy; t=st.t+dy; }
        if(w<MINW){ if(dir.includes('w')) l=st.l+(st.w-MINW); w=MINW; } if(ht<MINH){ if(dir.includes('n')) t=st.t+(st.h-MINH); ht=MINH; }
        el.style.left=l+'px'; el.style.top=t+'px'; el.style.width=w+'px'; el.style.height=ht+'px'; };
      const up=()=>{ document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',up); _winSaveGeom(el); try{ h.releasePointerCapture(e.pointerId); }catch(_){} };
      document.addEventListener('pointermove',move); document.addEventListener('pointerup',up);
    });
  });
}
function focusWin(docId){
  const w=_winList.find(x=>x.docId===docId); if(!w) return;
  if(isMobile() && !_readerFloat){ openReader(docId); return; }   // móvil: tocar la pastilla muestra ese documento
  if(docId===STATE.currentDocId){
    const rs=document.getElementById('reader-screen');
    if(w.min){ w.min=false; if(rs) rs.classList.remove('win-min'); if(w.geom) _applyFloatRect(w.geom); renderCompanions(); }
    renderWinDock(); return;
  }
  makeLive(docId);
}
function makeLive(docId){
  if(docId===STATE.currentDocId){ focusWin(docId); return; }
  const w=_winList.find(x=>x.docId===docId); if(!w) return;
  _snapshotLiveToCompanion();               // congela la viva actual (si no está minimizada)
  const geom=w.geom||_offsetGeom();
  _openReaderCore(docId);                    // carga el doc en el lector real
  w.snap=null; w.min=false; w.geom=geom;
  _enterFloat(geom);
  renderCompanions(); renderWinDock();
}
function minimizeReaderWin(){
  const rs=document.getElementById('reader-screen'); if(!rs) return;
  if(isMobile() && !_readerFloat){   // móvil: vuelve a la app/causa; el documento queda en la barra de pastillas
    const w=_winList.find(x=>x.docId===STATE.currentDocId); if(w){ if(_isEditableDoc(findDoc(w.docId))) apuntePersistNow(); w.min=true; }
    moveTopbarTo('app'); showScreen('app-screen'); closeTooltip();
    const ov=document.getElementById('exp-overlay'); if(ov) ov.classList.remove('blurred');
    renderWinDock(); return;
  }
  _snapshotLiveToCompanion();
  const w=_winList.find(x=>x.docId===STATE.currentDocId); if(w) w.min=true;
  rs.classList.add('win-min');
  renderCompanions(); renderWinDock();
}
function minWin(docId){
  if(docId===STATE.currentDocId){ minimizeReaderWin(); return; }
  const w=_winList.find(x=>x.docId===docId); if(!w) return;
  w.min=true; renderCompanions(); renderWinDock();
}
function closeReaderWin(){ closeWin(STATE.currentDocId); }
function closeWin(docId){
  if(isMobile() && !_readerFloat){
    const wasCurrent=(docId===STATE.currentDocId);
    _winList=_winList.filter(w=>w.docId!==docId);
    if(!_winList.length){ goToApp(); return; }             // no quedan documentos abiertos → salir
    if(wasCurrent){ const nxt=_winList[0]; openReader(nxt.docId); }   // saltar al siguiente abierto
    else renderWinDock();
    return;
  }
  const wasLive=(docId===STATE.currentDocId);
  _winList=_winList.filter(w=>w.docId!==docId);
  document.querySelectorAll('.snap-win[data-doc="'+docId+'"]').forEach(el=>el.remove());
  if(wasLive){
    const next=_winList.find(w=>!w.min) || _winList[0];
    const rs=document.getElementById('reader-screen'); if(rs) rs.classList.remove('win-min');
    if(next) makeLive(next.docId);
    else goToApp();
  } else { renderCompanions(); renderWinDock(); }
}
// Cuerpo de un apunte: editable directo (editor completo) + autoguardado; admite notas-círculo
let _apunteDoc=null;
function apuntePersistNow(){
  if(!_apunteDoc) return;
  if(STATE.viewingUid && !STATE.editOther) return;   // viendo en solo lectura
  const b=document.getElementById('reader-doc-body'); if(b){ _apunteDoc.content=b.innerHTML; _apunteDoc.updated=Date.now(); saveState(); }
}
function openApunteBody(d){
  _apunteDoc=d;
  initApunteToolbar();
  const body=document.getElementById('reader-doc-body'); if(!body) return;
  body.innerHTML = d.content || '';
  const editable = !(d.kind==='exescrito' && _escritoRead);   // escrito en modo lectura → no editable (se anota)
  body.contentEditable = editable ? 'true' : 'false';
  body.classList.toggle('apunte-edit', editable);
  // tipografía del documento (escritos legales)
  if(d.kind==='exescrito'){
    const fmt=d.fmt||STATE.redFormat||{};
    body.classList.add('doc-paper');
    body.style.fontFamily=fmt.font?`'${fmt.font}', serif`:''; body.style.fontSize=(fmt.size||12)+'pt'; body.style.lineHeight=fmt.lineHeight||1.5; body.style.textAlign=fmt.align||'justify';
    const lf=document.getElementById('leg-font'); if(lf) lf.value=fmt.font||'Times New Roman';
    const ll=document.getElementById('leg-lh'); if(ll) ll.value=String(fmt.lineHeight||1.5);
    const lss=document.getElementById('leg-size-sel'); if(lss){ const sz=String(fmt.size||12); lss.value=[...lss.options].some(o=>o.value===sz)?sz:''; }   // refleja el tamaño real actual
    _applyEscZoom();   // respeta el zoom de vista actual
  } else { body.classList.remove('doc-paper'); body.style.fontFamily=''; body.style.fontSize=''; body.style.lineHeight=''; body.style.textAlign=''; }
  body.setAttribute('data-ph','Escribe tu apunte aquí… (se guarda solo)');
  body.oninput = ()=>{ clearTimeout(_apTimer); _apTimer=setTimeout(apuntePersistNow, 600); };
  // título editable
  const h=document.querySelector('#reader-text .reader-heading');
  if(h){
    h.contentEditable='true'; h.classList.add('apunte-edit-title');
    h.oninput=()=>{ if(STATE.viewingUid&&!STATE.editOther)return; clearTimeout(_apTimer); _apTimer=setTimeout(()=>{ d.title=(h.textContent||'').trim()||'Apunte sin título'; d.updated=Date.now(); document.getElementById('reader-title').textContent=d.title; saveState(); },600); };
  }
  refreshDocMarks();   // notas-círculo sobre el contenido del apunte
  setTimeout(renderBookmarks, 80);   // marcadores de tema, ya con el contenido puesto
}
// Barra de formato del apunte (execCommand sobre el cuerpo editable)
// Inserta una sangría (tab) FIABLE en el cursor: span inline-block con ancho fijo.
// Antes se usaba execCommand('insertHTML') con un span VACÍO → el navegador lo colapsaba y no se veía.
// Ahora usamos Range.insertNode + un carácter de ancho cero (​) para que no se estripe.
function _insertTabSpan(b, ind){
  if(!b) return; b.focus();
  const sel=window.getSelection(); if(!sel) return;
  if(!sel.rangeCount || !b.contains(sel.getRangeAt(0).commonAncestorContainer)){
    const rr=document.createRange(); rr.selectNodeContents(b); rr.collapse(false);   // sin cursor válido → al final
    sel.removeAllRanges(); sel.addRange(rr);
  }
  const r=sel.getRangeAt(0); r.deleteContents();
  const span=document.createElement('span');
  span.className='doc-tab'; span.style.display='inline-block'; span.style.width=((ind||12.5))+'mm';
  span.appendChild(document.createTextNode('​'));
  r.insertNode(span);
  r.setStartAfter(span); r.collapse(true);            // cursor después de la sangría
  sel.removeAllRanges(); sel.addRange(r);
}
// Deshacer/rehacer SEGURO. Si la pila del editor está vacía, NO llamamos a execCommand:
// con nada que deshacer, el navegador ejecuta su "atrás" nativo y en la PWA salta a otra pestaña.
function _safeEditCmd(cmd, b){
  if(!b) return; b.focus();
  try{ if(document.queryCommandEnabled && !document.queryCommandEnabled(cmd)) return; }catch(_){}
  try{ document.execCommand(cmd); }catch(_){}
}
// Aplica un tamaño de letra (px) SOLO al texto seleccionado (como un editor común).
// Truco estándar: execCommand fontSize=7 (crea <font size=7>) y luego lo convertimos a un <span> con el px real.
function _setSelFontSize(px){
  try{ document.execCommand('styleWithCSS', false, false); }catch(_){}
  try{ document.execCommand('fontSize', false, '7'); }catch(_){}
  const b=document.getElementById('reader-doc-body'); if(!b) return;
  b.querySelectorAll('font[size="7"]').forEach(f=>{ const s=document.createElement('span'); s.style.fontSize=px+'px'; while(f.firstChild) s.appendChild(f.firstChild); if(f.parentNode) f.parentNode.replaceChild(s,f); });
}
// Zoom de VISUALIZACIÓN del editor (A+/A−): agranda/achica en pantalla SIN cambiar el tamaño real del texto ni el PDF.
let _escZoom=1;
function _applyEscZoom(){ const b=document.getElementById('reader-doc-body'); if(b) b.style.zoom=String(_escZoom); }
function _escZoomStep(d){ _escZoom=Math.min(2.2, Math.max(0.5, Math.round((_escZoom+d)*100)/100)); _applyEscZoom(); toast('Vista: '+Math.round(_escZoom*100)+'%'); }
// Inserta HTML en la posición del cursor del editor (para piezas/modelos)
function _insertHtmlAtCursor(b, html){
  if(!b) return; b.focus();
  const sel=window.getSelection(); let range;
  if(sel && sel.rangeCount && b.contains(sel.getRangeAt(0).commonAncestorContainer)) range=sel.getRangeAt(0);
  else { range=document.createRange(); range.selectNodeContents(b); range.collapse(false); sel.removeAllRanges(); sel.addRange(range); }
  range.deleteContents();
  const tmp=document.createElement('div'); tmp.innerHTML=html; const frag=document.createDocumentFragment(); let last=null;
  while(tmp.firstChild){ last=tmp.firstChild; frag.appendChild(last); }
  range.insertNode(frag);
  if(last){ range.setStartAfter(last); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); }
}
function _modeloInsertText(m){
  const parts=[]; const cab=(m.cabecera||m.suma||'').trim(); const cue=(m.cuerpo||'').trim(); const pie=(m.pie!==undefined?m.pie:m.portanto||'').trim();
  if(cab) parts.push(cab); if(cue) parts.push(cue); if(pie) parts.push(pie);
  return parts.join('\n\n');
}
// Menú "＋ Insertar": estructura rápida + tus modelos → los deja en el cursor
function openInsertModelos(ev){
  ev&&ev.stopPropagation();
  let dd=document.getElementById('leg-insert-dd');
  if(!dd){ dd=document.createElement('div'); dd.id='leg-insert-dd'; dd.className='reader-more-dd'; document.body.appendChild(dd);
    document.addEventListener('click', e=>{ if(!e.target.closest('#leg-insert-dd,#leg-insert')) dd.classList.remove('open'); }); }
  if(dd.classList.contains('open')){ dd.classList.remove('open'); return; }
  try{ ensureModelos&&ensureModelos(); }catch(_){}
  dd.innerHTML='';
  const doInsert=txt=>{ dd.classList.remove('open'); _insertHtmlAtCursor(document.getElementById('reader-doc-body'), docTextToHtml(txt)); if(typeof apuntePersistNow==='function') apuntePersistNow(); };
  const sep=t=>{ const s=document.createElement('div'); s.className='reader-more-empty'; s.textContent=t; dd.appendChild(s); };
  const item=(label,txt,icon)=>{ const it=document.createElement('button'); it.className='reader-more-item'; it.textContent=(icon||'📄')+' '+label; it.onclick=()=>doInsert(txt); dd.appendChild(it); };
  const quick=[
    ['En lo principal / Otrosí','EN LO PRINCIPAL: {{petición principal}};\nOTROSÍ: {{contenido}}.'],
    ['Otrosí','OTROSÍ: {{contenido}}.'],
    ['Por tanto','POR TANTO,\nRUEGO A US.: {{petición}}.'],
    ['Cláusula (contrato)','PRIMERO: {{contenido}}.'],
    ['Fecha y firma','_______________________\n{{nombre}}\n{{RUT}}'],
  ];
  sep('Estructura rápida'); quick.forEach(([l,t])=>item(l,t,'🧩'));
  const mods=(typeof MODELOS!=='undefined'?MODELOS:[]).filter(m=>_modeloInsertText(m).trim());
  if(mods.length){ sep('Tus modelos'); mods.forEach(m=>item(m.nombre||'Modelo', _modeloInsertText(m), '📋')); }
  const btn=document.getElementById('leg-insert'); const r=btn.getBoundingClientRect();
  dd.style.top=(r.bottom+6)+'px'; dd.style.left=Math.max(8, Math.min(r.left, window.innerWidth-250))+'px'; dd.style.maxHeight='min(62vh,460px)'; dd.style.overflowY='auto';
  dd.classList.add('open');
}
let apToolbarInited=false;
function initApunteToolbar(){
  if(apToolbarInited) return; apToolbarInited=true;
  const tb=document.getElementById('apunte-toolbar'); if(!tb) return;
  const body=()=>document.getElementById('reader-doc-body');
  const run=(cmd,val)=>{ const b=body(); if(!b)return; b.focus(); try{document.execCommand('styleWithCSS',false,true);}catch(e){} document.execCommand(cmd,false,val||null); apuntePersistNow(); };
  tb.addEventListener('mousedown', e=>{ if(e.target.closest('button,input')) e.preventDefault(); }); // no perder la selección
  tb.querySelectorAll('button[data-cmd]').forEach(b=>b.onclick=()=>run(b.dataset.cmd));
  tb.querySelectorAll('button[data-block]').forEach(b=>b.onclick=()=>run('formatBlock','<'+b.dataset.block+'>'));
  const gold=tb.querySelector('button[data-gold]'); if(gold) gold.onclick=()=>run('foreColor','#c9a84c');
  const hil=tb.querySelector('button[data-hilite]'); if(hil) hil.onclick=()=>run('hiliteColor','#6e5e22');
  const col=document.getElementById('ap-color'); if(col) col.addEventListener('input',()=>run('foreColor',col.value));
  const clr=document.getElementById('ap-clear'); if(clr) clr.onclick=()=>{ const b=body(); if(!b)return; b.focus(); document.execCommand('removeFormat'); document.execCommand('hiliteColor',false,'transparent'); apuntePersistNow(); };
  // Controles legales: tipografía del documento + PDF + copiar
  const setDocFmt=(k,v)=>{ if(!_apunteDoc)return; _apunteDoc.fmt=Object.assign({font:'Times New Roman',size:12,lineHeight:1.5,align:'justify'}, _apunteDoc.fmt||STATE.redFormat||{}); _apunteDoc.fmt[k]=v; const b=body(); if(b){
      if(k==='size'){ b.querySelectorAll('[style*="font-size"]').forEach(el=>{ el.style.fontSize=''; }); }   // el tamaño del DOCUMENTO manda: limpia tamaños inline que lo pisaban
      if(k==='font'){ b.querySelectorAll('font[face],[style*="font-family"]').forEach(el=>{ el.style.fontFamily=''; el.removeAttribute('face'); }); }
      b.style.fontFamily=`'${_apunteDoc.fmt.font}', serif`; b.style.fontSize=_apunteDoc.fmt.size+'pt'; b.style.lineHeight=_apunteDoc.fmt.lineHeight; b.style.textAlign=_apunteDoc.fmt.align; }
    apuntePersistNow();
    if(k==='size') toast('Tamaño del documento: '+v+' pt'); };
  const _hasSel=()=>{ const s=window.getSelection(); return s && String(s).trim().length>0; };
  const lf=document.getElementById('leg-font'); if(lf) lf.onchange=()=>{ if(_hasSel()){ run('fontName', lf.value); } else setDocFmt('font',lf.value); };   // con selección: solo ese texto; sin selección: todo el documento
  const ll=document.getElementById('leg-lh'); if(ll) ll.onchange=()=>setDocFmt('lineHeight',parseFloat(ll.value));
  const sdn=document.getElementById('leg-size-dn'); if(sdn) sdn.onclick=()=>_escZoomStep(-0.1);   // solo zoom de vista
  const sup=document.getElementById('leg-size-up'); if(sup) sup.onclick=()=>_escZoomStep(0.1);
  const lss=document.getElementById('leg-size-sel'); if(lss) lss.onchange=()=>{ const v=parseInt(lss.value); if(!v) return; setDocFmt('size',v); };   // tamaño REAL del documento (así sale en el PDF)
  const lc=document.getElementById('leg-color'); if(lc) lc.addEventListener('input',()=>run('foreColor', lc.value));   // color al texto seleccionado
  const lhi=document.getElementById('leg-hilite'); if(lhi) lhi.onclick=()=>run('hiliteColor','#fff59d');                // resaltar (marcador amarillo)
  const mb=document.getElementById('leg-membrete'); if(mb){ const on=()=>(_apunteDoc&&_apunteDoc.conMembrete!==false); mb.classList.toggle('on', on());
    mb.onclick=()=>{ if(!_apunteDoc) return; _apunteDoc.conMembrete=!on(); apuntePersistNow(); mb.classList.toggle('on', _apunteDoc.conMembrete!==false);
      const mem=STATE.membrete||{}; toast(_apunteDoc.conMembrete?((mem.logo||(mem.pie||'').trim())?'Con membrete ✓':'Membrete ON (config. tu perfil primero)'):'Sin membrete'); }; }
  const rd=document.getElementById('leg-read'); if(rd) rd.onclick=()=>toggleEscritoRead();
  const fnd=document.getElementById('leg-find'); if(fnd) fnd.onclick=()=>findReplaceEscrito();
  const wrd=document.getElementById('leg-word'); if(wrd) wrd.onclick=()=>importWordToEscrito();
  const ud=document.getElementById('leg-undo'); if(ud) ud.onclick=()=>{ _safeEditCmd('undo', body()); apuntePersistNow(); };
  const rdo=document.getElementById('leg-redo'); if(rdo) rdo.onclick=()=>{ _safeEditCmd('redo', body()); apuntePersistNow(); };
  const pdf=document.getElementById('leg-pdf'); if(pdf) pdf.onclick=()=>{ apuntePersistNow(); printRedaccion(STATE.currentDocId); };
  const sv=document.getElementById('leg-save'); if(sv) sv.onclick=()=>{ apuntePersistNow(); printRedaccion(STATE.currentDocId,'share'); };
  const cpy=document.getElementById('leg-copy'); if(cpy) cpy.onclick=()=>{ const b=body(); if(!b)return; const t=b.innerText||''; if(navigator.clipboard){ navigator.clipboard.writeText(t).then(()=>toast('Texto copiado','success'),()=>toast('No se pudo copiar','error')); } };
  const tab=document.getElementById('leg-tab'); if(tab) tab.onclick=()=>{ _insertTabSpan(body(), (_apunteDoc&&_apunteDoc.fmt&&_apunteDoc.fmt.indent)||12.5); apuntePersistNow(); };
}
// ── Convertir apunte en libro (mantiene notas y marcadores; las notas pasan a 'del autor') ──
function convertApunteToLibro(id){
  const ap=APUNTES.find(x=>x.id===id); if(!ap){ toast('No es un apunte','error'); return; }
  apuntePersistNow();                       // guarda lo último escrito
  STATE.convertingApunteId=id; STATE.editingDocId=null;
  document.getElementById('modal-doc-title').textContent='Convertir apunte en libro';
  document.getElementById('fd-delete-btn').style.display='none';
  document.getElementById('fd-title').value=ap.title||'';
  document.getElementById('fd-author').value=ap.author||'';
  document.getElementById('fd-summary').value='';
  document.getElementById('fd-content').value=ap.content||''; richLoad();
  document.getElementById('fd-tags').value=(ap.tags||[]).join(', ');
  document.getElementById('fd-status').value='pending'; document.getElementById('fd-type').value='Texto'; document.getElementById('fd-pages').value='0';
  document.getElementById('fd-unlock-row').style.display = STATE.isAdmin?'':'none'; document.getElementById('fd-unlocked').checked=false;
  populateSubjectSelect('fd-subject'); populateRelatedSelect(null,[]);
  setupShareSection(null);
  openModal('modal-doc');
}

// mover la única barra superior entre la app y el lector (sin duplicar IDs)
function moveTopbarTo(where){
  const bar=document.getElementById('main-topbar'); if(!bar) return;
  if(where==='reader'){
    const rs=document.getElementById('reader-screen');
    const sub=rs.querySelector('.reader-topbar');
    if(sub && bar.nextSibling!==sub) rs.insertBefore(bar, sub);
  } else {
    const app=document.getElementById('app-screen');
    if(app.firstChild!==bar) app.insertBefore(bar, app.firstChild);
  }
}

// ── Renderizado del cuerpo del documento según tipo ──
async function renderDocBody(d) {
  const body = document.getElementById('reader-doc-body');
  try {
    if (d.hasFile && d.fileKind==='pdf')        await renderPdf(d, body);
    else if (d.hasFile && d.fileKind==='docx')  await renderDocx(d, body);
    else if (d.hasFile && d.fileKind==='image') await renderImage(d, body);
    else if (d.hasFile && d.fileKind==='doc')   await renderDownload(d, body);
    else                                        renderTextBody(d, body);
    applyReaderFont();
    renderNotes();
    if(!(d.hasFile && (d.fileKind==='pdf'||d.fileKind==='image'||d.fileKind==='doc'))) refreshDocMarks();
    const area = document.getElementById('reader-text');
    const sp = STATE.lastScroll[d.id]||0;
    mmResumePoint = sp;
    // Retomar DONDE QUEDASTE: varios reintentos (en móvil el contenido no está listo al instante)
    if (sp>20 && area){
      const base=(d.fileKind==='pdf')?900:60;
      const restore=()=>{ const a=document.getElementById('reader-text'); if(a && Math.abs(a.scrollTop-sp)>8) a.scrollTop=sp; };
      [base, base+250, base+600, base+1100].forEach(ms=>setTimeout(restore,ms));
      setTimeout(()=>{ if(document.getElementById('reader-text')) toast('📖 Retomando donde quedaste','success'); }, base+120);
    }
    setTimeout(buildMinimap, d.fileKind==='pdf'?950:80);
    setTimeout(renderBookmarks, d.fileKind==='pdf'?980:100);   // re-ubica los marcadores ya con el contenido renderizado
  } catch(err) {
    body.innerHTML = `<div style="color:var(--danger);font-size:13px">No se pudo mostrar el documento: ${err.message}</div>`;
  }
}

function renderTextBody(d, body) {
  const c = (d.content||'').trim();
  if(!c){ body.innerHTML = '<div style="color:var(--gray2);font-size:13px">Este documento aún no tiene contenido. Edítalo para escribir texto o sube un archivo (PDF, Word, imagen…).</div>'; return; }
  if(looksLikeHtml(c)){ body.innerHTML = c; }
  else if(d.fileKind==='md'){ body.innerHTML = mdToHtml(c); }
  else {
    const sents = c.split('. ');
    const paras = sents.reduce((acc,sent,i)=>{const idx=Math.floor(i/3);acc[idx]=(acc[idx]||'')+sent+(i===sents.length-1?'':'. ');return acc;},[]);
    body.innerHTML = paras.map(p=>`<p>${p}</p>`).join('');
  }
}

function mdToHtml(t){
  return t
    .replace(/^### (.*)$/gm,'<h3>$1</h3>')
    .replace(/^## (.*)$/gm,'<h2>$1</h2>')
    .replace(/^# (.*)$/gm,'<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^[-*] (.*)$/gm,'<li>$1</li>')
    .split(/\n{2,}/).map(b=>/^<(h\d|li)/.test(b.trim())?b:`<p>${b.replace(/\n/g,'<br>')}</p>`).join('');
}

let _pdfZoom=1, _pdfIO=null, _pdfDoc=null, _pdfCurD=null, _pdfW0=0, _pdfReW=null;
// Re-ajustar el PDF al ancho cuando cambia el tamaño de pantalla (girar el celular) — vuelve a "ajustado al ancho"
window.addEventListener('resize', ()=>{
  if(!document.getElementById('pdf-zoom') || !_pdfCurD) return;
  if(Math.abs(window.innerWidth-_pdfW0) < 30) return;   // solo cambios reales de ancho (rotación)
  _pdfW0=window.innerWidth; clearTimeout(_pdfReW);
  _pdfReW=setTimeout(()=>{ const b=document.getElementById('reader-doc-body'); if(b && _pdfCurD) renderPdf(_pdfCurD, b); }, 250);
});
async function renderPdf(d, body) {
  if(!window.pdfjsLib){ body.innerHTML='<div style="color:var(--gray2)">Cargando visor PDF…</div>'; await waitFor(()=>window.pdfjsLib); }
  body.innerHTML='<div style="color:var(--gray2)">Cargando archivo…</div>';
  const blob = await getFileBlob(d.id);
  if(!blob){ body.innerHTML='<div style="color:var(--gray2)">Archivo no encontrado.</div>'; return; }
  if(_pdfIO){ try{ _pdfIO.disconnect(); }catch(_){} _pdfIO=null; }   // limpia el observer anterior
  const pdf = await pdfjsLib.getDocument({data:await blob.arrayBuffer()}).promise;
  _pdfDoc=pdf;
  body.innerHTML = `<div style="font-size:11px;color:var(--gray2);margin-bottom:10px">📄 ${d.fileName||'PDF'} · ${pdf.numPages} páginas · pellizca/Aa para acercar</div>`;
  const zoom=document.createElement('div'); zoom.id='pdf-zoom'; body.appendChild(zoom);
  // Ancho REAL disponible (respetando el padding del contenedor) → la página se ajusta EXACTO al ancho, sin desbordar
  const contW = Math.max(220, (zoom.clientWidth || body.clientWidth || 700) - 2);
  _pdfZoom=1; _pdfCurD=d; _pdfW0=window.innerWidth;
  const dpr=Math.min(2, window.devicePixelRatio||1.5);
  // 1) Detección de escaneado con la 1ª página (rápido)
  let _scanLen=0;
  try{ const tc1=await (await pdf.getPage(1)).getTextContent(); _scanLen=(tc1.items||[]).reduce((a,it)=>a+((it.str||'').trim().length),0); }catch(_){}
  _docScanned = _scanLen < 8; showOcrBtn(_docScanned);
  // 2) Marcos de TODAS las páginas (con su tamaño), pero SIN dibujar aún
  const base1=(await pdf.getPage(1)).getViewport({scale:1});
  // Móvil: SIEMPRE al ancho de la pantalla. PC: al tamaño real sin agrandar de más.
  const fit0 = isMobile() ? (contW/base1.width) : Math.min(1, contW/base1.width);
  for(let i=1;i<=pdf.numPages;i++){
    const pageDiv=document.createElement('div'); pageDiv.className='pdf-page pdf-lazy'; pageDiv.dataset.page=i; pageDiv.dataset.dpr=dpr; pageDiv.dataset.contw=contW;
    // tamaño provisional con el fit de la 1ª página (se corrige al dibujar); evita reflow feo
    const fitW=Math.round(fit0*base1.width), fitH=Math.round(fit0*base1.height);
    pageDiv.dataset.fitw=fitW; pageDiv.dataset.fith=fitH; pageDiv.style.width=fitW+'px'; pageDiv.style.height=fitH+'px';
    zoom.appendChild(pageDiv);
  }
  // 3) Dibuja solo lo que entra en pantalla (y un poco antes/después)
  const root=document.getElementById('reader-text');
  _pdfIO=new IntersectionObserver((ents)=>{ ents.forEach(en=>{ if(en.isIntersecting) renderPdfPage(en.target); }); }, {root, rootMargin:'1000px 0px'});
  zoom.querySelectorAll('.pdf-page').forEach(p=>_pdfIO.observe(p));
  if(isMobile()) attachPdfZoom(body);
  setFontRowMode('pdf');   // los botones de abajo pasan a acercar/alejar
  setTimeout(updatePdfPageNum, 120);
}
async function renderPdfPage(pageDiv){
  if(!pageDiv || pageDiv.dataset.done==='1' || !_pdfDoc) return;
  pageDiv.dataset.done='1';   // evita doble render
  try{
    const i=+pageDiv.dataset.page, dpr=+pageDiv.dataset.dpr||1.5, contW=+pageDiv.dataset.contw||700;
    const page=await _pdfDoc.getPage(i);
    const base=page.getViewport({scale:1});
    const fit = isMobile() ? (contW/base.width) : Math.min(1, contW/base.width);
    const fitW=Math.round(fit*base.width), fitH=Math.round(fit*base.height);
    pageDiv.dataset.fitw=fitW; pageDiv.dataset.fith=fitH; pageDiv.style.width=Math.round(fitW*_pdfZoom)+'px'; pageDiv.style.height=Math.round(fitH*_pdfZoom)+'px';
    const vp=page.getViewport({scale:fit*dpr});
    const canvas=document.createElement('canvas'); canvas.width=vp.width; canvas.height=vp.height; canvas.style.width='100%'; canvas.style.height='100%';
    pageDiv.appendChild(canvas);
    await page.render({canvasContext:canvas.getContext('2d'), viewport:vp}).promise;
    const vpFit=page.getViewport({scale:fit});
    const tl=document.createElement('div'); tl.className='pdf-text-layer'; tl.style.width=fitW+'px'; tl.style.height=fitH+'px'; tl.style.setProperty('--scale-factor', fit);
    pageDiv.appendChild(tl);
    const tc=await page.getTextContent();
    await pdfjsLib.renderTextLayer({ textContentSource:tc, container:tl, viewport:vpFit, textDivs:[] }).promise;
    pageDiv.classList.remove('pdf-lazy');
  }catch(err){ console.warn('render página PDF', err); pageDiv.dataset.done=''; }
}
// Zoom del PDF manteniendo el punto focal (lo que tocas/el centro), no la esquina
function setPdfZoom(z, cx, cy){
  const rt=document.getElementById('reader-text'), zoomEl=document.getElementById('pdf-zoom'); if(!rt||!zoomEl) return;
  const old=_pdfZoom||1; z=Math.max(1, Math.min(4, z));
  const rect=rt.getBoundingClientRect();
  const px=(cx!=null?cx:rect.left+rect.width/2), py=(cy!=null?cy:rect.top+rect.height/2);   // punto focal en pantalla
  const contentX=px-rect.left+rt.scrollLeft, contentY=py-rect.top+rt.scrollTop;             // ese punto en el contenido
  const ratio=z/old; _pdfZoom=z;
  zoomEl.querySelectorAll('.pdf-page').forEach(p=>{ const fw=+p.dataset.fitw||300, fh=+p.dataset.fith||(fw*1.3); p.style.width=Math.round(fw*z)+'px'; p.style.height=Math.round(fh*z)+'px'; });
  rt.scrollLeft=contentX*ratio-(px-rect.left);   // deja el punto focal donde estaba
  rt.scrollTop =contentY*ratio-(py-rect.top);
  updatePdfPageNum();
}
// Pellizco para acercar (hacia el centro del pellizco) + doble toque
function attachPdfZoom(body){
  let d0=0, z0=1, lastTap=0, tapX=0, tapY=0;
  body.addEventListener('touchstart', e=>{
    if(e.touches.length===2){ d0=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); z0=_pdfZoom; }
    else if(e.touches.length===1){ const now=Date.now(); tapX=e.touches[0].clientX; tapY=e.touches[0].clientY; if(now-lastTap<300){ setPdfZoom(_pdfZoom>1?1:2.2, tapX, tapY); e.preventDefault(); } lastTap=now; }
  }, {passive:false});
  body.addEventListener('touchmove', e=>{
    if(e.touches.length===2 && d0){ const mx=(e.touches[0].clientX+e.touches[1].clientX)/2, my=(e.touches[0].clientY+e.touches[1].clientY)/2; const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); setPdfZoom(z0*(d/d0), mx, my); e.preventDefault(); }
  }, {passive:false});
}
// Número de página (como los lectores de PDF): muestra la página más visible
function updatePdfPageNum(){
  const rt=document.getElementById('reader-text'), badge=document.getElementById('pdf-pagenum'), zoomEl=document.getElementById('pdf-zoom');
  if(!rt||!badge||!zoomEl){ if(badge) badge.style.display='none'; return; }
  const pages=zoomEl.querySelectorAll('.pdf-page'); if(!pages.length){ badge.style.display='none'; return; }
  const mid=rt.getBoundingClientRect().top + rt.clientHeight*0.35;   // referencia: tercio superior del visor
  let cur=1, best=1e9;
  pages.forEach(p=>{ const r=p.getBoundingClientRect(); const d=Math.abs(r.top-mid); if(r.bottom>=mid-2 && d<best){ best=d; cur=+p.dataset.page||1; } });
  badge.textContent=cur+' / '+pages.length; badge.style.display='';
}

async function renderDocx(d, body) {
  if(!window.mammoth){ body.innerHTML='<div style="color:var(--gray2)">Cargando conversor Word…</div>'; await waitFor(()=>window.mammoth); }
  const blob = await getFileBlob(d.id);
  if(!blob){ body.innerHTML='<div style="color:var(--gray2)">Archivo no encontrado.</div>'; return; }
  const res = await mammoth.convertToHtml({arrayBuffer:await blob.arrayBuffer()});
  body.innerHTML = `<div class="docx-content">${res.value||'<p>(documento vacío)</p>'}</div>`;
}

async function renderImage(d, body) {
  const blob = await getFileBlob(d.id);
  if(!blob){ body.innerHTML='<div style="color:var(--gray2)">Archivo no encontrado.</div>'; return; }
  body.innerHTML = `<div style="text-align:center"><div class="ocr-host" style="position:relative;display:inline-block;max-width:100%"><img id="ocr-img" src="${URL.createObjectURL(blob)}" style="max-width:100%;border-radius:8px;display:block"></div></div>`;
  showOcrBtn(true);   // una imagen siempre puede necesitar OCR
}
// ── OCR (reconocer texto de imágenes/escaneados, como el "Texto en vivo" del iPhone) ──
let _docScanned=false;
function showOcrBtn(on){ const b=document.getElementById('btn-reader-ocr'); if(b){ b.style.display=on?'':'none'; b.disabled=false; b.textContent='🔍 Leer texto'; } }
async function _loadTesseract(){
  if(window.Tesseract) return true;
  await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js'; s.onload=res; s.onerror=rej; document.head.appendChild(s); });
  return !!window.Tesseract;
}
async function _ocrCanvasEnCapa(host, canvas, dispW, dispH){
  if(host.querySelector('.ocr-layer')) return 0;
  const { data } = await Tesseract.recognize(canvas, 'spa');
  const sx=dispW/canvas.width, sy=dispH/canvas.height;
  const layer=document.createElement('div'); layer.className='pdf-text-layer ocr-layer';
  layer.style.width=dispW+'px'; layer.style.height=dispH+'px';
  (data.words||[]).forEach(w=>{ const b=w.bbox; if(!b) return; const sp=document.createElement('span');
    sp.textContent=w.text+' ';
    sp.style.left=(b.x0*sx)+'px'; sp.style.top=(b.y0*sy)+'px';
    sp.style.fontSize=Math.max(6,(b.y1-b.y0)*sy)+'px'; sp.style.height=((b.y1-b.y0)*sy)+'px';
    layer.appendChild(sp); });
  host.appendChild(layer);
  return (data.words||[]).length;
}
async function ocrCurrentDoc(){
  const btn=document.getElementById('btn-reader-ocr');
  const body=document.getElementById('reader-doc-body'); if(!body) return;
  if(btn){ btn.disabled=true; btn.textContent='⏳ Cargando OCR…'; }
  if(!(await _loadTesseract())){ toast('No se pudo cargar el OCR','error'); showOcrBtn(true); return; }
  if(btn) btn.textContent='🔍 Leyendo…';
  let total=0;
  try{
    const pages=[...body.querySelectorAll('.pdf-page')];
    if(pages.length){   // PDF: OCR cada página sobre su canvas
      for(const pg of pages){ const cv=pg.querySelector('canvas'); if(cv) total+=await _ocrCanvasEnCapa(pg, cv, pg.offsetWidth, pg.offsetHeight); }
    } else {            // imagen: dibujo en un canvas y OCR
      const img=document.getElementById('ocr-img'), host=body.querySelector('.ocr-host');
      if(img && host){ const cv=document.createElement('canvas'); cv.width=img.naturalWidth; cv.height=img.naturalHeight; cv.getContext('2d').drawImage(img,0,0);
        total+=await _ocrCanvasEnCapa(host, cv, img.offsetWidth||img.naturalWidth, img.offsetHeight||img.naturalHeight); }
    }
  }catch(err){ console.warn('OCR', err); toast('El OCR falló','error'); showOcrBtn(true); return; }
  if(btn){ btn.disabled=false; btn.textContent='🔍 Leído ✓'; }
  toast(total?('Texto reconocido ('+total+' palabras) · ya puedes seleccionarlo'):'No se reconoció texto','success');
}

async function renderDownload(d, body) {
  const blob = await getFileBlob(d.id);
  const url = blob ? URL.createObjectURL(blob) : '#';
  body.innerHTML = `<div style="text-align:center;padding:40px 20px">
    <div style="font-size:42px">📎</div>
    <p style="margin:12px 0;color:var(--gray2)">El formato .doc antiguo no se puede previsualizar en el navegador.</p>
    <a href="${url}" download="${d.fileName||'documento'}" class="btn-gold" style="text-decoration:none">⬇ Descargar ${d.fileName||'archivo'}</a>
  </div>`;
}

function goToApp() { const doc=STATE.currentDocId; if(doc) syncSharedDocIfMine(doc); moveTopbarTo('app'); showScreen('app-screen'); closeTooltip(); const ov=document.getElementById('exp-overlay'); if(ov) ov.classList.remove('blurred'); const rs=document.getElementById('reader-screen'); rs.classList.remove('reader-pop','reader-full'); _clearReaderFloat(); _closeAllWins(); const bd=document.getElementById('reader-backdrop'); if(bd) bd.classList.remove('on'); _readerFull=false; }

// ════════════════════════════════════════
// ANOTACIONES TIPO POST-IT (sobre el contenido)
// ════════════════════════════════════════
const HL_COLORS = {gold:'201,168,76', blue:'96,165,250', green:'45,212,191', pink:'236,72,153', purple:'139,92,246', orange:'251,146,60'};
function annById(id){ return ANNOTATIONS.find(a=>a.id===id); }
function annColor(a){ return (a && a.color && HL_COLORS[a.color]) ? a.color : (a&&a.type==='duda'?'blue':a&&a.type==='ya-se'?'green':'gold'); }

// ════════════════════════════════════════
// MÓVIL — notas como círculos, hoja inferior, pinch, lista de mapa
// ════════════════════════════════════════
const isMobile = () => window.matchMedia('(max-width:760px)').matches;
function noteDotType(a){ return a && a.type ? a.type : 'importante'; }
// Círculo flotante y MOVIBLE (móvil) = el post-it del PC, colapsado.
// Tap = abrir/editar; arrastrar = mover. Vale para notas ancladas y sueltas.
function noteMaxX(){ const rt=document.getElementById('reader-text'); const w=rt?rt.clientWidth:360; return Math.max(0, w-34); }
function makeFloatingCircle(a){
  const dot=document.createElement('span');
  dot.className='note-dot note-dot-float note-dot-'+noteDotType(a)+(a.byAuthor?' note-author':'');
  dot.dataset.aid=a.id;
  dot.setAttribute('role','button');
  // limita la X al ancho de la pantalla para que el círculo no se salga ni genere scroll lateral
  a.x = Math.max(0, Math.min((typeof a.x==='number'?a.x:20), noteMaxX()));
  if(typeof a.y!=='number') a.y=20;
  dot.style.left=a.x+'px';
  dot.style.top =a.y+'px';
  let sx,sy,ox,oy,moved=false,drag=false;
  dot.addEventListener('pointerdown', e=>{
    drag=true; moved=false; sx=e.clientX; sy=e.clientY;
    ox=a.x; oy=a.y;
    try{ dot.setPointerCapture(e.pointerId); }catch(_){}
  });
  dot.addEventListener('pointermove', e=>{
    if(!drag) return;
    const dx=e.clientX-sx, dy=e.clientY-sy;
    if(!moved && (Math.abs(dx)>4||Math.abs(dy)>4)) moved=true;
    if(moved){
      a.x=Math.max(0,Math.min(ox+dx, noteMaxX())); a.y=Math.max(0,oy+dy);
      dot.style.left=a.x+'px'; dot.style.top=a.y+'px';
      drawAnchorLine(a, dot);     // línea punteada a la frase, solo al mover
    }
  });
  dot.addEventListener('pointerup', ()=>{
    if(!drag) return; drag=false;
    if(moved){ clearWire(); saveState(); }   // soltó tras mover → quita la línea y guarda
    else { handleCircleTap(a); }             // toque (simple = destacar frase · doble = abrir)
  });
  dot.addEventListener('pointercancel', ()=>{ drag=false; clearWire(); });
  return dot;
}
// Línea punteada del círculo a su frase (reutiliza el conector del PC)
function drawAnchorLine(a, dot){
  const m=document.querySelector(`#reader-doc-body .amark[data-aid="${a.id}"]`);
  if(m) drawWire(m, dot); else clearWire();
}
// Un toque = destacar la frase · doble toque = abrir la nota
let _lastTapId=null, _lastTapTime=0, _tapTimer=null;
function handleCircleTap(a){
  const now=Date.now();
  if(_lastTapId===a.id && (now-_lastTapTime)<300){
    clearTimeout(_tapTimer); _lastTapId=null; _lastTapTime=0;
    openNoteSheet(a.id);                       // doble toque → abre la nota
    return;
  }
  _lastTapId=a.id; _lastTapTime=now;
  clearTimeout(_tapTimer);
  _tapTimer=setTimeout(()=>{
    _lastTapId=null;
    const m=document.querySelector(`#reader-doc-body .amark[data-aid="${a.id}"]`);
    if(m) flashAnchor(a.id);                   // toque simple en nota anclada → destaca la frase
    else openNoteSheet(a.id);                  // nota suelta (sin frase) → abre directo
  }, 300);
}
// Hoja inferior (leer + editar)
let _sheetNoteId=null;
const NOTE_TYPES=[['importante','Importante','#C9A84C'],['duda','Duda','#60A5FA'],['ya-se','Ya lo sé','#2DD4BF']];
function openNoteSheet(id){
  const a=annById(id); if(!a) return;
  _sheetNoteId=id;
  const cur=noteDotType(a);
  const chips=NOTE_TYPES.map(([t,l,c])=>`<button class="ns-type ${t===cur?'on':''}" data-t="${t}" style="--c:${c}">${l}</button>`).join('');
  document.getElementById('note-sheet-body').innerHTML = `
    ${a.quote?`<div class="ns-quote">“${escapeHtml(a.quote)}”</div>`:''}
    <div class="ns-types">${chips}</div>
    <textarea id="ns-text" class="ns-edit" placeholder="Escribe tu nota…">${escapeHtml(a.text||'')}</textarea>
    <div class="ns-actions">
      <button class="btn-ghost" onclick="deleteNoteFromSheet()">🗑 Borrar</button>
      <button class="btn-gold" onclick="saveNoteFromSheet()">✓ Guardar</button>
    </div>`;
  document.querySelectorAll('#note-sheet-body .ns-type').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('#note-sheet-body .ns-type').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
  });
  document.getElementById('note-sheet-backdrop').classList.add('open');
  document.getElementById('note-sheet').classList.add('open');
  flashAnchor(id);   // resalta y salta a la frase de origen (si está anclada)
  if(!a.text){ setTimeout(()=>{ const ta=document.getElementById('ns-text'); if(ta) ta.focus(); },220); }
}
// Resalta temporalmente (parpadeo) la frase de la que viene la nota y hace scroll a ella
function flashAnchor(id){
  const m=document.querySelector(`#reader-doc-body .amark[data-aid="${id}"]`);
  if(!m) return;
  try{ m.scrollIntoView({block:'center', behavior:'smooth'}); }catch(e){ m.scrollIntoView(); }
  m.classList.add('amark-flash');
  // dibuja la línea punteada del círculo a la frase (tras asentar el scroll)
  const dot=document.querySelector(`.note-dot[data-aid="${id}"]`);
  if(dot){ setTimeout(()=>drawWire(m, dot), 360); }
  setTimeout(()=>{ m.classList.remove('amark-flash'); clearWire(); }, 2600);
}
function closeNoteSheet(){
  document.getElementById('note-sheet').classList.remove('open');
  document.getElementById('note-sheet-backdrop').classList.remove('open');
  _sheetNoteId=null;
}
function saveNoteFromSheet(){
  const a=annById(_sheetNoteId); if(!a){ closeNoteSheet(); return; }
  const ta=document.getElementById('ns-text');
  const sel=document.querySelector('#note-sheet-body .ns-type.on');
  if(sel){ a.type=sel.dataset.t; a.color = a.type==='duda'?'blue':a.type==='ya-se'?'green':'gold'; }
  const v=(ta?ta.value:'').trim();
  if(!v && !a.text){ deleteNote(a.id); closeNoteSheet(); return; }  // nota nueva vacía → se cancela
  a.text=v;
  saveState(); buildSearchIndex(); renderNotes(); refreshDocMarks();
  closeNoteSheet(); toast('Nota guardada','success');
}
function deleteNoteFromSheet(){
  const id=_sheetNoteId; if(!id){ closeNoteSheet(); return; }
  if(!confirm('¿Borrar esta nota?')) return;
  deleteNote(id); closeNoteSheet();
}

// Pinch en el lector → cambia SOLO el tamaño del texto
function setReaderFontPx(px){ STATE.readerFontPx=Math.max(11,Math.min(30,Math.round(px))); applyReaderFont(); }
function pinchDist(e){ const a=e.touches[0],b=e.touches[1]; return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY); }
let _pinch=null;
function initReaderPinch(){
  const rt=document.getElementById('reader-text'); if(!rt || rt._pinchInit) return; rt._pinchInit=true;
  rt.addEventListener('touchstart', e=>{ if(e.touches.length===2){ _pinch={d:pinchDist(e), base:STATE.readerFontPx}; } }, {passive:true});
  rt.addEventListener('touchmove', e=>{
    if(_pinch && e.touches.length===2){ e.preventDefault(); const d=pinchDist(e); if(_pinch.d>0) setReaderFontPx(_pinch.base*d/_pinch.d); }
  }, {passive:false});
  const end=()=>{ if(_pinch){ _pinch=null; saveState(); setTimeout(buildMinimap,30); } };
  rt.addEventListener('touchend', end); rt.addEventListener('touchcancel', end);

  // En móvil, al seleccionar texto sale la burbuja de notas (como en el PC),
  // además del menú de copiar/pegar de iOS.
  document.addEventListener('selectionchange', ()=>{
    if(!isMobile()) return;
    if(!document.getElementById('reader-screen').classList.contains('active')) return;
    clearTimeout(_selTimer);
    _selTimer=setTimeout(()=>{
      const sel=window.getSelection();
      if(sel && sel.rangeCount && sel.toString().trim().length>=3){
        let el=sel.anchorNode; if(el && el.nodeType===3) el=el.parentElement;
        if(el && el.closest && el.closest('#reader-doc-body')) onTextSelect();
      } else { closeTooltip(); }
    }, 420);
  });
}
let _selTimer=null;

// Mapa mental → lista táctil (móvil)
function renderMmMobileList(){
  const host=document.getElementById('mm-mobile-list'); if(!host) return;
  const SCOL={civil:'#3B82F6',penal:'#EF4444',procesal:'#8B5CF6',laboral:'#10B981',mercantil:'#F59E0B',const:'#EC4899',admin:'#06B6D4'};
  host.innerHTML = SUBJECTS.map(s=>{
    const docs=DOCUMENTS.filter(d=>d.subject===s.id);
    const color=s.color||SCOL[s.id]||'#888';
    const docsHtml = docs.length ? docs.map(d=>`
      <div class="mml-doc" onclick="openReader('${d.id}')">
        <span style="color:${color}">●</span>
        <span class="mml-doc-title">${escapeHtml(d.title)}</span>
        <span class="mml-doc-pct">${d.progress||0}%</span>
      </div>`).join('') : `<div class="mml-doc" style="opacity:.5">Sin documentos</div>`;
    return `<div class="mml-area">
      <div class="mml-area-head" onclick="this.parentNode.classList.toggle('open')">
        <span class="mml-ico">${s.icon||'📁'}</span>
        <span class="mml-name" style="color:${color}">${escapeHtml(s.name)}</span>
        <span class="mml-count">${docs.length} doc${docs.length===1?'':'s'}</span>
        <span class="mml-chev">›</span>
      </div>
      <div class="mml-docs">${docsHtml}</div>
    </div>`;
  }).join('');
}

// ── tamaño de texto (documento y notas) ──
function applyReaderFont(){ const b=document.getElementById('reader-doc-body'); if(b) b.style.fontSize=STATE.readerFontPx+'px';
  if(document.getElementById('bm-layer')) setTimeout(renderBookmarks,40);   // re-ubica los temas al cambiar el tamaño (el texto se re-acomoda)
}
function setFontRowMode(mode){ const r=document.getElementById('rf-doc-row'); if(!r) return;
  r.innerHTML = mode==='pdf'
    ? `<span title="Zoom del PDF">🔍</span><button onclick="changeReaderFont(-1)" title="Alejar">−</button><button onclick="changeReaderFont(1)" title="Acercar">+</button>`
    : `<span title="Tamaño de letra">📄</span><button onclick="changeReaderFont(-1)">A−</button><button onclick="changeReaderFont(1)">A+</button>`;
}
function changeReaderFont(d){
  if(document.getElementById('pdf-zoom')){ setPdfZoom((_pdfZoom||1) + d*0.2); toast('Zoom PDF: '+Math.round((_pdfZoom||1)*100)+'%'); return; }   // en PDF, los botones acercan/alejan
  STATE.readerFontPx=Math.max(11,Math.min(30,STATE.readerFontPx+d)); applyReaderFont(); saveState(); setTimeout(buildMinimap,30); toast('Texto del documento: '+STATE.readerFontPx+'px');
}
function changeNoteFont(d){ STATE.noteFontPx=Math.max(10,Math.min(22,STATE.noteFontPx+d)); renderNotes(); saveState(); toast('Texto de notas: '+STATE.noteFontPx+'px'); }

// ── selección de texto → tooltip ──
let lastSelectionText = '', lastSelRect = null, lastSelOcc = 0;
// Cuenta cuántas veces aparece la frase ANTES del inicio de la selección actual,
// para anclar la nota a la ocurrencia REAL que tocó el usuario (no a la primera del documento).
function occBeforeSelection(q){
  try{
    const body=document.getElementById('reader-doc-body');
    const sel=window.getSelection();
    if(!body||!sel||!sel.rangeCount||!q) return 0;
    const r=sel.getRangeAt(0);
    if(!body.contains(r.startContainer)) return 0;
    const pre=document.createRange(); pre.selectNodeContents(body); pre.setEnd(r.startContainer, r.startOffset);
    const before=pre.toString(); let n=0,i=0;
    while((i=before.indexOf(q,i))>=0){ n++; i+=q.length; }
    return n;
  }catch(e){ return 0; }
}
function onTextSelect(e) {
  if(_notesOff()){ closeTooltip(); return; }   // redactando: sin burbuja de notas
  const sel = window.getSelection();
  if(!sel || sel.toString().trim().length<3){ closeTooltip(); return; }
  lastSelectionText = sel.toString().trim();
  lastSelRect = sel.getRangeAt(0).getBoundingClientRect();
  lastSelOcc = occBeforeSelection(lastSelectionText);
  const b = document.getElementById('tooltip-bubble');
  b.innerHTML = readerBubbleHTML();                 // acciones según el contexto (causa vs estudio)
  b.classList.add('visible');                       // visible para poder medirlo
  const bw = b.offsetWidth || 170, bh = b.offsetHeight || 0;
  let left = lastSelRect.left + lastSelRect.width/2 - bw/2;
  // En móvil va DEBAJO (para no chocar con el menú de copiar de iOS); en PC, encima
  let top = isMobile() ? (lastSelRect.bottom + 12) : (lastSelRect.top - bh - 8);
  if(!isMobile() && top < 8) top = lastSelRect.bottom + 8;
  left = Math.max(8, Math.min(left, window.innerWidth  - bw - 8));
  top  = Math.max(8, Math.min(top,  window.innerHeight - bh - 8));
  b.style.left = left+'px';
  b.style.top  = top+'px';
}
function closeTooltip(){ document.getElementById('tooltip-bubble').classList.remove('visible'); }
// ── Burbuja de selección: acciones según el contexto (documento de causa vs estudio) ──
// Compareciente para la FICHA: solo nombre(s) + RUT (no toda la individualización)
function comparecienteBreve(e){
  if(!e) return '';
  const ids=(e.clienteIds&&e.clienteIds.length?e.clienteIds:(e.clienteId?[e.clienteId]:[]));
  const ps=ids.map(findCliente).filter(Boolean);
  if(!ps.length) return '';
  return ps.map(p=>`${escapeHtml(p.nombre||'—')}${p.rut?' ('+escapeHtml(p.rut)+')':''}`).join(', ');
}
function _readerCausaId(){ return (_readerCtx && _readerCtx!=='estudio') ? _readerCtx : null; }
function _ctxLabel(ctx){ if(!ctx||ctx==='estudio') return 'Estudio'; const e=EXPEDIENTES.find(x=>x.id===ctx); return e?('📁 '+(e.name||'Causa').slice(0,18)):'Causa'; }
function _annCtx(a){ return a.ctx || 'estudio'; }
// ¿esta nota se ve en el contexto actual? estudio = capa base (siempre); causa = solo en su causa
function _annVisible(a){ const c=_annCtx(a); return c==='estudio' || c===_readerCtx || _showAllNotes; }
// Notas por TIPO: del autor (compartido) vs propias — cada una se puede ocultar por separado
function _annKindVisible(a){ return a.byAuthor ? !STATE.hideAuthorNotes : !STATE.hideOwnNotes; }
function readerBubbleHTML(){
  const cau=_readerCausaId();
  const est = `<button class="tb-btn" onclick="addAnnotation('importante')">⭐ Importante</button>`
    + `<button class="tb-btn" onclick="addAnnotation('duda')">❓ Duda</button>`
    + `<button class="tb-btn" onclick="addAnnotation('ya-se')">✅ Ya lo sé</button>`
    + `<button class="tb-btn" onclick="flashcardFromSelection()">🃏 Flashcard</button>`
    + `<button class="tb-btn" onclick="markFromSelection()">🔖 Tema</button>`;
  const cauBtns = cau ? (`<div class="tb-sec">📋 De la causa</div>`
    + `<button class="tb-btn" onclick="personaFromSelection()">➕ Persona</button>`
    + `<button class="tb-btn" onclick="agendarFromSelection()">📅 Agendar</button>`
    + `<button class="tb-btn" onclick="datosCausaFromSelection()">⚖️ Datos de causa</button>`
    + `<div class="tb-sec">✨ Estudio</div>`) : '';
  return cauBtns + est + `<button class="tb-btn tb-x" onclick="closeTooltip()">✕</button>`;
}
function personaFromSelection(){
  const t=(lastSelectionText||'').trim(); closeTooltip(); if(t.length<4) return;
  _pegarExpId=_readerCausaId();
  const chunks=splitIndividualizaciones(t);
  const list=chunks.map(ch=>_indivAItem(parseIndividualizacion(ch)));
  if(list.length) openDetectados(_pegarExpId||null, list, false, {clientes:!!_pegarExpId});
}
function agendarFromSelection(){
  const t=(lastSelectionText||'').trim(); const cau=_readerCausaId(); closeTooltip();
  openEventEditor(cau||'', _detectFechaEnTexto(t), t.slice(0,90));
}
function datosCausaFromSelection(){
  const t=(lastSelectionText||'').trim(); const cau=_readerCausaId(); closeTooltip();
  const e=cau?EXPEDIENTES.find(x=>x.id===cau):null; if(!e){ toast('No es un documento de una causa','error'); return; }
  const llenos=applyCausaDataToFolder(e,[{text:t}]);
  if(llenos.length){ saveState(); toast('De la selección: '+llenos.join(', '),'success'); if(_curExp===cau) openExpediente(cau); }
  else toast('No encontré RIT/tribunal/carátula en la selección','error');
}
function _detectFechaEnTexto(t){
  let m=(t||'').match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/); if(m) return m[3]+'-'+String(+m[2]).padStart(2,'0')+'-'+String(+m[1]).padStart(2,'0');
  const f=_fechaLargaCL(t); if(f){ const p=f.split('/'); return p[2]+'-'+p[1]+'-'+p[0]; }
  return '';
}

// ── Menú por doble clic dentro del libro: agregar nota en el lugar del clic ──
let ctxPos=null, readerMenuInited=false;
// Devuelve un fragmento de texto (ancla) que está bajo el punto clicado, para anclar el tema al texto y no a una posición fija en píxeles
function _snippetAtPoint(clientX, clientY){
  try{
    let node=null, off=0;
    if(document.caretRangeFromPoint){ const r=document.caretRangeFromPoint(clientX,clientY); if(r){ node=r.startContainer; off=r.startOffset; } }
    else if(document.caretPositionFromPoint){ const p=document.caretPositionFromPoint(clientX,clientY); if(p){ node=p.offsetNode; off=p.offset; } }
    if(!node) return '';
    if(node.nodeType!==3){ // no es texto: busca el primer texto dentro
      const w=document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null); node=w.nextNode(); off=0; if(!node) return '';
    }
    const txt=node.nodeValue||''; let snip=txt.slice(off).replace(/\s+/g,' ').trim();
    if(snip.length<3){ snip=txt.replace(/\s+/g,' ').trim(); }   // cayó al final de la línea → toma la línea
    return snip.slice(0,90);
  }catch(_){ return ''; }
}
function initReaderMenu(){
  if(readerMenuInited) return; readerMenuInited=true;
  const rt=document.getElementById('reader-text'); if(!rt) return;
  // Abre el menú de notas (⭐/❓/✅) por DOBLE CLIC o CLIC DERECHO en el texto del libro
  const openMenu = e=>{
    if(_notesOff()) return;   // redactando un escrito: sin menú de notas (clic derecho normal)
    if(_readerIsMedia()) return;   // PDF/imagen: doble-tap = zoom y dos dedos = pinch, NO el menú de notas
    if(e.target.closest('.postit')||e.target.closest('.amark')||e.target.closest('.pi-edit')||e.target.closest('.note-dot')) return;
    if(e.type==='contextmenu') e.preventDefault();   // clic derecho: usamos NUESTRO menú, no el del navegador
    const rect=rt.getBoundingClientRect();
    const sel=window.getSelection(); let quote=sel?sel.toString().trim():'';
    // si el clic NO cayó sobre el texto (margen/espacio), no anclar y limpiar la selección
    if(quote && sel.rangeCount){
      const wr=sel.getRangeAt(0).getBoundingClientRect();
      const onText = e.clientX>=wr.left-1 && e.clientX<=wr.right+1 && e.clientY>=wr.top-1 && e.clientY<=wr.bottom+1;
      if(!onText){ quote=''; sel.removeAllRanges(); }
    }
    ctxPos={ x:Math.max(8, e.clientX-rect.left+rt.scrollLeft+6), y:Math.max(8, e.clientY-rect.top+rt.scrollTop+6), quote, occ: quote?occBeforeSelection(quote):0, caret:_snippetAtPoint(e.clientX,e.clientY) };
    closeTooltip();
    const m=document.getElementById('reader-ctxmenu');
    m.classList.add('visible');
    const mw=m.offsetWidth||190, mh=m.offsetHeight||180;
    m.style.left=Math.max(8, Math.min(e.clientX, window.innerWidth-mw-8))+'px';
    m.style.top =Math.max(8, Math.min(e.clientY, window.innerHeight-mh-8))+'px';
  };
  rt.addEventListener('dblclick', openMenu);
  rt.addEventListener('contextmenu', openMenu);
  // MÓVIL: tocar con DOS DEDOS = clic derecho → abre el menú de la app (marcar tema, nota…) en ese punto
  rt.addEventListener('touchstart', e=>{
    if(e.touches.length!==2) return;
    if(_readerIsMedia()) return;   // en PDF/imagen los dos dedos son para HACER ZOOM (pinch), no el menú
    const t1=e.touches[0], t2=e.touches[1];
    const cx=Math.round((t1.clientX+t2.clientX)/2), cy=Math.round((t1.clientY+t2.clientY)/2);
    const tgt=document.elementFromPoint(cx,cy)||rt;
    if(!tgt.closest||!tgt.closest('#reader-text')) return;
    e.preventDefault();
    try{ const s=window.getSelection&&window.getSelection(); if(s) s.removeAllRanges(); }catch(_){}
    openMenu({type:'contextmenu', clientX:cx, clientY:cy, target:tgt, preventDefault(){}});
  }, {passive:false});
  document.addEventListener('mousedown', e=>{ const m=document.getElementById('reader-ctxmenu'); if(m&&m.classList.contains('visible')&&!m.contains(e.target)) closeCtxMenu(); });
  document.addEventListener('touchstart', e=>{ const m=document.getElementById('reader-ctxmenu'); if(m&&m.classList.contains('visible')&&!m.contains(e.target)) closeCtxMenu(); }, {passive:true});
  rt.addEventListener('scroll', closeCtxMenu, {passive:true});
}
function closeCtxMenu(){ const m=document.getElementById('reader-ctxmenu'); if(m) m.classList.remove('visible'); }
// ¿el documento abierto es PDF/imagen/archivo (con su propio zoom por pinch/doble-tap)?
function _readerIsMedia(){ const d=findDoc(STATE.currentDocId); return !!(d && d.hasFile && (d.fileKind==='pdf'||d.fileKind==='image'||d.fileKind==='doc')); }
// Móvil: el botón ＋ del visor abre la MISMA lista de acciones que el doble clic en PC.
// La nota nace en la zona visible y se puede arrastrar (círculo movible).
function readerAddMenu(ev){
  ev&&ev.stopPropagation();
  const rt=document.getElementById('reader-text');
  // Ancla al TEXTO visible (arriba del área) para que el tema no se pierda al agrandar/achicar en el celular
  let caret=''; if(rt){ const r=rt.getBoundingClientRect(); caret=_snippetAtPoint(r.left+Math.min(40,r.width*0.15), r.top+26); }
  const sel=(window.getSelection&&window.getSelection().toString().trim())||'';
  ctxPos={ x:Math.max(20,(rt?rt.scrollLeft:0)+30), y:(rt?rt.scrollTop:0)+50, quote:sel, occ: sel?occBeforeSelection(sel):0, caret };
  const m=document.getElementById('reader-ctxmenu'); if(!m) return;
  if(m.classList.contains('visible')){ m.classList.remove('visible'); return; }
  m.classList.add('visible');
  const btn=(ev&&ev.currentTarget)||document.getElementById('rmob-add');
  const r=btn?btn.getBoundingClientRect():{left:innerWidth/2,bottom:56};
  const mw=m.offsetWidth||200, mh=m.offsetHeight||190;
  m.style.left=Math.max(8, Math.min(r.left-mw+40, window.innerWidth-mw-8))+'px';
  m.style.top =Math.max(8, Math.min((r.bottom||56)+6, window.innerHeight-mh-8))+'px';
}
function addNoteFromMenu(type){
  if(!ctxPos) return;
  const color = type==='duda'?'blue':type==='ya-se'?'green':'gold';
  createNote({type, color, quote:ctxPos.quote||'', x:ctxPos.x, y:ctxPos.y, anchored:!!ctxPos.quote, occ:ctxPos.occ||0});
  closeCtxMenu();
}

// ── crear notas ──
function addAnnotation(type){ // desde la selección (tooltip)
  const color = type==='duda'?'blue':type==='ya-se'?'green':'gold';
  const rt = document.getElementById('reader-text');
  let x=40, y=(rt?rt.scrollTop:0)+40;
  if(lastSelRect && rt){ const r=rt.getBoundingClientRect(); x=Math.max(8, lastSelRect.left-r.left+rt.scrollLeft+10); y=Math.max(8, lastSelRect.top-r.top+rt.scrollTop+10); }
  createNote({type, color, quote:lastSelectionText, x, y, anchored:true, occ:lastSelOcc||0});
  lastSelectionText=''; lastSelRect=null; lastSelOcc=0; closeTooltip();
}
function addFreeNote(){ const rt=document.getElementById('reader-text'); createNote({type:'importante', color:'gold', quote:'', x:40, y:(rt?rt.scrollTop:0)+40}); }
function createNote({type,color,quote,x,y,anchored,occ}){
  const ann={id:'a'+Date.now(), docId:STATE.currentDocId, text:'', type, color, quote:quote||'', x, y, date:'ahora', anchored:!!(anchored&&quote), occ:occ||0, ctx:_readerCtx||'estudio'};
  ANNOTATIONS.push(ann);
  const d=DOCUMENTS.find(x2=>x2.id===STATE.currentDocId); if(d) d.annCount++;
  STATE.notesHidden=false; document.getElementById('reader-screen').classList.remove('notes-hidden');
  saveState(); buildSearchIndex(); renderNotes(); refreshDocMarks();
  // en móvil, las ancladas se ubican junto a su frase (posición fiable, sin depender del scroll)
  if(isMobile() && anchored && quote){ setTimeout(()=>repositionNoteToAnchor(ann), 50); }
  if(isMobile()) openNoteSheet(ann.id);            // en móvil: edita en la hoja inferior
  else setTimeout(()=>editNote(ann.id), 30);       // en PC: edita en la tarjeta
}
// Coloca el círculo de una nota anclada junto a su frase, en coordenadas del contenido (no del scroll)
function repositionNoteToAnchor(ann){
  const m=document.querySelector(`#reader-doc-body .amark[data-aid="${ann.id}"]`);
  const rt=document.getElementById('reader-text');
  if(!m || !rt) return;
  let x=0,y=0,n=m;
  while(n && n!==rt){ x+=n.offsetLeft; y+=n.offsetTop; n=n.offsetParent; }
  ann.x=Math.max(0, Math.min(x, noteMaxX()));
  ann.y=Math.max(0, y+22);
  saveState(); renderNotes();
}

// ── render de post-it ──
function renderNotes(){
  const rt = document.getElementById('reader-text'); if(!rt) return;
  let layer = document.getElementById('notes-layer');
  if(!layer){ layer=document.createElement('div'); layer.id='notes-layer'; rt.appendChild(layer); }
  if(_notesOff()){ layer.innerHTML=''; const b=document.getElementById('btn-annotations'); if(b) b.textContent='💬 Notas'; return; }   // redactando: sin notas
  const anns = ANNOTATIONS.filter(a=>a.docId===STATE.currentDocId && _annVisible(a) && _annKindVisible(a));   // filtra por contexto (estudio/causa) y por tipo (autor/propias)
  layer.innerHTML='';
  const mob=isMobile();
  anns.forEach((a,i)=>{
    if(typeof a.x!=='number'){ a.x=30+(i%3)*60; a.y=30+i*46; }
    layer.appendChild(mob ? makeFloatingCircle(a) : makeNoteEl(a));   // móvil: círculo movible · PC: post-it
  });
  const btn=document.getElementById('btn-annotations'); if(btn) btn.textContent=`💬 Notas (${anns.length})`;
  // Botón "ver todas": aparece si hay notas de OTROS contextos ocultas
  const otras=ANNOTATIONS.filter(a=>a.docId===STATE.currentDocId && _annCtx(a)!=='estudio' && _annCtx(a)!==_readerCtx).length;
  const ab=document.getElementById('btn-reader-allnotes'); if(ab){ ab.style.display=otras?'':'none'; ab.textContent=_showAllNotes?'👁 Ocultar otras':`👁 Ver todas (${otras})`; }
  buildMinimap();
}
function applyNoteColor(el,a){
  const ghost = a.color==='transparent';
  el.classList.toggle('postit-ghost', ghost);
  el.style.background = ghost ? 'transparent' : `rgb(${HL_COLORS[annColor(a)]})`;
}
// Redimensionar una nota tirando de sus bordes/esquinas (guarda w/h en la anotación)
function _noteResize(el, a){
  ['n','s','e','w','ne','nw','se','sw'].forEach(d=>{ const h=document.createElement('div'); h.className='note-rz note-rz-'+d; h.dataset.dir=d; el.appendChild(h); });
  el.querySelectorAll('.note-rz').forEach(h=>{
    h.addEventListener('mousedown', e=>{ e.preventDefault(); e.stopPropagation();
      const dir=h.dataset.dir, r=el.getBoundingClientRect();
      const st={x:e.clientX,y:e.clientY,w:r.width,h:r.height,l:parseFloat(el.style.left)||0,t:parseFloat(el.style.top)||0}, MINW=120,MINH=64;
      const move=ev=>{ let w=st.w,ht=st.h,l=st.l,t=st.t; const dx=ev.clientX-st.x,dy=ev.clientY-st.y;
        if(dir.includes('e')) w=st.w+dx;
        if(dir.includes('s')) ht=st.h+dy;
        if(dir.includes('w')){ w=st.w-dx; l=st.l+dx; }
        if(dir.includes('n')){ ht=st.h-dy; t=st.t+dy; }
        if(w<MINW){ if(dir.includes('w')) l=st.l+(st.w-MINW); w=MINW; }
        if(ht<MINH){ if(dir.includes('n')) t=st.t+(st.h-MINH); ht=MINH; }
        el.style.width=w+'px'; el.style.height=ht+'px'; el.style.left=l+'px'; el.style.top=t+'px'; };
      const up=()=>{ document.removeEventListener('mousemove',move); document.removeEventListener('mouseup',up);
        a.w=Math.round(el.offsetWidth); a.h=Math.round(el.offsetHeight); a.x=Math.round(parseFloat(el.style.left)||0); a.y=Math.round(parseFloat(el.style.top)||0); a.updated=Date.now(); saveState(); };
      document.addEventListener('mousemove',move); document.addEventListener('mouseup',up);
    });
  });
}
function makeNoteEl(a){
  const el=document.createElement('div');
  const ro=!!a.readOnly;   // nota del autor/otro colega en un compartido: no la edito
  el.className='postit'+(a.byAuthor?' pi-author':'')+(ro?' pi-ro':''); el.dataset.aid=a.id;
  el.style.left=(a.x||20)+'px'; el.style.top=(a.y||20)+'px';
  if(a.w) el.style.width=a.w+'px'; if(a.h) el.style.height=a.h+'px';   // tamaño propio de la nota (redimensionable)
  applyNoteColor(el,a);
  el.style.fontSize=(STATE.noteFontPx||12)+'px';
  const foraneo = _annCtx(a)!==_readerCtx;   // nota de otro contexto (se ve por "ver todas")
  el.innerHTML=`
    <div class="pi-head"><span class="pi-drag">${ro?(a.by?'✍️ '+escapeHtml((a.by||'').split('@')[0]):'✍️ autor'):'⠿ mover'}</span>
      ${foraneo?`<span class="pi-ctx" title="Nota de ${escapeHtml(_ctxLabel(_annCtx(a)))}">${escapeHtml(_ctxLabel(_annCtx(a)))}</span>`:''}
      ${ro?'':'<span class="pi-actions"><button title="Editar" data-act="edit">✏</button><button title="Eliminar" data-act="del">🗑</button></span>'}</div>
    ${a.quote?`<div class="pi-quote">“${escapeHtml(a.quote.slice(0,60))}${a.quote.length>60?'…':''}”</div>`:''}
    <div class="pi-text">${a.text?escapeHtml(a.text):'<span style="opacity:.45">(escribe…)</span>'}</div>`;
  if(!ro){
    el.querySelector('[data-act="edit"]').onclick=()=>editNote(a.id);
    el.querySelector('[data-act="del"]').onclick=()=>deleteNote(a.id);
    el.querySelector('.pi-head').addEventListener('mousedown', e=>noteDown(e, a.id, el));
    el.querySelector('.pi-text').ondblclick=()=>editNote(a.id);
    _noteResize(el, a);   // redimensionar tirando de bordes/esquinas (guarda el tamaño)
  }
  // hover ficha → resalta y conecta con su texto
  if(a.anchored){
    el.addEventListener('mouseenter', ()=>{ const m=document.querySelector(`.amark[data-aid="${a.id}"]`); if(m){ m.classList.add('amark-hot'); drawWire(m, el); } });
    el.addEventListener('mouseleave', ()=>{ const m=document.querySelector(`.amark[data-aid="${a.id}"]`); if(m) m.classList.remove('amark-hot'); clearWire(); });
  }
  return el;
}
function editNote(id){
  const a=annById(id); if(!a) return;
  const el=document.querySelector(`.postit[data-aid="${id}"]`); if(!el) return;
  const colors=Object.keys(HL_COLORS).map(k=>`<span class="${a.color!=='transparent'&&annColor(a)===k?'on':''}" style="background:rgb(${HL_COLORS[k]})" data-col="${k}"></span>`).join('')
    +`<span class="pi-col-ghost ${a.color==='transparent'?'on':''}" data-col="transparent" title="Transparente (solo contorno)"></span>`;
  el.innerHTML=`
    <div class="pi-head"><span class="pi-drag">⠿</span>
      <span class="pi-actions"><button data-act="save" title="Guardar">✓</button><button data-act="del" title="Eliminar">🗑</button></span></div>
    ${a.quote?`<div class="pi-quote">“${escapeHtml(a.quote.slice(0,60))}${a.quote.length>60?'…':''}”</div>`:''}
    <textarea class="pi-edit" id="pie-${id}">${escapeHtml(a.text)}</textarea>
    <div class="pi-colors">${colors}</div>`;
  const saveBtn=el.querySelector('[data-act="save"]'), delBtn=el.querySelector('[data-act="del"]');
  saveBtn.onclick=()=>saveNote(id);
  delBtn.onclick=()=>deleteNote(id);
  // estos controles no deben quitar el foco antes de actuar (evita doble guardado)
  [saveBtn, delBtn].forEach(b=>b.addEventListener('mousedown', e=>e.preventDefault()));
  el.querySelector('.pi-head').addEventListener('mousedown', e=>noteDown(e,id,el));
  el.querySelectorAll('.pi-colors span').forEach(s=>{
    s.addEventListener('mousedown', e=>e.preventDefault());
    s.onclick=()=>{ a.color=s.dataset.col; applyNoteColor(el,a); saveState(); editNote(id); };
  });
  const ta=document.getElementById('pie-'+id); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
  // guardar también al hacer clic fuera de la nota
  ta.addEventListener('blur', ()=>{ if(document.getElementById('pie-'+id)) saveNote(id); });
}
function saveNote(id){
  const a=annById(id); if(!a) return;
  const ta=document.getElementById('pie-'+id); if(!ta) return; // ya guardada / no en edición
  const v=ta.value.trim();
  if(!v && !a.text){ deleteNote(id); return; } // nota vacía recién creada
  a.text=v;
  saveState(); buildSearchIndex(); renderNotes();
  toast('Nota guardada','success');
}
function deleteNote(id){
  const i=ANNOTATIONS.findIndex(x=>x.id===id);
  if(i>=0){ ANNOTATIONS.splice(i,1); const d=DOCUMENTS.find(x=>x.id===STATE.currentDocId); if(d&&d.annCount>0) d.annCount--; }
  clearWire(); // quitar la línea conectora si quedó dibujada
  saveState(); buildSearchIndex(); renderNotes(); refreshDocMarks();
}

// ── Fichas ancladas: subrayado punteado + línea conectora ──
function ungoldEl(root){ if(!root)return; root.querySelectorAll('span.gold-caps[data-auto="1"]').forEach(s=>{ if(s.style && s.style.color){ s.classList.remove('gold-caps'); s.removeAttribute('data-auto'); return; } const p=s.parentNode; while(s.firstChild)p.insertBefore(s.firstChild,s); p.removeChild(s);}); root.normalize&&root.normalize(); }
function anchorNotes(){
  const body=document.getElementById('reader-doc-body'); if(!body) return;
  body.querySelectorAll('.amark').forEach(s=>{const p=s.parentNode; while(s.firstChild)p.insertBefore(s.firstChild,s); p.removeChild(s);});
  body.normalize&&body.normalize();
  ANNOTATIONS.filter(a=>a.docId===STATE.currentDocId && a.anchored && a.quote && _annVisible(a)).forEach(a=>{
    const q=a.quote.trim(); if(!q) return;
    // localizar la ocurrencia número (a.occ) dentro del texto completo del documento
    const full=body.textContent; const want=a.occ||0;
    let idx=-1, from=0;
    for(let k=0;k<=want;k++){ idx=full.indexOf(q, from); if(idx<0) break; from=idx+q.length; }
    if(idx<0){ idx=full.indexOf(q); if(idx<0) return; }   // fallback: primera aparición
    // mapear ese índice de caracteres a nodo/offset reales
    const walker=document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null);
    let acc=0, node, sNode=null, sOff=0, eNode=null, eOff=0;
    while((node=walker.nextNode())){
      const len=node.nodeValue.length;
      if(!sNode && acc+len>idx){ sNode=node; sOff=idx-acc; }
      if(sNode && acc+len>=idx+q.length){ eNode=node; eOff=idx+q.length-acc; break; }
      acc+=len;
    }
    if(!sNode||!eNode) return;
    const range=document.createRange();
    try{ range.setStart(sNode, sOff); range.setEnd(eNode, eOff); }catch(e){ return; }
    const span=document.createElement('span'); span.className='amark amark-'+(a.type||'importante'); span.dataset.aid=a.id;
    try{ range.surroundContents(span); }catch(e){}   // si cruza nodos (raro), queda sin subrayar pero sin romper
  });
  wireAnchorHovers();
}
function wireAnchorHovers(){
  document.querySelectorAll('#reader-doc-body .amark').forEach(m=>{
    const id=m.dataset.aid;
    m.onmouseenter=()=>{ const note=document.querySelector(`.postit[data-aid="${id}"]`); if(note){ note.classList.add('note-hot'); drawWire(m, note); } };
    m.onmouseleave=()=>{ const note=document.querySelector(`.postit[data-aid="${id}"]`); if(note) note.classList.remove('note-hot'); clearWire(); };
    m.onclick=()=>{ // clic en el texto → abre/enfoca la ficha
      if(STATE.notesHidden){ STATE.notesHidden=false; document.getElementById('reader-screen').classList.remove('notes-hidden'); renderNotes(); refreshDocMarks(); }
      const note=document.querySelector(`.postit[data-aid="${id}"]`);
      if(note){ note.classList.add('note-hot'); note.scrollIntoView({block:'nearest'}); editNote(id); setTimeout(()=>note.classList.remove('note-hot'),1600); }
    };
  });
}
function anchorSvg(){ let s=document.getElementById('anchor-wire'); if(!s){ s=document.createElementNS('http://www.w3.org/2000/svg','svg'); s.id='anchor-wire'; s.setAttribute('style','position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:120'); document.body.appendChild(s);} return s; }
function drawWire(a,b){
  const s=anchorSvg(); s.innerHTML=''; if(!a||!b) return;
  const ra=a.getBoundingClientRect(), rb=b.getBoundingClientRect();
  if(!ra.width || !rb.width) return; // ficha oculta
  // elegir los lados más cercanos entre la frase (a) y la nota (b)
  let x1,x2;
  if(rb.left >= ra.right){ x1=ra.right; x2=rb.left; }        // nota a la derecha de la frase
  else if(rb.right <= ra.left){ x1=ra.left; x2=rb.right; }   // nota a la izquierda
  else { x1=ra.left+ra.width/2; x2=rb.left+rb.width/2; }     // solapadas → centros
  const y1=ra.top+ra.height/2, y2=rb.top+rb.height/2, mx=(x1+x2)/2;
  const p=document.createElementNS('http://www.w3.org/2000/svg','path');
  p.setAttribute('d',`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`);
  p.setAttribute('fill','none'); p.setAttribute('stroke','#c9a84c'); p.setAttribute('stroke-width','1.6'); p.setAttribute('stroke-dasharray','4 4');
  s.appendChild(p);
  [[x1,y1],[x2,y2]].forEach(([cx,cy])=>{ const c=document.createElementNS('http://www.w3.org/2000/svg','circle'); c.setAttribute('cx',cx); c.setAttribute('cy',cy); c.setAttribute('r','3'); c.setAttribute('fill','#c9a84c'); s.appendChild(c); });
}
function clearWire(){ const s=document.getElementById('anchor-wire'); if(s) s.innerHTML=''; }
function refreshDocMarks(){
  const body=document.getElementById('reader-doc-body'); if(!body) return;
  clearWire();      // sin líneas residuales
  ungoldEl(body);   // texto limpio para anclar bien
  anchorNotes();    // subrayado punteado + listeners (la frase queda subrayada)
  goldifyEl(body);  // MAYÚSCULAS en dorado
}
function toggleNotes(){   // el botón 💬 Notas ahora despliega dos interruptores: autor / propias
  openNotesMenu();
}
// Desplegable del botón de notas: mostrar/ocultar notas del AUTOR y notas PROPIAS por separado
function openNotesMenu(ev){
  ev&&ev.stopPropagation();
  let dd=document.getElementById('notes-dd');
  const closeDd=()=>{ dd.classList.remove('open'); dd.style.display='none'; const b=document.getElementById('btn-annotations'); if(b) b.classList.remove('active'); };
  if(dd && dd.classList.contains('open')){ closeDd(); return; }
  if(!dd){ dd=document.createElement('div'); dd.id='notes-dd'; document.body.appendChild(dd);
    dd.style.cssText='position:fixed;z-index:560;background:var(--navy2);border:1px solid rgba(201,168,76,.3);border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.55);padding:6px;display:none';
    // Cerrar al tocar CUALQUIER otra parte (pointerdown sirve para mouse Y táctil). Hay que ocultar con display Y quitar el resaltado del botón.
    document.addEventListener('pointerdown', e=>{ if(dd.classList.contains('open') && !e.target.closest('#notes-dd,#btn-annotations')) closeDd(); });
  }
  // aseguramos que la capa de notas no esté oculta por completo (modo antiguo)
  STATE.notesHidden=false; const rs=document.getElementById('reader-screen'); if(rs) rs.classList.remove('notes-hidden');
  const hasAuthor = ANNOTATIONS.some(a=>a.docId===STATE.currentDocId && a.byAuthor);
  const row=(label,checked,fn)=>`<label style="display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 12px;border-radius:8px;cursor:pointer;font-size:13.5px;color:var(--white)" onmouseover="this.style.background='rgba(201,168,76,.08)'" onmouseout="this.style.background='none'"><span>${label}</span><input type="checkbox" ${checked?'checked':''} onchange="${fn}" style="width:17px;height:17px;cursor:pointer"></label>`;
  dd.innerHTML=`<div style="font-size:11px;font-weight:700;color:var(--gold);padding:8px 12px 6px;letter-spacing:.3px">💬 QUÉ NOTAS MOSTRAR</div>`
    + (hasAuthor ? row('✍️ Del autor', !STATE.hideAuthorNotes, "setNotesKind('author',this.checked)") : '')
    + row('📝 Mías', !STATE.hideOwnNotes, "setNotesKind('own',this.checked)")
    + (hasAuthor ? '' : `<div style="font-size:11px;color:var(--gray2);padding:2px 12px 8px">Este libro no tiene notas del autor.</div>`);
  const btn=document.getElementById('btn-annotations'); const r=btn.getBoundingClientRect();
  const w=232; let left=Math.max(8,Math.min(r.left, window.innerWidth-w-8));
  dd.style.width=w+'px'; dd.style.left=left+'px'; dd.style.top=(r.bottom+6)+'px'; dd.style.display='block';
  dd.classList.add('open'); btn.classList.add('active');   // resaltado SOLO mientras el menú está abierto
}
function setNotesKind(which, show){
  if(which==='author') STATE.hideAuthorNotes=!show; else STATE.hideOwnNotes=!show;
  renderNotes(); try{refreshDocMarks();}catch(_){}
  saveState();
}
function toggleAllNotes(){ _showAllNotes=!_showAllNotes; renderNotes(); refreshDocMarks(); }

// ── arrastre de post-it ──
let noteDrag=null;
function noteDown(e,id,el){
  if(e.target.closest('.pi-actions')) return;
  e.preventDefault();
  const a=annById(id);
  noteDrag={id, el, sx:e.clientX, sy:e.clientY, ox:a.x||0, oy:a.y||0};
}
document.addEventListener('mousemove', e=>{
  if(!noteDrag) return;
  const a=annById(noteDrag.id); if(!a){ noteDrag=null; return; }
  a.x=Math.max(0, noteDrag.ox+(e.clientX-noteDrag.sx));
  a.y=Math.max(0, noteDrag.oy+(e.clientY-noteDrag.sy));
  noteDrag.el.style.left=a.x+'px'; noteDrag.el.style.top=a.y+'px';
  // línea punteada a la frase mientras se arrastra (igual que en el celular)
  const m=document.querySelector(`#reader-doc-body .amark[data-aid="${noteDrag.id}"]`);
  if(m) drawWire(m, noteDrag.el); else clearWire();
});
document.addEventListener('mouseup', ()=>{ if(noteDrag){ clearWire(); saveState(); noteDrag=null; } });

// ── MARCADORES DE TEMA (bookmarks) — líneas horizontales en el texto ──
function renderBookmarks() {
  const rt = document.getElementById('reader-text');
  const bms = STATE.bookmarks[STATE.currentDocId] || [];
  // lista rápida (chips arriba)
  const el = document.getElementById('reader-bookmarks');
  if(el){
    el.innerHTML = bms.length
      ? '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">'+
        bms.map((b,i)=>`<span class="reader-tag" style="cursor:pointer" onclick="gotoBookmark(${i})">🔖 ${escapeHtml(b.label)}</span>`).join('')+'</div>'
      : '';
  }
  // líneas SOBRE la frase marcada — se reubican según el texto (sirve en PC, iPad y celular)
  if(rt){
    let layer=document.getElementById('bm-layer');
    if(!layer){ layer=document.createElement('div'); layer.id='bm-layer'; rt.appendChild(layer); }
    layer.innerHTML = bms.map((b,i)=>{
      const q = b.quote || (/^Tema \d+$/.test(b.label||'') ? '' : (b.label||''));
      const loc = q ? bmLocate(q) : null;
      let posCss;
      if(loc){ posCss=`left:${Math.round(loc.left)}px;width:${Math.max(28,Math.round(loc.width))}px;right:auto;top:${Math.round(Math.max(0,loc.top-12))}px`; }
      else if(typeof b.w==='number' && b.w>8){ posCss=`left:${b.x}px;width:${b.w}px;right:auto;top:${Math.max(0,b.pos-12)}px`; }
      else { posCss=`left:0;right:0;top:${Math.max(0,b.pos-12)}px`; }
      return `<div class="bm-line" style="${posCss}" onclick="openBookmarkEditor(${i})"><span class="bm-label">🔖 ${escapeHtml(b.label)}</span></div>`;
    }).join('');
  }
  buildMinimap();
}
// Localiza una frase en el contenido del lector y devuelve su posición (coords del contenido)
function bmLocate(quote){
  const rt=document.getElementById('reader-text'); const cont=document.getElementById('reader-doc-body')||rt;
  if(!rt||!cont||!quote) return null;
  const q=String(quote).trim().replace(/\s+/g,' '); if(q.length<2) return null;
  const walker=document.createTreeWalker(cont, NodeFilter.SHOW_TEXT, null);
  const nodes=[]; let full='';
  while(walker.nextNode()){ const n=walker.currentNode; nodes.push({node:n,start:full.length}); full+=n.nodeValue; }
  if(!full) return null;
  let rx; try{ rx=new RegExp(q.slice(0,80).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+')); }catch(e){ return null; }
  const m=rx.exec(full); if(!m) return null;
  const find=idx=>{ for(let k=nodes.length-1;k>=0;k--){ if(nodes[k].start<=idx) return {node:nodes[k].node, off:Math.min(idx-nodes[k].start, nodes[k].node.nodeValue.length)}; } return null; };
  const a=find(m.index), e=find(m.index+m[0].length); if(!a||!e) return null;
  const range=document.createRange();
  try{ range.setStart(a.node,a.off); range.setEnd(e.node,e.off); }catch(err){ return null; }
  const rects=range.getClientRects(); if(!rects.length) return null;
  const r0=rects[0], rb=rt.getBoundingClientRect();
  return { top:r0.top-rb.top+rt.scrollTop, left:r0.left-rb.left+rt.scrollLeft, width:r0.width };
}
function addBookmark() { // botón general: marca la posición actual
  const area = document.getElementById('reader-text'); if(!area) return;
  const list = STATE.bookmarks[STATE.currentDocId] || (STATE.bookmarks[STATE.currentDocId]=[]);
  list.push({pos:Math.round(area.scrollTop), label:'Tema '+(list.length+1)});
  saveState(); renderBookmarks(); openBookmarkEditor(list.length-1);
}
// Salta a un tema: prioriza la posición REAL del texto anclado (robusto al zoom), y si no, la posición guardada
function _bmScrollTop(b){ if(b&&b.quote){ const loc=bmLocate(b.quote); if(loc) return Math.max(0, loc.top-40); } return b?b.pos:0; }
function gotoBookmark(i) { const b=(STATE.bookmarks[STATE.currentDocId]||[])[i]; if(b) document.getElementById('reader-text').scrollTo({top:_bmScrollTop(b), behavior:'smooth'}); }
function delBookmark(i) { const a=STATE.bookmarks[STATE.currentDocId]||[]; a.splice(i,1); saveState(); renderBookmarks(); }
function addBookmarkAt(pos){
  const list = STATE.bookmarks[STATE.currentDocId] || (STATE.bookmarks[STATE.currentDocId]=[]);
  list.push({pos:Math.round(pos), label:'Tema '+(list.length+1)});
  saveState(); renderBookmarks(); openBookmarkEditor(list.length-1);
}
// Marcar tema desde el clic derecho (en el lugar clicado), pidiendo el nombre si no hay selección
function markFromMenu(){
  const rt=document.getElementById('reader-text'); if(!rt){ closeCtxMenu(); return; }
  const sel=(lastSelectionText||'').trim();
  const label=(sel || (prompt('Nombre del tema para el índice:')||'')).trim().slice(0,60);
  if(!label){ closeCtxMenu(); return; }
  const pos = ctxPos ? Math.round(Math.max(0,ctxPos.y)) : Math.round(rt.scrollTop);
  // Ancla al TEXTO: la selección, o el texto que estaba bajo el clic derecho. Así el tema no se corre al agrandar/achicar la letra.
  const quote = (sel || (ctxPos&&ctxPos.caret) || '').slice(0,120);
  const list = STATE.bookmarks[STATE.currentDocId] || (STATE.bookmarks[STATE.currentDocId]=[]);
  list.push({pos, x:0, w:0, label, quote});
  lastSelectionText=''; lastSelRect=null; closeCtxMenu();
  saveState(); renderBookmarks(); toast('Tema marcado en el índice','success');
}
function markFromSelection(){
  const rt=document.getElementById('reader-text'); if(!rt) return;
  let pos = rt.scrollTop, x=0, w=0;
  if(lastSelRect){ const r=rt.getBoundingClientRect(); pos=lastSelRect.top-r.top+rt.scrollTop; x=lastSelRect.left-r.left+rt.scrollLeft; w=lastSelRect.width; }
  const list = STATE.bookmarks[STATE.currentDocId] || (STATE.bookmarks[STATE.currentDocId]=[]);
  const quote = (lastSelectionText||'').trim().slice(0,120);
  const label = (lastSelectionText||'Tema '+(list.length+1)).trim().slice(0,60);
  closeTooltip();
  list.push({pos:Math.round(Math.max(0,pos)), x:Math.round(Math.max(0,x)), w:Math.round(w), label, quote});
  lastSelectionText=''; lastSelRect=null;
  saveState(); renderBookmarks(); toast('Tema marcado','success');
}
// Editor de marcador (popup, como las notas)
let _bmEdit=-1;
function openBookmarkEditor(i){
  const list=STATE.bookmarks[STATE.currentDocId]||[]; const b=list[i]; if(!b) return;
  _bmEdit=i;
  document.getElementById('fbm-label').value=b.label||'';
  openModal('modal-bookmark');
  setTimeout(()=>{ const inp=document.getElementById('fbm-label'); if(inp){ inp.focus(); inp.select(); } },100);
}
function saveBookmarkEdit(){
  const list=STATE.bookmarks[STATE.currentDocId]||[]; const b=list[_bmEdit]; if(!b){ closeAllModals(); return; }
  const v=document.getElementById('fbm-label').value.trim();
  if(!v){ deleteBookmarkEdit(); return; }
  b.label=v; closeAllModals(); saveState(); renderBookmarks(); toast('Marcador guardado','success');
}
function deleteBookmarkEdit(){
  const list=STATE.bookmarks[STATE.currentDocId]||[]; if(_bmEdit>=0 && list[_bmEdit]) list.splice(_bmEdit,1);
  _bmEdit=-1; closeAllModals(); saveState(); renderBookmarks(); toast('Marcador borrado');
}
function gotoBookmarkEdit(){ const list=STATE.bookmarks[STATE.currentDocId]||[]; const b=list[_bmEdit]; closeAllModals(); if(b) document.getElementById('reader-text').scrollTo({top:_bmScrollTop(b), behavior:'smooth'}); }

// ── ÍNDICE DE TEMAS (desplegable bajo el botón) ──
function openIndex(anchorId){
  const dd=document.getElementById('index-dd');
  if(dd.parentElement!==document.body) document.body.appendChild(dd);   // sacarlo de #app-screen para que NO quede detrás del lector
  if(dd.classList.contains('open')){ closeIndex(); return; }
  renderIndex();
  dd.classList.remove('sheet');
  // Siempre se despliega DESDE el botón hacia abajo (en móvil y PC). Si el botón está oculto, cae al 📑 móvil.
  let btn=document.getElementById(anchorId||'btn-index');
  if(!btn || btn.offsetParent===null) btn=document.getElementById('rmob-index')||document.getElementById('btn-index');
  const r=btn?btn.getBoundingClientRect():{left:innerWidth-16,right:innerWidth-8,top:8,bottom:52};
  const w=Math.min(300, window.innerWidth-16);
  let left=Math.max(8, Math.min(r.right-w, window.innerWidth-w-8));
  let top=r.bottom+6; if(top+280>window.innerHeight) top=Math.max(8, r.top-286);   // si no cabe abajo, hacia arriba
  dd.style.width=w+'px'; dd.style.left=left+'px'; dd.style.top=top+'px';
  dd.classList.add('open');
}
function closeIndex(){ const dd=document.getElementById('index-dd'); if(dd) dd.classList.remove('open'); }
function renderIndex(){
  const el=document.getElementById('index-list'); if(!el) return;
  const list=STATE.bookmarks[STATE.currentDocId]||[];
  const head=document.getElementById('index-head'); if(head) head.textContent='📑 Índice de temas'+(list.length?' ('+list.length+')':'');
  if(!list.length){
    el.innerHTML='<div style="padding:18px 6px;color:var(--gray2);font-size:13px;text-align:center">Aún no marcas temas.<br><br>Selecciona el título de un tema en el libro y toca <b>“🔖 Marcar tema”</b>.</div>';
    return;
  }
  // ordenados por posición, conservando su índice real
  const rows=list.map((b,i)=>({b,i})).sort((a,z)=>a.b.pos-z.b.pos);
  el.innerHTML=rows.map(({b,i})=>`
    <div class="idx-row">
      <span class="idx-name" onclick="jumpIndex(${i})">🔖 ${escapeHtml(b.label)}</span>
      <button class="idx-btn" title="Renombrar" onclick="renameIndex(${i})">✏</button>
      <button class="idx-btn del" title="Borrar" onclick="deleteIndexItem(${i})">🗑</button>
    </div>`).join('');
}
function jumpIndex(i){ const b=(STATE.bookmarks[STATE.currentDocId]||[])[i]; closeIndex(); if(b) document.getElementById('reader-text').scrollTo({top:_bmScrollTop(b), behavior:'smooth'}); }
function renameIndex(i){ closeIndex(); openBookmarkEditor(i); }
function deleteIndexItem(i){
  const a=STATE.bookmarks[STATE.currentDocId]||[]; if(!a[i]) return;
  if(!confirm('¿Borrar el tema “'+a[i].label+'”?')) return;
  a.splice(i,1); saveState(); renderBookmarks(); renderIndex();
}

// ── MINIMAPA del documento (texto real, redimensionable) ──
let mmResumePoint = 0, mmScale = 1, mmOffset = 0, mmSh = 1;
// Ocultar/mostrar el visualizador lateral (útil en horizontal / iPad). Se recuerda.
let _mmUserToggled=false;   // si el usuario abrió/cerró el visualizador a mano en esta apertura
function toggleMinimap(){
  const rs=document.getElementById('reader-screen'); if(!rs) return;
  const collapsed=rs.classList.toggle('mm-collapsed');
  STATE.mmCollapsed=collapsed; _mmUserToggled=true; saveState();
  if(!collapsed) setTimeout(buildMinimap,30);
}
function applyMinimapState(){
  const rs=document.getElementById('reader-screen'); if(!rs) return;
  // En pop-up y flotante el visualizador va OCULTO por defecto (más espacio para leer; se reabre con ⟨).
  // En pantalla completa se respeta la preferencia guardada. Si el usuario lo tocó a mano, mandamos su elección.
  const popOrFloat = rs.classList.contains('reader-pop') || rs.classList.contains('reader-float');
  const collapse = (popOrFloat && !_mmUserToggled) ? true : !!STATE.mmCollapsed;
  rs.classList.toggle('mm-collapsed', collapse);
}
function mmTip(txt, y){
  const tip=document.getElementById('rmm-tip'); if(!tip) return;
  if(txt==null){ tip.classList.remove('on'); return; }
  const mm=document.getElementById('reader-minimap'); const r=mm.getBoundingClientRect();
  tip.textContent=txt; tip.style.top=(y - r.top - 12)+'px'; tip.classList.add('on');
}
function buildMinimap(){
  applyMinimapState();   // recuerda si el visualizador estaba oculto
  const mm=document.getElementById('reader-minimap');
  const area=document.getElementById('reader-text');
  const wrap=document.getElementById('rmm-thumb-wrap');
  const scroll=document.getElementById('rmm-scroll');
  const thumb=document.getElementById('rmm-thumb');
  if(!mm||!area||!wrap||!scroll||!thumb) return;
  const sh=area.scrollHeight||1;
  mm.style.display = (sh > area.clientHeight + 12) ? '' : 'none';
  if(mm.style.display==='none') return;
  // 1) clonar el texto real, a escala
  const cw=area.clientWidth||1;
  const s=(wrap.clientWidth||1)/cw;
  mmScale=s; mmSh=sh;
  thumb.className='rmm-thumb reader-text-area';
  thumb.style.width=cw+'px'; thumb.style.boxSizing='border-box';
  thumb.style.transform='scale('+s+')';
  thumb.innerHTML=area.innerHTML;
  const nl=thumb.querySelector('#notes-layer'); if(nl) nl.remove();
  thumb.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
  thumb.querySelectorAll('canvas').forEach(c=>{ if(!c.style.height) c.style.minHeight='380px'; });
  // 2) capas/marcas (en coordenadas del contenido * escala)
  scroll.querySelectorAll('.rmm-section,.rmm-note,.rmm-bm,.rmm-last').forEach(e=>e.remove());
  const Y=pos=>Math.max(0,Math.min(sh,pos))*s;
  area.querySelectorAll('.reader-heading, #reader-doc-body h1, #reader-doc-body h2, #reader-doc-body h3').forEach(h=>{
    const d=document.createElement('div'); d.className='rmm-section'; d.style.top=Y(h.offsetTop)+'px';
    const txt=h.textContent.trim().slice(0,60);
    d.onmouseenter=e=>mmTip('§ '+txt, e.clientY); d.onmouseleave=()=>mmTip(null);
    d.onclick=e=>{ e.stopPropagation(); area.scrollTo({top:Math.max(0,h.offsetTop-40),behavior:'smooth'}); };
    scroll.appendChild(d);
  });
  ANNOTATIONS.filter(a=>a.docId===STATE.currentDocId).forEach(a=>{
    const d=document.createElement('div'); d.className='rmm-note'; d.style.top=Y(a.y||0)+'px';
    d.style.background=`rgb(${HL_COLORS[annColor(a)]})`;
    const lbl=(a.type==='duda'?'❓ ':a.type==='ya-se'?'✅ ':'⭐ ')+((a.text||a.quote||'nota').slice(0,50));
    d.onmouseenter=e=>mmTip(lbl, e.clientY); d.onmouseleave=()=>mmTip(null);
    d.onclick=e=>{ e.stopPropagation(); area.scrollTo({top:Math.max(0,(a.y||0)-60),behavior:'smooth'}); };
    scroll.appendChild(d);
  });
  (STATE.bookmarks[STATE.currentDocId]||[]).forEach((b,i)=>{
    const d=document.createElement('div'); d.className='rmm-bm'; d.style.top=Y(b.pos)+'px';
    d.onmouseenter=e=>mmTip('🔖 '+b.label, e.clientY); d.onmouseleave=()=>mmTip(null);
    d.onclick=e=>{ e.stopPropagation(); openBookmarkEditor(i); };   // mismo popup que en el texto
    scroll.appendChild(d);
  });
  if(mmResumePoint>0){ const d=document.createElement('div'); d.className='rmm-last'; d.style.top=Y(mmResumePoint)+'px'; scroll.appendChild(d); }
  updateMinimapViewport();
}
function updateMinimapViewport(){
  const area=document.getElementById('reader-text');
  const wrap=document.getElementById('rmm-thumb-wrap');
  const scroll=document.getElementById('rmm-scroll');
  const vp=document.getElementById('rmm-viewport');
  const read=document.getElementById('rmm-read');
  if(!area||!wrap||!scroll||!vp) return;
  const sh=area.scrollHeight||1;
  const s=(wrap.clientWidth||1)/(area.clientWidth||1);
  mmScale=s; mmSh=sh;
  const thumb=document.getElementById('rmm-thumb');   // auto-corrige la escala (evita que quede invisible/congelada)
  if(thumb) thumb.style.transform='scale('+s+')';
  const visualH=sh*s, availH=wrap.clientHeight;
  const offset = visualH<=availH ? 0 : Math.max(0, Math.min(visualH-availH, area.scrollTop*s + (area.clientHeight*s)/2 - availH/2));
  mmOffset=offset;
  scroll.style.transform='translateY('+(-offset)+'px)';
  vp.style.top=(area.scrollTop*s)+'px';
  vp.style.height=Math.max(14, area.clientHeight*s)+'px';
  if(read) read.style.height=((area.scrollTop+area.clientHeight)*s)+'px';
}
let mmInited=false, mmVpDrag=null, mmRez=null, mmDrag=null, mmSuppressClick=false, mmTouch=null;
function initMinimap(){
  if(mmInited) return; mmInited=true;
  const mm=document.getElementById('reader-minimap');
  const wrap=document.getElementById('rmm-thumb-wrap');
  const vp=document.getElementById('rmm-viewport');
  const rez=document.getElementById('rmm-resizer');
  if(!mm||!wrap||!vp) return;
  if(STATE.mmWidth){ mm.style.flex='0 0 '+STATE.mmWidth+'px'; mm.style.width=STATE.mmWidth+'px'; } // ancho guardado, una sola vez
  const posFromEvent=e=>{ const r=wrap.getBoundingClientRect(); return ((e.clientY-r.top)+mmOffset)/mmScale; };
  let mmClickT=null;
  wrap.addEventListener('click', e=>{
    if(mmSuppressClick){ mmSuppressClick=false; return; }   // veníamos de arrastrar
    if(e.target.closest('.rmm-bm,.rmm-note,.rmm-section,.rmm-viewport')) return;
    const pos=posFromEvent(e); clearTimeout(mmClickT);
    mmClickT=setTimeout(()=>{ const area=document.getElementById('reader-text'); area.scrollTo({top:pos-area.clientHeight/2, behavior:'smooth'}); }, 230);
  });
  // Rueda del mouse sobre el minimapa → desplaza el texto del libro
  wrap.addEventListener('wheel', e=>{ e.preventDefault(); document.getElementById('reader-text').scrollTop += e.deltaY; }, {passive:false});
  // Arrastrar el minimapa (en cualquier parte) → desplaza el texto
  wrap.addEventListener('mousedown', e=>{
    if(e.target.closest('.rmm-bm,.rmm-note,.rmm-section,.rmm-viewport,.rmm-add,.rmm-resizer')) return;
    mmDrag={sy:e.clientY, sTop:document.getElementById('reader-text').scrollTop, moved:false};
  });
  // Táctil: arrastrar el minimapa mueve el texto (si el minimapa está visible)
  wrap.addEventListener('touchstart', e=>{ if(e.touches.length!==1) return; mmTouch={sy:e.touches[0].clientY, sTop:document.getElementById('reader-text').scrollTop, moved:false}; }, {passive:true});
  wrap.addEventListener('touchmove', e=>{
    if(!mmTouch) return; const dy=e.touches[0].clientY-mmTouch.sy;
    if(Math.abs(dy)>3) mmTouch.moved=true;
    if(mmTouch.moved){ e.preventDefault(); document.getElementById('reader-text').scrollTop = mmTouch.sTop + dy/mmScale; }
  }, {passive:false});
  wrap.addEventListener('touchend', ()=>{ mmTouch=null; });
  // El minimap ya NO marca temas (marcar un tema es solo por clic derecho en el texto). Doble clic aquí solo salta.
  wrap.addEventListener('dblclick', e=>{
    if(e.target.closest('.rmm-bm,.rmm-viewport')) return;
    clearTimeout(mmClickT); const area=document.getElementById('reader-text'); if(area) area.scrollTo({top:posFromEvent(e)-area.clientHeight/2, behavior:'smooth'});
  });
  // (el botón 📑 del minimap abre el índice; se cablea en el HTML con openIndex)
  // arrastrar el viewport para leer
  vp.addEventListener('mousedown', e=>{ e.preventDefault(); e.stopPropagation(); mmVpDrag={sy:e.clientY, sTop:document.getElementById('reader-text').scrollTop}; });
  // redimensionar la columna
  if(rez) rez.addEventListener('mousedown', e=>{ e.preventDefault(); mmRez={sx:e.clientX, sw:mm.clientWidth}; rez.classList.add('drag'); document.body.style.cursor='ew-resize'; });
  window.addEventListener('mousemove', e=>{
    if(mmVpDrag){ const area=document.getElementById('reader-text'); area.scrollTop = mmVpDrag.sTop + (e.clientY-mmVpDrag.sy)/mmScale; }
    if(mmDrag){ const dy=e.clientY-mmDrag.sy; if(Math.abs(dy)>3) mmDrag.moved=true; if(mmDrag.moved){ const area=document.getElementById('reader-text'); area.scrollTop = mmDrag.sTop + dy/mmScale; } }
    if(mmRez){ const w=Math.max(90, Math.min(680, mmRez.sw + (mmRez.sx - e.clientX))); mm.style.flex='0 0 '+w+'px'; mm.style.width=w+'px'; updateMinimapViewport(); }
  });
  window.addEventListener('mouseup', ()=>{
    mmVpDrag=null;
    if(mmDrag){ if(mmDrag.moved) mmSuppressClick=true; mmDrag=null; }   // si arrastró, no saltar
    if(mmRez){ STATE.mmWidth=mm.clientWidth; saveState(); mmRez=null; if(rez) rez.classList.remove('drag'); document.body.style.cursor=''; buildMinimap(); }
  });
  window.addEventListener('resize', ()=>{ if(document.getElementById('reader-screen').classList.contains('active')) buildMinimap(); });
}
function markDone(){
  const btn=event.target;
  btn.textContent='✅ Sección marcada';
  btn.style.background='rgba(45,212,191,.1)';
  btn.style.borderColor='var(--success)';
  btn.style.color='var(--success)';
}

// ════════════════════════════════════════
// SEARCH
// ════════════════════════════════════════
function buildSearchIndex() {
  STATE.searchIndex = [];
  SUBJECTS.forEach(s => {
    STATE.searchIndex.push({type:'subject',id:s.id,title:s.name,body:s.desc+' '+s.name,icon:s.icon,subject:s});
  });
  DOCUMENTS.forEach(d => {
    const s = SUBJECTS.find(x=>x.id===d.subject);
    STATE.searchIndex.push({type:'doc',id:d.id,title:d.title,body:d.title+' '+d.summary+' '+(d.tags||[]).join(' '),icon:'📄',subject:s,doc:d});
    STATE.searchIndex.push({type:'content',id:d.id,title:d.title,body:stripHtml(d.content)+' '+(d.pdfText||''),icon:'📝',subject:s,doc:d});
  });
  APUNTES.forEach(a => {
    STATE.searchIndex.push({type:'doc',id:a.id,title:a.title||'Apunte',body:(a.title||'')+' '+stripHtml(a.content),icon:'📝',subject:null,doc:a});
  });
  DOCUMENTOS.forEach(a => {
    STATE.searchIndex.push({type:'doc',id:a.id,title:a.title||'Documento',body:(a.title||'')+' '+(a.fileName||''),icon:'📄',subject:null,doc:a});
  });
  ANNOTATIONS.forEach(a => {
    const d = findDoc(a.docId);
    const s = d?SUBJECTS.find(x=>x.id===d.subject):null;
    STATE.searchIndex.push({type:'annotation',id:a.id,title:d?d.title:'Anotación',body:a.text,icon:a.type==='importante'?'⭐':a.type==='duda'?'❓':'✅',subject:s,doc:d,ann:a});
  });
  // Oficina: causas, clientes y documentos redactados
  EXPEDIENTES.forEach(e => {
    const cli=findCliente(e.clienteId);
    STATE.searchIndex.push({type:'causa', id:e.id, title:e.name||'Causa', icon:'📁',
      body:[e.name,e.rit,e.ruc,e.rol,e.tribunal,e.materia,e.estado,e.contraparte,e.carpeta,cli&&cli.nombre,cli&&cli.rut].filter(Boolean).join(' ')});
  });
  CLIENTES.forEach(c => {
    STATE.searchIndex.push({type:'cliente', id:c.id, title:c.nombre||'Cliente', icon:c.tipo==='juridica'?'🏢':'👤',
      body:[c.nombre,c.rut,c.profesion,c.giro,c.correo,c.domicilio].filter(Boolean).join(' ')});
  });
  EXDOCS.forEach(x => { if(x.kind!=='exescrito') return; const e=EXPEDIENTES.find(p=>p.id===x.expediente);
    STATE.searchIndex.push({type:'exdoc', id:x.id, title:x.title||'Documento', icon:'📄',
      body:[x.title, e&&e.name, stripHtml(x.content)].filter(Boolean).join(' ')});
  });
}

function highlight(text, q) {
  const snippet = getSnippet(text, q);
  return snippet.replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi'), '<mark>$1</mark>');
}

function getSnippet(text, q) {
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if(idx===-1) return text.slice(0,100)+'…';
  const start = Math.max(0, idx-40);
  const end = Math.min(text.length, idx+q.length+80);
  return (start>0?'…':'')+text.slice(start,end)+(end<text.length?'…':'');
}

let searchResultsData = [];
function readSearchFilters(){
  return {
    subject: document.getElementById('sf-subject')?.value || '',
    type: document.getElementById('sf-type')?.value || '',
    status: document.getElementById('sf-status')?.value || '',
  };
}
function showTagCloud(){
  const counts={};
  DOCUMENTS.forEach(d=>(d.tags||[]).forEach(t=>counts[t]=(counts[t]||0)+1));
  const tags=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const el=document.getElementById('search-results');
  if(!tags.length){ el.innerHTML='<div class="search-empty"><div>🔍</div><p>Escribe para buscar en toda la biblioteca</p></div>'; return; }
  el.innerHTML='<div class="search-group-label">🏷️ Tags · clic para filtrar</div><div class="tag-cloud">'+
    tags.map(([t,c])=>`<span class="tag-chip" onclick="searchByTag(&quot;${t.replace(/"/g,'')}&quot;)">${t} <b>${c}</b></span>`).join('')+'</div>';
}
function searchByTag(t){ document.getElementById('search-input').value=t; doSearch(t); }

function doSearch(q) {
  STATE.activeSearchResult = -1;
  const query = (q||'').trim().toLowerCase();
  const f = readSearchFilters();
  const hasFilter = f.subject || f.type || f.status;
  if (!query && !hasFilter) { showTagCloud(); return; }
  const groups = {causa:[], cliente:[], exdoc:[], subject:[], doc:[], content:[], annotation:[]};
  const seen = new Set();
  STATE.searchIndex.forEach(item => {
    if (query && !item.body.toLowerCase().includes(query)) return;
    if (f.subject && (item.subject?.id)!==f.subject) return;
    if (f.type && (item.doc?.type)!==f.type) return;
    if (f.status && (item.doc?.status)!==f.status) return;
    const key = item.type+'-'+item.id;
    if (seen.has(key)) return;
    seen.add(key);
    if(groups[item.type]) groups[item.type].push(item);
  });

  searchResultsData = [...groups.causa, ...groups.cliente, ...groups.exdoc, ...groups.subject, ...groups.doc, ...groups.content, ...groups.annotation];

  let html = '';
  if (groups.causa.length) {
    html += `<div class="search-group-label">📁 Causas (${groups.causa.length})</div>`;
    html += groups.causa.slice(0,6).map(item => searchResultHTML(item, query, searchResultsData.indexOf(item))).join('');
  }
  if (groups.cliente.length) {
    html += `<div class="search-group-label">👥 Personas (${groups.cliente.length})</div>`;
    html += groups.cliente.slice(0,6).map(item => searchResultHTML(item, query, searchResultsData.indexOf(item))).join('');
  }
  if (groups.exdoc.length) {
    html += `<div class="search-group-label">📄 Documentos redactados (${groups.exdoc.length})</div>`;
    html += groups.exdoc.slice(0,5).map(item => searchResultHTML(item, query, searchResultsData.indexOf(item))).join('');
  }
  if (groups.subject.length) {
    html += `<div class="search-group-label">📁 Materias (${groups.subject.length})</div>`;
    html += groups.subject.slice(0,3).map((item,i) => searchResultHTML(item, query, searchResultsData.indexOf(item))).join('');
  }
  if (groups.doc.length) {
    html += `<div class="search-group-label">📄 Documentos (${groups.doc.length})</div>`;
    html += groups.doc.slice(0,5).map(item => searchResultHTML(item, query, searchResultsData.indexOf(item))).join('');
  }
  if (groups.content.length) {
    html += `<div class="search-group-label">📝 Contenido (${groups.content.length})</div>`;
    html += groups.content.slice(0,4).map(item => searchResultHTML(item, query, searchResultsData.indexOf(item))).join('');
  }
  if (groups.annotation.length) {
    html += `<div class="search-group-label">💬 Anotaciones (${groups.annotation.length})</div>`;
    html += groups.annotation.slice(0,4).map(item => searchResultHTML(item, query, searchResultsData.indexOf(item))).join('');
  }
  if (!html) html = `<div class="search-empty"><div>😕</div><p>Sin resultados para "<b>${q}</b>"</p></div>`;
  document.getElementById('search-results').innerHTML = html;
}

function searchResultHTML(item, query, idx) {
  const snippet = highlight(item.body, query);
  const subBadge = item.subject ? `<span class="sr-badge" style="background:${item.subject.color}20;color:${item.subject.color}">${item.subject.icon} ${item.subject.name}</span>` : '';
  return `<div class="search-result" data-idx="${idx}" onclick="openSearchResult(${idx})">
    <div class="sr-icon">${item.icon}</div>
    <div class="sr-body">
      <div class="sr-title">${item.title}</div>
      <div class="sr-snippet">${snippet}</div>
      ${subBadge}
    </div>
  </div>`;
}

function openSearchResult(idx) {
  const item = searchResultsData[idx];
  if (!item) return;
  closeSearch();
  if (item.type==='causa') {
    openExpediente(item.id);
  } else if (item.type==='cliente') {
    verCliente(item.id);
  } else if (item.type==='exdoc') {
    openExdoc(item.id);
  } else if (item.type==='subject') {
    filterFolders('all',null);
    openFolderDocs(item.id);
    switchView('grid', document.querySelectorAll('.view-btn')[2]);
  } else if (item.type==='doc'||item.type==='content') {
    openReader(item.id);
  } else if (item.type==='annotation') {
    openReader(item.doc.id);
  }
}

function searchKeyNav(e) {
  const results = document.querySelectorAll('.search-result');
  if (e.key==='ArrowDown') { STATE.activeSearchResult=Math.min(STATE.activeSearchResult+1,results.length-1); updateActiveResult(results); }
  else if (e.key==='ArrowUp') { STATE.activeSearchResult=Math.max(STATE.activeSearchResult-1,0); updateActiveResult(results); }
  else if (e.key==='Enter' && STATE.activeSearchResult>=0) { openSearchResult(STATE.activeSearchResult); }
  else if (e.key==='Escape') closeSearch();
}
function updateActiveResult(results) {
  results.forEach((r,i)=>r.classList.toggle('active-result',i===STATE.activeSearchResult));
  if(results[STATE.activeSearchResult]) results[STATE.activeSearchResult].scrollIntoView({block:'nearest'});
}

function openSearch() {
  buildSearchIndex();   // datos frescos (causas, clientes, documentos)
  const sf = document.getElementById('sf-subject');
  if(sf) sf.innerHTML = '<option value="">Toda materia</option>'+SUBJECTS.map(s=>`<option value="${s.id}">${s.icon} ${s.name}</option>`).join('');
  document.getElementById('search-overlay').classList.add('open');
  showTagCloud();
  setTimeout(()=>document.getElementById('search-input').focus(),50);
}
function closeSearch() {
  document.getElementById('search-overlay').classList.remove('open');
  document.getElementById('search-input').value='';
  ['sf-subject','sf-type','sf-status'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
  document.getElementById('search-results').innerHTML='<div class="search-empty"><div>🔍</div><p>Escribe para buscar en toda la biblioteca</p></div>';
}
function closeSearchOutside(e) { if(e.target===document.getElementById('search-overlay')) closeSearch(); }

// ════════════════════════════════════════
