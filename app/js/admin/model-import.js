let _mdocPieces=[], _mdocActiveTA=null, _mdocTipo='';

function openImportModeloDoc(){
  if(!_needAdminForms()) return;
  const host=document.getElementById('import-mdl-body'); if(!host) return;
  ensureTiposDoc && ensureTiposDoc();
  const tipos=TIPOSDOC.map(t=>`<option value="${t.id}" ${_mdlCat===t.id?'selected':''}>${t.icono||''} ${escapeHtml(t.nombre)}</option>`).join('');
  host.innerHTML=`<div class="modal-title">📄 Importar modelo desde documento</div>
    <div style="font-size:12px;color:var(--gray2);line-height:1.6;margin-bottom:10px">Sube un escrito o contrato (PDF o Word). Acervo lo <b>trocea en piezas</b> (principal + otrosíes / por tanto) y detecta variables a rellenar. Podrás revisar y marcar más antes de guardar.</div>
    <div class="form-row"><label class="form-label">Crear dentro del tipo</label><select class="form-select" id="mdoc-tipo">${tipos}</select></div>
    <input id="mdoc-file" type="file" accept=".pdf,.docx,.doc,.txt" onchange="onModeloDocPick(event)" style="font-size:13px;color:var(--gray);padding:8px;border:1px dashed rgba(201,168,76,.35);border-radius:8px;width:100%;background:rgba(255,255,255,.03);cursor:pointer">
    <div id="mdoc-status" style="font-size:12px;color:var(--gray2);margin-top:8px"></div>
    <div class="modal-footer"><button class="btn-ghost" onclick="openModelosPanel()">Cancelar</button></div>`;
  openModal('modal-import-mdl');
}

async function readFileText(file){
  const ext=(file.name.split('.').pop()||'').toLowerCase();
  let text='';
  if(ext==='pdf'){ if(!window.pdfjsLib) await waitFor(()=>window.pdfjsLib); const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
    for(let i=1;i<=pdf.numPages;i++){ const pg=await pdf.getPage(i); const tc=await pg.getTextContent(); text+=tc.items.map(it=>it.str).join(' ')+'\n'; } }
  else if(ext==='docx'){ if(!window.mammoth) await waitFor(()=>window.mammoth); const r=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()}); text=r.value||''; }
  else if(['txt','rtf','html','htm','md','csv'].includes(ext)) text=await file.text();
  return text.replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
}

async function onModeloDocPick(e){
  const file=e.target.files[0]; if(!file) return;
  const st=document.getElementById('mdoc-status'); if(st) st.textContent='Leyendo el documento…';
  let text='';
  try{ text=await readFileText(file); }
  catch(err){ if(st) st.textContent='No se pudo leer: '+err.message; return; }
  if(!text){ if(st) st.textContent='El documento no tiene texto extraíble (¿PDF escaneado?).'; return; }
  _mdocPieces=splitEscrito(text);
  _mdocTipo=classifyEscrito(text);
  const prin=_mdocPieces.find(p=>/principal/i.test(p.cabecera||p.nombre||''));
  if(_mdocTipo){ if(prin){ prin.nombre=_mdocTipo; } else if(_mdocPieces[0]){ _mdocPieces[0].nombre=_mdocPieces[0].nombre||_mdocTipo; } }
  renderModeloDocReview();
}

function splitEscrito(text){
  const markers=[]; let m;
  const rePrincipal=/\ben lo principal\b/gi;
  const reOtrosi=/\b(primer|segundo|tercer|cuarto|quinto|sexto|s[eé]ptimo|s[eé]timo|octavo|noveno|d[eé]cimo)?\s*otros[ií]([:.]|\b)/gi;
  const rePorTanto=/\bpor tanto\b/gi;
  while((m=rePrincipal.exec(text))) markers.push({i:m.index, kind:'principal', txt:'En lo principal'});
  while((m=reOtrosi.exec(text))) markers.push({i:m.index, kind:'otrosi', txt:(m[0]||'').replace(/[:.]\s*$/,'').trim()});
  while((m=rePorTanto.exec(text))) markers.push({i:m.index, kind:'portanto', txt:'Por tanto'});
  markers.sort((a,b)=>a.i-b.i);
  if(!markers.length) return [{nombre:'Documento completo', cabecera:'', cuerpo:text}];
  const firstPT = markers.find(x=>x.kind==='portanto');
  const cut = firstPT ? firstPT.i : text.length;
  let bodyMk = markers.filter(x=>x.i<cut && x.kind!=='portanto');
  const principals = bodyMk.filter(x=>x.kind==='principal');
  if(principals.length>1){ const lastI=principals[principals.length-1].i; bodyMk=bodyMk.filter(x=>x.i>=lastI); }
  const pieces=[];
  for(let k=0;k<bodyMk.length;k++){
    const cur=bodyMk[k]; const end=(k+1<bodyMk.length)?bodyMk[k+1].i:cut;
    const seg=text.slice(cur.i, end).trim();
    let cab=cur.txt, cuerpo=seg; const colon=seg.indexOf(':');
    if(colon>0 && colon<80){ cab=seg.slice(0,colon).trim(); cuerpo=seg.slice(colon+1).trim(); }
    pieces.push({nombre:cab, cabecera:cab, cuerpo});
  }
  if(firstPT) pieces.push({nombre:'Por tanto', cabecera:'POR TANTO', cuerpo:text.slice(firstPT.i).trim()});
  return pieces.length?pieces:[{nombre:'Documento completo', cabecera:'', cuerpo:text}];
}

function classifyEscrito(text){
  const t=(text||'').toLowerCase().replace(/[áàä]/g,'a').replace(/[éèë]/g,'e').replace(/[íìï]/g,'i').replace(/[óòö]/g,'o').replace(/[úùü]/g,'u');
  const rules=[
    [/tengase presente|tener presente/,'Téngase presente'],
    [/contestacion|contesta la demanda|contestando la demanda/,'Contestación de demanda'],
    [/demanda ejecutiva|juicio ejecutivo|gestion preparatoria/,'Demanda ejecutiva'],
    [/interpone demanda|deduzco demanda|vengo en demandar|interpongo demanda|demanda de/,'Demanda'],
    [/recurso de apelacion|deduce apelacion|apela\b|apelacion/,'Recurso de apelación'],
    [/recurso de casacion|casacion en la forma|casacion en el fondo|casacion/,'Recurso de casación'],
    [/recurso de nulidad/,'Recurso de nulidad'],
    [/recurso de proteccion/,'Recurso de protección'],
    [/recurso de amparo/,'Recurso de amparo'],
    [/recurso de reposicion|repone con apelacion|repone\b/,'Reposición'],
    [/recurso de queja/,'Recurso de queja'],
    [/nulidad de todo lo obrado|nulidad procesal/,'Nulidad procesal'],
    [/medida(s)? precautoria/,'Medida precautoria'],
    [/cumplimiento incidental/,'Cumplimiento incidental'],
    [/incidente|incidental/,'Incidente'],
    [/desiste|desistimiento/,'Desistimiento'],
    [/avenimiento|transaccion|concilia/,'Avenimiento / transacción'],
    [/patrocinio y poder|confiero poder/,'Patrocinio y poder'],
    [/acompan[ao] documento|acompano documentos|acompana documentos/,'Acompaña documentos'],
    [/lista de testigos|nomina de testigos/,'Lista de testigos'],
    [/oficio/,'Solicita oficio'],
    [/exhorto/,'Exhorto'],
    [/alega|vista de la causa|alegato/,'Alegato'],
    [/observaciones a la prueba/,'Observaciones a la prueba'],
    [/absuelva posiciones|absolucion de posiciones/,'Absolución de posiciones'],
  ];
  for(const [re,name] of rules){ if(re.test(t)) return name; }
  return '';
}

function autoVarsWrap(str){
  let s=str, cR=0,cM=0,cF=0;
  s=s.replace(/\b\d{1,2}\.\d{3}\.\d{3}-[\dkK]\b/g, ()=>{ cR++; return '{{rut'+(cR>1?'_'+cR:'')+'}}'; });
  s=s.replace(/\$\s?[\d\.]+(?:\.-)?/g, ()=>{ cM++; return '{{monto'+(cM>1?'_'+cM:'')+'}}'; });
  s=s.replace(/\b\d{1,2} de [a-záéíóúñ]+ (?:de )?\d{4}\b/gi, ()=>{ cF++; return '{{fecha'+(cF>1?'_'+cF:'')+'}}'; });
  return s;
}

function mdocCardHtml(p){
  return `<div class="mdoc-card" style="background:rgba(255,255,255,.03);border:1px solid rgba(201,168,76,.15);border-radius:10px;padding:10px;margin-bottom:8px">
    <div style="display:flex;gap:8px;margin-bottom:6px">
      <input class="form-input mdoc-nombre" value="${escapeHtml(p.nombre||'')}" placeholder="Nombre de la pieza (ej. tipo de escrito)" style="flex:1">
      <button class="btn-ghost" onclick="this.closest('.mdoc-card').remove()" title="Quitar pieza" style="color:var(--danger)">✕</button>
    </div>
    <input class="form-input mdoc-cab" value="${escapeHtml(p.cabecera||'')}" placeholder="Cabecera / suma (ej. EN LO PRINCIPAL: …)" style="margin-bottom:6px;font-size:12px">
    <textarea class="form-textarea mdoc-cuerpo" onfocus="_mdocActiveTA=this" placeholder="Contenido de la pieza" style="min-height:90px;font-size:12px">${escapeHtml(p.cuerpo||'')}</textarea>
  </div>`;
}

function renderModeloDocReview(){
  const host=document.getElementById('import-mdl-body');
  const cards=_mdocPieces.map(mdocCardHtml).join('');
  const tipoBanner=_mdocTipo?`<div style="font-size:12px;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.25);border-radius:8px;padding:8px 11px;margin-bottom:8px">📑 Tipo de escrito detectado: <b>${escapeHtml(_mdocTipo)}</b> <span style="color:var(--gray2)">(lo usé como nombre de la pieza principal; puedes cambiarlo)</span></div>`:'';
  host.innerHTML=`<div class="modal-title">Revisar piezas — ${_mdocPieces.length}</div>
    ${tipoBanner}
    <div style="font-size:12px;color:var(--gray2);margin-bottom:8px">Detecté las partes (suma, cuerpo, por tanto). Ajusta lo que haga falta o agrega piezas a mano. Selecciona texto y pulsa <b>marcar variable</b> para volverlo <code>{{campo}}</code>.</div>
    <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap">
      <button class="btn-ghost" onclick="mdocAutoVars()">✨ Detectar variables</button>
      <button class="btn-ghost" onclick="markSelectionAsVar()">＋ Marcar selección como variable</button>
      <button class="btn-ghost" onclick="mdocAddPiece()">＋ Añadir pieza</button>
    </div>
    <div style="display:flex;gap:5px;margin-bottom:8px;flex-wrap:wrap;align-items:center">
      <span style="font-size:11px;color:var(--gray2)">Insertar dato (toca el recuadro y luego):</span>
      ${['{{cliente.individualizacion}}','{{cliente.nombre}}','{{cliente.rut}}','{{causa.rol}}','{{causa.materia}}','{{abogado.nombre}}','{{fecha}}'].map(tk=>`<button class="rw-mini ee-tok" onmousedown="event.preventDefault()" onclick="mdocInsert('${tk}')">${tk}</button>`).join('')}
      <button class="rw-mini" onmousedown="event.preventDefault()" onclick="mdocInsert('\\t')" title="Sangría">⇥</button>
      <span style="width:1px;height:15px;background:rgba(255,255,255,.15);display:inline-block"></span>
      <button class="rw-mini" onmousedown="event.preventDefault()" onclick="mdocFmt('b')" title="Negrita"><b>B</b></button>
      <button class="rw-mini" onmousedown="event.preventDefault()" onclick="mdocFmt('i')" title="Cursiva"><i>I</i></button>
      <button class="rw-mini" onmousedown="event.preventDefault()" onclick="mdocFmt('u')" title="Subrayado"><u>U</u></button>
      <button class="rw-mini" onmousedown="event.preventDefault()" onclick="mdocFmt('center')" title="Centrar">↔</button>
    </div>
    <div id="mdoc-cards" style="max-height:42vh;overflow:auto">${cards}</div>
    <div class="modal-footer"><button class="btn-ghost" onclick="openImportModeloDoc()">← Otro documento</button><button class="btn-gold" onclick="saveImportedModeloDoc()">Guardar modelos</button></div>`;
}

function mdocAddPiece(){
  const box=document.getElementById('mdoc-cards'); if(!box) return;
  const tmp=document.createElement('div'); tmp.innerHTML=mdocCardHtml({nombre:'',cabecera:'',cuerpo:''});
  box.appendChild(tmp.firstElementChild); box.scrollTop=box.scrollHeight;
}
function mdocAutoVars(){ document.querySelectorAll('.mdoc-cuerpo').forEach(ta=>{ ta.value=autoVarsWrap(ta.value); }); toast('Variables detectadas (revisa y ajusta)','success'); }
function mdocInsert(tok){ const ta=_mdocActiveTA; if(!ta){ toast('Toca primero un recuadro de contenido','error'); return; } const s=ta.selectionStart!=null?ta.selectionStart:ta.value.length, e=ta.selectionEnd!=null?ta.selectionEnd:ta.value.length; ta.value=ta.value.slice(0,s)+tok+ta.value.slice(e); ta.focus(); const p=s+tok.length; try{ta.setSelectionRange(p,p);}catch(_){} }
function mdocSurround(pre,post){ const ta=_mdocActiveTA; if(!ta){ toast('Toca primero un recuadro','error'); return; } const s=ta.selectionStart!=null?ta.selectionStart:ta.value.length, e=ta.selectionEnd!=null?ta.selectionEnd:ta.value.length; const sel=ta.value.slice(s,e)||'texto'; ta.value=ta.value.slice(0,s)+pre+sel+post+ta.value.slice(e); ta.focus(); const p=s+pre.length; try{ta.setSelectionRange(p,p+sel.length);}catch(_){} }
function mdocFmt(kind){ if(kind==='b')mdocSurround('[[B]]','[[/B]]'); else if(kind==='i')mdocSurround('[[I]]','[[/I]]'); else if(kind==='u')mdocSurround('[[U]]','[[/U]]'); else mdocSurround('[[ALIGN:'+kind+']]\n','\n[[/ALIGN]]'); }
function markSelectionAsVar(){
  const ta=_mdocActiveTA;
  if(!ta || ta.selectionEnd<=ta.selectionStart){ toast('Selecciona primero un texto dentro de una pieza','error'); return; }
  const s=ta.selectionStart, e=ta.selectionEnd, sel=ta.value.slice(s,e);
  let name=prompt('Nombre de la variable (ej. comprador, vendedor, domicilio, monto):', sel.slice(0,24).replace(/\s+/g,'_').toLowerCase());
  if(!name) return;
  name=name.trim().toLowerCase().replace(/[áàä]/g,'a').replace(/[éèë]/g,'e').replace(/[íìï]/g,'i').replace(/[óòö]/g,'o').replace(/[úùü]/g,'u').replace(/ñ/g,'n').replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
  if(!name){ toast('Nombre no válido','error'); return; }
  ta.value = ta.value.slice(0,s)+'{{'+name+'}}'+ta.value.slice(e);
}
function saveImportedModeloDoc(){
  const tipoId=(document.getElementById('mdoc-tipo')||{}).value||_mdlCat||'escrito';
  const tp=tipoById(tipoId)||{};
  let n=0;
  document.querySelectorAll('.mdoc-card').forEach(card=>{
    const nombre=(card.querySelector('.mdoc-nombre').value||'').trim();
    const cab=(card.querySelector('.mdoc-cab').value||'').trim();
    const cuerpo=(card.querySelector('.mdoc-cuerpo').value||'').trim();
    if(!nombre && !cuerpo) return;
    const varIds=[...new Set((cuerpo.match(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)||[]).map(x=>x.replace(/[{}]/g,'').trim().toLowerCase()))];
    const variables=varIds.map(id=>({id, label:id.replace(/_/g,' '), tipo:'input', placeholder:''}));
    MODELOS.push({ id:'m'+Date.now()+Math.floor(Math.random()*99999), tipoId, categoria:tipoId, nombre:nombre||cab||'Modelo', cabecera:cab, suma:cab, cuerpo, pie:'', portanto:'', materia:'general', esOtrosi:/otros[ií]/i.test(cab), otrosiesDefault:[], roles:[], variables, usaMembrete:!!tp.usaMembrete });
    n++;
  });
  if(!n){ toast('No hay piezas para guardar','error'); return; }
  saveState(); closeAllModals(); _mdlCat=tipoId; openModelosPanel(); toast(n+' modelo(s) creado(s) desde el documento','success');
}
