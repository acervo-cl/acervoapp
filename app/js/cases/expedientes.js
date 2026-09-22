const EXP_FIELDS=['name','rit','ruc','rol','tribunal','contraparte','tipo','materia','estado','abogado','cuantia','plazo','carpeta','obs'];
// La carpeta muestra los archivos y las DEMANDAS; los escritos redactados viven solo en el Historial.
function expDocs(exId){ return EXDOCS.filter(x=>x.expediente===exId && !(x.kind==='exescrito'&&x.redactado&&x.tipoDoc!=='demanda')); }
// Etiqueta a mostrar de una causa: carátula si existe; si no, el RIT/rol (dinámico); si tampoco, "Sin caratular"
function setExpView(v){ STATE.expView=v; saveState(); renderExpedientes(); }
let _expTipoMigrated=false;
function migrateExpTipo(){
  if(_expTipoMigrated) return; _expTipoMigrated=true;
  const areas=new Set(materias().map(m=>(m||'').toLowerCase()));
  let ch=false;
  EXPEDIENTES.forEach(e=>{ if(!e.tipo && e.materia && areas.has((e.materia||'').toLowerCase())){ e.tipo=e.materia; e.materia=''; ch=true; } });
  if(ch){ try{ saveState(); }catch(_){} }
}
// ── Selección múltiple de causas para compartir en lote ──
let _expSelMode=false; const _expSel=new Set();
function toggleExpSel(){ _expSelMode=!_expSelMode; _expSel.clear(); renderExpedientes(); }
function selectAllExp(){
  const items=expVisibleList();
  if(!items.length){ toast('No hay trabajos para seleccionar','error'); return; }
  _expSelMode=true;
  _expSel.clear();
  items.forEach(e=>_expSel.add(e.id));
  renderExpedientes();
}
// Menú ⋯ de la cabecera de Causas (móvil): importar, vistas y, si estás seleccionando, las acciones
function causaHeadMenu(ev){
  ev&&ev.stopPropagation();
  const items=[{head:'Causas'}];
  if(_expSelMode){
    items.push({icon:'⧉', label:`Duplicar seleccionadas (${_expSel.size})`, onclick:()=>dupExpSelected()});
    items.push({icon:'✍️', label:`Redactar escrito para (${_expSel.size})`, onclick:()=>{ if(_expSel.size) openMasivoFromCausas(); else toast('Selecciona al menos una','error'); }});
    items.push({icon:'🤝', label:`Compartir seleccionadas (${_expSel.size})`, onclick:()=>{ if(_expSel.size) openBulkShareCausas(); else toast('Selecciona al menos una','error'); }});
    items.push({icon:'✕', label:'Salir de selección', onclick:()=>toggleExpSel()});
    items.push({sep:true});
  }
  items.push({icon:'⬆', label:'Importar tabla', onclick:()=>openImportCausas()});
  items.push({sep:true});
  items.push({icon:'✋', label:'Vista libre', onclick:()=>setExpView('libre')});
  items.push({icon:'🗂️', label:'Vista grilla', onclick:()=>setExpView('grid')});
  items.push({icon:'☰', label:'Vista lista', onclick:()=>setExpView('list')});
  showCtx(ev, items);
}
function toggleExpSelOne(id){ if(_expSel.has(id)) _expSel.delete(id); else _expSel.add(id); renderExpedientes(); }
function expSelBar(){ if(!_expSelMode) return ''; return `<div class="exp-selbar"><span>${_expSel.size} seleccionada(s)</span><span style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn-ghost" onclick="selectAllExp()">☑ Seleccionar todo</button><button class="btn-ghost" onclick="toggleExpSel()">Cancelar</button><button class="btn-ghost" ${_expSel.size?'':'disabled'} onclick="dupExpSelected()">⧉ Duplicar (${_expSel.size})</button><button class="btn-ghost" ${_expSel.size?'':'disabled'} onclick="openMasivoFromCausas()">✍️ Redactar (${_expSel.size})</button><button class="btn-gold" ${_expSel.size?'':'disabled'} onclick="openBulkShareCausas()">🤝 Compartir (${_expSel.size})</button></span></div>`; }
// Duplica las carpetas seleccionadas (copia los datos de la carpeta con "(copia)"; los documentos no se copian)
function dupExpSelected(){
  const ids=[..._expSel]; if(!ids.length){ toast('Selecciona al menos una','error'); return; }
  let n=0;
  ids.forEach(id=>{
    const e=EXPEDIENTES.find(x=>x.id===id); if(!e || e.shared) return;   // no duplicar las que te compartieron
    const c=JSON.parse(JSON.stringify(e));
    c.id='ex'+Date.now()+Math.floor(Math.random()*100000)+n;
    c.name=(e.name||'Carpeta')+' (copia)';
    c.created=Date.now(); c.updated=Date.now();
    delete c.shared; delete c.myRole; delete c.sharedOwner;
    EXPEDIENTES.push(c); n++;
  });
  if(!n){ toast('No se pudo duplicar (¿son compartidas?)','error'); return; }
  saveState(); renderExpedientes(); toast(n+' carpeta(s) duplicada(s) ⧉','success'); toggleExpSel();
}
function openBulkShareCausas(){
  if(!_expSel.size){ toast('Marca al menos una causa','error'); return; }
  if(typeof sb==='undefined'||!sb){ toast('Necesitas sesión en la nube','error'); return; }
  (async()=>{
    if(!STATE.profiles||!STATE.profiles.length){ try{ const {data}=await sb.from('profiles').select('id,email').order('email'); STATE.profiles=data||[]; }catch(_){} }
    const others=(STATE.profiles||[]).filter(p=>p.id!==STATE.uid);
    document.getElementById('import-body').innerHTML=`<div class="modal-title">🤝 Compartir ${_expSel.size} causa(s)</div>
      <div style="font-size:12px;color:var(--gray2);margin-bottom:10px">Elige a un colega y su rol; se aplica a todas las causas marcadas.</div>
      <div class="form-row"><label class="form-label">Colega (por correo)</label><select class="form-select" id="bulk-user">${others.length?others.map(p=>`<option value="${p.id}">${escapeHtml(p.email||'')}</option>`).join(''):'<option value="">(no hay otros usuarios)</option>'}</select></div>
      <div class="form-row"><label class="form-label">Rol</label><select class="form-select" id="bulk-role"><option value="editor">editor</option><option value="viewer">lector</option></select></div>
      <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" onclick="doBulkShareCausas()">Compartir</button></div>`;
    openModal('modal-import');
  })();
}
async function doBulkShareCausas(){
  const uid=(document.getElementById('bulk-user')||{}).value; const role=(document.getElementById('bulk-role')||{}).value||'viewer';
  if(!uid){ toast('Elige un colega','error'); return; }
  const email=((STATE.profiles||[]).find(p=>p.id===uid)||{}).email||'';
  const ids=[..._expSel]; let ok=0; toast('Compartiendo…');
  for(const id of ids){
    const good=await pushSharedCausa(id); if(!good) continue;
    try{ await sb.from('shared_causa_members').upsert({causa_id:id, user_id:STATE.uid, email:STATE.user||'', role:'owner'}); }catch(_){}
    try{ await sb.from('shared_causa_members').upsert({causa_id:id, user_id:uid, email, role}); }catch(_){}
    _sharedCausaIds.add(id); pushCausaFiles(id); ok++;
  }
  closeAllModals(); _expSelMode=false; _expSel.clear(); renderExpedientes();
  toast(ok+' causa(s) compartida(s) con '+(email||'el colega'),'success');
}
let _expFilter='todas';   // todas | causas | prep | asuntos
let _expQuery='', _expSort='recent';
function expFilterOk(e){
  if(_expFilter==='causas')  return e.kind!=='asunto' && !e.prep;
  if(_expFilter==='prep')    return !!e.prep;
  if(_expFilter==='asuntos') return e.kind==='asunto';
  return true;
}
function expQueryOk(e){
  const q=(_expQuery||'').trim().toLowerCase(); if(!q) return true;
  return [e.name,e.rit,e.ruc,e.rol,e.tribunal,e.contraparte,e.tipo,e.materia,e.estado,e.abogado,e.cuantia,e.plazo,e.carpeta,e.obs].filter(Boolean).join(' ').toLowerCase().includes(q);
}
function expVisibleList(){
  const list=EXPEDIENTES.filter(e=>expFilterOk(e)&&expQueryOk(e));
  if(_expSort==='name') list.sort((a,b)=>(causaLabel(a)||'').localeCompare(causaLabel(b)||''));
  else if(_expSort==='status') list.sort((a,b)=>(a.estado||'').localeCompare(b.estado||'')||(b.updated||0)-(a.updated||0));
  else if(_expSort==='type') list.sort((a,b)=>(a.tipo||a.materia||'').localeCompare(b.tipo||b.materia||'')||(b.updated||0)-(a.updated||0));
  else if(_expSort==='deadline') list.sort((a,b)=>(a.plazo||'').localeCompare(b.plazo||'')||(b.updated||0)-(a.updated||0));
  else list.sort((a,b)=>(b.updated||b.created||0)-(a.updated||a.created||0));
  return list;
}
function setExpFilter(f){ _expFilter=f; renderExpedientes(); }
function setExpQuery(value){ _expQuery=value||''; renderExpedientes(); }
function setExpSort(value){ _expSort=value||'recent'; renderExpedientes(); }
function expFilterBar(){
  const n=f=>EXPEDIENTES.filter(e=>{ const byType=f==='causas'?(e.kind!=='asunto'&&!e.prep):f==='prep'?!!e.prep:f==='asuntos'?e.kind==='asunto':true; return byType&&expQueryOk(e); }).length;
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">`+
    [['todas','Todas'],['causas','📁 Causas'],['prep','📝 En preparación'],['asuntos','📑 Asuntos']]
      .map(([k,l])=>`<button class="btn-ghost ${_expFilter===k?'on':''}" style="font-size:12px;${_expFilter===k?'color:var(--gold);border-color:rgba(201,168,76,.4)':''}" onclick="setExpFilter('${k}')">${l} <span style="opacity:.6">${n(k)}</span></button>`).join('')+`</div>`;
}
function renderExpedientes(){
  migrateExpTipo();
  closeExpediente();
  const host=document.getElementById('exp-list'); if(!host) return; host.style.display='';
  const pv=document.getElementById('exp-preview'); if(pv){ pv.innerHTML=_EXP_PREV_PLACEHOLDER; pv.classList.remove('show'); }   // ficha: placeholder hasta seleccionar
  const vb=document.getElementById('expv-libre'), gb=document.getElementById('expv-grid'), lb=document.getElementById('expv-list');
  if(vb) vb.classList.toggle('on',STATE.expView==='libre');
  if(gb) gb.classList.toggle('on',STATE.expView==='grid');
  if(lb) lb.classList.toggle('on',STATE.expView==='list');
  if(!EXPEDIENTES.length){ host.innerHTML='<div class="favs-empty"><div>📁</div><p>Aún no tienes carpetas.<br>Crea una con "＋ Nueva carpeta" y elige el tipo.<br><span style="font-size:11px;opacity:.7">(doble clic para abrir una carpeta)</span></p></div>'; return; }
  const list=expVisibleList();
  if(_expSelMode){ const visible=new Set(list.map(e=>e.id)); _expSel.forEach(id=>{ if(!visible.has(id)) _expSel.delete(id); }); }
  if(!list.length){ host.innerHTML=expFilterBar()+expSelBar()+'<div class="favs-empty"><div>🔎</div><p>No hay trabajos que coincidan con el filtro actual.</p></div>'; return; }
  if(STATE.expView==='list'){
    if(isMobile()){
      host.innerHTML=expSelBar()+list.map(e=>{ const n=expDocs(e.id).length; const cli=findCliente(e.clienteId); const shared=e.shared||_sharedCausaIds.has(e.id); const on=_expSel.has(e.id);
        const clk=_expSelMode?`onclick="toggleExpSelOne('${e.id}')"`:`onclick="openExpediente('${e.id}')" oncontextmenu="causaCtx(event,'${e.id}')"`;
        return `<div class="mcard ${on?'sel-on':''}" data-exp-id="${e.id}" ${_expSelMode?`onclick="event.stopPropagation();toggleExpSelOne('${e.id}')"`:clk}>
          ${_expSelMode?`<div class="sel-check">${on?'✓':''}</div>`:''}
          <div class="mcard-title">${escapeHtml(causaLabel(e))}${shared?' 🤝':''}</div>
          <div class="mcard-sub">${escapeHtml(e.tipo||e.materia||'Causa')}${e.estado?' · '+escapeHtml(e.estado):''}</div>
          <div class="mcard-row">${escapeHtml(e.rit||e.rol||'—')} · 👤 ${escapeHtml(cli?cli.nombre:(e.cliente||'—'))} · 📄 ${n}${e.plazo?' · ⏰ '+escapeHtml(e.plazo):''}</div>
          ${_expSelMode?'':`<div class="mcard-acts"><button class="btn-ghost" onclick="event.stopPropagation();openExpediente('${e.id}')">Abrir</button><button class="btn-ghost" onclick="event.stopPropagation();openRedactar('${e.id}')">✍️ Redactar</button></div>`}
        </div>`; }).join('');
      return;
    }
    const rowOf=e=>{
      const n=expDocs(e.id).length; const cli=findCliente(e.clienteId); const on=_expSel.has(e.id);
      const clk=_expSelMode?`onclick="toggleExpSelOne('${e.id}')"`:`ondblclick="openExpediente('${e.id}')" oncontextmenu="causaCtx(event,'${e.id}')"`;
      return `<tr class="${on?'sel-on':''}" data-exp-id="${e.id}" ${_expSelMode?`onclick="event.stopPropagation();toggleExpSelOne('${e.id}')"`:clk} style="cursor:pointer">
        <td>${_expSelMode?(on?'☑ ':'☐ '):''}<b>${escapeHtml(causaLabel(e))}</b><div class="cli-meta">${escapeHtml(e.materia||'')}</div></td>
        <td>${escapeHtml(e.rit||e.rol||'—')}</td>
        <td>${escapeHtml(cli?cli.nombre:(e.cliente||'—'))}</td>
        <td>${escapeHtml(e.estado||'—')}</td>
        <td>${escapeHtml(e.plazo||'—')}</td>
        <td style="text-align:center">${n}</td>
        <td style="text-align:right;white-space:nowrap"><button class="btn-ghost" onclick="event.stopPropagation();openExpediente('${e.id}')">Abrir</button> <button class="btn-ghost" onclick="event.stopPropagation();openRedactar('${e.id}')">✍️</button> <button class="btn-ghost" style="color:var(--danger)" onclick="event.stopPropagation();deleteExpediente('${e.id}')">🗑</button></td>
      </tr>`;
    };
    // agrupada por tipo (secciones)
    const rows=EXP_LANES.map(([k,lbl])=>{ const items=list.filter(e=>expLaneOf(e)===k); if(!items.length) return '';
      return `<tr class="exp-trsec"><td colspan="7">${lbl} · ${items.length}</td></tr>`+items.map(rowOf).join(''); }).join('');
    host.innerHTML=expFilterBar()+expSelBar()+`<table class="cli-table"><thead><tr><th>Caratulado</th><th>RIT/Rol</th><th>Cliente</th><th>Estado</th><th>Plazo</th><th style="text-align:center">Docs</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
    return;
  }
  // Modo selección múltiple: grilla simple, sin arrastre
  // Grilla ordenada (cada carpeta en su espacio), agrupada por tipo. También en modo selección y en móvil.
  if(_expSelMode || isMobile() || STATE.expView!=='libre'){
    const showG=k=> _expFilter==='todas' || (_expFilter==='causas'&&k==='causa') || (_expFilter==='prep'&&(k==='demanda'||k==='contestacion')) || (_expFilter==='asuntos'&&k==='asunto');
    const secs=EXP_LANES.filter(([k])=>showG(k)).map(([k,lbl])=>{
      const items=list.filter(e=>expLaneOf(e)===k); if(!items.length) return '';
      return `<div class="exp-sec-h">${lbl} <span style="opacity:.5">${items.length}</span></div><div class="exp-grid">${items.map(e=>folderCardHTML(e)).join('')}</div>`;
    }).join('');
    host.innerHTML=expFilterBar()+expSelBar()+(secs||'<div style="font-size:13px;color:var(--gray2);padding:12px">Sin carpetas en este filtro.</div>');
    return;
  }
  // MODO LIBRE: un solo lienzo con TODAS juntas (respeta el filtro), arrastre libre (solo PC)
  host.innerHTML=expFilterBar()+expSelBar()+`<div class="exp-lane" id="lane-all"></div>`;
  const lane=document.getElementById('lane-all'); if(lane){
    list.forEach((e,i)=>lane.appendChild(makeFolderCard(e,i)));
    layoutLane(lane);
  }
}
const EXP_LANES=[['causa','📁 Causas'],['demanda','📝 En preparación'],['contestacion','📥 Contestaciones'],['asunto','📑 Asuntos']];
function expLaneOf(e){ if(e.kind==='asunto') return 'asunto'; if(e.sub==='contestacion') return 'contestacion'; if(e.prep) return 'demanda'; return 'causa'; }
function folderCardInner(e){
  const n=expDocs(e.id).length; const asu=(e.kind==='asunto');
  const shared=e.shared||_sharedCausaIds.has(e.id);
  const badge=shared?`<div class="exp-card-count" style="color:var(--gold)">🤝 ${e.shared?('Compartida ('+(e.myRole||'lector')+')'):'Compartida por ti'}</div>`:'';
  return `<div class="exp-tab">${escapeHtml((e.tipo||e.materia||(asu?'Asunto':'Causa')).slice(0,18))}</div>
    <div class="exp-card-title">${escapeHtml(causaLabel(e))}</div>
    <div class="exp-card-sub">${escapeHtml(e.rit||e.rol||'')}${e.estado?' · '+escapeHtml(e.estado):''}</div>
    <div class="exp-card-count">📄 ${n} doc${n===1?'':'s'}</div>
    ${e.prep&&e.sub!=='contestacion'?'<div class="exp-card-count" style="color:#8fb8e0">📝 En preparación</div>':''}
    ${e.sub==='contestacion'?'<div class="exp-card-count" style="color:#8fb8e0">📥 Contestación</div>':''}
    ${asu?'<div class="exp-card-count" style="color:#2c4a63">📑 Asunto</div>':''}
    ${badge}
    ${(_expSelMode||e.shared)?'':`<button class="exp-card-del" title="Borrar" onclick="event.stopPropagation();deleteExpediente('${e.id}')">🗑</button>`}`;
}
function folderCardHTML(e){    // versión estática (modo selección / móvil)
  const asu=(e.kind==='asunto'); const on=_expSel.has(e.id);
  // Móvil: UN toque abre (el doble-toque no dispara fiable en celular). PC: doble clic abre, clic selecciona.
  const clk=_expSelMode?`onclick="toggleExpSelOne('${e.id}')"`
    :(isMobile()?`onclick="openExpediente('${e.id}')" oncontextmenu="causaCtx(event,'${e.id}')"`
                :`ondblclick="openExpediente('${e.id}')" onclick="expCardClick(event,'${e.id}',this)" oncontextmenu="causaCtx(event,'${e.id}')"`);
  return `<div class="exp-folder-card ${on?'sel-on':''} ${e.prep?'prep':''} ${asu?'asunto':''}" data-exp-id="${e.id}" style="--fc:${e.color||(asu?'#bcd3e8':'#e8c97f')}" ${_expSelMode?`onclick="event.stopPropagation();toggleExpSelOne('${e.id}')"`:clk} title="Doble clic para abrir · clic derecho para opciones">
    ${_expSelMode?`<div class="sel-check">${on?'✓':''}</div>`:''}${folderCardInner(e)}</div>`;
}
// Tarjeta arrastrable dentro de su carril (guarda posición gx,gy)
let _folderLastId=null,_folderLastT=0;
function makeFolderCard(e,i){
  const asu=(e.kind==='asunto');
  const card=document.createElement('div');
  card.className='exp-folder-card lane-card '+(e.prep?'prep ':'')+(asu?'asunto':'');
  card.style.setProperty('--fc', e.color||(asu?'#bcd3e8':'#e8c97f'));
  if(typeof e.gx!=='number'){ e.gx=14+(i%4)*172; e.gy=14+Math.floor(i/4)*158; }   // posición por defecto en flujo
  card.style.left=e.gx+'px'; card.style.top=e.gy+'px';
  card.innerHTML=folderCardInner(e);
  card.title='Arrastra para acomodar · doble clic para abrir · clic derecho para opciones';
  card.addEventListener('contextmenu', ev=>causaCtx(ev, e.id));
  const del=card.querySelector('.exp-card-del'); if(del) del.addEventListener('click',ev=>{ ev.stopPropagation(); deleteExpediente(e.id); });
  card.addEventListener('dragstart', ev=>ev.preventDefault());
  let sx,sy,ox,oy,moved=false,drag=false;
  card.addEventListener('pointerdown',ev=>{ if(ev.target.closest('.exp-card-del'))return; drag=true;moved=false;sx=ev.clientX;sy=ev.clientY;ox=e.gx;oy=e.gy; try{card.setPointerCapture(ev.pointerId);}catch(_){}});
  card.addEventListener('pointermove',ev=>{ if(!drag)return; const dx=ev.clientX-sx,dy=ev.clientY-sy; if(!moved&&(Math.abs(dx)>4||Math.abs(dy)>4)){moved=true;card.classList.add('dragging');} if(moved){ e.gx=Math.max(0,ox+dx); e.gy=Math.max(0,oy+dy); card.style.left=e.gx+'px'; card.style.top=e.gy+'px'; } });
  card.addEventListener('pointerup',()=>{ if(!drag)return; drag=false; card.classList.remove('dragging');
    if(moved){ e.updated=e.updated; saveState(); const lane=card.parentElement; if(lane) layoutLane(lane); return; }
    const now=Date.now();                                   // sin mover: 1 clic selecciona, 2 abre
    if(_folderLastId===e.id && now-_folderLastT<380){ openExpediente(e.id); }
    else { document.querySelectorAll('.exp-folder-card.sel').forEach(c=>c.classList.remove('sel')); card.classList.add('sel'); previewCausa(e.id); }
    _folderLastId=e.id; _folderLastT=now;
  });
  card.addEventListener('pointercancel',()=>{ drag=false; card.classList.remove('dragging'); });
  return card;
}
function layoutLane(lane){    // el carril crece para contener las tarjetas
  let maxB=140; lane.querySelectorAll('.lane-card').forEach(c=>{ maxB=Math.max(maxB, c.offsetTop+c.offsetHeight+14); });
  lane.style.minHeight=maxB+'px';
}
// ── Agregar EBOOK (Libro / carpeta electrónica del PJUD) ──
// Trae los datos de la causa Y las partes (con sus abreviaturas) desde la primera página.
const _EBOOK_ROLES={DTE:'demandante',DDO:'demandado',SOL:'solicitante',REQ:'requerido',RQNTE:'requirente',RQDO:'requerido',EJEC:'demandante',EJDO:'demandado',QRLLANTE:'querellante',QRLLADO:'querellado',NNA:'hijo/a',TERCERO:'tercero'};
function _ebRolDe(suj){ suj=(suj||'').toUpperCase().replace(/\s/g,''); const ab=/^AB\.?/.test(suj); const key=suj.replace(/^AB\.?/,'').replace(/\./g,''); return {rol: ab?'':(_EBOOK_ROLES[key]||''), ab}; }
function esEbookPJUD(text){ return /(Litigantes|Sujeto\s+RUT\s+Persona)/i.test(text) && /ROL:/i.test(text) && /Caratulad/i.test(text); }
function parseEbookPJUD(text){
  const out={rol:'',tribunal:'',caratula:'',materia:'',procedimiento:'',etapa:'',partes:[]}; let m;
  if(m=text.match(/ROL:\s*([A-Z]?-?\s?\d{1,6}-\d{4})/i)) out.rol=m[1].trim();
  if(m=text.match(/Caratulad[oa]:\s*(.+)/i)) out.caratula=m[1].trim();
  if(m=text.match(/Materia:\s*(?:\[\d+\]\s*)?(.+)/i)) out.materia=m[1].trim();
  if(m=text.match(/Procedimiento:\s*(.+)/i)) out.procedimiento=m[1].trim();
  if(m=text.match(/Etapa:\s*([^\n]+?)\s*(?:Estado|$)/i)) out.etapa=m[1].trim();
  if(m=text.match(/^\s*(?:\d+\s+)?((?:\d+[º°]?\s*)?(?:Juzgado|Tribunal|Corte)[^\n(]*)/mi)) out.tribunal=m[1].trim();
  const ti=text.indexOf('Sujeto'); const body=ti>=0?text.slice(ti):text;
  const rx=/(AB\.?[A-ZÑ]+|[A-ZÑ]{2,10}\.?)\s+(\d{6,8}-[\dkK])\s+(NATURAL|JUR[IÍ]DICA)\s+([\s\S]*?)(?=(?:AB\.?[A-ZÑ]+|[A-ZÑ]{2,10}\.?)\s+\d{6,8}-[\dkK]\s+(?:NATURAL|JUR)|$)/g;
  let r;
  while(r=rx.exec(body)){ const rd=_ebRolDe(r[1]);
    out.partes.push({sujeto:r[1], rut:fmtRut(r[2]), tipo:/^JUR/i.test(r[3])?'juridica':'natural', nombre:r[4].replace(/\s+/g,' ').trim(), rol:rd.rol, ab:rd.ab}); }
  return out;
}
function agregarEbook(){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.pdf';
  inp.onchange=async ev=>{ const f=ev.target.files[0]; if(!f) return; toast('Leyendo el ebook…');
    let text=''; try{ text=await readFileText(f); }catch(_){}
    if(!text){ toast('El PDF no tiene texto (¿es escaneado?). Necesitaría OCR.','error'); return; }
    if(!esEbookPJUD(text)){ toast('No parece un Libro PJUD. Usa "Desde PDF/escrito".','error'); return; }
    const eb=parseEbookPJUD(text);
    const e={id:'ex'+Date.now(),created:Date.now(),updated:Date.now(), name:eb.caratula||'Causa', rol:eb.rol, tribunal:eb.tribunal, tipo:'', materia:eb.materia, estado:eb.etapa, obs:eb.procedimiento?('Procedimiento: '+eb.procedimiento):'', partes:[], kind:'causa', prep:false, red:{}};
    EXPEDIENTES.push(e); _curExp=e.id; saveState();
    await addFilesToExpediente(e.id,[f]);   // guarda el PDF en la causa
    const list=eb.partes.map(p=>({rut:p.rut, ok:rutValido(p.rut), nombre:p.nombre, tipo:p.tipo, rol:p.ab?'':(p.rol||''), add:!p.ab, docs:['Ebook PJUD']}));
    if(list.length) openDetectados(e.id, list);
    else { openExpediente(e.id); }
    toast('Ebook: '+(eb.rol||'')+' · '+eb.partes.length+' parte(s)','success');
  };
  inp.click();
}
// Un solo botón "Nueva carpeta" → elige el tipo; cada tipo define prep/kind/sub y el formulario
// Nueva carpeta: se crea la carpeta y punto. Dentro indicas si es Causa o Asunto (se puede cambiar cuando quieras).
function openNuevaCarpeta(){ newExpediente(false,'causa'); }
function _nuevaPick(k){ const f=(window._nuevaActs||{})[k]; closeAllModals(); if(f) f(); }

// Carpeta en preparación → causa ingresada (pide lo que faltaba: cliente, rol/RIT y tribunal)
function marcarIngresada(id){
  const e=EXPEDIENTES.find(x=>x.id===id); if(!e) return;
  const falta=[];
  if(!e.clienteId) falta.push('el cliente');
  if(!(e.rit||e.rol)) falta.push('el RIT o rol');
  if(!e.tribunal) falta.push('el tribunal');
  if(falta.length){ toast('Para ingresarla falta '+falta.join(', '),'error'); editExpediente(id); return; }
  e.prep=false; e.updated=Date.now(); saveState(); renderExpedientes();
  toast('Causa marcada como ingresada','success');
}
/* ── Pantalla "Datos detectados": nada entra a la base sin que lo confirmes ── */
let _detect={exId:null, list:[], contest:false, clientes:false, noCausa:true};
function openDetectados(exId, list, contest, opts){
  if(!list||!list.length) return false;
  _detect={exId:exId||null, contest:!!contest, clientes:!!contest||!!(opts&&opts.clientes), noCausa:!exId, list:list.map(p=>{
    const ya=CLIENTES.find(c=>p.rut && nrmRut(c.rut)===nrmRut(p.rut));
    return {rut:p.rut||'', ok:p.rut?!!p.ok:false, docs:p.docs||[], yaId:ya?ya.id:'', add:(p.add!==undefined?p.add:true), cli:false,
            nombre: ya?(ya.nombre||''):(p.nombre||''), tipo: ya?(ya.tipo||'natural'):(p.tipo||'natural'), rol:(p.rol||''),
            extra:p.extra||null, vinc:p.vinc||null};
  })};
  renderDetectados(); openModal('modal-detect'); return true;
}
function detSet(i,k,v){ if(_detect.list[i]) _detect.list[i][k]=(k==='add')?!!v:v; if(k==='add') renderDetectados(); }
function detCli(i,v){ const p=_detect.list[i]; if(!p) return; p.cli=!!v;
  if(_detect.contest && v){ _detect.list.forEach((q,j)=>{ if(j!==i) q.cli=false; }); p.rol='demandado'; _detect.list.forEach((q,j)=>{ if(j!==i && !q.rol) q.rol='demandante'; }); }
  renderDetectados();
}
function renderDetectados(){
  const b=document.getElementById('detect-body'); if(!b) return;
  const n=_detect.list.filter(p=>p.add).length;
  const cont=_detect.contest, noC=_detect.noCausa, cli=_detect.clientes;
  b.innerHTML=`<div class="modal-title">${noC?'👥 Personas a crear':'🔎 Datos detectados'}</div>
    <div style="font-size:12px;color:var(--gray2);margin-bottom:12px">${_detect.list.length} persona(s). Revisa cada una${noC?'':' y dime con qué <b>calidad</b> entra a la carpeta'}. Nada se guarda hasta que confirmes.${cont?' <b style="color:var(--gold)">Contestación: marca cuál es tu cliente.</b>':(cli?' <span style="color:var(--gold)">Puedes marcar varias como <b>cliente</b>.</span>':'')}</div>
    ${_detect.list.map((p,i)=>`<div style="border:1px solid var(--line);border-radius:9px;padding:10px 12px;margin-bottom:8px;${p.add?'':'opacity:.45'}">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
        <input type="checkbox" ${p.add?'checked':''} onchange="detSet(${i},'add',this.checked)" style="width:16px;height:16px;cursor:pointer">
        <b style="font-family:monospace">${p.rut?escapeHtml(p.rut):'<span style="color:var(--gray2)">sin RUT</span>'}</b>
        ${p.rut?(p.ok?'<span style="color:#5fbf7f;font-size:11px">✓ válido</span>':'<span style="color:var(--danger);font-size:11px" title="El dígito verificador no calza">⚠ no calza</span>'):''}
        ${p.yaId?'<span style="color:var(--gold);font-size:11px">· ya existe → se vincula</span>':'<span style="color:var(--gray2);font-size:11px">· se creará</span>'}
        ${cli?`<label style="margin-left:auto;font-size:11px;color:var(--gold);display:flex;gap:4px;align-items:center;cursor:pointer"><input type="checkbox" ${p.cli?'checked':''} onchange="detCli(${i},this.checked)"> ${cont?'mi cliente':'cliente'}</label>`:''}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <input class="form-input" style="flex:2;min-width:170px;font-size:12px" placeholder="Nombre" value="${escapeHtml(p.nombre)}" oninput="detSet(${i},'nombre',this.value)" ${p.yaId?'disabled':''}>
        <select class="form-select" style="flex:1;min-width:105px;font-size:12px" onchange="detSet(${i},'tipo',this.value)" ${p.yaId?'disabled':''}>
          ${[['natural','👤 Natural'],['juridica','🏢 Jurídica'],['nino','🧒 Niño/a']].map(([v,l])=>`<option value="${v}" ${p.tipo===v?'selected':''}>${l}</option>`).join('')}</select>
        ${noC?'':`<select class="form-select" style="flex:1;min-width:125px;font-size:12px" onchange="detSet(${i},'rol',this.value)">
          <option value="">— calidad —</option>${EXP_ROLES.map(r=>`<option value="${r}" ${p.rol===r?'selected':''}>${r}</option>`).join('')}</select>`}
      </div>
      ${p.extra&&(p.extra.domicilio||p.extra.profesion||p.extra.correo||p.extra.telefono||p.extra.claveUnica)?`<div style="font-size:10.5px;color:var(--gray2);margin-top:5px">${[p.extra.nacionalidad,p.extra.profesion,p.extra.domicilio,p.extra.correo,p.extra.telefono,p.extra.claveUnica?'🔐 Clave Única':''].filter(Boolean).map(escapeHtml).join(' · ')}</div>`:(p.docs.length?`<div style="font-size:10.5px;color:var(--gray2);margin-top:5px">Aparece en: ${escapeHtml(p.docs.join(' · '))}</div>`:'')}
    </div>`).join('')}
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Ahora no</button>
      <button class="btn-gold" onclick="saveDetectados()">${noC?'Crear':'Agregar'} ${n} persona(s)</button></div>`;
}
function _mergeExtra(c,extra){ if(!extra) return; Object.keys(extra).forEach(k=>{ if(extra[k]) c[k]=extra[k]; }); }
function saveDetectados(){
  const e=_detect.exId?EXPEDIENTES.find(x=>x.id===_detect.exId):null;
  const sel=_detect.list.filter(p=>p.add);
  if(!sel.length){ closeAllModals(); return; }
  if(sel.some(p=>!(p.nombre||'').trim())){ toast('Falta el nombre en alguna persona seleccionada','error'); return; }
  if(e && sel.some(p=>!p.cli && !p.rol)){ toast('Elige la calidad (o marca cliente) de cada persona','error'); return; }
  let nuevas=0, vinc=0; const byRut={}, cliIds=[];
  if(e) e.partes=e.partes||[];
  sel.forEach(p=>{
    let c = p.yaId ? findCliente(p.yaId) : (p.rut ? CLIENTES.find(x=>nrmRut(x.rut)===nrmRut(p.rut)) : null);
    if(c){ vinc++; _mergeExtra(c,p.extra); }
    else{
      c={id:'cl'+Date.now()+Math.floor(Math.random()*99999), tipo:p.tipo||'natural', nombre:(p.nombre||'').trim(), rut:fmtRut(p.rut||''),
         apodo:'', domicilio:'', correo:'', nacionalidad:'Chileno/a', estadoCivil:'', profesion:'', giro:'',
         representante:'', rutRepresentante:'', cargoRepresentante:'Representante Legal', genero:'Masculino',
         created:Date.now(), updated:Date.now()};
      _mergeExtra(c,p.extra); CLIENTES.push(c); nuevas++;
    }
    if(p.rut) byRut[nrmRut(p.rut)]=c.id;
    if(e){
      if(p.rol){ let parte=e.partes.find(x=>String(x.personaId)===String(c.id)); if(!parte){ parte={personaId:c.id, rol:p.rol}; e.partes.push(parte); } else parte.rol=p.rol; parte._vinc=p.vinc||null; }
      if(p.cli) cliIds.push(c.id);
    }
  });
  if(e){
    e.partes.forEach(pt=>{ if(pt._vinc){ pt.vinculo=pt._vinc.rol; const de=byRut[nrmRut(pt._vinc.deRut||'')]; if(de) pt.vinculoDe=de; } delete pt._vinc; });
    if(cliIds.length){ e.clienteIds=[...new Set([...(e.clienteIds||[]).filter(Boolean), ...cliIds])]; if(!e.clienteId) e.clienteId=cliIds[0]; const c0=findCliente(e.clienteId); if(c0) e.cliente=c0.nombre||''; if(_detect.contest){ e.rolProcesal='demandada'; e.red=Object.assign(e.red||{},{clienteId:e.clienteId, rolProcesal:'demandada'}); } }
    e.updated=Date.now();
  }
  saveState(); closeAllModals();
  if(e) openExpediente(e.id); else { try{ renderClientesTab(); }catch(_){} }
  toast((nuevas?nuevas+' creada(s)':'')+(nuevas&&vinc?' · ':'')+(vinc?vinc+' vinculada(s)':'')+(cliIds.length?' · '+cliIds.length+' cliente(s)':''),'success');
}
function selExpCard(el){ document.querySelectorAll('.exp-folder-card.sel').forEach(c=>c.classList.remove('sel')); el.classList.add('sel'); }
const _EXP_PREV_PLACEHOLDER='<div class="preview-placeholder" style="text-align:center;color:var(--gray2);padding:30px 10px"><div style="font-size:34px">📁</div><p style="font-size:12.5px">Selecciona una causa (un clic)<br>para ver su ficha aquí.<br><span style="opacity:.7">Doble clic la abre.</span></p></div>';
function previewCausa(id){
  const pane=document.getElementById('exp-preview'); if(!pane) return;
  const e=EXPEDIENTES.find(x=>x.id===id); if(!e){ pane.innerHTML=_EXP_PREV_PLACEHOLDER; return; }
  const cli=findCliente(e.clienteId);
  const nDocs=expDocs(id).length;
  const evs=causaEventos(id).filter(v=>!v.done).sort((a,b)=>(((a.date||'')+(a.time||''))<((b.date||'')+(b.time||''))?-1:1));
  const prox=evs[0];
  const est=(e.estado||'').toLowerCase();
  const chipCol = est.includes('termin')?'rgba(88,199,154,.18);color:#7fdcb4' : e.prep?'rgba(232,178,74,.18);color:#e8b24a' : 'rgba(201,168,76,.16);color:#e6ce86';
  const rows=[['RIT / ROL',e.rit||e.rol],['Tribunal',e.tribunal],['Materia',e.materia],['Cliente',cli?(cli.nombre||cli.name):e.cliente],['Estado',e.estado]].filter(r=>r[1]);
  pane.innerHTML=`
    <button class="preview-del" title="Eliminar causa" onclick="deleteExpediente('${id}')">🗑</button>
    <div class="cp-head">
      <div class="cp-cover" style="background:${e.color||'#e3c074'};color:#4a370f">📁</div>
      <div style="min-width:0"><div class="cp-title">${escapeHtml(causaLabel(e))}</div><div class="cp-sub">${escapeHtml(e.tipo||e.materia||'Causa')} · 📄 ${nDocs}</div>
        <span class="cp-chip" style="background:${chipCol}">${escapeHtml(e.estado||(e.prep?'En preparación':'Activa'))}</span></div>
    </div>
    ${rows.map(r=>`<div class="cp-kv"><b>${escapeHtml(r[0])}</b><span>${escapeHtml(r[1])}</span></div>`).join('')}
    ${prox?`<div class="cp-kv"><b>Próxima</b><span style="color:var(--gold3)">${(typeof _evMeta==='function'?_evMeta(prox)[0]:'📅')} ${escapeHtml(_fmtFecha(prox.date)||'')}${prox.time?' '+escapeHtml(prox.time):''} · ${escapeHtml(prox.text||'')}</span></div>`:''}
    <button class="btn-gold" style="width:100%;margin-top:14px" onclick="openExpediente('${id}')">📂 Abrir carpeta</button>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn-ghost" style="flex:1" onclick="openRedactar('${id}')">✍️ Redactar</button>
      <button class="btn-ghost" style="flex:1" onclick="openExportCausa('${id}')">🖨️ Exportar</button>
    </div>`;
  pane.classList.add('show');
}
// Ctrl/⌘ + clic = abrir en pestaña nueva (como en el navegador); clic normal = solo seleccionar
function expCardClick(ev, id, el){ if(ev.ctrlKey||ev.metaKey){ ev.preventDefault(); _tabNew=true; openExpediente(id); return; } selExpCard(el); previewCausa(id); }
function closeExpediente(){ const ov=document.getElementById('exp-overlay');
  if(_readerFloat && ov && ov.classList.contains('open')) goToApp();   // solo si la causa estaba CENTRADA en el overlay (doc flotando sobre ella) → no cerrar docs cuando la causa está flotando o al re-renderizar la lista
  const prev=_curExp; if(ov){ ov.classList.remove('open'); ov.innerHTML=''; } _curExp=null; if(prev) syncSharedCausaIfMine(prev); }
function fillExpClienteSelect(selId){
  const sel=document.getElementById('fe-clienteId'); if(!sel) return;
  const opts=CLIENTES.slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''))
    .map(c=>`<option value="${c.id}" ${String(selId)===String(c.id)?'selected':''}>${c.tipo==='juridica'?'🏢':'👤'} ${escapeHtml(c.nombre||'(sin nombre)')}${c.rut?' — '+escapeHtml(c.rut):''}</option>`).join('');
  sel.innerHTML=`<option value="">— Elegir cliente —</option>${opts}`;
}
function refreshExpClienteSelect(selId){ fillExpClienteSelect(selId); }
// Varios clientes "por igual": el select principal + esta lista de co-clientes
let _expCoCli=[];
function renderCoClientes(){
  const host=document.getElementById('fe-coclientes'); if(!host) return;
  const principal=(document.getElementById('fe-clienteId')||{}).value||'';
  host.innerHTML=_expCoCli.map((cid,i)=>`<div style="display:flex;gap:6px;margin-top:5px;align-items:center">
    <select class="form-select" style="font-size:12px" onchange="_expCoCli[${i}]=this.value">
      <option value="">— otro cliente —</option>${CLIENTES.slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'')).filter(c=>c.id!==principal).map(c=>`<option value="${c.id}" ${String(cid)===String(c.id)?'selected':''}>${c.tipo==='juridica'?'🏢':(c.tipo==='nino'?'🧒':'👤')} ${escapeHtml(c.nombre||'(sin nombre)')}${c.rut?' — '+escapeHtml(c.rut):''}</option>`).join('')}</select>
    <button class="btn-ghost" type="button" style="color:var(--danger);padding:5px 8px" onclick="expDelCoCli(${i})">✕</button></div>`).join('');
}
function expAddCoCli(){ _expCoCli.push(''); renderCoClientes(); }
function expDelCoCli(i){ _expCoCli.splice(i,1); renderCoClientes(); }
const EXP_ROLES=['demandante','demandado','querellante','querellado','solicitante','requerido','tercero','hijo/a','testigo','representante','otro'];

/* ── Detección de personas en documentos (reglas locales, sin IA) ───────────────
   El RUT es el ancla: es el único dato verificable solo (dígito verificador, módulo 11). */
function rutDV(cuerpo){ let M=0,S=1,T=parseInt(cuerpo,10); for(;T;T=Math.floor(T/10)) S=(S+T%10*(9-M++%6))%11; return S?String(S-1):'k'; }
function nrmRut(r){ return (r||'').replace(/[.\-\s]/g,'').toLowerCase(); }
function rutValido(r){ const c=nrmRut(r); const m=c.match(/^(\d{7,8})([\dk])$/); return m?rutDV(m[1])===m[2]:false; }
function fmtRut(r){ const c=nrmRut(r); const m=c.match(/^(\d{7,8})([\dk])$/); if(!m) return r||'';
  return m[1].replace(/\B(?=(\d{3})+(?!\d))/g,'.')+'-'+m[2].toUpperCase(); }
// palabras que NO son nombre aunque vayan en mayúscula junto al RUT
const _NO_NOMBRE=/^(cédula|cedula|identidad|nacional|rut|rol|único|unico|tributario|nº|no|número|numero|don|doña|dona|señor|señora|sr|sra|juzgado|tribunal|corte|familia|civil|penal|laboral|garantía|garantia|república|republica|chile|registro|santiago|certificado|nacimiento|matrimonio|defunción|defuncion|circunscripción|circunscripcion|servicio|estado|fecha|inscripción|inscripcion|el|la|los|las|de|del|y|con|en|a|su|hijo|hija|padre|madre|cónyuge|conyuge|representante|legal|abogado|domiciliado|domiciliada|profesión|profesion|oficio|chileno|chilena|casado|casada|soltero|soltera)$/i;
function _nombresEn(frag){
  const rx=/([A-ZÑÁÉÍÓÚ][A-ZÑÁÉÍÓÚa-zñáéíóú]+(?:\s+(?:de|del|de\s+la|los|las)\s+[A-ZÑÁÉÍÓÚ][A-ZÑÁÉÍÓÚa-zñáéíóú]+|\s+[A-ZÑÁÉÍÓÚ][A-ZÑÁÉÍÓÚa-zñáéíóú]+){1,4})/g;
  const out=[]; let m;
  while((m=rx.exec(frag))){
    const toks=m[1].split(/\s+/).filter(t=>!_NO_NOMBRE.test(t));
    if(toks.length>=2) out.push(toks.join(' '));
  }
  return out;
}
function _nombreCerca(text, idx){
  const antes=_nombresEn(text.slice(Math.max(0,idx-160), idx));    // "don Juan Pérez, cédula … Nº<RUT>" → el más pegado al RUT
  if(antes.length) return antes[antes.length-1];
  const desp=_nombresEn(text.slice(idx, idx+160));                  // "RUT <RUT> JUAN PÉREZ"
  return desp.length?desp[0]:'';
}
// docs = [{name, text}] → una ficha por RUT, fusionando todos los documentos
function detectPersonasEnTextos(docs){
  const map=new Map();
  (docs||[]).forEach(d=>{
    if(!d.text) return;
    const rx=/(\d{1,2}\.?\d{3}\.?\d{3})\s*-\s*([\dkK])/g; let m;
    while((m=rx.exec(d.text))){
      const raw=m[1]+'-'+m[2], k=nrmRut(raw);
      if(!map.has(k)) map.set(k, {rut:fmtRut(raw), ok:rutValido(raw), nombre:'', docs:[]});
      const o=map.get(k);
      if(!o.nombre) o.nombre=_nombreCerca(d.text, m.index);
      if(d.name && !o.docs.includes(d.name)) o.docs.push(d.name);
    }
  });
  return [...map.values()];
}
// ── Certificado de nacimiento (Registro Civil, con texto) → inscrito + padre + madre ──
const _MESN={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12};
function _fechaLargaCL(s){ const m=String(s||'').match(/(\d{1,2})\s+([A-Za-zÁÉÍÓÚáéíóú]+)\s+(\d{4})/); if(!m) return ''; const mm=_MESN[m[2].toLowerCase()]; return mm?String(m[1]).padStart(2,'0')+'/'+String(mm).padStart(2,'0')+'/'+m[3]:''; }
function esCertNacimiento(text){ return /CERTIFICADO\s+DE\s+NACIMIENTO/i.test(text||''); }
function parseCertNacimiento(text){
  const g=rx=>{ const m=text.match(rx); return m?m[1].trim():''; };
  const rx=r=>{ const m=text.match(r); return m?m[1].replace(/\s/g,''):''; };
  return {
    inscrito:{ nombre:g(/Nombre inscrito\s*:\s*(.+)/i), rut:rx(/R\.U\.N\.\s*:\s*([\d.]+\s*-\s*[\dkK])/i),
               genero:/^f/i.test(g(/Sexo\s*:\s*(\w+)/i))?'Femenino':'Masculino', fechaNac:_fechaLargaCL(g(/Fecha nacimiento\s*:\s*(.+)/i)) },
    padre:{ nombre:g(/Nombre del Padre\s*:\s*(.+)/i), rut:rx(/R\.U\.N\.\s*del\s*Padre\s*:\s*([\d.]+\s*-\s*[\dkK])/i) },
    madre:{ nombre:g(/Nombre de la Madre\s*:\s*(.+)/i), rut:rx(/R\.U\.N\.\s*de\s*la\s*Madre\s*:\s*([\d.]+\s*-\s*[\dkK])/i) }
  };
}
// Enriquece la lista de detectados con lo que sabe el certificado (tipo niño, género, fecha, vínculo progenitor)
function _enriquecerConCert(det, textos){
  textos.forEach(t=>{ if(!esCertNacimiento(t.text)) return; const c=parseCertNacimiento(t.text); if(!c.inscrito.rut) return;
    const kN=nrmRut(c.inscrito.rut);
    const setItem=(rut,patch)=>{ let it=det.find(x=>nrmRut(x.rut)===nrmRut(rut)); if(!it){ it={rut:fmtRut(rut), ok:rutValido(rut), nombre:'', docs:['Certificado de nacimiento']}; det.push(it); } Object.assign(it,patch); };
    setItem(c.inscrito.rut, { nombre:c.inscrito.nombre, tipo:'nino', rol:'hijo/a', add:true, extra:{genero:c.inscrito.genero, fechaNac:c.inscrito.fechaNac} });
    if(c.padre.rut) setItem(c.padre.rut, { nombre:c.padre.nombre, tipo:'natural', rol:'', add:true, extra:{genero:'Masculino'}, vinc:{rol:'progenitor', deRut:c.inscrito.rut} });
    if(c.madre.rut) setItem(c.madre.rut, { nombre:c.madre.nombre, tipo:'natural', rol:'', add:true, extra:{genero:'Femenino'}, vinc:{rol:'progenitor', deRut:c.inscrito.rut} });
  });
  return det;
}
let _expPartes=[];
function personaOptions(sel){ return '<option value="">— elige persona —</option>'+CLIENTES.slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||'')).map(c=>`<option value="${c.id}" ${String(sel)===String(c.id)?'selected':''}>${c.tipo==='juridica'?'🏢':(c.tipo==='nino'?'🧒':'👤')} ${escapeHtml(c.nombre||'(sin nombre)')}</option>`).join(''); }
function renderExpPartes(){
  const host=document.getElementById('fe-partes'); if(!host) return;
  const area=(document.getElementById('fe-tipo')||{}).value||'';
  const vins=vinculosDe(area);
  const cliId=(document.getElementById('fe-clienteId')||{}).value||'';
  // "de quién": las OTRAS partes de esta carpeta, más el cliente
  const otras=i=>{ const ops=[]; if(cliId){ const c=findCliente(cliId); if(c) ops.push([cliId, (c.nombre||'')+' (cliente)']); }
    _expPartes.forEach((q,j)=>{ if(j!==i && q.personaId){ const c=findCliente(q.personaId); if(c) ops.push([q.personaId, c.nombre||'']); } }); return ops; };
  host.innerHTML=_expPartes.length?_expPartes.map((p,i)=>`<div style="border:1px solid var(--line);border-radius:8px;padding:7px 8px;margin-bottom:6px">
    <div style="display:flex;gap:6px;align-items:center">
      <select class="form-select" style="flex:2;font-size:12px" onchange="expSetParte(${i},'personaId',this.value);renderExpPartes()">${personaOptions(p.personaId)}</select>
      <select class="form-select" style="flex:1;font-size:12px" onchange="expSetParte(${i},'rol',this.value)">${EXP_ROLES.map(r=>`<option value="${r}" ${p.rol===r?'selected':''}>${r}</option>`).join('')}</select>
      <button class="btn-ghost" type="button" style="color:var(--danger);padding:5px 8px" onclick="expRemoveParte(${i})">✕</button>
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-top:5px">
      <span style="font-size:11px;color:var(--gray2);flex:0 0 auto">es</span>
      <select class="form-select" style="flex:1;font-size:12px" onchange="expSetParte(${i},'vinculo',this.value);renderExpPartes()">
        <option value="">— sin vínculo —</option>
        ${vins.map(v=>`<option value="${v}" ${p.vinculo===v?'selected':''}>${vincLbl(v)}</option>`).join('')}</select>
      <span style="font-size:11px;color:var(--gray2);flex:0 0 auto">de</span>
      <select class="form-select" style="flex:1;font-size:12px" ${p.vinculo?'':'disabled'} onchange="expSetParte(${i},'vinculoDe',this.value)">
        <option value="">—</option>
        ${otras(i).map(([id,n])=>`<option value="${id}" ${String(p.vinculoDe)===String(id)?'selected':''}>${escapeHtml(n)}</option>`).join('')}</select>
    </div>
  </div>`).join(''):'<div style="font-size:12px;color:var(--gray2)">Sin otras partes. Agrega la contraparte, hijos, testigos…</div>';
}
function expAddParte(){ _expPartes.push({personaId:'',rol:'demandado'}); renderExpPartes(); }
function expRemoveParte(i){ _expPartes.splice(i,1); renderExpPartes(); }
function expSetParte(i,k,v){ if(_expPartes[i]) _expPartes[i][k]=v; }
function expAddPartePersona(){ editCliente(null,'parte'); }
let _expPrep=false;   // carpeta en preparación: causa aún NO ingresada (sin rol/tribunal, y el cliente puede no existir todavía)
let _expKind='causa'; // 'causa' | 'asunto' (contrato, escritura, trámite: NUNCA tendrá rol ni tribunal)
let _expSub=null;     // 'contestacion' → los datos de causa y las partes salen de la demanda notificada
// Modo corto del formulario: solo título, materia, partes y documentos
function _tipoCarpetaKey(){ if(_expKind==='asunto') return 'asunto'; if(_expSub==='contestacion') return 'contestacion'; if(_expPrep) return 'demanda'; return 'causa'; }
function renderTipoCarpeta(){
  const host=document.getElementById('fe-tipocarpeta'); if(!host) return; const cur=_tipoCarpetaKey();
  host.innerHTML=[['causa','📁 Causa'],['asunto','📜 Asunto']]
    .map(([k,l])=>`<button type="button" class="rw-pill ${cur===k?'on':''}" onclick="expSetTipoCarpeta('${k}')">${l}</button>`).join('');
}
function expSetTipoCarpeta(t){
  if(t==='asunto'){ _expKind='asunto'; _expPrep=false; _expSub=null; }
  else if(t==='demanda'){ _expKind='causa'; _expPrep=true; _expSub=null; }
  else if(t==='contestacion'){ _expKind='causa'; _expPrep=true; _expSub='contestacion'; }
  else { _expKind='causa'; _expPrep=false; _expSub=null; }
  expSlimForm();
}
function expSlimForm(){
  const m=document.getElementById('modal-exp'); if(m) m.classList.toggle('slim', _expPrep || _expKind==='asunto');
  renderTipoCarpeta();
  const tt=document.getElementById('modal-exp-title'); if(tt){ const nom=_expKind==='asunto'?'asunto':(_expSub==='contestacion'?'contestación':(_expPrep?'carpeta (en preparación)':'expediente')); tt.textContent=(_editExpId?'Editar ':'Nuevo/a ')+nom; }
  const ln=document.getElementById('fe-name-lbl'); if(ln) ln.textContent = (_expKind==='asunto') ? 'Título del asunto'
    : (_expSub==='contestacion' ? 'Título (se completa con la carátula de la demanda)'
    : (_expPrep?'Título de la carpeta (luego lo cambias por la carátula real)':'Caratulado / Nombre de la causa'));
  const lc=document.getElementById('fe-cli-lbl'); if(lc) lc.textContent = (_expPrep||_expKind==='asunto') ? 'Cliente' : 'Cliente *';
  const fh=document.getElementById('fe-files-hint'); if(fh) fh.textContent = (_expSub==='contestacion')
    ? '(sube la demanda notificada: de ahí saco RIT, tribunal, carátula y las partes)'
    : '(se leen y te ofrezco las personas que encuentre)';
  const fi=document.getElementById('fe-files'); if(fi) fi.value='';
}
function newExpediente(prep, kind, sub){ _expPrep=!!prep; _expKind=kind||'causa'; _expSub=sub||null; ensureModelos(); migrateClientes(); _editExpId=null; EXP_FIELDS.forEach(f=>{const el=document.getElementById('fe-'+f); if(el)el.value='';}); fillExpClienteSelect('');
  _expCoCli=[]; renderCoClientes();
  _expPartes=[]; renderExpPartes();
  const tp=document.getElementById('fe-tienePoder'); if(tp) tp.checked=false; fillRolSelect('fe-rolProcesal', sub==='contestacion'?'demandada':'demandante'); fillMateriaDatalist();
  expSlimForm(); tribPreview('');
  document.getElementById('modal-exp-title').textContent=(_expKind==='asunto')?'Nuevo asunto (contrato, escritura, trámite)':(_expSub==='contestacion'?'Nueva contestación (me demandaron)':(_expPrep?'Nueva carpeta (en preparación)':'Nuevo expediente')); openModal('modal-exp'); }
function fillMateriaDatalist(){ const dl=document.getElementById('fe-tipo-dl'); if(dl) dl.innerHTML=materias().map(m=>`<option value="${escapeHtml(m)}">`).join(''); }
function editExpediente(id){ const e=EXPEDIENTES.find(x=>x.id===id); if(!e)return; migrateClientes(); _editExpId=id; _expPrep=!!e.prep; _expKind=e.kind||'causa'; _expSub=e.sub||null; EXP_FIELDS.forEach(f=>{const el=document.getElementById('fe-'+f); if(el)el.value=e[f]||'';}); const feRit=document.getElementById('fe-rit'); if(feRit) feRit.value=e.rit||e.rol||''; fillExpClienteSelect(e.clienteId||'');
  _expCoCli=(e.clienteIds||[]).filter(id=>id && String(id)!==String(e.clienteId)); renderCoClientes();
  _expPartes=JSON.parse(JSON.stringify(e.partes||[])); renderExpPartes();
  const tp=document.getElementById('fe-tienePoder'); if(tp) tp.checked=!!e.tienePoder;
  fillRolSelect('fe-rolProcesal', e.rolProcesal||'demandante'); fillMateriaDatalist();
  expSlimForm(); tribPreview(e.tribunal||'');
  document.getElementById('modal-exp-title').textContent=(_expKind==='asunto')?'Editar asunto':(_expPrep?'Editar carpeta (en preparación)':'Editar expediente'); openModal('modal-exp'); }
function saveExpediente(){
  const get=f=>{const el=document.getElementById('fe-'+f); return el?el.value.trim():'';};
  const chk=f=>{const el=document.getElementById('fe-'+f); return !!(el&&el.checked);};
  // ÚNICO requisito: el título de la carpeta. Todo lo demás (RIT, tribunal, cliente…) es opcional y se completa después.
  if(!get('name')){ toast('Ponle un título a la carpeta','error'); const el=document.getElementById('fe-name'); if(el) el.focus(); return; }
  const clienteId=get('clienteId');
  const cli=findCliente(clienteId);
  const comp={ tienePoder:chk('tienePoder'), rolProcesal:get('rolProcesal')||'demandante', esCAJ:chk('esCAJ') };
  const partes=_expPartes.filter(p=>p.personaId);
  const clienteIds=[clienteId, ..._expCoCli].filter((v,i,a)=>v&&a.indexOf(v)===i);   // varios clientes por igual (sin repetir)
  if(_editExpId){ const e=EXPEDIENTES.find(x=>x.id===_editExpId); if(e){ EXP_FIELDS.forEach(f=>e[f]= f==='tribunal' ? tribunalNombre(get(f)) : get(f)); e.clienteId=clienteId; e.clienteIds=clienteIds; e.cliente=cli?cli.nombre:''; e.partes=partes; Object.assign(e,comp); e.prep=_expPrep; e.kind=_expKind; e.sub=_expSub; e.red=Object.assign(e.red||{},{clienteId},comp); e.updated=Date.now(); } }
  else { const e={id:'ex'+Date.now(),created:Date.now(),updated:Date.now()}; EXP_FIELDS.forEach(f=>e[f]= f==='tribunal' ? tribunalNombre(get(f)) : get(f)); e.clienteId=clienteId; e.clienteIds=clienteIds; e.cliente=cli?cli.nombre:''; e.partes=partes; Object.assign(e,comp); e.prep=_expPrep; e.kind=_expKind; e.sub=_expSub; e.red=Object.assign({clienteId},comp); EXPEDIENTES.push(e); _curExp=e.id; }
  const fi=document.getElementById('fe-files'); const files=(fi&&fi.files)?[...fi.files]:[];
  closeAllModals(); saveState();
  if(_curExp) openExpediente(_curExp); else renderExpedientes();
  toast((_expKind==='asunto'?'Asunto':'Expediente')+' guardado','success');
  if(files.length && _curExp) addFilesToExpediente(_curExp, files);   // se leen y ofrecen las personas detectadas
}
async function deleteExpediente(id){
  const e=EXPEDIENTES.find(x=>x.id===id); if(!e)return;
  // CASO A: causa que ME compartieron (no soy dueño) → borrar solo quita MI acceso (salir del equipo)
  if(e.shared){
    if(!confirm('Esta causa te la compartieron. ¿Quitar tu acceso? (no se borra para el resto; el dueño puede volver a compartírtela)')) return;
    try{ if(typeof sb!=='undefined'&&sb) await sb.from('shared_causa_members').delete().eq('causa_id',id).eq('user_id',STATE.uid); }catch(err){ toast('No se pudo salir: '+(err.message||''),'error'); return; }
    for(let i=EXDOCS.length-1;i>=0;i--) if(EXDOCS[i].expediente===id && EXDOCS[i].shared) EXDOCS.splice(i,1);
    const ix=EXPEDIENTES.findIndex(x=>x.id===id); if(ix>=0) EXPEDIENTES.splice(ix,1);
    _sharedCausaIds.delete(id);
    renderExpedientes(); toast('Saliste de la causa compartida');
    return;
  }
  // CASO B: causa PROPIA (soy dueño/creador). Solo el dueño la borra de verdad.
  const shared=_sharedCausaIds.has(id);
  if(!confirm('¿Borrar la causa "'+(e.name||'')+'" y sus documentos?'+(shared?'\n\n⚠️ Está compartida: se eliminará para TODO el equipo.':''))) return;
  if(shared && typeof sb!=='undefined'&&sb){ try{ await sb.from('shared_causas').delete().eq('id',id); }catch(err){} _sharedCausaIds.delete(id); }
  // A la papelera (recuperable): causa + sus documentos + sus notas. Los archivos NO se borran aún.
  const exdocsCausa=EXDOCS.filter(x=>x.expediente===id);
  const annsCausa=ANNOTATIONS.filter(a=>exdocsCausa.some(x=>x.id===a.docId));
  trashAdd('causa', e.name||'Causa', {expediente:e, exdocs:exdocsCausa, anns:annsCausa});
  for(let j=ANNOTATIONS.length-1;j>=0;j--) if(exdocsCausa.some(x=>x.id===ANNOTATIONS[j].docId)) ANNOTATIONS.splice(j,1);
  for(let i=EXDOCS.length-1;i>=0;i--) if(EXDOCS[i].expediente===id) EXDOCS.splice(i,1);
  const ix=EXPEDIENTES.findIndex(x=>x.id===id); if(ix>=0) EXPEDIENTES.splice(ix,1);
  saveState(); renderExpedientes(); toast('Causa movida a la papelera 🗑');
}
// ══════════════════ PAPELERA (recuperar lo borrado) ══════════════════
// Lo borrado (causas, documentos, libros, apuntes, personas) va aquí en vez de perderse.
// Los archivos (blobs) NO se borran hasta eliminar definitivamente desde la papelera.
function trashAdd(kind, title, payload){
  STATE.papelera = STATE.papelera||[];
  STATE.papelera.unshift({ tid:'tr'+Date.now()+Math.floor(Math.random()*9999), kind, title:title||'(sin título)', deletedAt:Date.now(), payload:JSON.parse(JSON.stringify(payload||{})) });
  if(STATE.papelera.length>200) STATE.papelera.length=200;   // tope de seguridad
}
const _TRASH_LABEL={causa:'📁 Causa', exdoc:'📄 Doc. de causa', documento:'📄 Documento PDF', libro:'📖 Libro', apunte:'📝 Apunte', cliente:'👤 Persona'};
function openPapelera(){ try{closeAvatarMenu();}catch(_){} renderPapelera(); openModal('modal-papelera'); }
function renderPapelera(){
  const host=document.getElementById('papelera-body'); if(!host) return;
  const list=STATE.papelera||[];
  const rows=list.map(t=>{
    const when=new Date(t.deletedAt).toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'2-digit'});
    return `<div class="pap-row"><div style="flex:1;min-width:0"><div class="pap-t">${_TRASH_LABEL[t.kind]||'Elemento'} · ${escapeHtml(t.title)}</div><div class="pap-s">Borrado el ${when}</div></div>
      <button class="btn-ghost" onclick="restoreTrash('${t.tid}')">↩ Restaurar</button>
      <button class="btn-ghost" style="color:var(--danger)" onclick="purgeTrash('${t.tid}')" title="Eliminar definitivamente">✕</button></div>`;
  }).join('') || '<div style="color:var(--gray2);padding:14px 4px">La papelera está vacía.</div>';
  host.innerHTML=`<div class="modal-title" style="display:flex;justify-content:space-between;align-items:center;gap:10px">🗑 Papelera ${list.length?`<button class="btn-ghost" style="color:var(--danger);font-size:12px" onclick="emptyTrash()">Vaciar todo</button>`:''}</div>
    <div style="font-size:12px;color:var(--gray2);margin-bottom:10px">Aquí queda lo que borras. Puedes restaurarlo o eliminarlo definitivamente.</div>
    <div style="max-height:min(60vh,440px);overflow-y:auto">${rows}</div>
    <div class="modal-footer"><button class="btn-gold" onclick="closeAllModals()">Cerrar</button></div>`;
}
function _trashFind(tid){ return (STATE.papelera||[]).findIndex(t=>t.tid===tid); }
function _pushIfAbsent(arr, obj, key){ key=key||'id'; if(obj && !arr.some(y=>String(y[key])===String(obj[key]))) arr.push(obj); }
function restoreTrash(tid){
  const i=_trashFind(tid); if(i<0) return; const t=STATE.papelera[i], p=t.payload||{};
  try{
    if(t.kind==='causa'){ _pushIfAbsent(EXPEDIENTES,p.expediente); (p.exdocs||[]).forEach(x=>_pushIfAbsent(EXDOCS,x)); (p.anns||[]).forEach(a=>_pushIfAbsent(ANNOTATIONS,a)); }
    else if(t.kind==='exdoc'){ _pushIfAbsent(EXDOCS,p.exdoc); (p.anns||[]).forEach(a=>_pushIfAbsent(ANNOTATIONS,a)); }
    else if(t.kind==='documento'){ _pushIfAbsent(DOCUMENTOS,p.documento); (p.anns||[]).forEach(a=>_pushIfAbsent(ANNOTATIONS,a)); }
    else if(t.kind==='libro'){ _pushIfAbsent(DOCUMENTS,p.doc); if(p.order && !STATE.docOrder.includes(p.doc.id)) STATE.docOrder.push(p.doc.id); if(p.mm) mmPos[p.doc.id]=p.mm; if(p.book) STATE.bookPos[p.doc.id]=p.book; }
    else if(t.kind==='apunte'){ _pushIfAbsent(APUNTES,p.apunte); (p.anns||[]).forEach(a=>_pushIfAbsent(ANNOTATIONS,a)); }
    else if(t.kind==='cliente'){ _pushIfAbsent(CLIENTES,p.cliente); }
  }catch(e){ toast('No se pudo restaurar','error'); return; }
  STATE.papelera.splice(i,1);
  saveState(); try{buildSearchIndex();}catch(_){} renderPapelera(); try{renderAll();}catch(_){}
  toast('Restaurado ✓','success');
}
function _trashPurgeBlobs(t){
  const p=t.payload||{}, ids=[];
  if(t.kind==='causa') (p.exdocs||[]).forEach(x=>ids.push(x.id));
  else if(t.kind==='exdoc' && p.exdoc) ids.push(p.exdoc.id);
  else if(t.kind==='documento' && p.documento) ids.push(p.documento.id);
  else if(t.kind==='libro' && p.doc) ids.push(p.doc.id);
  ids.forEach(id=>{ try{delFileBlob(id);}catch(_){} });
}
function purgeTrash(tid){
  const i=_trashFind(tid); if(i<0) return;
  if(!confirm('¿Eliminar definitivamente? No se podrá recuperar.')) return;
  try{ _trashPurgeBlobs(STATE.papelera[i]); }catch(_){}
  STATE.papelera.splice(i,1); saveState(); renderPapelera();
}
function emptyTrash(){
  if(!(STATE.papelera||[]).length) return;
  if(!confirm('¿Vaciar toda la papelera? Se eliminará todo definitivamente.')) return;
  (STATE.papelera||[]).forEach(t=>{ try{_trashPurgeBlobs(t);}catch(_){} });
  STATE.papelera=[]; saveState(); renderPapelera();
}
function causaEventos(id){ return (STATE.recordatorios||[]).filter(e=>e.causaId===id); }

// ══════════════ EXPORTAR CAUSA (imprimir/PDF): Lista · Fichas · Nota ══════════════
function _estudioNombre(){ return (STATE.perfilAbogado&&STATE.perfilAbogado.nombre)||nombreUsuario()||'Acervo'; }
function _causaTimbre(){ const d=new Date(); const f=d.toLocaleDateString('es-CL',{day:'2-digit',month:'long',year:'numeric'})+' · '+d.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'}); return `Generado en Acervo · ${escapeHtml(_estudioNombre())} · ${f}`; }
function openExportCausa(id){
  const ex=EXPEDIENTES.find(x=>x.id===id); if(!ex) return;
  const old=document.getElementById('export-causa-ov'); if(old) old.remove();
  const ov=document.createElement('div'); ov.id='export-causa-ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(5,10,18,.62);backdrop-filter:blur(3px);z-index:6000;display:flex;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML=`<div style="background:var(--navy2);border:1px solid rgba(201,168,76,.25);border-radius:16px;max-width:450px;width:100%;padding:20px;box-shadow:0 30px 80px rgba(0,0,0,.6)">
     <div style="font-size:16px;font-weight:800;color:var(--gold3);margin-bottom:3px">🖨️ Exportar causa</div>
     <div style="font-size:12px;color:var(--gray2);margin-bottom:14px">${escapeHtml(ex.name||'Causa')}</div>
     <div style="display:flex;flex-direction:column;gap:9px">
       <button class="btn-ghost exp-fmt" data-f="lista" style="text-align:left;padding:12px 14px">📋 <b>Lista</b> — todos los datos en un documento ordenado</button>
       <button class="btn-ghost exp-fmt" data-f="fichas" style="text-align:left;padding:12px 14px">🗂️ <b>Fichas</b> — datos en tarjetas, de un vistazo</button>
       <button class="btn-ghost exp-fmt" data-f="nota" style="text-align:left;padding:12px 14px">📝 <b>Nota</b> — hoja para escribir a mano (audiencia), con firma</button>
     </div>
     <div style="text-align:right;margin-top:14px"><button class="btn-ghost" onclick="document.getElementById('export-causa-ov').remove()">Cancelar</button></div>
   </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click',ev=>{ if(ev.target===ov) ov.remove(); });
  ov.querySelectorAll('.exp-fmt').forEach(b=>b.onclick=()=>{ ov.remove(); exportCausa(id,b.dataset.f); });
}
function exportCausa(id, fmt){
  const e=EXPEDIENTES.find(x=>x.id===id); if(!e){ toast('Causa no encontrada','error'); return; }
  const cli=findCliente(e.clienteId);
  const partes=(e.partes||[]).map(p=>{ const c=findCliente(p.personaId); return {nombre:(c&&(c.nombre||c.name))||'—', rut:(c&&c.rut)||'', rol:p.rol||p.calidad||p.baseRole||''}; });
  const evs=causaEventos(id).slice().sort((a,b)=>(((a.date||'')+(a.time||''))<((b.date||'')+(b.time||''))?-1:1));
  const docs=expDocs(id);
  const notas=(e.notas||[]).filter(n=>(n.text||'').trim());
  const dg=[['Carátula',e.name],['RIT / ROL',e.rit||e.rol],['Tribunal',e.tribunal],['Materia',e.materia],['Procedimiento',e.tipo],['Estado',e.estado],['Cliente',cli?((cli.nombre||cli.name)+(cli.rut?' · '+cli.rut:'')):e.cliente]].filter(r=>r[1]);
  const body = fmt==='nota' ? _causaNotaHTML(e,dg,evs)
             : fmt==='fichas' ? _causaFichasHTML(e,dg,partes,evs,docs,notas)
             : _causaListaHTML(e,dg,partes,evs,docs,notas);
  _openPrintWindow(body, e.name||'Causa');
}
function _evLine(ev){ const m=(typeof _evMeta==='function')?_evMeta(ev):['📌','',null]; const f=(typeof _fmtFecha==='function')?_fmtFecha(ev.date):ev.date; return `${m[0]||'📌'} ${escapeHtml(f||'')}${ev.time?' '+escapeHtml(ev.time):''} — ${escapeHtml(ev.text||m[1]||'')}`; }
function _kvHTML(rows){ return `<table class="kv">${rows.map(r=>`<tr><th>${escapeHtml(r[0])}</th><td>${escapeHtml(r[1]||'')}</td></tr>`).join('')}</table>`; }
function _sec(title, inner){ return inner ? `<h2>${escapeHtml(title)}</h2>${inner}` : ''; }
function _causaListaHTML(e,dg,partes,evs,docs,notas){
  const partesH = partes.length ? `<ul>${partes.map(p=>`<li><b>${escapeHtml(p.nombre)}</b>${p.rut?' · '+escapeHtml(p.rut):''}${p.rol?' — '+escapeHtml(p.rol):''}</li>`).join('')}</ul>` : '';
  const evsH = evs.length ? `<ul>${evs.map(ev=>`<li>${_evLine(ev)}</li>`).join('')}</ul>` : '';
  const docsH = docs.length ? `<ol>${docs.map(d=>`<li>${escapeHtml(d.title||'Documento')}</li>`).join('')}</ol>` : '';
  const notasH = notas.length ? `<ul>${notas.map(n=>`<li>${escapeHtml(n.text)}</li>`).join('')}</ul>` : '';
  return `<h1>${escapeHtml(e.name||'Causa')}</h1>${_kvHTML(dg)}
    ${_sec('Partes', partesH)}${_sec('Audiencias y plazos', evsH)}${_sec('Documentos', docsH)}${_sec('Comentarios / notas', notasH)}`;
}
function _causaFichasHTML(e,dg,partes,evs,docs,notas){
  const card=(t,inner)=> inner?`<div class="card"><h3>${escapeHtml(t)}</h3>${inner}</div>`:'';
  const partesH = partes.length ? partes.map(p=>`<div class="chip"><b>${escapeHtml(p.nombre)}</b><small>${[p.rut,p.rol].filter(Boolean).map(escapeHtml).join(' · ')}</small></div>`).join('') : '';
  const evsH = evs.length ? evs.map(ev=>`<div class="row">${_evLine(ev)}</div>`).join('') : '';
  const docsH = docs.length ? docs.map(d=>`<div class="row">📄 ${escapeHtml(d.title||'Documento')}</div>`).join('') : '';
  const notasH = notas.length ? notas.map(n=>`<div class="row">🗒️ ${escapeHtml(n.text)}</div>`).join('') : '';
  return `<h1>${escapeHtml(e.name||'Causa')}</h1>
    <div class="cards">
      ${card('Datos generales', _kvHTML(dg))}
      ${card('Partes', partesH)}
      ${card('Audiencias y plazos', evsH)}
      ${card('Documentos', docsH)}
      ${card('Comentarios / notas', notasH)}
    </div>`;
}
function _causaNotaHTML(e,dg,evs){
  const key=dg.filter(r=>['Carátula','RIT / ROL','Tribunal','Materia'].includes(r[0]));
  const prox=evs.find(ev=>!ev.done);
  const lines=Array.from({length:20}).map(()=>`<div class="wl"></div>`).join('');
  return `<div class="nota-head">
      <div class="nota-title">${escapeHtml(e.name||'Causa')}</div>
      ${_kvHTML(key)}
      ${prox?`<div class="nota-prox">Próxima: ${_evLine(prox)}</div>`:''}
      <div class="nota-meta">Fecha: __________________   ·   Lugar: ______________________________</div>
    </div>
    <h2 style="margin-top:14px">Notas</h2>
    <div class="lines">${lines}</div>
    <div class="sig"><div class="sig-line"></div><div class="sig-cap">Firma</div></div>`;
}
const _CAUSA_PRINT_CSS=`
  *{box-sizing:border-box} html,body{margin:0}
  body{font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;background:#f3f4f6}
  .pbar{position:sticky;top:0;display:flex;align-items:center;gap:12px;background:#0A1628;color:#F5E4A8;padding:10px 16px;font-family:system-ui,sans-serif;font-size:13px}
  .pbar button{background:#C9A84C;color:#0A1628;border:none;border-radius:8px;padding:9px 15px;font-weight:700;cursor:pointer;font-size:13px}
  .page{background:#fff;max-width:800px;margin:18px auto;padding:40px 46px;box-shadow:0 6px 30px rgba(0,0,0,.18);min-height:900px;position:relative}
  h1{font-size:22px;margin:0 0 16px;text-align:center;border-bottom:2px solid #0A1628;padding-bottom:10px}
  h2{font-size:15px;margin:20px 0 8px;color:#0A1628;border-bottom:1px solid #ccc;padding-bottom:3px}
  h3{font-size:13px;margin:0 0 8px;color:#8a6d1f;text-transform:uppercase;letter-spacing:.5px}
  table.kv{width:100%;border-collapse:collapse;font-size:13.5px}
  table.kv th{text-align:left;width:32%;padding:5px 8px 5px 0;color:#555;font-weight:600;vertical-align:top}
  table.kv td{padding:5px 0;border-bottom:1px solid #eee}
  ul,ol{margin:4px 0;padding-left:22px;font-size:13.5px;line-height:1.7}
  .cards{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:8px}
  .card{border:1px solid #d8d2c2;border-radius:10px;padding:13px 15px;background:#fcfbf7}
  .chip{display:block;padding:5px 0;border-bottom:1px solid #eee;font-size:13px} .chip small{color:#666;display:block}
  .row{font-size:13px;padding:4px 0;border-bottom:1px solid #f0f0f0}
  .nota-head{border:1.5px solid #0A1628;border-radius:10px;padding:14px 16px;background:#fafaf7}
  .nota-title{font-size:18px;font-weight:700;text-align:center;margin-bottom:10px}
  .nota-prox{font-size:13px;margin-top:8px;color:#7a2b2b}
  .nota-meta{font-size:13px;margin-top:10px;color:#333}
  .lines{margin-top:6px}
  .wl{height:30px;border-bottom:1px solid #b9c0cc}
  .sig{margin-top:34px;text-align:right}
  .sig-line{display:inline-block;width:260px;border-bottom:1.5px solid #333;height:40px}
  .sig-cap{width:260px;text-align:center;display:inline-block;font-size:12px;color:#555;margin-top:3px}
  .timbre{position:absolute;left:46px;right:46px;bottom:22px;border-top:1px solid #ddd;padding-top:6px;font-family:system-ui,sans-serif;font-size:10px;color:#999;text-align:center}
  @media print{ body{background:#fff} .pbar,.noprint{display:none!important} .page{box-shadow:none;margin:0;max-width:none;min-height:auto;padding:0 6mm} @page{margin:14mm} }
`;
function _openPrintWindow(bodyHtml, title){
  const w=window.open('','_blank'); if(!w){ toast('Permite ventanas emergentes para imprimir/descargar','error'); return; }
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>${_CAUSA_PRINT_CSS}</style></head><body> <!-- xss-reviewed: reviewed print shell with escaped title and app-built body -->
    <div class="pbar"><button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button><span>${escapeHtml(title)}</span></div>
    <div class="page">${bodyHtml}<div class="timbre">${_causaTimbre()}</div></div></body></html>`); // xss-reviewed: reviewed print shell with escaped title and app-built body
  w.document.close();
}
function causaEventosHTML(id){
  const evs=causaEventos(id).sort((a,b)=>{ if(!!a.done!==!!b.done) return a.done?1:-1; return ((a.date+(a.time||''))<(b.date+(b.time||''))?-1:1); });
  const hoy=_todayISO();
  const filas=evs.map(ev=>{ const mt=_evMeta(ev); const venc=ev.date&&ev.date<hoy&&!ev.done;
    return `<div class="exp-ev ${ev.done?'ev-done':''} ${venc?'ev-late':''}">
      <input type="checkbox" ${ev.done?'checked':''} onclick="event.stopPropagation();evToggleDone('${ev.id}')" title="Marcar hecho">
      <span class="exp-ev-ic" style="--ec:${mt[2]}">${mt[0]}</span>
      <span class="exp-ev-t" onclick="evEdit('${ev.id}')"><b>${escapeHtml(ev.text)}</b><span class="exp-ev-d">${_fmtFecha(ev.date)}${ev.time?' · '+escapeHtml(ev.time):''}${ev.done?'':' · '+(_diasFalta(ev.date)||'')}</span></span>
    </div>`;}).join('');
  return `<div class="exp-ev-box"><div class="exp-ev-h">📅 Agenda <button class="exp-ev-add" onclick="openEventEditor('${id}')" title="Agendar">＋</button></div>
    ${filas||'<div class="exp-ev-empty">Sin audiencias ni plazos.</div>'}</div>`;
}
function evToggleDone(id){ const x=(STATE.recordatorios||[]).find(e=>e.id===id); if(x){ x.done=!x.done; saveState(); if(_curExp) openExpediente(_curExp); renderRail(); } }
// Hoja de acciones de la causa (móvil): sube desde abajo con todo lo demás
function openCausaSheet(id){
  const acts=[['📋','Datos',`expTab('datos','${id}')`],['🎨','Apariencia',`expTab('look','${id}')`],['🤝','Compartir',`expTab('share','${id}')`],
    ['✍️','Redactar (escrito, libre, contrato…)',`openRedactar('${id}')`],['📅','Agendar audiencia/plazo',`openEventEditor('${id}')`],['📋','Pegar personas',`openPegarPersonas('${id}')`],['📌','Agregar nota',`addExpNota('${id}')`],['⬆','Subir documento (PDF/JPG)',`addExdocFile('${id}')`],['🖨️','Exportar / imprimir',`openExportCausa('${id}')`]];
  let sh=document.getElementById('causa-sheet');
  if(!sh){ sh=document.createElement('div'); sh.id='causa-sheet'; sh.className='sheet-back'; document.body.appendChild(sh); }
  sh.innerHTML=`<div class="sheet" onclick="event.stopPropagation()"><div class="sheet-h">Acciones</div>${acts.map(a=>`<button class="sheet-item" onclick="closeCausaSheet();${a[2]}">${a[0]} ${a[1]}</button>`).join('')}<button class="sheet-cancel" onclick="closeCausaSheet()">Cancelar</button></div>`;
  sh.onclick=closeCausaSheet; requestAnimationFrame(()=>sh.classList.add('open'));
}
function closeCausaSheet(){ const sh=document.getElementById('causa-sheet'); if(sh) sh.classList.remove('open'); }
// Acceso rápido: copiar RUT / Clave Única del cliente para ingresar a los portales en su nombre
function _causaPersonasIds(e){ const ids=[]; _clienteIds(e).forEach(id=>{ if(id && !ids.includes(id)) ids.push(id); }); (e.partes||[]).forEach(p=>{ if(p.personaId && !ids.includes(p.personaId)) ids.push(p.personaId); }); return ids; }
function copiarDato(v,label){ if(!v) return; try{ navigator.clipboard.writeText(v); toast((label||'Dato')+' copiado ✓','success'); }catch(_){ toast('No se pudo copiar','error'); } }
function copiarRut(id){ const p=findCliente(id); if(p) copiarDato(p.rut,'RUT'); }
function copiarClave(id){ const p=findCliente(id); if(p) copiarDato(p.claveUnica,'Clave Única'); }
function copiarIndiv(id){ const p=findCliente(id); if(p) copiarDato(stripMarks(buildIndividualizacion(p)),'Individualización'); }
// Individualización del COMPARECIENTE completo: junta a TODOS los clientes de la causa
// (el 1º sin don; del 2º en adelante con don/doña según género — lo maneja buildIndividualizacionGroup)
function copiarComparecienteIndiv(id){
  const e=EXPEDIENTES.find(x=>x.id===id); if(!e) return;
  const clis=_clienteIds(e).map(findCliente).filter(Boolean);
  if(!clis.length){ toast('La causa no tiene clientes cargados','error'); return; }
  const txt = clis.length>1 ? buildIndividualizacionGroup(clis) : buildIndividualizacion(clis[0]);
  copiarDato(stripMarks(txt), clis.length>1 ? 'Individualización de los clientes' : 'Individualización');
}
function copiarDatosCausa(id){
  const e=EXPEDIENTES.find(x=>x.id===id); if(!e) return;
  const L=[]; const add=(k,v)=>{ if(v) L.push(k+': '+v); };
  add('Caratulado', e.name); add('RIT/Rol', e.rit||e.rol); add('Tribunal', e.tribunal);
  add('Materia', e.materia); add('Procedimiento', e.tipo); add('Estado', e.estado);
  copiarDato(L.join('\n'),'Datos de la causa');
}
function causaCredsHTML(id){
  const e=EXPEDIENTES.find(x=>x.id===id); if(!e) return '';
  const ps=_causaPersonasIds(e).map(findCliente).filter(Boolean);   // todas las personas (para individualización), no solo con clave
  const nCli=_clienteIds(e).map(findCliente).filter(Boolean).length;
  const hayDatos = e.name||e.rit||e.rol||e.tribunal||e.materia;
  if(!ps.length && !hayDatos) return '';
  const filas=ps.map(p=>`<div class="exp-cred"><span class="exp-cred-n">${escapeHtml(p.nombre||'—')}</span>
    <span class="exp-cred-b"><button onclick="event.stopPropagation();copiarIndiv('${p.id}')" title="Copiar individualización completa">🧾 Indiv.</button>${p.rut?`<button onclick="event.stopPropagation();copiarRut('${p.id}')" title="Copiar RUT">RUT</button>`:''}${p.claveUnica?`<button onclick="event.stopPropagation();copiarClave('${p.id}')" title="Copiar Clave Única">🔐 Clave</button>`:''}</span></div>`).join('');
  const btnCli = nCli?`<button class="exp-ev-add" style="width:auto;padding:2px 8px;font-size:10px" onclick="copiarComparecienteIndiv('${id}')" title="Copiar la individualización de ${nCli>1?'todos los clientes juntos (regla don/doña)':'el cliente'}">🧾 ${nCli>1?'clientes':'cliente'}</button>`:'';
  return `<div class="exp-ev-box"><div class="exp-ev-h">📋 Copiar ${btnCli}${hayDatos?`<button class="exp-ev-add" style="width:auto;padding:2px 8px;font-size:10px" onclick="copiarDatosCausa('${id}')" title="Copiar los datos de la causa">datos causa</button>`:''}</div>${filas||'<div class="exp-ev-empty">Sin partes cargadas.</div>'}</div>`;
}
// Documentos/libros/apuntes ANEXADOS a la causa (enlazados: el mismo archivo de estudio)
function causaAnexosHTML(id){
  const e=EXPEDIENTES.find(x=>x.id===id); if(!e||!(e.anexos&&e.anexos.length)) return '';
  const items=e.anexos.map(did=>({did, d:findDoc(did)})).filter(x=>x.d);
  if(!items.length) return '';
  return `<div class="exp-ev-box"><div class="exp-ev-h">📎 Anexados (de estudio)</div>`+items.map(({did,d})=>`<div class="exp-cred"><span class="exp-cred-n" style="cursor:pointer" onclick="_openAnexo('${did}','${id}')" title="Abrir">${escapeHtml(d.title||'Documento')}</span><span class="exp-cred-b"><button onclick="event.stopPropagation();_openAnexo('${did}','${id}')">Abrir</button><button onclick="event.stopPropagation();quitarAnexo('${id}','${did}')" title="Quitar de la causa">✕</button></span></div>`).join('')+`</div>`;
}
function _openAnexo(docId, causaId){ _readerCtxOverride=causaId; openReader(docId); }
function quitarAnexo(causaId, docId){ const e=EXPEDIENTES.find(x=>x.id===causaId); if(!e||!e.anexos) return; e.anexos=e.anexos.filter(x=>String(x)!==String(docId)); e.updated=Date.now(); saveState(); if(_curExp===causaId) openExpediente(causaId); }
function anexarReaderACausa(){ const d=findDoc(STATE.currentDocId); if(!d) return; openAnexarPicker(d.id); }
function openAnexarPicker(docId){
  const causas=EXPEDIENTES.filter(e=>!e.shared).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  document.getElementById('pegar-body').innerHTML=`<div class="modal-title">📎 Anexar a una causa</div>
    <div style="font-size:12.5px;color:var(--gray2);margin-bottom:10px">El documento aparecerá dentro de la carpeta de la causa. Es el <b>mismo archivo</b> (no se copia); tus notas quedan separadas por lugar.</div>
    <select class="form-select" id="anexar-causa">${causas.length?causas.map(e=>`<option value="${e.id}">${escapeHtml(causaLabel(e))}</option>`).join(''):'<option value="">(no tienes causas)</option>'}</select>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" onclick="anexarGo('${docId}')">Anexar</button></div>`;
  openModal('modal-pegar');
}
function anexarGo(docId){
  const cid=(document.getElementById('anexar-causa')||{}).value; const e=EXPEDIENTES.find(x=>x.id===cid);
  if(!e){ toast('Elige una causa','error'); return; }
  e.anexos=e.anexos||[]; if(!e.anexos.some(x=>String(x)===String(docId))){ e.anexos.push(docId); e.updated=Date.now(); saveState(); toast('Anexado a '+(e.name||'la causa'),'success'); } else toast('Ya estaba anexado');
  closeAllModals();
  if(_curExp===cid) openExpediente(cid);   // refresca la causa abierta para que el anexo aparezca al instante
}
function openExpediente(id, forceCentered){
  const e=EXPEDIENTES.find(x=>x.id===id); if(!e)return;
  // La carpeta se abre en modo NORMAL (centrada) por defecto; el flotante queda solo para documentos
  // (y sigue disponible a mano para causas vía el botón ⧉).
  _curExp=id;
  const ov=document.getElementById('exp-overlay'); if(!ov)return;
  touchTab('causa', id, e.name||'Carpeta', e.prep?'📝':'📁');
  const posts=[];
  if(e.plazo) posts.push(['⏰ Plazo',e.plazo,'#ffe27a']);
  if(e.estado) posts.push(['📌 Estado',e.estado,'#aee6ff']);
  if(e.abogado) posts.push(['👤 Abogado',e.abogado,'#caffbf']);
  const partesTxt=(e.partes||[]).map(p=>{ const per=findCliente(p.personaId); return per?`${per.nombre} (${p.rol})`:''; }).filter(Boolean).join(' · ');
  const rows=[['RIT / Rol',e.rit||e.rol],['Tribunal',e.tribunal],['Cliente',e.cliente],['Contraparte',e.contraparte],['Partes',partesTxt],['Tipo (área)',e.tipo],['Materia / acción',e.materia],['Cuantía',e.cuantia]].filter(r=>r[1]);
  // (Compareciente quitado de la ficha: se muestra solo en "Partes"; la individualización se usa al redactar)
  const docs=expDocs(id);
  const anexados=(e.anexos||[]).map(did=>findDoc(did)).filter(Boolean);   // docs de estudio anexados: se muestran como un documento más (con marca 📎)
  const mob=isMobile();
  // Escritorio: todos los botones en fila. Móvil: acción principal + "⊕ Acciones" que abre una hoja inferior.
  const optsHtml= mob
    ? `<div class="exp-opts">
        <button class="exp-opt-btn" style="flex:1" onclick="openRedactar('${id}')">✍️ Redactar</button>
        <button class="exp-opt-btn" style="flex:1" onclick="openCausaSheet('${id}')">⊕ Acciones</button>
      </div>`
    : `<div class="exp-opts">
        <button class="exp-opt-btn" onclick="expTab('datos','${id}')">📋 Datos</button>
        <button class="exp-opt-btn" onclick="expTab('look','${id}')">🎨 Apariencia</button>
        <button class="exp-opt-btn" onclick="expTab('share','${id}')">🤝 Compartir</button>
        <button class="exp-opt-btn" onclick="openExportCausa('${id}')">🖨️ Exportar</button>
        <span style="margin-left:auto;display:flex;gap:8px">
          <button class="exp-opt-btn" onclick="openRedactar('${id}')">✍️ Redactar</button>
          <button class="exp-opt-btn" onclick="openEventEditor('${id}')">📅 Agendar</button>
          <button class="exp-opt-btn" onclick="openPegarPersonas('${id}')">📋 Pegar personas</button>
          <button class="exp-opt-btn" onclick="addExpNota('${id}')">📌 Nota</button>
        </span>
      </div>`;
  const fichaRows=rows.map(r=>`<div><b>${r[0]}:</b> ${escapeHtml(r[1])}</div>`).join('')||'<div style="opacity:.55">Sin datos cargados</div>';
  if(mob){
    ov.innerHTML=`
    <div class="exp-folder-real exp-mob" style="--fc:${e.color||'#e3c074'}">
      <div class="exp-real-tab">📁 ${escapeHtml(causaLabel(e))}</div>
      <button class="exp-float-btn" title="Abrir como ventana flotante (mover libre; abrir varias)" onclick="floatCurrentCausa('${id}')">⧉</button>
      <button class="exp-max-btn" id="exp-max-btn" title="Ampliar" onclick="toggleExpMax()">⛶</button>
      <button class="exp-close" title="Cerrar" onclick="closeExpediente()">✕</button>
      ${optsHtml}
      <div class="exp-inner exp-inner-mob">
        <div class="exp-ficha-mob">
          <div class="efm-title">${escapeHtml(causaLabel(e))}</div>
          <div class="efm-rows">${fichaRows}</div>
          ${e.obs?`<div class="exp-ficha-obs">${escapeHtml(e.obs)}</div>`:''}
          ${posts.length?`<div class="efm-posts">${posts.map(p=>`<span class="efm-post" style="--pc:${p[2]}"><b>${p[0]}:</b> ${escapeHtml(p[1])}</span>`).join('')}</div>`:''}
          ${causaCredsHTML(id)}
          ${causaEventosHTML(id)}
        </div>
        <div class="exp-mlist-label">📄 Documentos · toca para abrir</div>
        <div class="exp-mlist" id="exp-docs-grid">${docs.length||anexados.length||(e.notas||[]).length?'':'<div class="exp-nodocs" style="position:static;transform:none">Sin documentos. Arrastra aquí un PDF/imagen · o usa ✍ Escrito.</div>'}</div>
      </div>
    </div>`;
  } else {
    ov.innerHTML=`
    <div class="exp-folder-real" style="--fc:${e.color||'#e3c074'}">
      <div class="exp-real-tab">📁 ${escapeHtml(causaLabel(e))}</div>
      <button class="exp-float-btn" title="Abrir como ventana flotante (mover libre; abrir varias)" onclick="floatCurrentCausa('${id}')">⧉</button>
      <button class="exp-max-btn" id="exp-max-btn" title="Ampliar" onclick="toggleExpMax()">⛶</button>
      <button class="exp-close" title="Cerrar" onclick="closeExpediente()">✕</button>
      ${optsHtml}
      <div class="exp-inner">
        <div class="exp-flap exp-flap-left">
          <div class="exp-ficha">
            <div class="exp-clip"></div>
            <div class="exp-ficha-title">${escapeHtml(causaLabel(e))}</div>
            <div class="exp-ficha-rows">${fichaRows}</div>
            ${e.obs?`<div class="exp-ficha-obs">${escapeHtml(e.obs)}</div>`:''}
            ${causaCredsHTML(id)}
            ${causaEventosHTML(id)}
          </div>
          ${posts.map((p,i)=>`<div class="exp-post" style="--pc:${p[2]};--rot:${(i%2?3:-3)}deg"><b>${p[0]}</b><span>${escapeHtml(p[1])}</span></div>`).join('')}
        </div>
        <div class="exp-flap exp-flap-right">
          <div class="exp-right-label">📄 Documentos<br><small>arrástralos por la carpeta</small></div>
        </div>
        <div class="exp-docs-layer" id="exp-docs-grid">${docs.length||anexados.length?'':'<div class="exp-nodocs">Sin documentos. Arrastra aquí un PDF/imagen · o usa ✍ Escrito.</div>'}</div>
      </div>
    </div>`;
  }
  ov.classList.add('open');
  const grid=document.getElementById('exp-docs-grid');
  if(mob){
    docs.forEach(x=> grid.appendChild(makeExdocRow(x)));
    anexados.forEach(d=> grid.appendChild(makeAnexoRow(d, id)));
    (e.notas||[]).forEach(n=> grid.appendChild(makeNotaRow(n, id)));
  } else {
    docs.forEach((x,i)=> grid.appendChild(makeExdocCard(x,i)));
    anexados.forEach((d,k)=> grid.appendChild(makeAnexoCard(d, id, docs.length+k)));
    (e.notas||[]).forEach(n=> grid.appendChild(makeNotaCard(n, id)));
  }
  // Arrastrar archivos/fotos DESDE FUERA (escritorio) hacia la carpeta
  const fr=ov.querySelector('.exp-folder-real');
  if(fr){
    fr.addEventListener('dragover', e=>{ if(e.dataTransfer && [...e.dataTransfer.types].includes('Files')){ e.preventDefault(); fr.classList.add('drop-on'); } });
    fr.addEventListener('dragleave', e=>{ if(e.target===fr) fr.classList.remove('drop-on'); });
    fr.addEventListener('drop', e=>{ const files=[...(e.dataTransfer&&e.dataTransfer.files||[])]; if(files.length){ e.preventDefault(); fr.classList.remove('drop-on');
      let pos=null; const layer=document.getElementById('exp-docs-grid'); if(layer && STATE.expView!=='list'){ const r=layer.getBoundingClientRect(); pos={x:e.clientX-r.left, y:e.clientY-r.top}; }
      addFilesToExpediente(id, files, pos); } });
  }
  if(!mob && fr){                                   // PC: carpeta ampliable (recuerda) + movible por la pestaña
    fr.classList.toggle('exp-max', !!STATE.expMax);
    const mb=document.getElementById('exp-max-btn'); if(mb){ mb.textContent=STATE.expMax?'🗗':'⛶'; mb.title=STATE.expMax?'Restaurar tamaño':'Ampliar'; }
    _initExpDrag(fr);
  }
}
// Carpeta abierta: ⛶ ampliar/restaurar (recordado) y mover arrastrando la pestaña (solo PC)
function toggleExpMax(){
  const fr=document.querySelector('#exp-overlay .exp-folder-real'); if(!fr) return;
  const on=!fr.classList.contains('exp-max'); STATE.expMax=on; saveState();
  fr.classList.toggle('exp-max', on);
  fr.classList.remove('exp-moved'); fr.style.left=fr.style.top=fr.style.margin='';   // recentra al ampliar/restaurar
  const b=document.getElementById('exp-max-btn'); if(b){ b.textContent=on?'🗗':'⛶'; b.title=on?'Restaurar tamaño':'Ampliar'; }
}
function _initExpDrag(fr){
  const tab=fr.querySelector('.exp-real-tab'); if(!tab) return;
  let sx=0,sy=0,ox=0,oy=0,drag=false;
  tab.addEventListener('pointerdown',e=>{
    if(e.target.closest('button')) return;
    const r=fr.getBoundingClientRect();
    fr.classList.add('exp-moved'); fr.style.left=r.left+'px'; fr.style.top=r.top+'px'; fr.style.margin='0';
    sx=e.clientX;sy=e.clientY;ox=r.left;oy=r.top;drag=true;
    try{tab.setPointerCapture(e.pointerId);}catch(_){}
  });
  tab.addEventListener('pointermove',e=>{ if(!drag)return;
    let nx=Math.max(4,Math.min(ox+(e.clientX-sx), innerWidth-160)), ny=Math.max(4,Math.min(oy+(e.clientY-sy), innerHeight-70));
    fr.style.left=nx+'px'; fr.style.top=ny+'px'; });
  const end=e=>{ if(!drag)return; drag=false; try{tab.releasePointerCapture(e.pointerId);}catch(_){} };
  tab.addEventListener('pointerup',end); tab.addEventListener('pointercancel',end);
}
// ══ CARPETAS FLOTANTES: varias causas como ventanas movibles/redimensionables (PC) ══
let _folderWins=[];
function _folderFront(el){ document.querySelectorAll('.folder-win').forEach(w=>w.style.zIndex='435'); if(el) el.style.zIndex='438'; }
function floatCurrentCausa(id){ openCausaFloat(id); closeExpediente(); }   // convierte la causa centrada en ventana flotante
// Abrir un documento DESDE una carpeta flotante → que salga también flotando
function _openFromFolderWin(docId, ctxCausa){
  if(ctxCausa) _readerCtxOverride=ctxCausa;
  openReader(docId);
  if(!_readerFloat && !isMobile()) toggleReaderFloat();
}
function openCausaFloat(id){
  if(isMobile()) return;
  const e=EXPEDIENTES.find(x=>x.id===id); if(!e) return;
  _curExp=id;   // para que las actualizaciones (docs/notas) refresquen esta ventana
  let _reGeom=null; const ex=_folderWins.find(w=>w.id===id); if(ex){ const r=ex.el.getBoundingClientRect(); _reGeom={l:r.left,t:r.top,w:r.width,h:r.height}; ex.el.remove(); _folderWins=_folderWins.filter(w=>w.id!==id); }   // ya abierta → re-renderiza en su lugar (refresca)
  const posts=[]; if(e.plazo)posts.push(['⏰ Plazo',e.plazo,'#ffe27a']); if(e.estado)posts.push(['📌 Estado',e.estado,'#aee6ff']); if(e.abogado)posts.push(['👤 Abogado',e.abogado,'#caffbf']);
  const partesTxt=(e.partes||[]).map(p=>{const per=findCliente(p.personaId);return per?`${per.nombre} (${p.rol})`:'';}).filter(Boolean).join(' · ');
  const rws=[['RIT / Rol',e.rit||e.rol],['Tribunal',e.tribunal],['Cliente',e.cliente],['Contraparte',e.contraparte],['Partes',partesTxt],['Tipo (área)',e.tipo],['Materia / acción',e.materia],['Cuantía',e.cuantia]].filter(r=>r[1]);
  const fichaRows=rws.map(r=>`<div><b>${r[0]}:</b> ${escapeHtml(r[1])}</div>`).join('')||'<div style="opacity:.55">Sin datos cargados</div>';
  const docs=expDocs(id); const anexados=(e.anexos||[]).map(did=>findDoc(did)).filter(Boolean);
  const gid='fwgrid-'+id;
  const win=document.createElement('div'); win.className='folder-win'; win.dataset.causa=id;
  win.style.setProperty('--fc', e.color||'#e3c074');
  const n=_folderWins.length; win.style.left=Math.min(60+n*34, innerWidth-580)+'px'; win.style.top=Math.min(66+n*34, innerHeight-460)+'px'; win.style.width='560px'; win.style.height='62vh';
  if(_reGeom){ win.style.left=_reGeom.l+'px'; win.style.top=_reGeom.t+'px'; win.style.width=_reGeom.w+'px'; win.style.height=_reGeom.h+'px'; }
  win.innerHTML=`<div class="fw-bar"><span class="fw-grip">⠿</span><span class="fw-title">📁 ${escapeHtml(e.name||'Causa')}</span>
      <span class="fw-actions">
        <button class="fw-red" title="Redactar">✍️</button>
        <button class="fw-acc" title="Más acciones">⊕</button>
        <button class="fw-dock" title="Volver a la vista normal (anclar)">🗗</button>
        <button class="fw-min" title="Minimizar">—</button>
        <button class="fw-x" title="Cerrar">✕</button>
      </span></div>
    <div class="fw-body">
      <div class="fw-ficha">
        <div class="efm-title">${escapeHtml(causaLabel(e))}</div>
        <div class="efm-rows">${fichaRows}</div>
        ${e.obs?`<div class="exp-ficha-obs">${escapeHtml(e.obs)}</div>`:''}
        ${posts.length?`<div class="efm-posts">${posts.map(p=>`<span class="efm-post" style="--pc:${p[2]}"><b>${p[0]}:</b> ${escapeHtml(p[1])}</span>`).join('')}</div>`:''}
        ${causaCredsHTML(id)}
        ${causaEventosHTML(id)}
      </div>
      <div class="exp-mlist-label">📄 Documentos · clic para abrir (flotante)</div>
      <div class="exp-mlist" id="${gid}"></div>
    </div>`;
  document.body.appendChild(win);
  const grid=document.getElementById(gid);
  const mkRow=(d, anexo)=>{ const row=document.createElement('div'); row.className='exm-row'+(anexo?' anexo':'');
    row.innerHTML=`<div class="exm-ico exdoc-thumb"></div><div class="exm-name">${escapeHtml(d.title||'Documento')}${anexo?' <span class="anexo-badge-inline">📎 anexado</span>':''}</div>`;
    row.onclick=()=>_openFromFolderWin(d.id, anexo?id:null);
    renderExThumb(d, row.querySelector('.exm-ico')); return row; };
  if(grid){ docs.forEach(d=>grid.appendChild(mkRow(d,false))); anexados.forEach(d=>grid.appendChild(mkRow(d,true)));
    if(!docs.length && !anexados.length){ grid.innerHTML='<div style="font-size:12px;color:#7a6a45;padding:6px">Sin documentos.</div>'; } }
  // asas de redimensión + arrastre + botones
  ['n','s','e','w','ne','nw','se','sw'].forEach(d=>{ const h=document.createElement('div'); h.className='rf-resize rf-'+d; h.dataset.dir=d; win.appendChild(h); });
  _winDragBind(win, win.querySelector('.fw-bar'));
  _winResizeBind(win);
  win.querySelector('.fw-bar').addEventListener('pointerdown',()=>_folderFront(win));
  win.querySelector('.fw-red').onclick=()=>openRedactar(id);
  win.querySelector('.fw-acc').onclick=()=>openCausaSheet(id);
  win.querySelector('.fw-dock').onclick=()=>dockFolderWin(id);
  win.querySelector('.fw-min').onclick=()=>{ win.style.display='none'; renderFolderDock(); };
  win.querySelector('.fw-x').onclick=()=>closeFolderWin(id);
  _folderWins.push({id, el:win}); _folderFront(win); renderFolderDock();
}
function closeFolderWin(id){ const i=_folderWins.findIndex(w=>w.id===id); if(i<0) return; _folderWins[i].el.remove(); _folderWins.splice(i,1); if(_curExp===id) _curExp=null; renderFolderDock(); }
function dockFolderWin(id){ closeFolderWin(id); openExpediente(id, true); }   // vuelve de la ventana flotante a la vista normal (centrada)
// Barra de carpetas minimizadas (arriba a la izquierda)
function renderFolderDock(){
  let dock=document.getElementById('folder-dock');
  const mins=_folderWins.filter(w=>w.el.style.display==='none');
  if(!mins.length){ if(dock) dock.remove(); return; }
  if(!dock){ dock=document.createElement('div'); dock.id='folder-dock'; document.body.appendChild(dock); }
  dock.innerHTML=mins.map(w=>{ const e=EXPEDIENTES.find(x=>x.id===w.id); return `<button class="fd-pill" onclick="restoreFolderWin('${w.id}')">📁 ${escapeHtml((e&&e.name)||'Causa')}</button>`; }).join('');
}
function restoreFolderWin(id){ const w=_folderWins.find(x=>x.id===id); if(w){ w.el.style.display=''; _folderFront(w.el); renderFolderDock(); } }
// Pestañas de opciones del expediente
function expTab(which,id){
  if(which==='datos'){ editExpediente(id); return; }
  if(which==='look'){ openExpLook(id); return; }
  if(which==='share'){ openExpShare(id); return; }
}
const FOLDER_COLORS=['#e3c074','#d98c5f','#7fae80','#6fa8d6','#b58fd0','#d97f9b','#9aa3ad'];
function openExpLook(id){
  const e=EXPEDIENTES.find(x=>x.id===id); if(!e)return;
  const sw=FOLDER_COLORS.map(c=>`<button class="exp-sw" style="background:${c}" onclick="setExpColor('${id}','${c}')"></button>`).join('');
  document.getElementById('exp-look-body').innerHTML=`<div style="font-size:12px;color:var(--gray2);margin-bottom:10px">Color de la carpeta</div><div class="exp-sw-row">${sw}</div>`;
  openModal('modal-explook');
}
function setExpColor(id,c){ const e=EXPEDIENTES.find(x=>x.id===id); if(!e)return; e.color=c; e.updated=Date.now(); saveState(); closeAllModals(); openExpediente(id); renderExpedientes(); }
// ══════ CAUSAS COMPARTIDAS (expedientes legales en equipo) ══════
let _sharedCausaIds = new Set();     // ids de causas compartidas visibles (propias compartidas o de terceros)
let _sharedAddedCliente = false;     // marca si al cargar causas compartidas se agregó algún cliente nuevo
function _causaRole(e){ return (e && e.shared) ? (e.myRole||'viewer') : 'owner'; }
function _causaCanEdit(e){ const r=_causaRole(e); return r==='owner'||r==='editor'; }
async function toggleShareCreds(id,on){ const e=EXPEDIENTES.find(x=>x.id===id); if(!e) return; e.shareCreds=on; saveState();
  if(on && !confirm('¿Compartir las Claves Únicas de los clientes de esta causa con quienes tengan acceso?\n\nRecuerda: es una credencial del Estado.')){ e.shareCreds=false; saveState(); openExpShare(id); return; }
  if(_sharedCausaIds.has(id)) await pushSharedCausa(id);
  toast(on?'Las claves se comparten con el equipo':'Las claves ya no se comparten','success'); openExpShare(id); }
function _causaPayload(exId){
  const e=EXPEDIENTES.find(x=>x.id===exId); if(!e) return null;
  const ex={...e}; delete ex.shared; delete ex.myRole; delete ex.sharedOwner;
  const exdocs=EXDOCS.filter(x=>x.expediente===exId).map(d=>{ const c={...d}; delete c.shared; return c; });
  const limpia = e.shareCreds ? (c=>c) : (c=>{ if(!c) return c; const x={...c}; delete x.claveUnica; return x; });   // Clave Única: solo si el dueño lo activó
  const cliente = e.clienteId ? limpia(CLIENTES.find(c=>c.id===e.clienteId)||null) : null;   // la ficha del cliente viaja con la causa
  const personas = (e.partes||[]).map(p=>limpia(CLIENTES.find(c=>c.id===p.personaId))).filter(Boolean);   // y las demás partes
  const recordatorios = (STATE.recordatorios||[]).filter(r=>r.causaId===exId);   // audiencias/plazos/recordatorios de la causa (calendario)
  return { expediente:ex, exdocs, cliente, personas, recordatorios };
}
async function pushSharedCausa(exId){
  if(typeof sb==='undefined'||!sb||!STATE.uid) return false;
  const data=_causaPayload(exId); if(!data) return false;
  try{ const {error}=await sb.from('shared_causas').upsert({id:exId, owner_id:STATE.uid, data, updated_at:new Date().toISOString()}); if(error) throw error; return true; }
  catch(e){ toast('No se pudo sincronizar la causa: '+(e.message||''),'error'); return false; }
}
// sube cambios si la causa abierta es compartida y puedo editar (dueño o editor)
async function syncSharedCausaIfMine(exId){
  const e=EXPEDIENTES.find(x=>x.id===exId); if(!e) return;
  const isShared = e.shared || _sharedCausaIds.has(exId);
  if(isShared && _causaCanEdit(e)) await pushSharedCausa(exId);
}
async function loadSharedCausas(){
  if(typeof sb==='undefined'||!sb||!STATE.uid) return;
  for(let i=EXPEDIENTES.length-1;i>=0;i--) if(EXPEDIENTES[i].shared) EXPEDIENTES.splice(i,1);
  for(let i=EXDOCS.length-1;i>=0;i--) if(EXDOCS[i].shared) EXDOCS.splice(i,1);
  _sharedCausaIds=new Set();
  try{
    const {data:mem}=await sb.from('shared_causa_members').select('causa_id,role').eq('user_id',STATE.uid);
    const roleById={}; (mem||[]).forEach(m=>{ roleById[m.causa_id]=m.role; });
    const {data:rows,error}=await sb.from('shared_causas').select('*');
    if(error) throw error;
    (rows||[]).forEach(r=>{
      _sharedCausaIds.add(r.id);
      const d=r.data||{}; const ex=d.expediente; if(!ex) return;
      if(r.owner_id===STATE.uid){
        if(!EXPEDIENTES.find(x=>x.id===r.id)){ EXPEDIENTES.push({...ex, shared:false}); (d.exdocs||[]).forEach(x=>{ if(!EXDOCS.find(y=>y.id===x.id)) EXDOCS.push(x); }); }
        return;
      }
      const role=roleById[r.id]||'viewer';
      EXPEDIENTES.push({...ex, id:r.id, shared:true, myRole:role, sharedOwner:r.owner_id});
      (d.exdocs||[]).forEach(x=>{ if(!EXDOCS.find(y=>y.id===x.id)) EXDOCS.push({...x, shared:true}); });
      // el cliente de la causa se agrega a MI base de clientes (una copia), si no lo tengo
      const nrm=s=>(s||'').replace(/[.\-\s]/g,'').toLowerCase();
      const addPersona=cl=>{ if(!cl) return; const ya=CLIENTES.find(c=>c.id===cl.id || (cl.rut && nrm(c.rut)===nrm(cl.rut))); if(!ya){ CLIENTES.push({...cl}); _sharedAddedCliente=true; } };
      if(d.cliente) addPersona(d.cliente);
      (d.personas||[]).forEach(addPersona);
      // fechas del calendario de la causa (audiencias/plazos/recordatorios) → a MI agenda, como copia compartida
      if(!STATE.recordatorios) STATE.recordatorios=[];
      (d.recordatorios||[]).forEach(rec=>{ if(!rec||!rec.id) return; if(STATE.recordatorios.find(x=>x.id===rec.id)) return; STATE.recordatorios.push({...rec, causaId:r.id, shared:true, sharedOwner:r.owner_id}); _sharedAddedCliente=true; });
    });
    if(_sharedAddedCliente){ _sharedAddedCliente=false; try{ saveState(); }catch(_){} }
  }catch(e){ /* tablas pueden no existir aún: silencioso */ }
}
async function openExpShare(id){
  const body=document.getElementById('exp-share-body');
  body.innerHTML='<div style="color:var(--gray2);padding:8px">Cargando…</div>';
  openModal('modal-expshare');
  const e=EXPEDIENTES.find(x=>x.id===id); if(!e){ body.innerHTML='Causa no encontrada'; return; }
  const amMember=!!e.shared;                       // soy miembro (no dueño)
  const amOwner=!amMember;                          // está en mi lista personal → soy el dueño
  const isShared=_sharedCausaIds.has(id)||amMember;
  if(typeof sb==='undefined'||!sb){ body.innerHTML='<div style="color:var(--warn)">Necesitas sesión en la nube para compartir.</div>'; return; }
  if(!STATE.profiles || !STATE.profiles.length){ try{ const {data}=await sb.from('profiles').select('id,email,role').order('email'); STATE.profiles=data||[]; }catch(_){} }
  let members=[]; try{ const {data}=await sb.from('shared_causa_members').select('*').eq('causa_id', id); members=data||[]; }catch(_){}
  if(amMember){
    const owner=(STATE.profiles.find(p=>p.id===e.sharedOwner)||{}).email||'otro usuario';
    body.innerHTML=`<div class="modal-title">🤝 ${escapeHtml(e.name||'Causa')}</div>
      <div style="font-size:13px;color:var(--gray2);margin-bottom:10px">Compartida por <b>${escapeHtml(owner)}</b>. Tu acceso: <b>${e.myRole==='editor'?'editor (puedes modificar)':'lector (solo ver)'}</b>.</div>
      <div class="partes-h">Miembros</div>${members.map(m=>`<div style="display:flex;justify-content:space-between;padding:7px 0;font-size:13px;border-bottom:1px solid rgba(255,255,255,.06)"><span>${escapeHtml(memberEmail(m))}</span><span style="color:var(--gray2)">${escapeHtml(m.role)}</span></div>`).join('')}
      <div class="modal-footer" style="justify-content:space-between"><button class="btn-ghost" style="color:var(--danger)" onclick="closeAllModals();deleteExpediente('${id}')">🚪 Salir de la causa</button><button class="btn-gold" onclick="closeAllModals()">Cerrar</button></div>`;
    return;
  }
  // DUEÑO — solo TUS colaboradores (Social), no todos los usuarios
  const others=socialCollaborators().filter(p=>p&&p.id&&p.id!==STATE.uid && !members.find(m=>m.user_id===p.id));
  const memberRows=isShared?(members.length?members.map(m=>{
    const isOwnerRow=m.role==='owner';
    return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.06)">
      <span style="flex:1;font-size:13px">${escapeHtml(memberEmail(m))}</span>
      ${isOwnerRow?'<span style="color:var(--gold);font-size:12px">dueño</span>':`<select class="form-select" style="width:auto;font-size:12px;padding:5px 8px" onchange="setCausaMemberRole('${id}','${m.user_id}',this.value)"><option value="editor" ${m.role==='editor'?'selected':''}>editor</option><option value="viewer" ${m.role==='viewer'?'selected':''}>lector</option></select><button class="btn-ghost" style="color:var(--danger);padding:5px 8px" onclick="removeCausaMember('${id}','${m.user_id}')">✕</button>`}
    </div>`;
  }).join(''):'<div style="font-size:12px;color:var(--gray2)">Aún sin miembros.</div>'):'';
  const inviteRow=`<div class="form-row" style="margin-top:12px"><label class="form-label">Dar acceso a un colaborador</label>
    ${others.length?`<div style="display:flex;gap:8px;flex-wrap:wrap">
      <select class="form-select" id="cau-invite-user" style="flex:1;min-width:140px">${others.map(p=>`<option value="${p.id}">${escapeHtml(p.display_name||p.email||'')}</option>`).join('')}</select>
      <select class="form-select" id="cau-invite-role" style="width:auto"><option value="editor">editor</option><option value="viewer">lector</option></select>
      <button class="btn-gold" onclick="inviteCausaMember('${id}')">Compartir</button>
    </div>`:'<div style="font-size:12px;color:var(--gray2)">No tienes colaboradores disponibles. Agrégalos en <a style="color:var(--gold3);cursor:pointer" onclick="closeAllModals();openSocial()">🌐 Social</a> (invítalos por correo) y luego compárteles la causa.</div>'}</div>`;
  body.innerHTML=`<div class="modal-title">🤝 Compartir causa</div>
    <div style="font-size:13px;color:var(--gray2);margin-bottom:10px">“${escapeHtml(e.name||'Causa')}”. Comparte con colegas de tu estudio para trabajarla en equipo. Los <b>editores</b> pueden modificarla; los <b>lectores</b> solo ven.</div>
    ${isShared?`<div class="partes-h">Miembros con acceso</div>${memberRows}${inviteRow}
      <label class="rw-check" style="margin-top:12px"><input type="checkbox" ${e.shareCreds?'checked':''} onchange="toggleShareCreds('${id}',this.checked)"> 🔐 Incluir las <b>Claves Únicas</b> de los clientes (por defecto NO se comparten)</label>
      <div class="modal-footer" style="justify-content:space-between"><button class="btn-ghost" style="color:var(--danger)" onclick="unshareCausa('${id}')">Dejar de compartir</button><button class="btn-gold" onclick="pushSharedCausa('${id}').then(()=>toast('Actualizado para el equipo','success'))">💾 Actualizar</button></div>`
     : `<button class="btn-gold" onclick="shareCausa('${id}')">🤝 Compartir esta causa</button>
        <div style="font-size:11px;color:var(--gray2);margin-top:8px">Los PDF/imágenes de la causa se comparten en una próxima versión; por ahora se comparten los datos y los escritos.</div>
        <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cerrar</button></div>`}`;
}
function memberEmail(m){ return m.email || ((STATE.profiles||[]).find(p=>p.id===m.user_id)||{}).email || m.user_id; }
async function shareCausa(id){
  const ok=await pushSharedCausa(id); if(!ok) return;
  try{ await sb.from('shared_causa_members').upsert({causa_id:id, user_id:STATE.uid, email:STATE.user||'', role:'owner'}); }catch(_){}
  _sharedCausaIds.add(id); toast('Causa compartida','success');
  pushCausaFiles(id);   // sube los PDF/imágenes de la causa para que el equipo los vea
  openExpShare(id); renderExpedientes();
}
async function inviteCausaMember(id){
  const uid=(document.getElementById('cau-invite-user')||{}).value; const role=(document.getElementById('cau-invite-role')||{}).value||'viewer';
  if(!uid){ toast('Elige un usuario','error'); return; }
  if(!_sharedCausaIds.has(id)){ const ok=await pushSharedCausa(id); if(!ok) return; try{ await sb.from('shared_causa_members').upsert({causa_id:id, user_id:STATE.uid, email:STATE.user||'', role:'owner'}); }catch(_){} _sharedCausaIds.add(id); }
  const email=((STATE.profiles||[]).find(p=>p.id===uid)||{}).email||'';
  try{ const {error}=await sb.from('shared_causa_members').upsert({causa_id:id, user_id:uid, email, role}); if(error) throw error; toast('Invitado','success'); }
  catch(e){ toast('No se pudo invitar: '+(e.message||''),'error'); }
  openExpShare(id);
}
async function setCausaMemberRole(id,uid,role){ try{ await sb.from('shared_causa_members').update({role}).eq('causa_id',id).eq('user_id',uid); toast('Rol actualizado','success'); }catch(e){ toast('Error: '+(e.message||''),'error'); } }
async function removeCausaMember(id,uid){ try{ await sb.from('shared_causa_members').delete().eq('causa_id',id).eq('user_id',uid); openExpShare(id); }catch(e){ toast('Error: '+(e.message||''),'error'); } }
async function unshareCausa(id){
  if(!confirm('¿Dejar de compartir esta causa? Los demás perderán el acceso.')) return;
  try{ await sb.from('shared_causas').delete().eq('id',id); }catch(e){ toast('Error: '+(e.message||''),'error'); return; }
  _sharedCausaIds.delete(id); toast('Dejaste de compartir','success'); closeAllModals(); renderExpedientes();
}
// ════════════════════════════════════════════════════════════════
// LIBROS / APUNTES / DOCUMENTOS compartidos con colegas (con sus notas)
//   Espejo de las causas: el dueño comparte con lectores; sus notas viajan
//   como "notas del autor" (✍️ solo lectura). El receptor conserva las suyas
//   privadas y, si quiere, puede DEVOLVERLE sus notas al dueño (opt-in).
// ════════════════════════════════════════════════════════════════
let _sharedDocIds=new Set();
function _ensureSharedSubject(){ if(!SUBJECTS.find(s=>s.id==='__shared__')) SUBJECTS.push({id:'__shared__', name:'Compartidos', icon:'📢', color:'#C9A84C', progress:0, desc:'Libros compartidos contigo.'}); }
function _findAnyDoc(id){ return DOCUMENTS.find(x=>x.id===id)||APUNTES.find(x=>x.id===id)||DOCUMENTOS.find(x=>x.id===id); }
function _docKindOf(d){ if(!d) return 'libro'; if(d.kind==='apunte'||APUNTES.includes(d)) return 'apunte'; if(d.kind==='documento'||DOCUMENTOS.includes(d)) return 'documento'; return 'libro'; }
function _docArray(kind){ return kind==='apunte'?APUNTES:(kind==='documento'?DOCUMENTOS:DOCUMENTS); }
function _myDocAnns(id){ return ANNOTATIONS.filter(a=>a.docId===id && !a.shared).map(a=>{ const c={...a}; delete c.shared; return c; }); }
function _docPayload(id){
  const d=_findAnyDoc(id); if(!d) return null;
  const kind=_docKindOf(d);
  const doc={...d}; ['shared','sharedDoc','myRole','sharedOwner'].forEach(k=>delete doc[k]);
  const withNotes = d._shareNotes!==false;                 // el dueño eligió al compartir
  return { doc, kind, withNotes, annotations: withNotes ? _myDocAnns(id) : [] };
}
async function pushSharedDoc(id){
  if(typeof sb==='undefined'||!sb||!STATE.uid) return false;
  const data=_docPayload(id); if(!data) return false;
  try{ const {error}=await sb.from('shared_docs').upsert({id, owner_id:STATE.uid, kind:data.kind, data, updated_at:new Date().toISOString()}); if(error) throw error;
       if(data.doc.hasFile) pushDocFile(id);   // PDF/imagen al bucket para el equipo
       return true; }
  catch(e){ toast('No se pudo compartir: '+(e.message||''),'error'); return false; }
}
async function pushDocFile(id){
  try{ const blob=await getFileBlob(id); if(blob) await sb.storage.from(FILE_BUCKET).upload('doc/'+id+'/'+id, blob, {upsert:true, contentType:blob.type||'application/octet-stream'}); }catch(_){}
}
// sube cambios si el doc abierto es MÍO y está compartido (para que el equipo vea las notas al día)
async function syncSharedDocIfMine(id){
  if(!_sharedDocIds.has(id)) return; const d=_findAnyDoc(id);
  if(d && !d.shared) await pushSharedDoc(id);           // soy el dueño
  else if(d && d.shared && d._shareBack) await pushMyDocNotes(id);   // soy receptor que devuelve notas
}
async function loadSharedDocs(){
  if(typeof sb==='undefined'||!sb||!STATE.uid) return;
  for(let i=DOCUMENTS.length-1;i>=0;i--)  if(DOCUMENTS[i].sharedDoc)  DOCUMENTS.splice(i,1);
  for(let i=APUNTES.length-1;i>=0;i--)    if(APUNTES[i].sharedDoc)    APUNTES.splice(i,1);
  for(let i=DOCUMENTOS.length-1;i>=0;i--) if(DOCUMENTOS[i].sharedDoc) DOCUMENTOS.splice(i,1);
  for(let i=ANNOTATIONS.length-1;i>=0;i--) if(ANNOTATIONS[i].shared)  ANNOTATIONS.splice(i,1);
  _sharedDocIds=new Set();
  try{
    const {data:mem}=await sb.from('shared_doc_members').select('doc_id,role,share_notes').eq('user_id',STATE.uid);
    const myMem={}; (mem||[]).forEach(m=>myMem[m.doc_id]=m);
    const {data:rows,error}=await sb.from('shared_docs').select('*'); if(error) throw error;
    let _fcGot=0;
    for(const r of (rows||[])){
      _sharedDocIds.add(r.id);
      if((r.kind||'')==='flashpack'){ if(r.owner_id!==STATE.uid) _fcGot+=_importFlashpack(r); continue; }   // pack de flashcards compartido → copia a mi colección (una vez)
      const data=r.data||{}; const doc=data.doc; if(!doc) continue;
      const kind=r.kind||data.kind||'libro';
      if(r.owner_id===STATE.uid){
        const d=_findAnyDoc(r.id); if(d){ d._shareNotes=(data.withNotes!==false); }
        // notas que ME devolvieron los lectores que optaron por compartirlas
        try{ const {data:mm}=await sb.from('shared_doc_members').select('user_id,email,notes,share_notes').eq('doc_id',r.id);
          (mm||[]).forEach(m=>{ if(m.user_id!==STATE.uid && m.share_notes && Array.isArray(m.notes)) m.notes.forEach(a=>ANNOTATIONS.push({...a, docId:r.id, shared:true, byAuthor:true, readOnly:true, by:m.email||''})); });
        }catch(_){}
        continue;
      }
      const arr=_docArray(kind);
      const extra={};
      if(kind==='libro'){ _ensureSharedSubject(); extra.subject='__shared__'; }   // aparece en el área "Compartidos" del estante
      if(!arr.find(x=>x.id===r.id)) arr.push({...doc, id:r.id, shared:true, sharedDoc:true, myRole:(myMem[r.id]&&myMem[r.id].role)||'viewer', sharedOwner:r.owner_id, _shareBack:!!(myMem[r.id]&&myMem[r.id].share_notes), ...extra});
      (data.annotations||[]).forEach(a=>ANNOTATIONS.push({...a, docId:r.id, shared:true, byAuthor:true, readOnly:true}));   // notas del dueño = del autor
    }
    if(_fcGot>0){ saveState(); toast(`Recibiste ${_fcGot} flashcard(s) compartida(s) 🃏`,'success'); try{renderFlashcards();}catch(_){} }
  }catch(e){ /* tablas pueden no existir aún: silencioso */ }
}
// receptor: sube (o limpia) SUS notas para el dueño
async function pushMyDocNotes(id){
  const on=(_findAnyDoc(id)||{})._shareBack;
  const notes = on ? _myDocAnns(id) : [];
  try{ await sb.from('shared_doc_members').update({notes, share_notes:!!on}).eq('doc_id',id).eq('user_id',STATE.uid); }catch(e){ toast('No se pudo actualizar tus notas: '+(e.message||''),'error'); }
}
async function toggleShareMyNotes(id, on){ const d=_findAnyDoc(id); if(!d) return; d._shareBack=on; await pushMyDocNotes(id); toast(on?'Tus notas ahora las ve el dueño':'Dejaste de compartir tus notas','success'); openDocShare(id); }
async function shareDoc(id){
  const inc=document.getElementById('doc-share-notes'); const withNotes = inc ? inc.checked : true;
  const d=_findAnyDoc(id); if(d) d._shareNotes=withNotes;
  const ok=await pushSharedDoc(id); if(!ok) return;
  try{ await sb.from('shared_doc_members').upsert({doc_id:id, user_id:STATE.uid, email:STATE.user||'', role:'owner'}); }catch(_){}
  _sharedDocIds.add(id); saveState(); toast('Compartido','success'); openDocShare(id);
}
async function inviteDocMember(id){
  const uid=(document.getElementById('doc-invite-user')||{}).value;
  if(!uid){ toast('Elige un colega','error'); return; }
  if(!_sharedDocIds.has(id)){ const ok=await shareDoc(id); if(ok===undefined && !_sharedDocIds.has(id)) return; }
  const email=((STATE.profiles||[]).find(p=>p.id===uid)||{}).email||'';
  try{ const {error}=await sb.from('shared_doc_members').upsert({doc_id:id, user_id:uid, email, role:'viewer'}); if(error) throw error; toast('Invitado','success'); }
  catch(e){ toast('No se pudo invitar: '+(e.message||''),'error'); }
  openDocShare(id);
}
async function removeDocMember(id,uid){ try{ await sb.from('shared_doc_members').delete().eq('doc_id',id).eq('user_id',uid); openDocShare(id); }catch(e){ toast('Error: '+(e.message||''),'error'); } }
async function unshareDoc(id){
  if(!confirm('¿Dejar de compartir? Los demás perderán el acceso (sus notas propias las conservan).')) return;
  try{ await sb.from('shared_docs').delete().eq('id',id); }catch(e){ toast('Error: '+(e.message||''),'error'); return; }
  _sharedDocIds.delete(id); const d=_findAnyDoc(id); if(d) delete d._shareNotes;
  toast('Dejaste de compartir','success'); closeAllModals(); refreshLibrary&&refreshLibrary();
}
async function setDocAllowDownload(id, on){
  const d=_findAnyDoc(id); if(!d) return; d.allowDownload=!!on; saveState();
  if(_sharedDocIds.has(id)){ try{ await pushSharedDoc(id); }catch(_){} }   // re-empuja para que los lectores reciban el permiso
  toast(on?'Los lectores podrán descargarlo ⬇':'Descarga desactivada para los lectores','success');
}
async function openDocShare(id){
  const body=document.getElementById('doc-share-body'); if(!body) return;
  body.innerHTML='<div style="color:var(--gray2);padding:8px">Cargando…</div>'; openModal('modal-docshare');
  const d=_findAnyDoc(id); if(!d){ body.innerHTML='No encontrado'; return; }
  if(typeof sb==='undefined'||!sb){ body.innerHTML='<div style="color:var(--warn)">Necesitas sesión en la nube para compartir.</div>'; return; }
  if(!STATE.profiles || !STATE.profiles.length){ try{ const {data}=await sb.from('profiles').select('id,email,role').order('email'); STATE.profiles=data||[]; }catch(_){} }
  const amRecipient=!!d.shared;
  const titulo=escapeHtml(d.title||'Documento');
  if(amRecipient){
    const owner=(STATE.profiles.find(p=>p.id===d.sharedOwner)||{}).email||'otro usuario';
    body.innerHTML=`<div class="modal-title">🤝 ${titulo}</div>
      <div style="font-size:13px;color:var(--gray2);margin-bottom:12px">Compartido por <b>${escapeHtml(owner)}</b>. Ves sus notas (✍️) en solo lectura; las tuyas son privadas.</div>
      <label class="rw-check"><input type="checkbox" ${d._shareBack?'checked':''} onchange="toggleShareMyNotes('${id}',this.checked)"> Compartir MIS notas con el dueño</label>
      ${d._shareBack?`<div style="margin-top:8px"><button class="btn-ghost" onclick="pushMyDocNotes('${id}').then(()=>toast('Tus notas actualizadas','success'))">💾 Actualizar mis notas</button></div>`:''}
      <div class="modal-footer"><button class="btn-gold" onclick="closeAllModals()">Cerrar</button></div>`;
    return;
  }
  const isShared=_sharedDocIds.has(id);
  let members=[]; if(isShared){ try{ const {data}=await sb.from('shared_doc_members').select('*').eq('doc_id', id); members=data||[]; }catch(_){} }
  const others=socialCollaborators().filter(p=>p&&p.id&&p.id!==STATE.uid && !members.find(m=>m.user_id===p.id));
  const memberRows=isShared?(members.filter(m=>m.role!=='owner').length?members.filter(m=>m.role!=='owner').map(m=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.06)">
      <span style="flex:1;font-size:13px">${escapeHtml(memberEmail(m))}</span>
      ${m.share_notes?'<span style="color:var(--gold);font-size:11px" title="Te comparte sus notas">✍️ te comparte</span>':''}
      <button class="btn-ghost" style="color:var(--danger);padding:5px 8px" onclick="removeDocMember('${id}','${m.user_id}')">✕</button>
    </div>`).join(''):'<div style="font-size:12px;color:var(--gray2)">Aún sin lectores.</div>'):'';
  const inviteRow=`<div class="form-row" style="margin-top:12px"><label class="form-label">Dar acceso a un colaborador</label>
    ${others.length?`<div style="display:flex;gap:8px;flex-wrap:wrap">
      <select class="form-select" id="doc-invite-user" style="flex:1;min-width:150px">${others.map(p=>`<option value="${p.id}">${escapeHtml(p.display_name||p.email||'')}</option>`).join('')}</select>
      <button class="btn-gold" onclick="inviteDocMember('${id}')">Compartir</button>`:`<div style="font-size:12px;color:var(--gray2)">No tienes colaboradores. Agrégalos en <a style="color:var(--gold3);cursor:pointer" onclick="closeAllModals();openSocial()">🌐 Social</a> y luego compárteles.</div><div style="display:none">`}
    </div></div>`;
  body.innerHTML=`<div class="modal-title">🤝 Compartir con colegas</div>
    <div style="font-size:13px;color:var(--gray2);margin-bottom:10px">“${titulo}”. Los colegas lo ven en solo lectura. ${d.hasFile?'El archivo (PDF/imagen) también se comparte. ':''}</div>
    <label class="rw-check"><input type="checkbox" id="doc-share-notes" ${d._shareNotes!==false?'checked':''} ${isShared?'onchange="shareDoc(\''+id+'\')"':''}> Incluir MIS notas (se ven como del autor ✍️)</label>
    <label class="rw-check"><input type="checkbox" id="doc-allow-dl" ${d.allowDownload?'checked':''} onchange="setDocAllowDownload('${id}',this.checked)"> ⬇ Permitir que lo descarguen</label>
    ${isShared?`<div class="partes-h" style="margin-top:12px">Colegas con acceso</div>${memberRows}${inviteRow}
      <div class="modal-footer" style="justify-content:space-between"><button class="btn-ghost" style="color:var(--danger)" onclick="unshareDoc('${id}')">Dejar de compartir</button><button class="btn-gold" onclick="pushSharedDoc('${id}').then(()=>toast('Actualizado para el equipo','success'))">💾 Actualizar</button></div>`
     : `<div style="margin-top:12px"><button class="btn-gold" onclick="shareDoc('${id}')">🤝 Compartir</button></div>
        <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cerrar</button></div>`}`;
}
// menú contextual de una CAUSA (clic derecho)
function causaCtx(e, id){
  const ex=EXPEDIENTES.find(x=>x.id===id); if(!ex) return;
  const items=[{head:ex.name||'Causa'}, {icon:'📂', label:'Abrir', onclick:()=>openExpediente(id)}];
  if(_causaCanEdit(ex)) items.push({icon:'✍️', label:'Redactar', onclick:()=>openRedactar(id)});
  if(!isMobile()) items.push({icon:'🗂', label:'Abrir en pestaña nueva', onclick:()=>{ _tabNew=true; openExpediente(id); }});
  if(ex.prep && _causaCanEdit(ex)) items.push({icon:'📥', label:'Marcar como ingresada…', onclick:()=>marcarIngresada(id)});
  if(!ex.shared) items.push({icon:'🤝', label:(_sharedCausaIds.has(id)?'Gestionar acceso…':'Compartir…'), onclick:()=>openExpShare(id)});
  else items.push({icon:'🤝', label:'Ver acceso…', onclick:()=>openExpShare(id)});
  items.push({sep:true});
  items.push({icon:'🖨️', label:'Exportar / imprimir…', onclick:()=>openExportCausa(id)});
  items.push({sep:true});
  if(ex.shared) items.push({icon:'🚪', label:'Salir de la causa', danger:true, onclick:()=>deleteExpediente(id)});
  else items.push({icon:'🗑', label:'Borrar', danger:true, onclick:()=>deleteExpediente(id)});
  showCtx(e, items);
}
// Tarjeta de documento ARRASTRABLE (como las notas): tap abre · arrastrar acomoda
function makeExdocCard(x,i){
  const card=document.createElement('div'); card.className='exdoc-card';
  if(typeof x.x!=='number'){ x.x=12+(i%3)*132; x.y=12+Math.floor(i/3)*200; }
  card.style.left=x.x+'px'; card.style.top=x.y+'px';
  card.innerHTML=`<div class="exdoc-thumb"></div><div class="exdoc-name">${escapeHtml(x.title||'Documento')}</div><button class="exdoc-ren" title="Renombrar">✏️</button><button class="exdoc-del" title="Borrar">🗑</button>`;
  card.querySelector('.exdoc-del').addEventListener('click',e=>{ e.stopPropagation(); deleteExdoc(x.id); });
  card.querySelector('.exdoc-ren').addEventListener('click',e=>{ e.stopPropagation(); renameExdoc(x.id); });
  card.addEventListener('dragstart', e=>e.preventDefault());   // no "sacar" el archivo; solo reacomodar
  let sx,sy,ox,oy,moved=false,drag=false;
  card.addEventListener('pointerdown',e=>{ if(e.target.closest('.exdoc-del,.exdoc-ren'))return; drag=true;moved=false;sx=e.clientX;sy=e.clientY;ox=x.x;oy=x.y; try{card.setPointerCapture(e.pointerId);}catch(_){}});
  card.addEventListener('pointermove',e=>{ if(!drag)return; const dx=e.clientX-sx,dy=e.clientY-sy; if(!moved&&(Math.abs(dx)>4||Math.abs(dy)>4))moved=true; if(moved){ x.x=Math.max(0,ox+dx); x.y=Math.max(0,oy+dy); card.style.left=x.x+'px'; card.style.top=x.y+'px'; } });
  card.addEventListener('pointerup',()=>{ if(!drag)return; drag=false;
    if(moved){ x.updated=Date.now(); saveState(); return; }
    const now=Date.now();                                    // un clic selecciona, doble clic abre
    if(_exdocLastId===x.id && now-_exdocLastT<380){ openExdoc(x.id); }
    else selectExdocCard(x.id, card);
    _exdocLastId=x.id; _exdocLastT=now;
  });
  card.addEventListener('pointercancel',()=>{ drag=false; });
  renderExThumb(x, card.querySelector('.exdoc-thumb'));
  return card;
}
let _exdocLastId=null,_exdocLastT=0,_exdocSel=null;
function selectExdocCard(id, card){
  _exdocSel=id;
  document.querySelectorAll('.exdoc-card.sel').forEach(c=>c.classList.remove('sel'));
  if(card) card.classList.add('sel');
}
// Post-its del usuario en la carpeta (recordatorios / datos)
const NOTA_COLORS=['#ffe27a','#aee6ff','#caffbf','#ffb3c1','#e0c3fc','#ffffff'];
function addExpNota(exId){
  const e=EXPEDIENTES.find(x=>x.id===exId); if(!e)return;
  e.notas=e.notas||[];
  const k=e.notas.length;
  e.notas.push({id:'nt'+Date.now(), text:'', color:NOTA_COLORS[0], x:24+(k%4)*26, y:24+(k%5)*22, rot:(k%2?2:-2)});
  e.updated=Date.now(); saveState(); openExpediente(exId);
}
function makeNotaCard(n, exId){
  const card=document.createElement('div'); card.className='exp-nota';
  if(typeof n.x!=='number'){ n.x=24; n.y=24; }
  card.style.left=n.x+'px'; card.style.top=n.y+'px'; card.style.setProperty('--nc', n.color||'#ffe27a'); card.style.transform=`rotate(${n.rot||0}deg)`;
  card.innerHTML=`<div class="exp-nota-bar"><span class="exp-nota-grip">📌</span><span style="display:flex;gap:5px"><button class="exp-nota-color" title="Color">🎨</button><button class="exp-nota-del" title="Borrar">🗑</button></span></div><div class="exp-nota-body" contenteditable="true" data-ph="Recordatorio o dato…"></div>`;
  const body=card.querySelector('.exp-nota-body'); body.textContent=n.text||'';
  let t=null;
  body.addEventListener('input',()=>{ n.text=body.innerText; clearTimeout(t); t=setTimeout(saveState,400); });
  body.addEventListener('blur',()=>{ n.text=body.innerText; saveState(); });
  card.querySelector('.exp-nota-del').addEventListener('click',ev=>{ ev.stopPropagation(); if(!confirm('¿Borrar esta nota?'))return; const e=EXPEDIENTES.find(x=>x.id===exId); if(e&&e.notas){ const i=e.notas.findIndex(z=>z.id===n.id); if(i>=0)e.notas.splice(i,1); e.updated=Date.now(); saveState(); openExpediente(exId); } });
  card.querySelector('.exp-nota-color').addEventListener('click',ev=>{ ev.stopPropagation(); const i=NOTA_COLORS.indexOf(n.color); n.color=NOTA_COLORS[(i+1)%NOTA_COLORS.length]; card.style.setProperty('--nc',n.color); saveState(); });
  card.addEventListener('dragstart', e=>e.preventDefault());
  let sx,sy,ox,oy,moved=false,drag=false;
  card.addEventListener('pointerdown',e=>{ if(e.target.closest('.exp-nota-body')||e.target.closest('button'))return; drag=true;moved=false;sx=e.clientX;sy=e.clientY;ox=n.x;oy=n.y; try{card.setPointerCapture(e.pointerId);}catch(_){}});
  card.addEventListener('pointermove',e=>{ if(!drag)return; const dx=e.clientX-sx,dy=e.clientY-sy; if(!moved&&(Math.abs(dx)>3||Math.abs(dy)>3))moved=true; if(moved){ n.x=Math.max(0,ox+dx); n.y=Math.max(0,oy+dy); card.style.left=n.x+'px'; card.style.top=n.y+'px'; } });
  card.addEventListener('pointerup',()=>{ if(!drag)return; drag=false; if(moved){ n.updated=Date.now(); saveState(); } });
  card.addEventListener('pointercancel',()=>{ drag=false; });
  return card;
}
// ── Versión MÓVIL: fila de lista con icono grande (sin arrastrar) ──
function makeExdocRow(x){
  const row=document.createElement('div'); row.className='exm-row';
  row.innerHTML=`<div class="exm-ico exdoc-thumb"></div><div class="exm-name">${escapeHtml(x.title||'Documento')}</div><button class="exm-del exm-ren" title="Renombrar">✏️</button><button class="exm-del" title="Borrar">🗑</button>`;
  row.querySelectorAll('.exm-del')[1].addEventListener('click',e=>{ e.stopPropagation(); deleteExdoc(x.id); });
  row.querySelector('.exm-ren').addEventListener('click',e=>{ e.stopPropagation(); renameExdoc(x.id); });
  row.addEventListener('click',e=>{ if(e.target.closest('.exm-del,.exm-ren'))return; _exdocRowTap(x.id, row, ()=>openExdoc(x.id)); });
  renderExThumb(x, row.querySelector('.exm-ico'));
  return row;
}
// Móvil dentro de causas: un toque selecciona, doble toque abre
function _exdocRowTap(id, row, openFn){
  const now=Date.now();
  if(_exdocLastId===id && now-_exdocLastT<430){ _exdocLastId=null; _exdocLastT=0; openFn(); return; }
  document.querySelectorAll('.exm-row.sel').forEach(c=>c.classList.remove('sel'));
  if(row) row.classList.add('sel'); _exdocSel=id;
  _exdocLastId=id; _exdocLastT=now;
}
// ── Documento ANEXADO (de estudio): se ve como un documento más, con marca 📎.
//    Clic abre en contexto de la causa; ✕ solo lo quita de la causa (no borra el archivo). ──
function makeAnexoCard(d, causaId, i){
  const e=EXPEDIENTES.find(x=>x.id===causaId)||{}; e.anexoPos=e.anexoPos||{};
  let p=e.anexoPos[d.id]; if(!p){ p={x:12+(i%3)*132, y:12+Math.floor(i/3)*200}; e.anexoPos[d.id]=p; }
  const card=document.createElement('div'); card.className='exdoc-card anexo';
  card.style.left=p.x+'px'; card.style.top=p.y+'px';
  card.innerHTML=`<div class="exdoc-thumb"></div><span class="anexo-badge" title="Documento anexado (de estudio)">📎</span><div class="exdoc-name">${escapeHtml(d.title||'Documento')}</div><button class="exdoc-del" title="Quitar de la causa">✕</button>`;
  card.querySelector('.exdoc-del').addEventListener('click',ev=>{ ev.stopPropagation(); quitarAnexo(causaId, d.id); });
  card.addEventListener('dragstart', ev=>ev.preventDefault());
  let sx,sy,ox,oy,moved=false,drag=false;
  card.addEventListener('pointerdown',ev=>{ if(ev.target.closest('.exdoc-del'))return; drag=true;moved=false;sx=ev.clientX;sy=ev.clientY;ox=p.x;oy=p.y; try{card.setPointerCapture(ev.pointerId);}catch(_){}});
  card.addEventListener('pointermove',ev=>{ if(!drag)return; const dx=ev.clientX-sx,dy=ev.clientY-sy; if(!moved&&(Math.abs(dx)>4||Math.abs(dy)>4))moved=true; if(moved){ p.x=Math.max(0,ox+dx); p.y=Math.max(0,oy+dy); card.style.left=p.x+'px'; card.style.top=p.y+'px'; } });
  card.addEventListener('pointerup',()=>{ if(!drag)return; drag=false;
    if(moved){ e.updated=Date.now(); saveState(); return; }
    const now=Date.now();
    if(_exdocLastId===d.id && now-_exdocLastT<380){ _openAnexo(d.id, causaId); }
    else selectExdocCard(d.id, card);
    _exdocLastId=d.id; _exdocLastT=now;
  });
  card.addEventListener('pointercancel',()=>{ drag=false; });
  renderExThumb(d, card.querySelector('.exdoc-thumb'));
  return card;
}
function makeAnexoRow(d, causaId){
  const row=document.createElement('div'); row.className='exm-row anexo';
  row.innerHTML=`<div class="exm-ico exdoc-thumb"></div><div class="exm-name">${escapeHtml(d.title||'Documento')} <span class="anexo-badge-inline">📎 anexado</span></div><button class="exm-del" title="Quitar de la causa">✕</button>`;
  row.querySelector('.exm-del').addEventListener('click',ev=>{ ev.stopPropagation(); quitarAnexo(causaId, d.id); });
  row.addEventListener('click',ev=>{ if(ev.target.closest('.exm-del'))return; _exdocRowTap(d.id, row, ()=>_openAnexo(d.id, causaId)); });
  renderExThumb(d, row.querySelector('.exm-ico'));
  return row;
}
function makeNotaRow(n, exId){
  const row=document.createElement('div'); row.className='exm-row exm-nota';
  row.style.setProperty('--nc', n.color||'#ffe27a');
  row.innerHTML=`<div class="exm-ico exm-nota-ico">📌</div><div class="exm-name exm-nota-body" contenteditable="true" data-ph="Recordatorio o dato…"></div><button class="exm-del" title="Borrar">🗑</button>`;
  const body=row.querySelector('.exm-nota-body'); body.textContent=n.text||'';
  let t=null;
  body.addEventListener('input',()=>{ n.text=body.innerText; clearTimeout(t); t=setTimeout(saveState,400); });
  body.addEventListener('blur',()=>{ n.text=body.innerText; saveState(); });
  row.querySelector('.exm-del').addEventListener('click',ev=>{ ev.stopPropagation(); if(!confirm('¿Borrar esta nota?'))return; const e=EXPEDIENTES.find(x=>x.id===exId); if(e&&e.notas){ const i=e.notas.findIndex(z=>z.id===n.id); if(i>=0)e.notas.splice(i,1); e.updated=Date.now(); saveState(); openExpediente(exId); } });
  return row;
}
async function renderExThumb(x, el){
  try{
    if(x.kind==='exescrito'){ el.classList.add('thumb-paper'); el.textContent=(stripHtml(x.content||'').slice(0,90))||'Escrito vacío'; return; }
    const blob=await getFileBlob(x.id); if(!blob){ el.classList.add('thumb-ico'); el.textContent='📄'; return; }
    if(x.fileKind==='image'){ const img=document.createElement('img'); img.draggable=false; img.src=URL.createObjectURL(blob); el.appendChild(img); return; }
    if(x.fileKind==='pdf' && window.pdfjsLib){
      const pdf=await pdfjsLib.getDocument({data:await blob.arrayBuffer()}).promise; const page=await pdf.getPage(1);
      const base=page.getViewport({scale:1}); const vp=page.getViewport({scale:150/base.width});
      const c=document.createElement('canvas'); c.width=vp.width; c.height=vp.height;
      await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise; el.appendChild(c); return;
    }
    el.classList.add('thumb-ico'); el.textContent='📄';
  }catch(err){ el.classList.add('thumb-ico'); el.textContent='📄'; }
}
async function addFilesToExpediente(exId, files, pos){
  if(!files||!files.length) return; let n=0;
  const _place=xd=>{ if(pos){ xd.x=Math.max(0,Math.round(pos.x-59)+n*18); xd.y=Math.max(0,Math.round(pos.y-30)+n*18); } return xd; };
  const textos=[];   // se lee el texto MIENTRAS se guardan: no hay que releer nada después
  for(const f of files){
    const ext=(f.name.split('.').pop()||'').toLowerCase();
    const base=f.name.replace(/\.[^.]+$/,'');
    if(ext==='pdf'||ext==='docx'){ try{ const t=await readFileText(f); if(t) textos.push({name:base, text:t}); }catch(err){} }
    if(ext==='docx'){   // Word → nota de texto editable
      try{
        const res=await mammoth.convertToHtml({arrayBuffer: await f.arrayBuffer()});
        EXDOCS.push(_place({id:'xd'+Date.now()+Math.floor(Math.random()*9999), expediente:exId, title:base, kind:'exescrito', type:'Texto', content:res.value||'', created:Date.now(), updated:Date.now()})); n++;
      }catch(err){ toast('No se pudo convertir "'+base+'"','error'); }
    } else if(ext==='pdf' || ['png','jpg','jpeg','webp','gif'].includes(ext)){
      const id='xd'+Date.now()+Math.floor(Math.random()*9999);
      const fileKind=(ext==='pdf')?'pdf':'image';
      const blob = (fileKind==='image') ? await compressIfImage(f) : f;   // optimiza imágenes
      try{ await putFileBlob(id,blob); EXDOCS.push(_place({id, expediente:exId, title:base, kind:'exdoc', type:fileKind==='pdf'?'PDF':'Imagen', hasFile:true, fileName:blob.name, fileKind, created:Date.now()})); n++; }
      catch(err){ toast('No se pudo guardar "'+base+'"','error'); }
    } else { toast('Formato no soportado: .'+ext,'error'); }
  }
  if(n){ saveState(); openExpediente(exId); toast(n+' documento(s) agregado(s)','success');
    if(_sharedCausaIds.has(exId) || (EXPEDIENTES.find(e=>e.id===exId)||{}).shared){ pushCausaFiles(exId); pushSharedCausa(exId); }   // propaga al equipo
  }
  // Carpeta en preparación o asunto: ofrecer las personas detectadas en lo recién subido
  const ex=EXPEDIENTES.find(x=>x.id===exId);
  if(ex && ex.sub==='contestacion' && textos.length){
    // Contestación: la demanda notificada trae los datos de la causa → los saco con extractCausaData
    const llenos=applyCausaDataToFolder(ex, textos);
    if(llenos.length){ saveState(); openExpediente(exId); toast('De la demanda: '+llenos.join(', '),'success'); }
  }
  if(ex && (ex.prep || ex.kind==='asunto') && textos.length){
    let det=detectPersonasEnTextos(textos);
    det=_enriquecerConCert(det, textos);   // certificado de nacimiento → niño/padre/madre con rol y vínculo
    det=det.filter(p=>!(ex.partes||[]).some(q=>{ const c=findCliente(q.personaId); return c && nrmRut(c.rut)===nrmRut(p.rut); }));
    if(det.length) openDetectados(exId, det, ex.sub==='contestacion');
  }
}
// Llena los datos de causa VACÍOS de la carpeta desde el texto (RIT, tribunal, carátula…). Devuelve qué llenó.
function applyCausaDataToFolder(ex, textos){
  const d=extractCausaData(textos.map(t=>t.text).join('\n')); const puesto=[];
  const set=(campo,val,etq)=>{ if(val && !ex[campo]){ ex[campo]=val; puesto.push(etq); } };
  set('name', d.name, 'carátula'); set('rit', d.rit, 'RIT'); set('ruc', d.ruc, 'RUC');
  set('rol', d.rol, 'rol'); set('tribunal', d.tribunal, 'tribunal'); set('tipo', d.tipo, 'área'); set('materia', d.materia, 'materia');
  if(puesto.length) ex.updated=Date.now();
  return puesto;
}
function addExdocFile(exId){
  const inp=document.createElement('input'); inp.type='file'; inp.accept='.pdf,.docx,.png,.jpg,.jpeg,.webp,.gif'; inp.multiple=true;
  inp.onchange=ev=>addFilesToExpediente(exId, [...ev.target.files]);
  inp.click();
}
function newExEscrito(exId){
  const id='xd'+Date.now();
  EXDOCS.push({id, expediente:exId, title:'Escrito sin título', kind:'exescrito', type:'Texto', content:'', conMembrete:true, created:Date.now(), updated:Date.now()});   // por defecto CON membrete (listo para el tribunal)
  saveState(); openExdoc(id);
}
function renameExdoc(id){ const x=EXDOCS.find(d=>d.id===id)||findDoc(id); if(!x) return; const n=prompt('Nuevo nombre del documento:', x.title||''); if(n==null) return; const t=n.trim(); if(!t) return; x.title=t; x.updated=Date.now(); saveState(); if(_curExp) openExpediente(_curExp); if(STATE.currentDocId===id){ const rt=document.getElementById('reader-title'); if(rt) rt.textContent=t; } }
function deleteExdoc(id){
  const x=EXDOCS.find(d=>d.id===id); if(!x)return;
  if(!confirm('¿Borrar este documento?')) return;
  const anns=ANNOTATIONS.filter(a=>a.docId===id);
  trashAdd('exdoc', x.title||'Documento', {exdoc:x, anns});   // a la papelera (blob se conserva)
  for(let j=ANNOTATIONS.length-1;j>=0;j--) if(ANNOTATIONS[j].docId===id) ANNOTATIONS.splice(j,1);
  const ix=EXDOCS.findIndex(d=>d.id===id); if(ix>=0) EXDOCS.splice(ix,1);
  saveState(); toast('Documento movido a la papelera 🗑'); if(_curExp) openExpediente(_curExp);
}
function openExdoc(id){ openReader(id); if(STATE.floatDefault!==false && !_readerFloat && !isMobile()) toggleReaderFloat(); }   // documentos de causa: flotante por defecto (PC)
