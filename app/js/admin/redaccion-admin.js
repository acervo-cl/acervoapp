// ════════════════════════════════════════
// REDACCIÓN — UI (asistente, listado, modelos, partes)
// ════════════════════════════════════════
let _ME=null;            // estado del editor de modelo
let _clienteReturn=null;  // 'rw' | 'exp' | null: a dónde volver tras guardar un cliente

// ── Listado en la pestaña ✍️ Redactar ──
let _redView='chooser';   // 'chooser' | 'historial'
// ══════ Herramientas de redacción — Conversor de cifras (número ↔ palabras) ══════
const _UNI=['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte','veintiuno','veintidós','veintitrés','veinticuatro','veinticinco','veintiséis','veintisiete','veintiocho','veintinueve'];
const _DEC=['','','','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
const _CEN=['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];
function _cu(n){ if(n<30) return _UNI[n]; if(n<100){const d=Math.floor(n/10),r=n%10; return _DEC[d]+(r?' y '+_UNI[r]:'');} if(n===100) return 'cien'; const c=Math.floor(n/100),r=n%100; return _CEN[c]+(r?' '+_cu(r):''); }
function _capoc(s){ return s.replace(/veintiuno$/,'veintiún').replace(/(^|\s)uno$/,'$1un'); }
function _cmiles(n){ if(n===0) return ''; const m=Math.floor(n/1000),r=n%1000,o=[]; if(m===1)o.push('mil'); else if(m>1)o.push(_capoc(_cu(m))+' mil'); if(r>0)o.push(_cu(r)); return o.join(' '); }
function numeroAPalabras(n){ n=Math.floor(Math.abs(n)); if(n===0) return 'cero'; const mi=Math.floor(n/1e6),re=n%1e6,o=[]; if(mi===1)o.push('un millón'); else if(mi>1)o.push(_capoc(_cmiles(mi))+' millones'); if(re>0)o.push(_cmiles(re)); return o.join(' ').trim(); }
function _cdec(dec){ return dec.split('').map(d=>_UNI[+d]).join(' '); }
const _MAPA={cero:0,un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiuno:21,veintiun:21,veintidos:22,veintitres:23,veinticuatro:24,veinticinco:25,veintiseis:26,veintisiete:27,veintiocho:28,veintinueve:29,treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90,cien:100,ciento:100,doscientos:200,trescientos:300,cuatrocientos:400,quinientos:500,seiscientos:600,setecientos:700,ochocientos:800,novecientos:900};
function palabrasANumero(str){ const clean=(str||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim(); if(!clean) return null; let total=0,cur=0,any=false; for(const w of clean.split(' ')){ if(w==='y'||w==='con'||w==='de'||w==='pesos'||w==='peso')continue; if(w==='mil'){cur=(cur||1)*1000;total+=cur;cur=0;any=true;continue;} if(w==='millon'||w==='millones'){cur=(cur||1)*1e6;total+=cur;cur=0;any=true;continue;} if(_MAPA[w]!==undefined){cur+=_MAPA[w];any=true;continue;} } return any?total+cur:null; }
const _cfmt=n=>n.toLocaleString('es-CL');
let _convTipo='num', _convForce=null, _convVal='';
let _toolsReturn=null;   // desde el asistente: al cerrar Herramientas, volver a Redactar
let _toolTab='copiar', _toolPerson='';   // pestaña activa y persona elegida en "Copiar datos"
function openHerramientas(ret, tab){ _toolsReturn=ret||null; _convForce=null; if(tab) _toolTab=tab; renderTools(); openModal('modal-tools'); }
function convClose(){ const ret=_toolsReturn; _toolsReturn=null; if(ret==='rw' && _RW){ openModal('modal-redactar'); renderRW(); return; } closeAllModals(); }
function convSet(t){ _convTipo=t; renderTools(true); }
function convToggle(){ const raw=(_convVal||'').trim(); const cur=_convForce!=null?_convForce:/[a-záéíóúñ]/i.test(raw); _convForce=!cur; renderTools(true); }
function toolTab(t){ _toolTab=t; renderTools(); }
// Persona seleccionada → objeto con sus datos ("__yo__" = perfil del abogado / usuario)
function _toolPersonObj(id){
  if(id==='__yo__'){ const a=STATE.perfilAbogado||{}; return {__yo:true, tipo:'natural', nombre:a.nombre||'', rut:a.rut||'', domicilio:a.domicilio||'', correo:a.email||'', profesion:a.cargo||'Abogado'}; }
  return findCliente(id)||null;
}
function _toolCopy(id, field){
  const p=_toolPersonObj(id); if(!p){ toast('Elige una persona','error'); return; }
  if(field==='indiv'){ copiarDato(stripMarks(buildIndividualizacion(p)), 'Individualización'); return; }
  const map={nombre:'Nombre', rut:'RUT', claveUnica:'Clave Única', correo:'Correo', telefono:'Teléfono', domicilio:'Domicilio'};
  copiarDato(p[field]||'', map[field]||'Dato');
}
function _toolCopyHTML(){
  const cur=_toolPerson||'__yo__';
  const list=CLIENTES.slice().sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''));
  const opts=[`<option value="__yo__" ${cur==='__yo__'?'selected':''}>👤 Yo (mi perfil de abogado)</option>`]
    .concat(list.map(c=>`<option value="${c.id}" ${cur===c.id?'selected':''}>${escapeHtml((c.tipo==='juridica'?'🏢 ':(c.tipo==='nino'?'🧒 ':'👤 '))+(c.nombre||'(sin nombre)'))}</option>`)).join('');
  const p=_toolPersonObj(cur);
  const row=(label,field,ok)=> ok ? `<button class="btn-ghost" style="display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;text-align:left" onclick="_toolCopy('${cur}','${field}')"><span>${label}</span><span style="color:var(--gold3);flex-shrink:0">⧉ Copiar</span></button>` : '';
  let btns='';
  if(p){
    btns+= row('🧾 Individualización completa', 'indiv', !!(p.nombre||p.rut));
    btns+= row('Nombre', 'nombre', !!p.nombre);
    btns+= row('RUT', 'rut', !!p.rut);
    btns+= row('🔐 Clave Única', 'claveUnica', !!p.claveUnica);
    btns+= row('Correo', 'correo', !!p.correo);
    btns+= row('Teléfono', 'telefono', !!p.telefono);
    btns+= row('Domicilio', 'domicilio', !!p.domicilio);
  }
  return `<div style="font-size:12px;color:var(--gray2);margin-bottom:10px">Elige de quién copiar y toca el dato para pegarlo donde lo necesites.</div>
    <select class="form-select" onchange="_toolPerson=this.value;renderTools()">${opts}</select>
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:7px">${btns||'<div style="color:var(--gray2);font-size:12.5px;padding:8px 0">Esta persona no tiene datos guardados para copiar.</div>'}</div>`;
}
function _toolConvHTML(){
  const tabs=[['num','Número / RUT'],['pesos','Pesos'],['uf','UF'],['utm','UTM']].map(([t,l])=>`<button class="rw-pill ${_convTipo===t?'on':''}" onclick="convSet('${t}')">${l}</button>`).join('');
  return `<div style="font-size:12px;color:var(--gray2);margin-bottom:12px">Escribe un número y te da las palabras; escribe en palabras y te da la cifra. Copia lo que necesites.</div>
    <div class="redactar-tabs" style="flex-wrap:wrap;margin-bottom:12px">${tabs}</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">
      <span style="font-size:12px;color:var(--gray2)">Escribe aquí</span>
      <span style="display:flex;align-items:center;gap:9px"><span style="font-size:11px;font-weight:700;color:var(--gold)" id="conv-dir">número → palabras</span>
        <button type="button" onclick="convToggle()" title="Cambiar el sentido" style="width:32px;height:32px;border-radius:9px;border:1px solid rgba(201,168,76,.35);background:rgba(201,168,76,.12);color:var(--gold);display:flex;align-items:center;justify-content:center;cursor:pointer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:17px;height:17px"><polyline points="17 2 21 6 17 10"/><path d="M3 12V10a4 4 0 0 1 4-4h14"/><polyline points="7 22 3 18 7 14"/><path d="M21 12v2a4 4 0 0 1-4 4H3"/></svg>
        </button></span>
    </div>
    <input class="form-input" id="conv-inp" value="${escapeHtml(_convVal)}" oninput="_convVal=this.value;convUpdate()" style="font-size:17px" placeholder="Ej: 1.500.000  ·  20.379.191-7" autocomplete="off" spellcheck="false">
    <div id="conv-out" style="margin-top:14px;background:rgba(45,212,191,.06);border:1px solid rgba(45,212,191,.25);border-radius:11px;padding:13px 14px;min-height:52px;position:relative"></div>
    <div id="conv-alts" style="margin-top:9px;display:flex;flex-direction:column;gap:6px"></div>`;
}
function renderTools(keepFocus){
  const tab=(t,l)=>`<button class="rw-pill ${_toolTab===t?'on':''}" onclick="toolTab('${t}')">${l}</button>`;
  const inner = _toolTab==='cifras' ? _toolConvHTML() : _toolCopyHTML();
  document.getElementById('tools-body').innerHTML=`<div class="modal-title">🛠️ Herramientas</div>
    <div class="redactar-tabs" style="flex-wrap:wrap;margin-bottom:14px;gap:6px">${tab('copiar','📋 Copiar datos')}${tab('cifras','🔢 Cifras / RUT')}</div>
    ${inner}
    <div class="modal-footer"><button class="btn-gold" onclick="convClose()">${_toolsReturn==='rw'?'← Volver a redactar':'Cerrar'}</button></div>`;
  if(_toolTab==='cifras'){
    convUpdate();
    if(keepFocus){ const el=document.getElementById('conv-inp'); if(el){ el.focus(); el.setSelectionRange(el.value.length,el.value.length); } }
  }
}
function convShow(s){ const out=document.getElementById('conv-out'); out.innerHTML=`<div style="font-size:16px;line-height:1.5;padding-right:62px" id="conv-otxt"></div><button class="btn-gold" onclick="convCopy(document.getElementById('conv-otxt').textContent)" style="position:absolute;top:10px;right:10px;padding:6px 11px;font-size:12px">Copiar</button>`; document.getElementById('conv-otxt').textContent=s; }
function convAlt(label,v){ const a=document.getElementById('conv-alts'); const d=document.createElement('div'); d.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:13px;background:rgba(255,255,255,.03);border-radius:8px;padding:8px 11px'; const wrap=document.createElement('span'); wrap.style.color='var(--gray)'; const lbl=document.createElement('b'); lbl.style.cssText='color:var(--gray2);font-weight:600'; lbl.textContent=label+': '; wrap.appendChild(lbl); wrap.appendChild(document.createTextNode(v)); const b=document.createElement('button'); b.className='btn-ghost'; b.textContent='Copiar'; b.style.cssText='padding:4px 9px;font-size:11px;flex-shrink:0'; b.onclick=()=>convCopy(v); d.appendChild(wrap); d.appendChild(b); a.appendChild(d); }
function convCopy(s){ try{ navigator.clipboard.writeText(s); }catch(_){} toast('Copiado ✓','success'); }
function convUpdate(){
  const out=document.getElementById('conv-out'), alts=document.getElementById('conv-alts'), dir=document.getElementById('conv-dir'), inp=document.getElementById('conv-inp');
  if(!out) return; alts.innerHTML='';
  const raw=(_convVal||'').trim();
  const setPH=ep=>{ if(inp) inp.placeholder = ep?'Ej: un millón quinientos mil  ·  … guion siete':'Ej: 1.500.000  ·  20.379.191-7'; };
  if(!raw){ out.innerHTML='<span style="color:var(--gray2);font-size:14px">El resultado aparece aquí…</span>'; const ep=_convForce===true; dir.textContent=ep?'palabras → número':'número → palabras'; setPH(ep); return; }
  const esPal=_convForce!=null?_convForce:/[a-záéíóúñ]/i.test(raw);
  dir.textContent=esPal?'palabras → número':'número → palabras'; setPH(esPal);
  const tipo=_convTipo; let outStr='';
  if(esPal){
    let numText=raw, verifOut='';
    const gi=raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').search(/\bguion\b/);
    if(gi>=0){ numText=raw.slice(0,gi); const after=raw.slice(gi).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/guion/,'').trim(); if(/^k/.test(after))verifOut='-K'; else{ const d=palabrasANumero(after); if(d!=null&&d>=0&&d<=9)verifOut='-'+d; } }
    const n=palabrasANumero(numText);
    if(n==null){ out.innerHTML='<span style="color:var(--gray2);font-size:14px">No reconocí el número…</span>'; return; }
    if(verifOut) outStr=_cfmt(n)+verifOut;
    else if(tipo==='pesos') outStr='$'+_cfmt(n)+'.-';
    else if(tipo==='uf'||tipo==='utm') outStr=_cfmt(n)+' '+(tipo==='uf'?'UF':'UTM');
    else outStr=_cfmt(n);
    convShow(outStr); return;
  }
  let cuerpo=raw, verif=null; const rm=raw.match(/^(.*?)[-–]\s*([\dkK])\s*$/); if(rm){cuerpo=rm[1];verif=rm[2];}
  const norm=cuerpo.replace(/\./g,'').replace(',', '.'); const [intP,decP]=norm.split('.'); const n=parseInt(intP,10);
  if(isNaN(n)){ out.innerHTML='<span style="color:var(--gray2);font-size:14px">Escribe una cifra válida…</span>'; return; }
  let palabras=numeroAPalabras(n);
  const conDec=decP&&/\d/.test(decP);
  if(conDec) palabras+=' coma '+_cdec(decP.replace(/0+$/,'')||'0');
  if(verif!=null) palabras+=' guion '+(/[kK]/.test(verif)?'K':_UNI[+verif]);
  if(verif!=null){ outStr=palabras; convShow(outStr); convAlt('Con el RUT', palabras+' ('+_cfmt(n)+'-'+verif.toUpperCase()+')'); }
  else if(tipo==='pesos'){ const suf=(n===1&&!conDec)?' peso':((n>=1e6&&n%1e6===0&&!conDec)?' de pesos':' pesos'); outStr='$'+_cfmt(n)+'.- ('+palabras+suf+')'; convShow(outStr); convAlt('Solo palabras',palabras+suf); convAlt('Solo la frase',palabras); }
  else if(tipo==='uf'||tipo==='utm'){ const larga=tipo==='uf'?'Unidades de Fomento':'Unidades Tributarias Mensuales'; const corta=tipo==='uf'?'UF':'UTM'; const cifra=conDec?_cfmt(n)+','+decP:_cfmt(n); outStr=cifra+' '+corta+' ('+palabras+' '+larga+')'; convShow(outStr); convAlt('Solo palabras',palabras+' '+larga); }
  else { outStr=palabras; convShow(outStr); convAlt('Con la cifra',palabras+' ('+_cfmt(n)+')'); }
}
function openRedFormat(){
  if(!_needAdminForms()) return;   // la forma/formato base de los escritos la define el admin
  const f=resolveFmt(null);
  const fonts=['Times New Roman','Georgia','Arial','Calibri','Verdana','Courier New'];
  const aligns=[['justify','Justificado'],['left','Izquierda'],['center','Centrado']];
  const sizes=[['oficio','Oficio (21,6 × 33)'],['legal','Legal · Oficio largo (21,6 × 35,6)'],['carta','Carta (21,6 × 27,9)'],['a4','A4 (21 × 29,7)'],['a3','A3 (29,7 × 42)']];
  document.getElementById('redfmt-body').innerHTML=`<div class="modal-title">⚙️ Formato base de los escritos</div>
    <div style="font-size:12px;color:var(--gray2);margin-bottom:12px">Es la base de cada documento generado; en cada modelo puedes ajustar lo suyo, y a mano en el editor.</div>
    <div class="form-grid">
      <div class="form-row"><label class="form-label">Tipografía</label><select class="form-select" id="rf-font">${fonts.map(x=>`<option ${f.font===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="form-row"><label class="form-label">Tamaño (pt)</label><input class="form-input" id="rf-size" type="number" min="8" max="18" value="${f.size||12}"></div>
    </div>
    <div class="form-grid">
      <div class="form-row"><label class="form-label">Interlineado</label><select class="form-select" id="rf-lh">${[['1','1'],['1.15','1,15'],['1.5','1,5'],['2','2']].map(([v,l])=>`<option value="${v}" ${String(f.lineHeight)===v?'selected':''}>${l}</option>`).join('')}</select></div>
      <div class="form-row"><label class="form-label">Alineación</label><select class="form-select" id="rf-align">${aligns.map(([v,l])=>`<option value="${v}" ${f.align===v?'selected':''}>${l}</option>`).join('')}</select></div>
    </div>
    <div class="form-row"><label class="form-label">Tamaño de hoja</label><select class="form-select" id="rf-page">${sizes.map(([v,l])=>`<option value="${v}" ${f.pageSize===v?'selected':''}>${l}</option>`).join('')}</select></div>
    <div style="font-size:11px;color:var(--gray2);margin:6px 0 3px">Márgenes (cm)</div>
    <div class="form-grid">
      <div class="form-row"><label class="form-label">Superior</label><input class="form-input" id="rf-mt" type="number" step="0.1" value="${(f.mTop/10).toFixed(1)}"></div>
      <div class="form-row"><label class="form-label">Inferior</label><input class="form-input" id="rf-mb" type="number" step="0.1" value="${(f.mBottom/10).toFixed(1)}"></div>
    </div>
    <div class="form-grid">
      <div class="form-row"><label class="form-label">Izquierdo</label><input class="form-input" id="rf-ml" type="number" step="0.1" value="${(f.mLeft/10).toFixed(1)}"></div>
      <div class="form-row"><label class="form-label">Derecho</label><input class="form-input" id="rf-mr" type="number" step="0.1" value="${(f.mRight/10).toFixed(1)}"></div>
    </div>
    <div class="form-grid">
      <div class="form-row"><label class="form-label">Sangría del tab (cm)</label><input class="form-input" id="rf-ind" type="number" step="0.05" value="${(f.indent/10).toFixed(2)}"></div>
      <div class="form-row"><label class="form-label">Sangría 1ª línea (cm)</label><input class="form-input" id="rf-fi" type="number" step="0.05" value="${((f.firstIndent||0)/10).toFixed(2)}"></div>
    </div>
    <div class="form-row"><label class="form-label">Espacio entre párrafos (cm)</label><input class="form-input" id="rf-pg" type="number" step="0.05" value="${((f.paraGap||0)/10).toFixed(2)}"></div>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" onclick="saveRedFormat()">Guardar</button></div>`;
  openModal('modal-redfmt');
}
function saveRedFormat(){
  if(!_needAdminForms()) return;
  const numCm=(id,def)=>{ const v=parseFloat(val(id)); return isNaN(v)?def:Math.round(v*100)/10; };  // cm→mm
  STATE.redFormat={ font:val('rf-font')||'Times New Roman', size:parseInt(val('rf-size'))||12, lineHeight:parseFloat(val('rf-lh'))||1.5, align:val('rf-align')||'justify',
    pageSize:val('rf-page')||'oficio', mTop:numCm('rf-mt',25), mBottom:numCm('rf-mb',25), mLeft:numCm('rf-ml',30), mRight:numCm('rf-mr',25), indent:numCm('rf-ind',12.5),
    firstIndent:numCm('rf-fi',0), paraGap:numCm('rf-pg',0) };
  saveState(); closeAllModals(); toast('Formato base guardado','success');
}
// ── Mi equipo (colaboradores: abogados que se agregan junto a ti) ──
let _equipoEdit=null;
function openEquipo(){ closeAvatarMenu(); _equipoEdit=null; renderEquipo(); openModal('modal-equipo'); }
function renderEquipo(){
  const host=document.getElementById('equipo-body'); if(!host) return;
  const list=STATE.colaboradores||[];
  if(_equipoEdit){
    const c=_equipoEdit;
    host.innerHTML=`<div class="modal-title">${c._isNew?'Nuevo colaborador':'Editar colaborador'}</div>
      <div class="form-grid"><div class="form-row"><label class="form-label">Nombre *</label><input class="form-input" id="co-nombre" value="${escapeHtml(c.nombre||'')}"></div><div class="form-row"><label class="form-label">RUT</label><input class="form-input" id="co-rut" value="${escapeHtml(c.rut||'')}"></div></div>
      <div class="form-grid"><div class="form-row"><label class="form-label">Domicilio</label><input class="form-input" id="co-domicilio" value="${escapeHtml(c.domicilio||'')}"></div><div class="form-row"><label class="form-label">Género</label><select class="form-select" id="co-genero">${['Masculino','Femenino'].map(x=>`<option ${(c.genero||'Masculino')===x?'selected':''}>${x}</option>`).join('')}</select></div></div>
      <div class="form-row"><label class="form-label">Correo</label><input class="form-input" id="co-email" value="${escapeHtml(c.email||'')}"></div>
      <div class="modal-footer"><button class="btn-ghost" onclick="_equipoEdit=null;renderEquipo()">← Volver</button><button class="btn-gold" onclick="saveColab()">Guardar</button></div>`;
    return;
  }
  const rows=list.map(c=>`<div class="mdl-card"><div style="flex:1"><div class="mdl-name">🧑‍⚖️ ${escapeHtml(c.nombre||'(sin nombre)')}</div><div class="mdl-suma">${[c.rut,c.domicilio].filter(Boolean).map(escapeHtml).join(' · ')||'—'}</div></div><div style="display:flex;gap:6px"><button class="btn-ghost" onclick="editColab('${c.id}')">Editar</button><button class="btn-ghost" style="color:var(--danger)" onclick="delColab('${c.id}')">🗑</button></div></div>`).join('')||'<div style="font-size:12px;color:var(--gray2)">Sin colaboradores externos. Estos son abogados que NO usan Acervo; a los que sí lo usan, agrégalos en 🤝 Mi equipo.</div>';
  host.innerHTML=`<div class="modal-title" style="display:flex;justify-content:space-between;align-items:center">👤 Colaboradores externos <button class="btn-gold" onclick="editColab(null)">＋ Externo</button></div>
    <div style="font-size:12px;color:var(--gray2);margin-bottom:12px">Solo para abogados que <b>no usan Acervo</b> (los cargas a mano). A tus colegas de la app agrégalos en <b>🤝 Mi equipo</b> y sus datos se toman solos. Al redactar aparecen todos juntos para elegir.</div>
    ${rows}
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cerrar</button></div>`;
}
function editColab(id){ _equipoEdit = id ? Object.assign({},(STATE.colaboradores||[]).find(c=>c.id===id)) : {id:'co'+Date.now(), nombre:'',rut:'',domicilio:'',email:'',genero:'Masculino', _isNew:true}; renderEquipo(); }
function saveColab(){
  const g=id=>{const el=document.getElementById(id);return el?el.value.trim():'';};
  if(!g('co-nombre')){ toast('Pon el nombre','error'); return; }
  const o={ id:_equipoEdit.id, nombre:g('co-nombre'), rut:g('co-rut'), domicilio:g('co-domicilio'), genero:g('co-genero'), email:g('co-email') };
  STATE.colaboradores=STATE.colaboradores||[];
  const i=STATE.colaboradores.findIndex(c=>c.id===o.id); if(i>=0) STATE.colaboradores[i]=o; else STATE.colaboradores.push(o);
  _equipoEdit=null; saveState(); renderEquipo(); toast('Colaborador guardado','success');
}
function delColab(id){ if(!confirm('¿Borrar este colaborador?'))return; const i=(STATE.colaboradores||[]).findIndex(c=>c.id===id); if(i>=0)STATE.colaboradores.splice(i,1); saveState(); renderEquipo(); }
function applyAppFont(){ document.body.style.fontFamily = (STATE.appFont&&STATE.appFont.trim()) ? (`'${STATE.appFont}', system-ui, sans-serif`) : ''; }
function fmtBytes(n){ if(!n) return '0 B'; const u=['B','KB','MB','GB','TB']; const i=Math.floor(Math.log(n)/Math.log(1024)); return (n/Math.pow(1024,i)).toFixed(i?1:0)+' '+u[i]; }
const STORAGE_QUOTA = 1024*1024*1024;   // 1 GB (plan gratis de Supabase Storage)
async function openStorageInfo(){
  closeAvatarMenu();
  const body=document.getElementById('storage-body');
  body.innerHTML=`<div class="modal-title">☁️ Almacenamiento</div>
    <div style="text-align:center;padding:30px 10px;color:var(--gray2)">Calculando espacio usado…</div>`;
  openModal('modal-storage');
  // texto (biblioteca): tamaño del JSON de estado
  let stateBytes=0; try{ stateBytes=new Blob([JSON.stringify(_statePayload())]).size; }catch(_){}
  // archivos: listar la carpeta del usuario en el bucket y sumar tamaños
  let fileBytes=0, fileCount=0, cloudOK=false;
  if (STATE.uid && _hasStorage()){
    try{
      let off=0;
      while(true){
        const { data, error } = await sb.storage.from(FILE_BUCKET).list(STATE.uid, {limit:1000, offset:off});
        if(error) throw error;
        cloudOK=true;
        (data||[]).forEach(o=>{ fileCount++; fileBytes += (o.metadata&&o.metadata.size)||0; });
        if(!data || data.length<1000) break; off+=1000;
      }
    }catch(e){ cloudOK=false; }
  }
  const total = stateBytes + fileBytes;
  const pct = Math.min(100, total/STORAGE_QUOTA*100);
  const barColor = pct>90?'#e05555':(pct>70?'#d8a13a':'var(--gold)');
  body.innerHTML=`<div class="modal-title">☁️ Almacenamiento</div>
    <div style="font-size:13px;color:var(--gray2);margin-bottom:14px">Uso de tu cuenta en la nube (Supabase). Tope del plan gratis: <b>${fmtBytes(STORAGE_QUOTA)}</b>.</div>
    <div style="background:rgba(255,255,255,.08);border-radius:8px;height:16px;overflow:hidden;margin-bottom:6px">
      <div style="height:100%;width:${pct.toFixed(1)}%;background:${barColor};transition:width .4s"></div></div>
    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--gray2);margin-bottom:18px">
      <span><b style="color:var(--white)">${fmtBytes(total)}</b> usado</span><span>${pct.toFixed(1)}%</span></div>
    <div class="partes-sec"><div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)">
        <span>📄 Archivos (PDF, imágenes, Word)</span><b>${cloudOK?fmtBytes(fileBytes):'—'}</b></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)">
        <span style="color:var(--gray2)">↳ Nº de archivos</span><span style="color:var(--gray2)">${cloudOK?fileCount:'—'}</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0">
        <span>📝 Biblioteca de texto (libros, apuntes, notas)</span><b>${fmtBytes(stateBytes)}</b></div></div>
    ${cloudOK?'':'<div style="font-size:12px;color:#e0a04a;margin-top:12px">⚠️ No se pudo leer la nube (¿falta crear el bucket <b>acervo-files</b> en Supabase?). Se muestra solo el texto.</div>'}
    <div class="modal-footer"><button class="btn-gold" onclick="closeAllModals()">Cerrar</button></div>`;
}
function openApariencia(){
  closeAvatarMenu();
  const f=STATE.redFormat||{}; const af=STATE.appFont||'';
  const appFonts=[['','Predeterminada del sistema'],['Inter','Inter'],['Georgia','Georgia'],['Times New Roman','Times New Roman'],['Arial','Arial'],['Verdana','Verdana'],['Trebuchet MS','Trebuchet MS']];
  const docFonts=['Times New Roman','Georgia','Arial','Calibri','Verdana','Courier New'];
  document.getElementById('apariencia-body').innerHTML=`<div class="modal-title">🎨 Apariencia</div>
    <div class="partes-h">Interfaz de la app</div>
    <div class="form-row"><label class="form-label">Tipografía de la app</label><select class="form-select" id="ap-appfont">${appFonts.map(([v,l])=>`<option value="${v}" ${af===v?'selected':''}>${l}</option>`).join('')}</select></div>
    ${canEditForms()?`<div class="partes-sec"><div class="partes-h">Documentos / escritos</div>
      <div style="font-size:12px;color:var(--gray2);margin-bottom:10px">Base de cada documento generado; en el editor puedes ajustar a mano.</div>
      <div class="form-grid"><div class="form-row"><label class="form-label">Tipografía</label><select class="form-select" id="ap-font">${docFonts.map(x=>`<option ${f.font===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="form-row"><label class="form-label">Tamaño (pt)</label><input class="form-input" id="ap-size" type="number" min="8" max="18" value="${f.size||12}"></div></div>
      <div class="form-grid"><div class="form-row"><label class="form-label">Interlineado</label><select class="form-select" id="ap-lh">${[['1','1'],['1.5','1,5'],['2','2']].map(([v,l])=>`<option value="${v}" ${String(f.lineHeight)===v?'selected':''}>${l}</option>`).join('')}</select></div><div class="form-row"><label class="form-label">Alineación</label><select class="form-select" id="ap-align">${[['justify','Justificado'],['left','Izquierda'],['center','Centrado']].map(([v,l])=>`<option value="${v}" ${f.align===v?'selected':''}>${l}</option>`).join('')}</select></div></div>
    </div>`:''}
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" onclick="saveApariencia()">Guardar</button></div>`;
  openModal('modal-apariencia');
}
function saveApariencia(){
  STATE.appFont=val('ap-appfont');   // tipografía de la INTERFAZ: preferencia personal del usuario
  if(canEditForms() && document.getElementById('ap-font')){   // la base de los escritos solo la ajusta el admin
    STATE.redFormat=Object.assign({}, resolveFmt(null), { font:val('ap-font')||'Times New Roman', size:parseInt(val('ap-size'))||12, lineHeight:parseFloat(val('ap-lh'))||1.5, align:val('ap-align')||'justify' });
  }
  applyAppFont(); saveState(); closeAllModals(); toast('Apariencia guardada','success');
}
// (Desactivado) Antes: MAYÚSCULAS → negrita automática. Ahora el formato es manual/seleccionable.
function ucBold(html){ return html||''; }
// Convierte el texto del documento a HTML como saldría en PDF (negritas + recuadro presuma)
function docTextToHtml(texto){
  let esc=escapeHtml(texto||''); const boxes=[];
  esc=esc.replace(/\[\[PRESUMA\]\]\n?([\s\S]*?)\n?\[\[\/PRESUMA\]\]/g,(m,inner)=>{ const i=boxes.length; boxes.push({t:'presuma',inner}); return `~~b${i}~~`; });
  esc=esc.replace(/\[\[ALIGN:(\w+)\]\]\n?([\s\S]*?)\n?\[\[\/ALIGN\]\]/g,(m,al,inner)=>{ const i=boxes.length; boxes.push({t:'align',al,inner}); return `~~b${i}~~`; });
  const _inlineMarks=s=> s.replace(/\[\[B\]\]([\s\S]*?)\[\[\/B\]\]/g,'<b>$1</b>').replace(/\[\[I\]\]([\s\S]*?)\[\[\/I\]\]/g,'<i>$1</i>').replace(/\[\[U\]\]([\s\S]*?)\[\[\/U\]\]/g,'<u>$1</u>');
  esc=_inlineMarks(ucBold(esc)).replace(/\n/g,'<br>');
  esc=esc.replace(/~~b(\d+)~~/g,(m,i)=>{ const o=boxes[i]; const inner=_inlineMarks(ucBold(o.inner)).replace(/\n/g,'<br>'); return o.t==='presuma' ? `<table class="presuma-box"><tr><td>${inner}</td></tr></table>` : `<div style="text-align:${o.al}">${inner}</div>`; });
  // Tabuladores (\t) → sangría real (mismo span que el botón ⇥), con el tamaño del formato
  const _ind=((STATE.redFormat&&STATE.redFormat.indent)||12.5);
  esc=esc.replace(/\t/g, `<span class="doc-tab" style="display:inline-block;width:${_ind}mm"></span>`);
  return esc;
}
// ── Formato de redacción (general + override por modelo) ──
const DEFAULT_FMT={ font:'Times New Roman', size:12, lineHeight:1.5, align:'justify',
  pageSize:'oficio', mTop:25, mBottom:25, mLeft:30, mRight:25, indent:12.5,
  firstIndent:0, paraGap:0 };
function resolveFmt(model){ return Object.assign({}, DEFAULT_FMT, STATE.redFormat||{}, (model&&model.fmt)||{}); }
function pageDims(ps){ return ps==='carta'?[216,279]:ps==='a4'?[210,297]:ps==='legal'?[216,356]:ps==='a3'?[297,420]:[216,330]; }   // oficio por defecto (21,6×33); legal/oficio largo 21,6×35,6
function _hexToRgb(h){ h=String(h||'#111111').replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); const n=parseInt(h,16); return isNaN(n)?[17,17,17]:[(n>>16)&255,(n>>8)&255,n&255]; }
function pageStyleStr(fmt){ const d=pageDims(fmt.pageSize);
  return `width:${d[0]}mm;min-height:${d[1]}mm;box-sizing:border-box;`+
    `padding:${fmt.mTop}mm ${fmt.mRight}mm ${fmt.mBottom}mm ${fmt.mLeft}mm;`+
    `background:#fff;color:#111;font-family:'${fmt.font||'Times New Roman'}',Georgia,serif;`+
    `font-size:${fmt.size||12}pt;line-height:${fmt.lineHeight||1.5};text-align:${fmt.align||'justify'}`; }
// Carga (si hace falta) jsPDF y resuelve true/false
let _pdfLibsPromise=null;
function ensurePdfLibs(){
  if(window.jspdf && window.jspdf.jsPDF) return Promise.resolve(true);
  if(_pdfLibsPromise) return _pdfLibsPromise;
  const load=src=>new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=()=>res(); s.onerror=()=>rej(); document.head.appendChild(s); });
  _pdfLibsPromise=load('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
    .then(()=>!!(window.jspdf&&window.jspdf.jsPDF)).catch(()=>false);
  return _pdfLibsPromise;
}
// Descarga genérica de un blob con nombre
function downloadBlob(blob, name){ const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name||'documento'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>{try{URL.revokeObjectURL(url);}catch(_){}} ,1500); }
// Descarga el ARCHIVO ORIGINAL del documento abierto (PDF/imagen tal como se subió)
function _textToDocBlob(title, content){   // arma un .doc (HTML de Word) que Word/Google Docs abren directo, con párrafos y negritas
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let body=esc(content).replace(/\[\[B\]\]/g,'<b>').replace(/\[\[\/B\]\]/g,'</b>');
  body=body.split(/\n{2,}/).map(p=>'<p style="margin:0 0 10pt 0;text-align:justify;">'+(p.replace(/\n/g,'<br>')||'&nbsp;')+'</p>').join('');
  const head=title?'<h2 style="font-family:Georgia,serif;">'+esc(title)+'</h2>':'';
  const html='<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">'
    +'<head><meta charset="utf-8"><title>'+esc(title||'documento')+'</title>'
    +'<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->'
    +'<style>@page{margin:2.5cm;} body{font-family:Georgia,serif;font-size:12pt;line-height:1.5;}</style></head>'
    +'<body>'+head+body+'</body></html>';
  return new Blob(['﻿'+html], {type:'application/msword'});
}
async function downloadCurrentDoc(){
  const d=findDoc(STATE.currentDocId); if(!d){ toast('No hay documento abierto','error'); return; }
  if(d.shared && !d.allowDownload){ toast('El dueño no permitió descargar este documento','error'); return; }
  if(!d.hasFile){   // libro/apunte de solo texto → se descarga como Word (.doc, lo abre directo)
    const content=(d.content||'').trim();
    if(!content){ toast('Este documento no tiene contenido para descargar','error'); return; }
    const base=(d.title||'documento').replace(/[\\/:*?"<>|]+/g,' ').trim();
    downloadBlob(_textToDocBlob(d.title||'', content), base+'.doc'); toast('Descargado ✓','success'); return;
  }
  toast('Descargando…');
  const blob=await getFileBlob(d.id); if(!blob){ toast('No se encontró el archivo','error'); return; }
  let name=d.fileName || ((d.title||'documento').replace(/[\\/:*?"<>|]+/g,' ').trim());
  if(!/\.[a-z0-9]{2,4}$/i.test(name)) name+= (d.fileKind==='image'?'.jpg':'.pdf');
  downloadBlob(blob, name);
}
function printRedaccion(id, mode){
  const x=EXDOCS.find(d=>d.id===id)||findDoc(id); if(!x){ toast('No se encontró el documento','error'); return; }
  const f=Object.assign({}, DEFAULT_FMT, STATE.redFormat||{}, x.fmt||{});
  const fname=(x.title||'documento').replace(/[\\/:*?"<>|]+/g,' ').trim()+'.pdf';
  if(mode==='share'){
    toast('Generando PDF…');
    ensurePdfLibs().then(ok=>{
      if(!ok){ toast('Sin conexión para generar el PDF','error'); return; }
      pdfTextoReal(x, f, null, blob=>savePdfBlob(blob, fname)).catch(()=>toast('No se pudo generar el PDF','error'));
    });
    return;
  }
  // Abrimos la pestaña YA (dentro del clic) para que el navegador no la bloquee; ahí mostraremos el PDF.
  const win=window.open('', '_blank');
  if(win){ try{ win.document.write('<!doctype html><meta charset="utf-8"><title>Generando PDF…</title><body style="margin:0;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;color:#444">Generando PDF…</body>'); }catch(_){} } // xss-reviewed: static loading shell only
  ensurePdfLibs().then(ok=>{
    if(ok){ pdfTextoReal(x,f,win).catch(()=>printRedaccionFallback(x,f,win)); }
    else { printRedaccionFallback(x,f,win); }   // offline / sin librería
  });
}
// Mapea la tipografía a una fuente base de jsPDF (con acentos/ñ)
function pdfFontBase(name){ name=(name||'').toLowerCase(); if(name.indexOf('courier')>=0) return 'courier'; if(name.indexOf('arial')>=0||name.indexOf('calibri')>=0||name.indexOf('verdana')>=0||name.indexOf('helvet')>=0) return 'helvetica'; return 'times'; }
function pdfFontStyle(b,i){ return (b&&i)?'bolditalic':b?'bold':i?'italic':'normal'; }
// Parsea el HTML del documento a bloques: {type:'para',align,runs[]} | {type:'break'} | {type:'presuma',lines[]} | {type:'image',src}
function pdfParseBlocks(root, defAlign){
  const out=[]; let cur=null;
  const flush=()=>{ if(cur){ out.push(cur); cur=null; } };
  const ensure=al=>{ if(!cur) cur={type:'para',align:al,runs:[]}; };
  const alignOf=el=>{ try{ return (el.style&&el.style.textAlign)|| (el.getAttribute&&el.getAttribute('align'))||''; }catch(_){ return ''; } };
  function walk(node, st, al){
    node.childNodes.forEach(ch=>{
      if(ch.nodeType===3){
        const t=(ch.nodeValue||'').replace(/ /g,' ').replace(/[ \t\r\n]+/g,' ');
        if(t){ ensure(al); cur.runs.push(Object.assign({text:t},st)); }
      } else if(ch.nodeType===1){
        const tag=ch.tagName.toLowerCase();
        if(tag==='br'){ if(cur) flush(); else out.push({type:'break'}); }
        else if(ch.classList && ch.classList.contains('doc-tab')){ ensure(al); cur.runs.push({tab:true, w:parseFloat(ch.style.width)||12.5}); }
        else if(tag==='b'||tag==='strong') walk(ch, Object.assign({},st,{bold:true}), al);
        else if(tag==='i'||tag==='em') walk(ch, Object.assign({},st,{italic:true}), al);
        else if(tag==='u') walk(ch, Object.assign({},st,{underline:true}), al);
        else if(tag==='img'){ flush(); out.push({type:'image',src:ch.getAttribute('src')||''}); }
        else if(tag==='table'){ flush(); const td=ch.querySelector('td')||ch; out.push({type:'presuma', lines:pdfParseBlocks(td,'left')}); }
        else if(tag==='div'||tag==='p'||tag==='h1'||tag==='h2'||tag==='h3'||tag==='li'||tag==='ul'||tag==='ol'||tag==='center'||tag==='tr'||tag==='tbody'){
          flush(); const a=alignOf(ch)||(tag==='center'?'center':al); walk(ch, st, a); flush();
        } else {
          const s2=Object.assign({},st), cs=ch.style||{};
          if(cs.fontWeight==='bold'||parseInt(cs.fontWeight,10)>=600) s2.bold=true;
          if(cs.fontStyle==='italic') s2.italic=true;
          if((cs.textDecoration||'').indexOf('underline')>=0) s2.underline=true;
          walk(ch, s2, alignOf(ch)||al);
        }
      }
    });
  }
  walk(root, {}, defAlign); flush(); return out;
}
// Genera un PDF de TEXTO REAL (seleccionable), tamaño OFICIO, márgenes normales; lo abre en la pestaña.
function pdfTextoReal(x,f,win,onBlob){
  const showUrl=(url)=>{ if(win){ try{ win.location.href=url; return; }catch(_){} } const w2=window.open(url,'_blank'); if(!w2){ const a=document.createElement('a'); a.href=url; a.download=(x.title||'documento')+'.pdf'; document.body.appendChild(a); a.click(); a.remove(); } };
  const { jsPDF }=window.jspdf;
  const dims=pageDims(f.pageSize);
  const doc=new jsPDF({unit:'mm', format:dims});
  const pageW=dims[0], pageH=dims[1];
  const MT=Number(f.mTop)||25, MB=Number(f.mBottom)||25, ML=Number(f.mLeft)||30, MR=Number(f.mRight)||25;
  const cW=pageW-ML-MR;
  const fam=pdfFontBase(f.font), size=Number(f.size)||12, lh=Number(f.lineHeight)||1.5, PT=0.35278;
  const lineH=size*lh*PT;
  const mem=STATE.membrete||{};
  const conM = x.conMembrete && (mem.logo || (mem.pie||'').trim());
  const pieLines = (conM && (mem.pie||'').trim()) ? mem.pie.split('\n') : [];
  // Como en Word: el membrete va EN el margen superior y el pie EN el margen inferior; NO reducen el cuerpo
  const bodyTop = (mem.bodyTopMm!=null) ? Number(mem.bodyTopMm) : MT;   // el usuario puede hacer que el texto empiece más abajo (aire tras el membrete)
  const CT = bodyTop + size*PT;     // baseline de la 1ª línea de contenido
  const CB = (mem.bodyBottomMm!=null) ? Number(mem.bodyBottomMm) : (pageH - MB);   // el usuario puede subir dónde termina el texto (aire antes del pie)
  const FI = Number(f.firstIndent)||0;   // sangría de 1ª línea (mm)
  const PGAP = Number(f.paraGap)||0;     // espacio entre párrafos (mm)
  let y=CT;
  doc.setFont(fam,'normal'); doc.setFontSize(size);
  const need=()=>{ if(y>CB){ doc.addPage(); y=CT; } };
  const wOf=(s,b,i)=>{ doc.setFont(fam,pdfFontStyle(b,i)); return doc.getTextWidth(s); };
  const tokW=t=> t.tab ? t.w : (function(){ doc.setFont(fam,pdfFontStyle(t.b,t.i)); return doc.getTextWidth(t.s); })();
  function renderPara(runs, align){
    const fi = (align==='center'||align==='right')?0:FI;   // sangría de 1ª línea (solo izq/justificado)
    const toks=[];
    (runs||[]).forEach(r=>{ if(r.tab){ toks.push({tab:true, w:Number(r.w)||12.5}); return; } (r.text||'').split(/(\s+)/).forEach(p=>{ if(p!=='') toks.push({s:p, sp:/^\s+$/.test(p), b:!!r.bold, i:!!r.italic, u:!!r.underline}); }); });
    const lines=[]; let ln=[], lw=0;
    const push=()=>{ while(ln.length&&ln[ln.length-1].sp) ln.pop(); while(ln.length&&ln[0].sp) ln.shift(); if(ln.length) lines.push(ln); ln=[]; lw=0; };
    toks.forEach(t=>{ const w=tokW(t); const limit=(lines.length===0?cW-fi:cW); if(!t.sp && !t.tab && lw+w>limit && ln.length){ push(); } ln.push(t); lw+=w; });
    push();
    if(!lines.length){ need(); y+=lineH; return; }
    lines.forEach((line,li)=>{
      need();
      const ind=(li===0?fi:0);
      let natW=0, nSp=0; line.forEach(t=>{ natW+=tokW(t); if(t.sp) nSp++; });
      let x=ML+ind, extra=0; const last=li===lines.length-1; const avail=cW-ind;
      if(align==='center') x=ML+(cW-natW)/2;
      else if(align==='right') x=ML+(cW-natW);
      else if(align==='justify' && !last && nSp>0) extra=(avail-natW)/nSp;
      line.forEach(t=>{ if(t.tab){ x+=t.w; return; } doc.setFont(fam,pdfFontStyle(t.b,t.i)); const w=doc.getTextWidth(t.s); if(!t.sp){ doc.text(t.s,x,y); if(t.u){ doc.setLineWidth(0.2); doc.line(x,y+0.7,x+w,y+0.7); } } x+=w+(t.sp?extra:0); });
      y+=lineH;
    });
  }
  function renderPresuma(b){
    const paras=(b.lines||[]).filter(l=>l.type==='para'); const pad=2.5, boxW=cW*0.58, boxX=ML+cW-boxW;
    const boxH=Math.max(lineH, paras.length*lineH)+pad*2;
    if(y - size*PT + boxH > CB){ doc.addPage(); y=CT; }
    const top=y-size*PT;
    doc.setLineWidth(0.3); doc.rect(boxX, top, boxW, boxH);
    let yy=top+pad+size*PT;
    paras.forEach(p=>{ let xx=boxX+pad; (p.runs||[]).forEach(r=>{ doc.setFont(fam,pdfFontStyle(r.bold,r.italic)); const w=doc.getTextWidth(r.text); doc.text(r.text,xx,yy); xx+=w; }); yy+=lineH; });
    y=top+boxH+lineH*0.4+size*PT;
  }
  async function renderImage(b){
    if(!b.src) return;
    const dim=await new Promise(res=>{ const im=new Image(); im.onload=()=>res({w:im.naturalWidth,h:im.naturalHeight}); im.onerror=()=>res(null); im.src=b.src; });
    let hmm=20, wmm=40; if(dim&&dim.w&&dim.h){ wmm=hmm*(dim.w/dim.h); if(wmm>cW){ wmm=cW; hmm=wmm*(dim.h/dim.w); } }
    if(y - size*PT + hmm > CB){ doc.addPage(); y=CT; }
    const top=y-size*PT, xx=ML+(cW-wmm)/2;
    try{ doc.addImage(b.src,'PNG',xx,top,wmm,hmm); }catch(e){ try{ doc.addImage(b.src,'JPEG',xx,top,wmm,hmm); }catch(_){} }
    y=top+hmm+lineH*0.6+size*PT;
  }
  return (async()=>{
    const root=document.createElement('div'); root.innerHTML=x.content||''; // xss-reviewed: PDF export parses saved editor HTML into text/image blocks
    const blocks=pdfParseBlocks(root, f.align||'justify');
    for(const b of blocks){
      if(b.type==='break'){ need(); y+=lineH; }   // línea en blanco completa (igual que en pantalla)
      else if(b.type==='image'){ await renderImage(b); }
      else if(b.type==='presuma'){ renderPresuma(b); }
      else renderPara(b.runs, b.align);
      if(PGAP) y+=PGAP;   // espacio entre párrafos (igual que margin-bottom en pantalla)
    }
    // Guarniciones: membrete arriba y pie abajo, REPETIDOS en cada página (como Word)
    if(conM){
      let headDim=null;
      if(mem.logo){ headDim=await new Promise(res=>{ const im=new Image(); im.onload=()=>res({w:im.naturalWidth,h:im.naturalHeight}); im.onerror=()=>res(null); im.src=mem.logo; }); }
      const la=mem.logoAlign||'center', pa=mem.pieAlign||'center';
      const total=doc.getNumberOfPages();
      const dLogoY=Number(mem.logoY)||0, dPieY=Number(mem.pieY)||0, sc=(Number(mem.logoScale)||100)/100;   // ajustes globales (posición/tamaño) — se configuran una vez
      for(let p=1;p<=total;p++){ doc.setPage(p);
        if(mem.logo){ const bh=Math.max(8, MT-4); const asp=(headDim&&headDim.w&&headDim.h)?(headDim.w/headDim.h):1.6; let hh=bh, ww=bh*asp;
          if(mem.logoXmm==null){ if(ww>cW){ ww=cW; hh=ww/asp; } if(hh>MT-2){ hh=MT-2; ww=hh*asp; } }   // modo alineación: cabe en la banda; modo libre: tamaño real
          ww*=sc; hh*=sc;
          let hx, hy;
          if(mem.logoXmm!=null){ hx=Number(mem.logoXmm)||0; hy=Number(mem.logoYmm)||0; }   // posición LIBRE (editor visual)
          else { hx = la==='left'?ML : la==='right'?(ML+cW-ww) : (ML+(cW-ww)/2); hy=Math.max(0,(MT-hh)/2)+dLogoY; }
          try{ doc.addImage(mem.logo,'PNG',hx,hy,ww,hh); }catch(e){ try{ doc.addImage(mem.logo,'JPEG',hx,hy,ww,hh); }catch(_){} } }
        if(pieLines.length){ doc.setFont(fam,'normal'); doc.setFontSize(10); const flh=10*1.25*PT;
          const pc=_hexToRgb(mem.pieColor); doc.setTextColor(pc[0],pc[1],pc[2]);
          if(mem.pieXmm!=null){ let ly=(Number(mem.pieYmm)||0)+10*PT*0.9; const px=Number(mem.pieXmm)||0; const W=cW; pieLines.forEach(l=>{ const w=doc.getTextWidth(l); let lx=px; if(pa==='center') lx=px+(W-w)/2; else if(pa==='right') lx=px+(W-w); doc.text(l, lx, ly); ly+=flh; }); }   // posición LIBRE: bloque = ancho del área de texto, líneas alineadas dentro
          else { const pieH=pieLines.length*flh; let ly=pageH-MB+Math.max(1.5,(MB-pieH)/2)+10*PT*0.9+dPieY; const px = pa==='left'?ML : pa==='right'?(pageW-MR) : (pageW/2); pieLines.forEach(l=>{ doc.text(l, px, ly, {align:pa}); ly+=flh; }); }
          doc.setTextColor(0,0,0); doc.setFontSize(size); }
      }
    }
    await stampWatermark(doc, mem, pageW, pageH, fam, size);   // marca de agua (texto o imagen) si el usuario la activó
    const blob=doc.output('blob');
    if(onBlob){ onBlob(blob); return; }
    const url=URL.createObjectURL(blob);
    showUrl(url);
    setTimeout(()=>{ try{URL.revokeObjectURL(url);}catch(_){} }, 120000);
  })();
}
// Guarda/compartir el PDF: en móvil abre la hoja de Compartir de iOS (Guardar en Archivos, etc.); en PC descarga.
async function savePdfBlob(blob, name){
  try{
    const file=new File([blob], name, {type:'application/pdf'});
    if(navigator.canShare && navigator.canShare({files:[file]})){
      try{ await navigator.share({files:[file], title:name}); return; }
      catch(e){ if(e && e.name==='AbortError') return; }
    }
  }catch(_){}
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>{ try{URL.revokeObjectURL(url);}catch(_){} }, 8000);
  toast('PDF guardado','success');
}
// Respaldo: abre el documento en pestaña propia con forma de impresión (sin librería de PDF)
function printRedaccionFallback(x,f,win){
  // Hoja real (forma de impresión) en pestaña propia — funciona igual en PC y celular y evita el screenshot.
  const sheetStyle=`font-family:'${f.font||'Times New Roman'}',Georgia,serif;font-size:${f.size||12}pt;line-height:${f.lineHeight||1.5};text-align:${f.align||'justify'};color:#000`;
  const auto=!isMobile();   // en PC abrimos directo el diálogo de impresión; en móvil, con botón (AirPrint)
  const doc=`<!doctype html><html lang="es"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(x.title||'Documento')}</title>
    <style>@page{margin:2cm 2.2cm} *{box-sizing:border-box}
      body{margin:0;background:#5b6066;-webkit-text-size-adjust:100%}
      .rwp-bar{position:sticky;top:0;display:flex;gap:10px;justify-content:center;align-items:center;background:#0A1628;padding:11px;font-family:system-ui;box-shadow:0 2px 10px rgba(0,0,0,.35);z-index:5}
      .rwp-bar button{background:#C9A84C;color:#0A1628;border:none;border-radius:9px;padding:12px 18px;font-weight:800;font-size:15px;cursor:pointer}
      .rwp-sheet{${sheetStyle};background:#fff;max-width:21cm;margin:18px auto;padding:2.2cm 2.4cm;box-shadow:0 8px 30px rgba(0,0,0,.45)}
      .rwp-sheet b{font-weight:700}
      .rwp-sheet .presuma-box{border:1px solid #333;width:58%;margin:0 0 14px auto;border-collapse:collapse}
      .rwp-sheet .presuma-box td{padding:6px 10px}
      @media print{ body{background:#fff} .rwp-bar{display:none} .rwp-sheet{box-shadow:none;margin:0;max-width:none;padding:0} }
    </style></head>
    <body ${auto?'onload="setTimeout(function(){try{window.print()}catch(e){}},400)"':''}>
      <div class="rwp-bar"><button onclick="window.print()">📄 Guardar como PDF / Imprimir</button></div>
      <div class="rwp-sheet">${x.content||''}</div>
    </body></html>`;
  if(win){ try{ win.document.open(); win.document.write(doc); win.document.close(); return; }catch(_){} } // xss-reviewed: print fallback writes one reviewed HTML document shell
  const blob=new Blob([doc],{type:'text/html'});
  const url=URL.createObjectURL(blob);
  const w=window.open(url,'_blank');
  if(!w){ toast('Permite las ventanas/pestañas para ver el PDF','error'); }
  setTimeout(()=>{ try{URL.revokeObjectURL(url);}catch(_){} }, 60000);
}

// ── Asistente de redacción ──
const RW_LABELS={tipo:'Tipo',causa:'Causa',comp:'Compareciente',modelo:'Modelo',datos:'Partes',escritos:'Piezas',generar:'Generar'};
function tipoNombre(id){ const t=tipoById(id); return t?t.nombre:''; }
function rwPickPieza(id){ _RW.escs=[{modeloId:id,vars:{}}]; _RW.cx.partes=_RW.cx.partes||{}; rwSaveDraft(); renderRW(); }
function rwSetParte(rk,cid){ _RW.cx.partes=_RW.cx.partes||{}; _RW.cx.partes[rk]=cid; rwSaveDraft(); rwUpdatePreview(); }
function rwAddRolePerson(base){ _RW.cx.partes=_RW.cx.partes||{}; let i=2; while(_RW.cx.partes[base+i]!==undefined) i++; _RW.cx.partes[base+i]=''; rwSaveDraft(); renderRW(); }   // otra persona en la misma parte (va por igual)
function rwSetVar(mid,vid,val){ const e=_RW.escs.find(x=>x.modeloId===mid); if(e){ e.vars=e.vars||{}; e.vars[vid]=val; } rwSaveDraft(); rwUpdatePreview(); }
function rwSetCx(k,val){ _RW.cx[k]=val; rwSaveDraft(); }
function rwSetMode(m){ _RW.mode=m; _RW._autoApplied=false; renderRW(); }
function rwPickExp(id){ const e=EXPEDIENTES.find(x=>x.id===id); _RW.cx = e ? cxFromExpediente(e) : Object.assign(_RW.cx,{expId:null}); _RW._autoApplied=false; rwSaveDraft(); renderRW(); }
function rwSetPoder(v){ _RW.cx.tienePoder=v; _RW._autoApplied=false; renderRW(); }
function rwToggleModel(id){
  const i=_RW.escs.findIndex(e=>e.modeloId===id);
  if(i>=0){ _RW.escs.splice(i,1); }
  else {
    const m=MODELOS.find(x=>x.id===id); _RW.escs.push({modeloId:id,vars:{}});
    if(m && m.categoria==='demanda' && (m.otrosiesDefault||[]).length){
      m.otrosiesDefault.forEach(oid=>{ if(MODELOS.some(x=>x.id===oid) && !_RW.escs.some(e=>e.modeloId===oid)) _RW.escs.push({modeloId:oid,vars:{}}); });
    }
  }
  rwSortEscs(); rwSaveDraft(); renderRW();
}
// el principal (no-otrosí) queda primero; los otrosíes (incl. PYP) después, en su orden
function rwSortEscs(){ _RW.escs.sort((a,b)=>{ const ma=MODELOS.find(x=>x.id===a.modeloId), mb=MODELOS.find(x=>x.id===b.modeloId); return ((ma&&ma.esOtrosi?1:0)-(mb&&mb.esOtrosi?1:0)); }); }
// Reglas automáticas al entrar a elegir piezas: si la causa NO tiene poder, agrega la PYP como petición marcada
function rwApplyAutoPeticiones(){
  if(_RW._autoApplied) return;
  const t=tipoById(_RW.tipoDoc);
  if(t && (t.motor||'judicial')==='judicial'){
    const hasPyp=_RW.escs.some(e=>e.modeloId==='pyp');
    if(!_RW.cx.tienePoder && !hasPyp && MODELOS.some(m=>m.id==='pyp')) _RW.escs.push({modeloId:'pyp',vars:{}});
    if(_RW.cx.tienePoder && hasPyp) _RW.escs=_RW.escs.filter(e=>e.modeloId!=='pyp');
    // Otrosí que ACREDITA PERSONERÍA/MANDATO: se agrega al marcar "Tengo mandato", se quita si no
    const persoIds=MODELOS.filter(m=>m.esPersoneria).map(m=>m.id);
    if(persoIds.length){
      if(_RW.cx.mandato){ persoIds.forEach(pid=>{ if(!_RW.escs.some(e=>e.modeloId===pid)) _RW.escs.push({modeloId:pid,vars:{}}); }); }
      else { _RW.escs=_RW.escs.filter(e=>!persoIds.includes(e.modeloId)); }
    }
  }
  rwSortEscs(); _RW._autoApplied=true;
}
function rwMove(i,dir){ const j=i+dir; if(j<0||j>=_RW.escs.length) return; const t=_RW.escs[i]; _RW.escs[i]=_RW.escs[j]; _RW.escs[j]=t; rwSaveDraft(); renderRW(); }
function rwGo(dir){
  const steps=rwSteps(); const i=steps.indexOf(_RW.step);
  if(dir>0){
    if(_RW.step==='tipo'){ const t=tipoById(_RW.tipoDoc); if(!t){ toast('Elige el tipo de documento','error'); return; } }
    if(_RW.step==='causa'){
      if(_RW.mode==='exist' && !_RW.cx.expId){ toast('Elige una causa o usa "Nueva causa"','error'); return; }
      if(_RW.mode==='nueva'){ if(!_RW.cx.clienteId){ toast('Elige el cliente de la causa','error'); return; } if(_RW.tipoDoc!=='demanda' && !(_RW.cx.caratula||'').trim()){ toast('Pon la carátula de la causa','error'); return; } }
    }
    if(_RW.step==='modelo' && !_RW.escs.length){ toast('Elige el modelo','error'); return; }
    if(_RW.step==='datos'){ const pz=MODELOS.find(x=>x.id===(_RW.escs[0]||{}).modeloId); const roles=(pz&&pz.roles)||[]; const partes=_RW.cx.partes||{}; if(roles.some(r=>!partes[r.key])){ toast('Asigna un cliente a cada parte','error'); return; } }
    if(_RW.step==='escritos' && !_RW.escs.length){ toast('Elige al menos un escrito','error'); return; }
  }
  const ni=Math.max(0,Math.min(steps.length-1,i+dir));
  _RW.step=steps[ni];
  _RW.genHTML=null;   // al navegar, la hoja de Generar se regenera con las selecciones actuales
  if(_RW.step==='escritos') rwApplyAutoPeticiones();
  rwSaveDraft(); renderRW();
}
// Membrete (logo) y pie de página configurados en el perfil del usuario
// Marca de agua (texto o imagen) en cada página — el usuario elige qué y cómo
async function stampWatermark(doc, mem, pageW, pageH, fam, size){
  const wm=(mem||{}).wm; if(!wm || !wm.on) return;
  const esImg=wm.type==='imagen';
  if(esImg ? !wm.img : !(wm.text||'').trim()) return;
  const op=Math.max(0.03, Math.min(0.6, Number(wm.opacity)||0.12));
  let dim=null; if(esImg){ dim=await new Promise(res=>{ const im=new Image(); im.onload=()=>res({w:im.naturalWidth,h:im.naturalHeight}); im.onerror=()=>res(null); im.src=wm.img; }); }
  const total=doc.getNumberOfPages();
  for(let p=1;p<=total;p++){ doc.setPage(p);
    try{ doc.setGState(new doc.GState({opacity:op})); }catch(_){}
    if(esImg){ let ww=Number(wm.size)||90, hh=ww; if(dim&&dim.w&&dim.h) hh=ww*(dim.h/dim.w); const wx=(pageW-ww)/2, wy=(pageH-hh)/2; try{ doc.addImage(wm.img,'PNG',wx,wy,ww,hh); }catch(e){ try{ doc.addImage(wm.img,'JPEG',wx,wy,ww,hh); }catch(_){} } }
    else { const fs=Number(wm.size)||60; doc.setFont(fam,'bold'); doc.setFontSize(fs); doc.setTextColor(120,120,120); try{ doc.text(String(wm.text).toUpperCase(), pageW/2, pageH/2, {align:'center', baseline:'middle', angle:Number(wm.angle)||45}); }catch(_){ doc.text(String(wm.text).toUpperCase(), pageW/2, pageH/2, {align:'center'}); } doc.setTextColor(0,0,0); }
    try{ doc.setGState(new doc.GState({opacity:1})); }catch(_){}
  }
  doc.setFont(fam,'normal'); doc.setFontSize(size);
}
function membreteHeaderHTML(){ const mem=STATE.membrete||{}; return mem.logo?`<div style="text-align:${mem.logoAlign||'center'};margin-bottom:14px"><img src="${mem.logo}" style="max-height:90px;max-width:100%"></div>`:''; }
function membreteFooterHTML(){ const mem=STATE.membrete||{}; return (mem.pie||'').trim()?`<div style="margin-top:26px;border-top:1px solid #999;padding-top:6px;font-size:10pt;text-align:${mem.pieAlign||'center'};white-space:pre-wrap">${escapeHtml(mem.pie)}</div>`:''; }
function hayMembrete(){ const mem=STATE.membrete||{}; return !!(mem.logo||(mem.pie||'').trim()); }
// HTML inicial de la hoja del paso Generar (cuerpo + membrete/pie si están activos)
function rwGenInitHTML(){ const inc=_RW.conMembrete!==false; return (inc?membreteHeaderHTML():'') + rwPreviewHTML() + (inc?membreteFooterHTML():''); }
// ── Paginación REAL de la vista previa (hojas oficio, mismo flujo que el PDF) ──
function pageSheetStyle(fmt){ const d=pageDims(fmt.pageSize);
  return `width:${d[0]}mm;height:${d[1]}mm;box-sizing:border-box;overflow:hidden;`+
    `padding:${fmt.mTop}mm ${fmt.mRight}mm ${fmt.mBottom}mm ${fmt.mLeft}mm;`+
    `background:#fff;color:#111;font-family:'${fmt.font||'Times New Roman'}',Georgia,serif;`+
    `font-size:${fmt.size||12}pt;line-height:${fmt.lineHeight||1.5};text-align:${fmt.align||'justify'}`; }
function pdfRunsToHTML(runs){ return (runs||[]).map(r=>{
    if(r.tab) return `<span class="doc-tab" style="display:inline-block;width:${(r.w||12.5)}mm"></span>`;
    let t=escapeHtml(r.text||''); if(r.underline)t=`<u>${t}</u>`; if(r.italic)t=`<i>${t}</i>`; if(r.bold)t=`<b>${t}</b>`; return t;
  }).join(''); }
function pdfBlockToEl(b){
  if(b.type==='break'){ const d=document.createElement('div'); d.innerHTML='&nbsp;'; return d; }
  if(b.type==='image'){ const w=document.createElement('div'); w.style.textAlign='center'; const im=document.createElement('img'); im.src=b.src; im.style.maxHeight='22mm'; im.style.maxWidth='100%'; w.appendChild(im); return w; }
  if(b.type==='presuma'){ const wrap=document.createElement('div'); const t=document.createElement('table'); t.className='presuma-box'; const ls=(b.lines||[]).filter(l=>l.type==='para'); t.innerHTML=`<tr><td>${ls.map(l=>pdfRunsToHTML(l.runs)).join('<br>')}</td></tr>`; wrap.appendChild(t); return wrap; }
  const d=document.createElement('div'); if(b.align)d.style.textAlign=b.align; d.innerHTML=pdfRunsToHTML(b.runs)||'&nbsp;'; return d;
}
function membreteHeadEl(fmt){ const mem=STATE.membrete||{};
  const d=document.createElement('div'); d.className='rw-sheet-head'; d.contentEditable='false';
  if(!mem.logo) return d;
  if(mem.logoXmm!=null){   // posición LIBRE (editor visual)
    const sc=(Number(mem.logoScale)||100)/100, bh=Math.max(8,fmt.mTop-4)*sc;
    d.style.cssText=`position:absolute;left:${mem.logoXmm}mm;top:${mem.logoYmm}mm;pointer-events:none;z-index:2`;
    const im=document.createElement('img'); im.src=mem.logo; im.style.height=`${bh}mm`; im.style.width='auto'; im.style.maxWidth='none'; d.appendChild(im); return d;
  }
  const j=({left:'flex-start',right:'flex-end',center:'center'})[mem.logoAlign||'center']||'center';
  const sc=(Number(mem.logoScale)||100)/100;
  d.style.cssText=`position:absolute;left:${fmt.mLeft}mm;right:${fmt.mRight}mm;top:0;height:${fmt.mTop}mm;display:flex;align-items:center;justify-content:${j};pointer-events:none`;
  const im=document.createElement('img'); im.src=mem.logo; im.style.maxHeight=`${Math.max(8,fmt.mTop-4)*sc}mm`; im.style.maxWidth='100%'; d.appendChild(im); return d; }
function membreteFootEl(fmt){ const mem=STATE.membrete||{}; const al=mem.pieAlign||'center';
  const d=document.createElement('div'); d.className='rw-sheet-foot'; d.contentEditable='false';
  if(!(mem.pie||'').trim()) return d;
  const pcol=mem.pieColor||'#111111';
  if(mem.pieXmm!=null){   // posición LIBRE (editor visual)
    d.style.cssText=`position:absolute;left:${mem.pieXmm}mm;top:${mem.pieYmm}mm;pointer-events:none;z-index:2`;
    const t=document.createElement('div'); t.style.cssText=`font-size:10pt;white-space:pre-wrap;text-align:${al};color:${pcol}`; t.textContent=mem.pie; d.appendChild(t); return d;
  }
  d.style.cssText=`position:absolute;left:${fmt.mLeft}mm;right:${fmt.mRight}mm;bottom:0;height:${fmt.mBottom}mm;display:flex;align-items:center;pointer-events:none`;
  const t=document.createElement('div'); t.style.cssText=`width:100%;font-size:10pt;white-space:pre-wrap;text-align:${al};color:${pcol}`; t.textContent=mem.pie; d.appendChild(t); return d; }
// ── EDITOR VISUAL del membrete: arrastra logo y pie sobre una hoja de muestra (global) ──
function openMembreteEditor(){
  const mem=STATE.membrete=STATE.membrete||{};
  if(!mem.logo && !(mem.pie||'').trim()){ toast('Primero carga un logo o escribe el pie en tu perfil','error'); return; }
  const f=Object.assign({}, DEFAULT_FMT, STATE.redFormat||{});
  const dims=pageDims(f.pageSize), PW=dims[0], PH=dims[1];
  const SW=Math.min(340, Math.round(window.innerWidth*0.55)), pxmm=SW/PW, SH=Math.round(PH*pxmm);
  const bh=Math.max(8, f.mTop-4);
  const body=document.getElementById('membrete-ed-body');
  body.innerHTML=`<div class="modal-title">🎨 Acomodar membrete</div>
    <div style="font-size:12.5px;color:var(--gray2);margin-bottom:10px">Arrastra el <b>logo</b> y el <b>pie</b> a donde quieras (hasta el borde). La <b style="color:#3b82f6">línea azul</b> marca dónde <b>empieza el texto</b>: bájala para dejar aire tras el membrete (una, dos o más líneas). El recuadro punteado es el área de texto. Es la base para todos los escritos.</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
      <div id="mbe-sheet" style="position:relative;width:${SW}px;height:${SH}px;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,.5);border-radius:2px;flex:0 0 auto;overflow:hidden;touch-action:none">
        <div style="position:absolute;left:${f.mLeft*pxmm}px;top:${f.mTop*pxmm}px;width:${(PW-f.mLeft-f.mRight)*pxmm}px;height:${(PH-f.mTop-f.mBottom)*pxmm}px;border:1px dashed #c4c4c4;pointer-events:none"></div>
      </div>
      <div style="flex:1;min-width:190px">
        <div class="form-label" style="margin-bottom:3px">Logo</div>
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px">
          <button class="btn-ghost" onclick="_mbeSnapLogo('left')" title="Izquierda">⬅</button>
          <button class="btn-ghost" onclick="_mbeSnapLogo('center')" title="Centro">↔</button>
          <button class="btn-ghost" onclick="_mbeSnapLogo('right')" title="Derecha">➡</button>
          <input class="form-input" type="number" id="mbe-scale" step="5" min="20" max="400" value="${Number(mem.logoScale)||100}" title="Tamaño (%)" style="width:66px">
          <span style="font-size:10px;color:var(--gray2)">%</span>
        </div>
        ${(mem.pie||'').trim()?`<div class="form-label" style="margin-bottom:3px">Pie de página</div>
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:10px">
          <button class="btn-ghost" onclick="_mbePieAlign('left')" title="Izquierda">⬅</button>
          <button class="btn-ghost" onclick="_mbePieAlign('center')" title="Centro">↔</button>
          <button class="btn-ghost" onclick="_mbePieAlign('right')" title="Derecha">➡</button>
          <input type="color" id="mbe-piecolor" value="${mem.pieColor||'#111111'}" title="Color del pie" style="width:38px;height:32px;border:none;background:none;cursor:pointer">
          <span style="font-size:10px;color:var(--gray2)">color</span>
        </div>`:''}
        <div style="font-size:11px;color:var(--gray2);margin:2px 0 12px">Arrastra las piezas y las líneas azul/roja. Ubica el logo como en tu papel membretado.</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn-ghost" onclick="_mbeReset()">↺ Reiniciar posiciones</button>
          <button class="btn-gold" onclick="closeAllModals()">Listo</button>
        </div>
      </div>
    </div>`;
  openModal('modal-membrete');
  const sheet=document.getElementById('mbe-sheet');
  const sc=(Number(mem.logoScale)||100)/100;
  // ── Líneas "empieza / termina el texto" (arrastre vertical) ──
  if(mem.bodyTopMm==null) mem.bodyTopMm=f.mTop;
  if(mem.bodyBottomMm==null) mem.bodyBottomMm=Math.round((PH-f.mBottom)*10)/10;
  _mbeVLine(sheet, pxmm, '↧ empieza el texto', '#3b82f6', mem.bodyTopMm, ymm=>{ mem.bodyTopMm=Math.max(4,ymm); saveState(); });
  _mbeVLine(sheet, pxmm, '↥ termina el texto', '#e0736f', mem.bodyBottomMm, ymm=>{ mem.bodyBottomMm=ymm; saveState(); });
  if(mem.logo){
    const img=new Image(); img.src=mem.logo;
    img.onload=()=>{
      const asp=(img.naturalWidth/img.naturalHeight)||1.6;
      const hh=bh*sc, ww=hh*asp;
      if(mem.logoXmm==null){ mem.logoXmm=Math.round(((PW-ww)/2)*10)/10; mem.logoYmm=Math.round(Math.max(0,(f.mTop-hh)/2)*10)/10; }
      const box=document.createElement('div'); box.className='mbe-box mbe-logo'; box.title='Logo — arrastra';
      box.style.cssText=`position:absolute;cursor:grab;left:${mem.logoXmm*pxmm}px;top:${mem.logoYmm*pxmm}px;width:${ww*pxmm}px;height:${hh*pxmm}px`;
      box.innerHTML=`<img src="${mem.logo}" style="width:100%;height:100%;object-fit:contain;pointer-events:none">`;
      sheet.appendChild(box);
      _mbeDrag(box, sheet, pxmm, (xmm,ymm)=>{ mem.logoXmm=xmm; mem.logoYmm=ymm; saveState(); });
      box._asp=asp;
    };
  }
  if((mem.pie||'').trim()){
    if(mem.pieXmm==null){ mem.pieXmm=f.mLeft; mem.pieYmm=Math.round((PH-f.mBottom+2)*10)/10; }
    const box=document.createElement('div'); box.className='mbe-box mbe-pie'; box.title='Pie — arrastra';
    box.style.cssText=`position:absolute;cursor:grab;left:${mem.pieXmm*pxmm}px;top:${mem.pieYmm*pxmm}px;width:${(PW-f.mLeft-f.mRight)*pxmm}px;font-size:${Math.max(6,Math.round(3.5*pxmm))}px;line-height:1.25;color:${mem.pieColor||'#111'};text-align:${mem.pieAlign||'center'};white-space:pre-wrap;background:rgba(201,168,76,.1);border:1px dashed rgba(0,0,0,.25);padding:1px 3px;box-sizing:border-box`;
    box.textContent=mem.pie;
    sheet.appendChild(box);
    _mbeDrag(box, sheet, pxmm, (xmm,ymm)=>{ mem.pieXmm=xmm; mem.pieYmm=ymm; saveState(); });
  }
  const scin=document.getElementById('mbe-scale'); if(scin) scin.oninput=()=>{ const v=Math.max(20,Math.min(400,Number(scin.value)||100)); mem.logoScale=v; saveState();
    const lb=sheet.querySelector('.mbe-logo'); if(lb&&lb._asp){ const hh=bh*(v/100), ww=hh*lb._asp; lb.style.width=(ww*pxmm)+'px'; lb.style.height=(hh*pxmm)+'px'; } };
  const pcin=document.getElementById('mbe-piecolor'); if(pcin) pcin.oninput=()=>{ mem.pieColor=pcin.value; saveState(); const pb=sheet.querySelector('.mbe-pie'); if(pb) pb.style.color=mem.pieColor; };
}
function _mbeGuide(sheet, show){ let g=sheet.querySelector('.mbe-guide'); if(show){ if(!g){ g=document.createElement('div'); g.className='mbe-guide'; g.style.cssText='position:absolute;top:0;bottom:0;left:50%;width:0;border-left:1px dashed #10b981;pointer-events:none;z-index:6'; sheet.appendChild(g); } } else if(g){ g.remove(); } }
function _mbeDrag(box, sheet, pxmm, onDrop){
  let sx=0,sy=0,ox=0,oy=0,drag=false;
  box.addEventListener('pointerdown',e=>{ e.preventDefault(); drag=true; ox=parseFloat(box.style.left)||0; oy=parseFloat(box.style.top)||0; sx=e.clientX; sy=e.clientY; box.style.cursor='grabbing'; try{box.setPointerCapture(e.pointerId);}catch(_){}});
  box.addEventListener('pointermove',e=>{ if(!drag) return; let nx=ox+(e.clientX-sx), ny=oy+(e.clientY-sy);
    const cx=sheet.clientWidth/2, bcx=nx+box.offsetWidth/2;   // IMÁN: centro del cuadro → centro de la hoja
    if(Math.abs(bcx-cx)<9){ nx=cx-box.offsetWidth/2; _mbeGuide(sheet,true); } else _mbeGuide(sheet,false);
    nx=Math.max(-box.offsetWidth*0.6, Math.min(nx, sheet.clientWidth-box.offsetWidth*0.4));
    ny=Math.max(-box.offsetHeight*0.6, Math.min(ny, sheet.clientHeight-box.offsetHeight*0.4));
    box.style.left=nx+'px'; box.style.top=ny+'px'; });
  const end=e=>{ if(!drag) return; drag=false; box.style.cursor='grab'; _mbeGuide(sheet,false); try{box.releasePointerCapture(e.pointerId);}catch(_){}
    onDrop(Math.round((parseFloat(box.style.left)/pxmm)*10)/10, Math.round((parseFloat(box.style.top)/pxmm)*10)/10); };
  box.addEventListener('pointerup',end); box.addEventListener('pointercancel',end);
}
function _mbeVLine(sheet, pxmm, label, color, initMm, onDrop){
  const ln=document.createElement('div');
  ln.style.cssText=`position:absolute;left:0;right:0;top:${initMm*pxmm}px;height:0;border-top:2px dashed ${color};cursor:ns-resize;z-index:4`;
  ln.innerHTML=`<span style="position:absolute;left:4px;top:-15px;font-size:9px;background:${color};color:#fff;padding:1px 6px;border-radius:5px;white-space:nowrap">${label}</span>`;
  sheet.appendChild(ln);
  let sy=0,oy=0,drag=false;
  ln.addEventListener('pointerdown',e=>{ e.preventDefault(); drag=true; oy=parseFloat(ln.style.top)||0; sy=e.clientY; try{ln.setPointerCapture(e.pointerId);}catch(_){}});
  ln.addEventListener('pointermove',e=>{ if(!drag)return; let ny=Math.max(0,Math.min(oy+(e.clientY-sy), sheet.clientHeight-2)); ln.style.top=ny+'px'; });
  const end=e=>{ if(!drag)return; drag=false; try{ln.releasePointerCapture(e.pointerId);}catch(_){} onDrop(Math.round((parseFloat(ln.style.top)/pxmm)*10)/10); };
  ln.addEventListener('pointerup',end); ln.addEventListener('pointercancel',end);
}
function _mbeSnapLogo(where){
  const sheet=document.getElementById('mbe-sheet'), box=sheet&&sheet.querySelector('.mbe-logo'); if(!box) return;
  const mem=STATE.membrete||{}, f=Object.assign({}, DEFAULT_FMT, STATE.redFormat||{}), PW=pageDims(f.pageSize)[0], pxmm=sheet.clientWidth/PW, wmm=box.offsetWidth/pxmm;
  let x = where==='left'? f.mLeft : where==='right'? (PW-f.mRight-wmm) : (PW-wmm)/2;
  x=Math.round(x*10)/10; mem.logoXmm=x; box.style.left=(x*pxmm)+'px'; saveState();
}
function _mbePieAlign(al){
  const mem=STATE.membrete||{}; mem.pieAlign=al;
  const sheet=document.getElementById('mbe-sheet'), box=sheet&&sheet.querySelector('.mbe-pie'); if(!box){ saveState(); return; }
  const f=Object.assign({}, DEFAULT_FMT, STATE.redFormat||{}), PW=pageDims(f.pageSize)[0], pxmm=sheet.clientWidth/PW, wmm=box.offsetWidth/pxmm;
  let x = al==='left'? f.mLeft : al==='right'? (PW-f.mRight-wmm) : (PW-wmm)/2;   // "centro" = bloque centrado en la hoja
  x=Math.round(x*10)/10; mem.pieXmm=x; box.style.left=(x*pxmm)+'px'; box.style.textAlign=al; saveState();
}
function _mbeReset(){ const mem=STATE.membrete||{}; mem.logoXmm=null; mem.logoYmm=null; mem.pieXmm=null; mem.pieYmm=null; saveState(); closeAllModals(); openMembreteEditor(); }
// Normaliza el HTML a BLOQUES (cada línea/párrafo un div) para poder paginar moviendo nodos

// ── Editor del admin: Formas de documento (Lego: tipos + estructura + piezas) ──
// Liberar/reservar un TIPO de redacción a la comunidad (así el admin guarda tipos de prueba solo para sí)
function toggleTipoParaTodos(id){ if(!_needAdminForms()) return; const t=tipoById(id); if(!t) return; t.paraTodos=!t.paraTodos; saveState(); try{ if(STATE.isAdmin){ _writeMaster(); _masterSig=JSON.stringify(_masterData()); } }catch(_){} renderModelos(); toast(t.paraTodos?'Este tipo lo verá toda la comunidad':'Este tipo queda solo para ti (pruebas)','success'); }
// Editor de la ESTRUCTURA por PARTES nombradas (la lógica común)
// Editor del TIPO de documento (crear/editar)
let _TE=null;
function editTipoDoc(id){
  if(!_needAdminForms()) return;
  const t=id?tipoById(id):null;
  _TE = t ? JSON.parse(JSON.stringify(t)) : {id:'tipo'+Date.now(), nombre:'', icono:'📄', motor:'judicial', piezaLabel:'Piezas', estructura:ESTRUCT_JUDICIAL, usaMembrete:false, builtin:false, desc:''};
  _TE._isNew=!t;
  const m=_TE;
  document.getElementById('tipodoc-body').innerHTML=`<div class="modal-title">${m._isNew?'Nuevo tipo de documento':'Editar tipo'}</div>
    <div class="form-grid"><div class="form-row"><label class="form-label">Nombre</label><input class="form-input" id="td-nombre" value="${escapeHtml(m.nombre||'')}" placeholder="Ej: Recursos"></div><div class="form-row"><label class="form-label">Ícono (emoji)</label><input class="form-input" id="td-icono" value="${escapeHtml(m.icono||'')}" placeholder="📄"></div></div>
    <div class="form-grid"><div class="form-row"><label class="form-label">Motor</label><select class="form-select" id="td-motor" ${m.builtin?'disabled':''}><option value="judicial" ${m.motor!=='documental'?'selected':''}>Judicial (con causa: suma/cuerpo/por tanto/otrosíes)</option><option value="documental" ${m.motor==='documental'?'selected':''}>Documental (entre partes: encabezado/cuerpo/pie)</option></select></div><div class="form-row"><label class="form-label">Nombre de sus piezas</label><input class="form-input" id="td-pieza" value="${escapeHtml(m.piezaLabel||'')}" placeholder="Peticiones / Tipos de contrato"></div></div>
    <div class="form-row"><label class="form-label">Descripción (en la tarjeta de redactar)</label><input class="form-input" id="td-desc" value="${escapeHtml(m.desc||'')}" placeholder="Breve descripción"></div>
    <label class="rw-check"><input type="checkbox" id="td-membrete" ${m.usaMembrete?'checked':''}> Por defecto lleva membrete y pie</label>
    <label class="rw-check"><input type="checkbox" id="td-encausa" ${m.enCausa?'checked':''}> Se puede redactar dentro de una causa (si no, solo desde ✍️ Redactar)</label>
    <label class="rw-check"><input type="checkbox" id="td-paratodos" ${m.paraTodos?'checked':''}> 🌐 Visible para la comunidad (todos los usuarios). Se aplica solo al guardar.</label>
    ${m.builtin?'<div style="font-size:11px;color:var(--gray2)">Tipo base del sistema: el motor no se cambia.</div>':''}
    <div class="modal-footer">${m._isNew||!m.builtin?`<button class="btn-ghost" style="color:var(--danger)" onclick="deleteTipoDoc('${m.id}')">Borrar tipo</button>`:''}<button class="btn-ghost" onclick="openModelosPanel()">Cancelar</button><button class="btn-gold" onclick="saveTipoDoc()">Guardar</button></div>`;
  openModal('modal-tipodoc');
}
function saveTipoDoc(){
  if(!_needAdminForms()) return;
  const g=id=>{const el=document.getElementById(id);return el?el.value.trim():'';};
  const nombre=g('td-nombre'); if(!nombre){ toast('Pon un nombre','error'); return; }
  _TE.nombre=nombre; _TE.icono=g('td-icono')||'📄'; _TE.piezaLabel=g('td-pieza')||'Piezas'; _TE.desc=g('td-desc');
  if(!_TE.builtin){ _TE.motor=g('td-motor')||'judicial'; if(!_TE.estructura) _TE.estructura=_TE.motor==='documental'?ESTRUCT_DOCUMENTAL:ESTRUCT_JUDICIAL; }
  _TE.usaMembrete=!!(document.getElementById('td-membrete')||{}).checked;
  _TE.enCausa=!!(document.getElementById('td-encausa')||{}).checked;
  _TE.paraTodos=!!(document.getElementById('td-paratodos')||{}).checked;   // visible para todos al publicar
  const isNew=_TE._isNew; delete _TE._isNew;
  const i=TIPOSDOC.findIndex(t=>t.id===_TE.id);
  if(i>=0) TIPOSDOC[i]=_TE; else TIPOSDOC.push(_TE);
  _mdlCat=_TE.id; saveState(); openModelosPanel(); toast('Tipo guardado','success');
}
function deleteTipoDoc(id){
  if(!_needAdminForms()) return;
  const t=tipoById(id); if(!t) return;
  if(t.builtin){ toast('No se puede borrar un tipo base del sistema','error'); return; }
  const n=piezasDeTipo(id).length;
  if(!confirm(`¿Borrar el tipo "${t.nombre}"${n?` y sus ${n} pieza(s)`:''}?`)) return;
  for(let j=MODELOS.length-1;j>=0;j--){ if((MODELOS[j].tipoId||MODELOS[j].categoria)===id) MODELOS.splice(j,1); }
  const i=TIPOSDOC.findIndex(x=>x.id===id); if(i>=0) TIPOSDOC.splice(i,1);
  _mdlCat=(TIPOSDOC[0]||{}).id; saveState(); openModelosPanel(); toast('Tipo borrado','success');
}
function restaurarModelos(){ if(!_needAdminForms()) return; if(!confirm('¿Restaurar los modelos originales? Se perderán los cambios en los modelos por defecto.')) return; MODELOS.length=0; MODELOS_DEFAULT.forEach(m=>MODELOS.push(JSON.parse(JSON.stringify(m)))); saveState(); renderModelos(); }
function deleteModelo(id){ if(!_needAdminForms()) return; if(!confirm('¿Borrar este modelo?')) return; const i=MODELOS.findIndex(m=>m.id===id); if(i>=0) MODELOS.splice(i,1); saveState(); renderModelos(); }
// Visibilidad de un MODELO (subtipo) para el equipo: sin marca = visible; false = solo admin
function toggleModeloParaTodos(id){ if(!_needAdminForms()) return; const m=MODELOS.find(x=>x.id===id); if(!m) return; m.paraTodos=(m.paraTodos===false); saveState(); renderModelos(); toast(m.paraTodos===false?'Este modelo lo verá solo el admin':'Este modelo lo verá toda la comunidad','success'); }
function editModelo(id){
  if(!_needAdminForms()) return;
  const m = id ? MODELOS.find(x=>x.id===id) : null;
  if(m){ _ME=JSON.parse(JSON.stringify(m)); }
  else { const tp=tipoById(_mdlCat); _ME={ id:'m'+Date.now(), tipoId:_mdlCat, categoria:_mdlCat, nombre:'', suma:'', esOtrosi:false, cuerpo:'', portanto:'', encabezado:'', pie:'', roles:[], otrosiesDefault:[], variables:[], usaMembrete:!!(tp&&tp.usaMembrete) }; }
  if(!_ME.tipoId) _ME.tipoId=_ME.categoria||'escrito';
  if(!_ME.variables) _ME.variables=[];
  _ME._isNew=!m;
  renderModeled(); openModal('modal-modeled');
}
let _meTab='comparecientes';   // pestaña activa del editor de contrato
function meSet(k,v){ _ME[k]=v; meUpdatePreview(); }
function meSetTab(t){ _meTab=t; renderModeled(); }
function meUpdatePreview(){ const el=document.getElementById('me-preview'); if(el){ el.innerHTML=meWrap(meModelPreview()); meFitPaper('me-preview'); } }
// Reemplaza tokens por etiquetas legibles para la vista previa del modelo
function meDemoResolve(text){
  let t=text||'';
  (_ME.roles||[]).forEach(r=>{ if(!r.key)return; const k=escRx(r.key);
    t=t.replace(new RegExp('\\{\\{\\s*'+k+'\\s*:\\s*([^}]+?)\\s*\\}\\}','g'), (m,w)=>w.split('/')[0]);
    t=t.replace(new RegExp('\\{\\{\\s*'+k+'\\.(\\w+)\\s*\\}\\}','g'), '«'+(r.label||r.key)+'»');
  });
  (_ME.variables||[]).forEach(v=>{ if(!v.id)return; const k=escRx(v.id); t=t.replace(new RegExp('\\[\\s*'+k+'\\s*\\]|\\{\\{\\s*'+k+'\\s*\\}\\}','g'), '«'+(v.label||v.id)+'»'); });
  t=t.replace(/\{\{\s*fecha\s*\}\}/g, longDateCL()).replace(/\{\{\s*abogados?(\.\w+)?\s*\}\}/g,'«abogado»').replace(/\{\{\s*(cliente|causa|abogado)\.(\w+)\s*\}\}/g,'«$2»');
  return t;
}
function meModelPreview(){
  const tipo=tipoOfModel(_ME)||{motor:'judicial'};
  const judicial=(tipo.motor||'judicial')==='judicial';
  const partes=(tipo.partes&&tipo.partes.length)?tipo.partes:defaultPartes(tipo);
  const D=meDemoResolve;   // resuelve tokens del modelo a «etiquetas»
  const blocks=[];
  partes.filter(p=>p.on!==false).forEach(pt=>{
    let txt='';
    if(judicial){
      switch(pt.key){
        case 'presuma': txt=(pt.rows||[]).map(r=>`${r.label}: ${r.token||'«____»'}`).join('\n'); if(txt) txt='[[PRESUMA]]\n'+txt+'\n[[/PRESUMA]]'; break;
        case 'titulo': txt='EN LO PRINCIPAL: '+D(_ME.cabecera||'«suma»')+'.-'; break;
        case 'tribunal': txt='S. J. L.'; break;
        case 'comparecencia': txt=fillMarkers(pt.texto||'', {compareciente:'«Compareciente individualizado»', causa:'«causa Rol C-123-2025, caratulada Pérez con Soto»'}); break;
        case 'cuerpo': txt=D(_ME.cuerpo||'«cuerpo de la petición»'); break;
        case 'portanto': txt=fillMarkers(pt.texto||'', {portanto: D(_ME.pie||_ME.portanto||'«lo que se solicita»')}); break;
        case 'otrosies': txt='OTROSÍ: «otrosí de ejemplo».'; break;
      }
    } else {
      if(pt.key==='titulo') txt=D(_ME.cabecera||'«título / encabezado»');
      else if(pt.key==='cuerpo') txt=D(_ME.cuerpo||'«cláusulas»');
      else if(pt.key==='pie') txt=D(_ME.pie||'«firmas»');
    }
    if((txt||'').trim()){ if(pt.align && pt.key!=='presuma') txt=`[[ALIGN:${pt.align}]]\n${txt}\n[[/ALIGN]]`; blocks.push(txt); }
  });
  let out=blocks.join('\n\n').replace(/\{\{\s*([\w.]+)\s*\}\}/g,(m,k)=>'«'+k+'»');
  return docTextToHtml(out)||'<span style="opacity:.5">Escribe el documento para ver cómo queda…</span>';
}
function meSetPatrocinio(v){ _ME.esPatrocinio=v; renderModeled(); }
function meSetVar(i,k,v){ if(_ME.variables[i]) _ME.variables[i][k]=v; }
function meSetVarTipo(i,v){ if(_ME.variables[i]){ _ME.variables[i].tipo=v; renderModeled(); } }
function meAddVar(){ _ME.variables.push({id:'var'+(_ME.variables.length+1), label:'', tipo:'input', placeholder:'', opciones:''}); renderModeled(); }
function meDelVar(i){ _ME.variables.splice(i,1); renderModeled(); }
function meAddRole(){ _ME.roles=_ME.roles||[]; _ME.roles.push({key:'parte'+(_ME.roles.length+1), label:''}); renderModeled(); }
function meSetRole(i,k,v){ if(_ME.roles[i]) _ME.roles[i][k]=v; }
function meDelRole(i){ _ME.roles.splice(i,1); renderModeled(); }
function meToggleOtrosi(id){ _ME.otrosiesDefault=_ME.otrosiesDefault||[]; const k=_ME.otrosiesDefault.indexOf(id); if(k>=0)_ME.otrosiesDefault.splice(k,1); else _ME.otrosiesDefault.push(id); renderModeled(); }
function meSetTipo(id){ _ME.tipoId=id; _ME.categoria=id; renderModeled(); }
let _meField='pe-cuerpo';   // textarea activa para insertar tokens
function meFocus(id){ _meField=id; }
function meInsert(tok){
  const el=document.getElementById(_meField)||document.getElementById('pe-cuerpo'); if(!el) return;
  const s=(el.selectionStart!=null)?el.selectionStart:el.value.length, e=(el.selectionEnd!=null)?el.selectionEnd:el.value.length;
  el.value=el.value.slice(0,s)+tok+el.value.slice(e);
  const key=el.id.replace('pe-',''); _ME[key]=el.value;
  el.focus(); const np=s+tok.length; try{el.setSelectionRange(np,np);}catch(_){}
}
function meInsertTab(){ meInsert('\t'); }
// Envuelve la selección de la caja activa con marcas de formato (negrita/cursiva/centrar…)
function meSurround(pre,post){ const el=document.getElementById(_meField)||document.getElementById('pe-cuerpo'); if(!el) return; const s=el.selectionStart!=null?el.selectionStart:el.value.length, e=el.selectionEnd!=null?el.selectionEnd:el.value.length; const sel=el.value.slice(s,e)||'texto'; el.value=el.value.slice(0,s)+pre+sel+post+el.value.slice(e); const key=el.id.replace('pe-',''); _ME[key]=el.value; el.focus(); const p=s+pre.length; try{el.setSelectionRange(p,p+sel.length);}catch(_){} meUpdatePreview(); }
function meFmt(kind){ if(kind==='b')meSurround('[[B]]','[[/B]]'); else if(kind==='i')meSurround('[[I]]','[[/I]]'); else if(kind==='u')meSurround('[[U]]','[[/U]]'); else meSurround('[[ALIGN:'+kind+']]\n','\n[[/ALIGN]]'); }
const DATOS_INS=[
  ['📁 Causa',[['causa.rol','Rol/RIT'],['causa.tribunal','Tribunal'],['causa.caratula','Carátula'],['causa.materia','Materia']]],
  ['👤 Cliente',[['cliente.individualizacion','🧾 Individualización completa'],['cliente.nombre','Nombre'],['cliente.rut','RUT'],['cliente.estadoCivil','Estado civil'],['cliente.profesion','Profesión u oficio'],['cliente.domicilio','Domicilio'],['cliente.nacionalidad','Nacionalidad'],['cliente.giro','Giro'],['cliente.representante','Representante'],['cliente.don','don/doña'],['cliente.el','él/ella']]],
  ['🧑‍⚖️ Abogado',[['abogado.nombre','Nombre'],['abogado.rut','RUT'],['abogado.domicilio','Domicilio'],['abogado.email','Correo'],['abogados','Equipo (lista)'],['abogados.nombres','Equipo (nombres)']]],
];
// Partes en la barra de inserción: un selector + los datos de la parte elegida (compacto)
let _meParteSel='demandado';
const _MEPARTE_F=[['individualizacion','🧾 Individualización'],['nombre','Nombre'],['rut','RUT'],['estadoCivil','Estado civil'],['profesion','Profesión u oficio'],['domicilio','Domicilio'],['nacionalidad','Nacionalidad'],['don','don/doña'],['hijo','hijo/hija'],['vinculo','🔗 Vínculo (padre/madre)'],['vinculoDe','🔗 …de quién'],['fechaNac','Fecha nacimiento'],['edad','Edad']];
function mePartChips(){ return _MEPARTE_F.map(([f,lb])=>`<button type="button" class="ins-chip" onmousedown="event.preventDefault()" onclick="meInsert('{{${_meParteSel}.${f}}}')">${lb}</button>`).join(''); }
function meSetParteSel(k){ _meParteSel=k; const el=document.getElementById('me-parte-chips'); if(el) el.innerHTML=mePartChips(); }
// Colaboradores: el modelo no sabe a quién elegirás al redactar → los tokens son posicionales (colab1, colab2…)
let _meColabSel='colab1';
const _MECOLAB_F=[['individualizacion','🧾 Individualización'],['nombre','Nombre'],['rut','RUT'],['domicilio','Domicilio'],['don','don/doña'],['el','él/ella']];
function meColabChips(){ return _MECOLAB_F.map(([f,lb])=>`<button type="button" class="ins-chip" onmousedown="event.preventDefault()" onclick="meInsert('{{${_meColabSel}.${f}}}')">${lb}</button>`).join(''); }
function meSetColabSel(k){ _meColabSel=k; const el=document.getElementById('me-colab-chips'); if(el) el.innerHTML=meColabChips(); }
function renderModeled(){
  const host=document.getElementById('modeled-body'); if(!host) return;
  const tp=tipoOfModel(_ME)||{motor:'judicial',nombre:'documento'}; const judicial=(tp.motor||'judicial')==='judicial', doc=!judicial;
  const labCab = judicial?'Cabecera (la suma — texto que individualiza)':'Cabecera / título';
  const labPie = judicial?'Pie (el «por tanto»)':'Pie / firmas';
  // barra de inserción de datos — depende del motor (judicial = causa/cliente; documental = roles)
  const PARTE_FIELDS=[['individualizacion','🧾 Individualización completa'],['nombre','Nombre'],['rut','RUT'],['estadoCivil','Estado civil'],['profesion','Profesión u oficio'],['domicilio','Domicilio'],['nacionalidad','Nacionalidad'],['giro','Giro'],['representante','Representante'],['don','don/doña'],['el','él/ella']];
  let grupos;
  if(doc){
    const roles=(_ME.roles||[]).filter(r=>(r.key||'').trim());
    grupos = roles.length
      ? roles.map(r=>[`👥 ${r.label||r.key}`, PARTE_FIELDS.map(([f,l])=>[`${r.key}.${f}`,l])])
      : [];
    grupos.push(['🧑‍⚖️ Abogado',[['abogado.nombre','Nombre'],['abogado.rut','RUT'],['abogado.domicilio','Domicilio']]]);
  } else {
    grupos = DATOS_INS.slice();
    // En DEMANDAS: botones de las Partes que eliges al redactar (demandado, hijo/a, empresa…)
    const esDem = (tipoOfModel(_ME)||{}).id==='demanda';
    // las Partes van en un grupo compacto con selector (ver partesGrp), para no llenar la barra
  }
  const esDem2 = (!doc && (tipoOfModel(_ME)||{}).id==='demanda');
  const partesGrp = (esDem2 && typeof RW_ROLES!=='undefined')
    ? `<div class="ins-grp"><span class="ins-g-l">👥 Partes</span><select class="form-select" style="width:auto;font-size:11.5px;padding:3px 7px" onchange="meSetParteSel(this.value)">${RW_ROLES.map(([k,l])=>`<option value="${k}" ${_meParteSel===k?'selected':''}>${l}</option>`).join('')}</select><span id="me-parte-chips">${mePartChips()}</span></div>` : '';
  const colabGrp = `<div class="ins-grp"><span class="ins-g-l">🤝 Colaboradores</span><select class="form-select" style="width:auto;font-size:11.5px;padding:3px 7px" onchange="meSetColabSel(this.value)">${[1,2,3,4].map(n=>`<option value="colab${n}" ${_meColabSel==='colab'+n?'selected':''}>Colaborador ${n}</option>`).join('')}</select><span id="me-colab-chips">${meColabChips()}</span><span style="font-size:10.5px;color:var(--gray2);margin-left:6px">se llenan en orden con los que elijas al redactar · todos juntos: <code>{{abogados}}</code></span></div>`;
  const esDemHint = esDem2 ? `<div style="font-size:11px;color:var(--gray2);margin-bottom:6px">👥 Elige la parte y toca el dato. Otros: escríbelo directo, ej. <code>{{demandado.giro}}</code>, <code>{{empresa.representante}}</code>.</div>` : '';
  const sinRoles = ((doc && !(_ME.roles||[]).some(r=>(r.key||'').trim())) ? `<div style="font-size:11px;color:var(--warn);margin-bottom:6px">Define arriba las <b>Partes/roles</b> para poder insertar sus datos (ej. {{arrendador.nombre}}).</div>` : '') + esDemHint;
  const insBar=`<div class="ins-bar"><div class="ins-hint">Toca un dato para insertarlo en el cursor. Para género en cualquier palabra: <code>{{cliente:vendedor/a}}</code> o <code>{{${doc&&(_ME.roles||[])[0]?(_ME.roles[0].key):'arrendador'}:obligado/a}}</code>.</div>${sinRoles}
    <div class="ins-grp"><button type="button" class="ins-chip" onclick="const f=document.getElementById('me-fmtbar');f.style.display=(f.style.display==='none'?'flex':'none')" title="Mostrar/ocultar formato">✎ Formato</button></div>
    <div id="me-fmtbar" class="ins-grp" style="display:none"><span class="ins-g-l">Formato (selecciona texto)</span>
      <button type="button" class="ins-chip" onmousedown="event.preventDefault()" onclick="meFmt('b')" title="Negrita"><b>B</b></button>
      <button type="button" class="ins-chip" onmousedown="event.preventDefault()" onclick="meFmt('i')" title="Cursiva"><i>I</i></button>
      <button type="button" class="ins-chip" onmousedown="event.preventDefault()" onclick="meFmt('u')" title="Subrayado"><u>U</u></button>
      <button type="button" class="ins-chip" onmousedown="event.preventDefault()" onclick="meFmt('left')" title="Izquierda">⬅</button>
      <button type="button" class="ins-chip" onmousedown="event.preventDefault()" onclick="meFmt('center')" title="Centrar">↔</button>
      <button type="button" class="ins-chip" onmousedown="event.preventDefault()" onclick="meFmt('right')" title="Derecha">➡</button></div>
    ${partesGrp}
    ${colabGrp}
    ${grupos.map(([g,arr])=>`<div class="ins-grp"><span class="ins-g-l">${g}</span>${arr.map(([tok,l])=>`<button type="button" class="ins-chip" onmousedown="event.preventDefault()" onclick="meInsert('{{${tok}}}')">${l}</button>`).join('')}</div>`).join('')}
    <div class="ins-grp"><button type="button" class="ins-chip" onmousedown="event.preventDefault()" onclick="meInsert('{{fecha}}')">📅 Fecha</button><button type="button" class="ins-chip" onmousedown="event.preventDefault()" onclick="meInsertTab()" title="Sangría (tab)">⇥ Sangría</button></div>
    <div class="ins-grp"><span class="ins-g-l">Tus variables [ ]</span>${(_ME.variables||[]).filter(v=>v.id).map(v=>`<button type="button" class="ins-chip ins-var" onmousedown="event.preventDefault()" onclick="meInsert('[${escapeHtml(v.id)}]')">${escapeHtml(v.id)}</button>`).join('')||'<span style="font-size:11px;color:var(--gray2)">defínelas abajo</span>'}</div></div>`;
  const ta=(id,lab,val,ph,h)=>`<div class="form-row"><label class="form-label">${lab}</label><textarea class="form-textarea" id="pe-${id}" style="min-height:${h}px" onfocus="meFocus('pe-${id}')" oninput="meSet('${id}',this.value)" placeholder="${ph}">${escapeHtml(val||'')}</textarea></div>`;
  const vrows=_ME.variables.map((v,i)=>`<div class="mdl-var-row">
    <input class="form-input" placeholder="nombre (ej. petitor)" value="${escapeHtml(v.id||'')}" oninput="meSetVar(${i},'id',this.value)">
    <input class="form-input" placeholder="¿Qué pedir? (etiqueta)" value="${escapeHtml(v.label||'')}" oninput="meSetVar(${i},'label',this.value)">
    <select class="form-select" onchange="meSetVarTipo(${i},this.value)">${[['input','texto'],['textarea','párrafo'],['fecha','fecha'],['lista','lista']].map(([val,l])=>`<option value="${val}" ${(v.tipo||'input')===val?'selected':''}>${l}</option>`).join('')}</select>
    <button class="rw-mini" onclick="meDelVar(${i})">✕</button>
  </div>${v.tipo==='lista'?`<input class="form-input" style="margin:-2px 0 8px" placeholder="Opciones separadas por coma" value="${escapeHtml(v.opciones||'')}" oninput="meSetVar(${i},'opciones',this.value)">`:''}`).join('');
  const tipoSel=`<div class="form-grid"><div class="form-row"><label class="form-label">Tipo de modelo</label><select class="form-select" onchange="meSetTipo(this.value)">${TIPOSDOC.map(t=>`<option value="${t.id}" ${(_ME.tipoId||_ME.categoria)===t.id?'selected':''}>${t.icono||''} ${escapeHtml(t.nombre)}</option>`).join('')}</select></div>
    <div class="form-row"><label class="form-label">Nombre del modelo</label><input class="form-input" value="${escapeHtml(_ME.nombre||'')}" oninput="meSet('nombre',this.value)" placeholder="${doc?'Contrato de arrendamiento':'Téngase presente'}"></div></div>`;
  // extras según tipo
  let extras='';
  if(judicial && _ME.tipoId==='escrito') extras=`<label class="rw-check"><input type="checkbox" ${_ME.esOtrosi?'checked':''} onchange="meSet('esOtrosi',this.checked)"> Es un otrosí (accesorio)</label>
    <label class="rw-check"><input type="checkbox" ${_ME.esPersoneria?'checked':''} onchange="meSet('esPersoneria',this.checked)"> Acredita personería / mandato (se agrega solo al marcar “Tengo mandato” en la demanda)</label>
    <label class="rw-check"><input type="checkbox" ${_ME.esPatrocinio?'checked':''} onchange="meSetPatrocinio(this.checked)"> Lleva colaboradores (PYP/mandato con 1 o varios abogados — usa el token <code>{{abogados}}</code>)</label>
    ${_ME.esPatrocinio?`<div class="form-row"><label class="form-label">Cuerpo PLURAL (cuando van 2+ abogados)</label><textarea class="form-textarea" id="pe-cuerpoPlural" style="min-height:70px" onfocus="meFocus('pe-cuerpoPlural')" oninput="meSet('cuerpoPlural',this.value)" placeholder="Que, por este acto, confiero patrocinio y poder a los abogados {{abogados}}.">${escapeHtml(_ME.cuerpoPlural||'')}</textarea></div>`:''}`;
  if(judicial && _ME.tipoId!=='escrito'){ const ot=piezasDeTipo('escrito'); extras=`<div class="form-row"><label class="form-label">Otrosíes por defecto (se agregan solos al elegir esta pieza)</label><div class="mdl-otrosis">${ot.map(m=>`<label class="rw-check" style="margin:0"><input type="checkbox" ${(_ME.otrosiesDefault||[]).includes(m.id)?'checked':''} onchange="meToggleOtrosi('${m.id}')"> ${escapeHtml(m.nombre)}</label>`).join('')||'<span style="font-size:12px;color:var(--gray2)">Crea Peticiones (Escritos) primero.</span>'}</div></div>`; }
  // Partes / comparecientes: para CUALQUIER tipo. Cada parte puede ser una o "varias" (se combinan con don/doña).
  const rrows=(_ME.roles||[]).map((r,i)=>`<div class="mdl-var-row" style="grid-template-columns:1fr 1fr auto auto"><input class="form-input" placeholder="Parte (ej. Arrendatario / Demandado)" value="${escapeHtml(r.label||'')}" oninput="meSetRole(${i},'label',this.value)"><input class="form-input" placeholder="clave (ej. arrendatario)" value="${escapeHtml(r.key||'')}" oninput="meSetRole(${i},'key',this.value)"><label class="rw-check" style="margin:0;white-space:nowrap;font-size:11px" title="Puede ser más de una persona"><input type="checkbox" ${r.multi?'checked':''} onchange="meSetRole(${i},'multi',this.checked)"> varias</label><button class="rw-mini" onclick="meDelRole(${i})">✕</button></div>`).join('');
  extras+=`<div class="form-row"><label class="form-label" style="display:flex;justify-content:space-between;align-items:center">Partes / comparecientes <button class="btn-ghost" onclick="meAddRole()">＋ Parte</button></label><div style="font-size:11px;color:var(--gray2);margin-bottom:6px">Define quién comparece. Marca <b>varias</b> si esa parte puede ser más de una persona. Inserta sus datos con <code>{{clave.individualizacion}}</code>, <code>{{clave.nombre}}</code>, etc.</div>${rrows||'<div style="font-size:12px;color:var(--gray2)">Ej.: Arrendador · Arrendatario (varias) → {{arrendatario.individualizacion}}</div>'}</div>`;
  const varsBlock=`<div class="form-row"><label class="form-label" style="display:flex;justify-content:space-between;align-items:center">Variables que pide al redactar <button class="btn-ghost" onclick="meAddVar()">＋ Variable</button></label><div style="font-size:11px;color:var(--gray2);margin-bottom:6px">Variables manuales = <b>[corchetes]</b> (las rellenas al redactar). Los datos automáticos del sistema van en <b>{{llaves}}</b>.</div>${vrows||'<div style="font-size:12px;color:var(--gray2)">Sin variables manuales.</div>'}</div>`;
  const membreteChk=`<label class="rw-check" style="margin-top:6px"><input type="checkbox" ${_ME.usaMembrete?'checked':''} onchange="meSet('usaMembrete',this.checked)"> Lleva membrete y pie de página del usuario</label>`;
  let left;
  if(doc){
    // 2 pestañas: Comparecientes (roles + encabezado) · Contenido (cláusulas + firmas)
    const tabBar=`<div class="redactar-tabs"><button class="rw-pill ${_meTab==='comparecientes'?'on':''}" onclick="meSetTab('comparecientes')">👥 Comparecientes</button><button class="rw-pill ${_meTab==='contenido'?'on':''}" onclick="meSetTab('contenido')">📄 Contenido</button></div>`;
    const tabBody = _meTab==='comparecientes'
      ? `${extras}${ta('cabecera','Encabezado / título — aquí se presentan las partes',_ME.cabecera,'CONTRATO DE ARRENDAMIENTO. En [ciudad], a {{fecha}}, entre {{arrendador.nombre}}…',120)}`
      : `${ta('cuerpo','Cuerpo / cláusulas',_ME.cuerpo,'PRIMERO: … SEGUNDO: …',180)}${ta('pie','Pie / firmas',_ME.pie,'{{arrendador.nombre}}   {{arrendatario.nombre}}',70)}${varsBlock}${membreteChk}`;
    left=`${tabBar}${insBar}${tabBody}`;
  } else {
    left=`${insBar}${ta('cabecera',labCab,_ME.cabecera,'Téngase Presente',58)}${ta('cuerpo','Cuerpo (contenido)',_ME.cuerpo,'Que, por este acto, vengo en…',140)}${ta('pie',labPie,_ME.pie,'tener presente lo expuesto…',58)}${extras}${varsBlock}${membreteChk}`;
  }
  const materiaSel = judicial ? `<div class="form-row"><label class="form-label">Materia (en qué causas aparece)</label><select class="form-select" onchange="meSet('materia',this.value)">${materiaOptions(_ME.materia||'general', true)}</select></div>` : '';
  const fmtBtn = `<div class="form-row"><label class="form-label">Formato del documento</label><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn-ghost" onclick="openModeloFormato()">${_ME.fmt?'⚙️ Formato propio ✓ (editar)':'⚙️ Usar formato propio'}</button>${_ME.fmt?`<button class="btn-ghost" style="color:var(--danger)" onclick="_ME.fmt=undefined;renderModeled()">Quitar (usar el general)</button>`:'<span style="font-size:11px;color:var(--gray2)">Usa el formato general</span>'}</div></div>`;
  host.innerHTML=`<div class="modal-title">${_ME._isNew?'Nuevo':'Editar'} · ${escapeHtml(tp.nombre||'documento')}</div>
    ${tipoSel}
    ${materiaSel}
    ${fmtBtn}
    <div class="me-doc-wrap">
      <div class="me-doc-left">${left}</div>
      <div class="me-doc-right"><div class="rw-preview-lbl">Vista previa</div><div class="me-preview" id="me-preview">${meWrap(meModelPreview())}</div></div>
    </div>
    <div class="modal-footer"><button class="btn-ghost" onclick="openModelosPanel()">Cancelar</button><button class="btn-gold" onclick="saveModeloEdit()">Guardar</button></div>`;
  meFitPaper('me-preview');
}
function openModeloFormato(){
  const f=Object.assign({}, resolveFmt(null), _ME.fmt||{});
  const fonts=['Times New Roman','Georgia','Arial','Calibri','Verdana','Courier New'];
  const aligns=[['justify','Justificado'],['left','Izquierda'],['center','Centrado']];
  const sizes=[['oficio','Oficio (21,6 × 33)'],['legal','Legal · Oficio largo (21,6 × 35,6)'],['carta','Carta (21,6 × 27,9)'],['a4','A4 (21 × 29,7)'],['a3','A3 (29,7 × 42)']];
  document.getElementById('mdlfmt-body').innerHTML=`<div class="modal-title">⚙️ Formato propio del modelo</div>
    <div style="font-size:12px;color:var(--gray2);margin-bottom:10px">Solo este modelo usará este formato (sobrescribe al general).</div>
    <div class="form-grid">
      <div class="form-row"><label class="form-label">Tipografía</label><select class="form-select" id="mf-font">${fonts.map(x=>`<option ${f.font===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div class="form-row"><label class="form-label">Tamaño (pt)</label><input class="form-input" id="mf-size" type="number" min="8" max="18" value="${f.size||12}"></div>
    </div>
    <div class="form-grid">
      <div class="form-row"><label class="form-label">Interlineado</label><select class="form-select" id="mf-lh">${[['1','1'],['1.5','1,5'],['2','2']].map(([v,l])=>`<option value="${v}" ${String(f.lineHeight)===v?'selected':''}>${l}</option>`).join('')}</select></div>
      <div class="form-row"><label class="form-label">Alineación</label><select class="form-select" id="mf-align">${aligns.map(([v,l])=>`<option value="${v}" ${f.align===v?'selected':''}>${l}</option>`).join('')}</select></div>
    </div>
    <div class="form-row"><label class="form-label">Tamaño de hoja</label><select class="form-select" id="mf-page">${sizes.map(([v,l])=>`<option value="${v}" ${f.pageSize===v?'selected':''}>${l}</option>`).join('')}</select></div>
    <div style="font-size:11px;color:var(--gray2);margin:6px 0 3px">Márgenes (cm)</div>
    <div class="form-grid">
      <div class="form-row"><label class="form-label">Superior</label><input class="form-input" id="mf-mt" type="number" step="0.1" value="${(f.mTop/10).toFixed(1)}"></div>
      <div class="form-row"><label class="form-label">Inferior</label><input class="form-input" id="mf-mb" type="number" step="0.1" value="${(f.mBottom/10).toFixed(1)}"></div>
    </div>
    <div class="form-grid">
      <div class="form-row"><label class="form-label">Izquierdo</label><input class="form-input" id="mf-ml" type="number" step="0.1" value="${(f.mLeft/10).toFixed(1)}"></div>
      <div class="form-row"><label class="form-label">Derecho</label><input class="form-input" id="mf-mr" type="number" step="0.1" value="${(f.mRight/10).toFixed(1)}"></div>
    </div>
    <div class="form-grid">
      <div class="form-row"><label class="form-label">Sangría del tab (cm)</label><input class="form-input" id="mf-ind" type="number" step="0.05" value="${(f.indent/10).toFixed(2)}"></div>
      <div class="form-row"><label class="form-label">Sangría 1ª línea (cm)</label><input class="form-input" id="mf-fi" type="number" step="0.05" value="${((f.firstIndent||0)/10).toFixed(2)}"></div>
    </div>
    <div class="form-row"><label class="form-label">Espacio entre párrafos (cm)</label><input class="form-input" id="mf-pg" type="number" step="0.05" value="${((f.paraGap||0)/10).toFixed(2)}"></div>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals();renderModeled();openModal('modal-modeled')">Cancelar</button><button class="btn-gold" onclick="saveModeloFormato()">Guardar formato</button></div>`;
  openModal('modal-mdlfmt');
}
function saveModeloFormato(){
  if(!_needAdminForms()) return;
  const numCm=(id,def)=>{ const v=parseFloat(val(id)); return isNaN(v)?def:Math.round(v*100)/10; };
  _ME.fmt={ font:val('mf-font')||'Times New Roman', size:parseInt(val('mf-size'))||12, lineHeight:parseFloat(val('mf-lh'))||1.5, align:val('mf-align')||'justify',
    pageSize:val('mf-page')||'oficio', mTop:numCm('mf-mt',25), mBottom:numCm('mf-mb',25), mLeft:numCm('mf-ml',30), mRight:numCm('mf-mr',25), indent:numCm('mf-ind',12.5),
    firstIndent:numCm('mf-fi',0), paraGap:numCm('mf-pg',0) };
  closeAllModals(); renderModeled(); openModal('modal-modeled'); toast('Formato del modelo guardado','success');
}
function saveModeloEdit(){
  if(!_needAdminForms()) return;
  if(!(_ME.nombre||'').trim()){ toast('Pon un nombre','error'); return; }
  const tp2=tipoOfModel(_ME)||{motor:'judicial'}; const judicial=(tp2.motor||'judicial')==='judicial';
  if(judicial && !(_ME.cabecera||'').trim()){ toast('Pon la cabecera (la suma)','error'); return; }
  _ME.suma=_ME.cabecera;   // compatibilidad con el motor
  _ME.variables=(_ME.variables||[]).filter(v=>(v.id||'').trim());
  if(_ME.roles) _ME.roles=_ME.roles.filter(r=>(r.label||'').trim()||(r.key||'').trim());
  const isNew=_ME._isNew; delete _ME._isNew;
  const i=MODELOS.findIndex(m=>m.id===_ME.id);
  if(i>=0) MODELOS[i]=_ME; else MODELOS.push(_ME);
  _mdlCat=_ME.tipoId||_ME.categoria||'escrito';
  saveState(); openModelosPanel();
  toast('Guardado','success');
}

// ── Perfil del abogado ──
function openPartesPanel(){ renderPartes(); openModal('modal-partes'); }
function renderPartes(){
  const host=document.getElementById('partes-body'); if(!host) return;
  const p=STATE.perfilAbogado||{};
  if(accessLevel()==='study'){   // solo-estudio: no redacta → pide solo el nombre
    host.innerHTML=`<div class="modal-title">🧑‍⚖️ Mi perfil</div>
      <div style="font-size:12px;color:var(--gray2);margin-bottom:14px">Tu nombre, para saludarte y personalizar tu espacio.</div>
      <div class="form-row"><label class="form-label">Nombre</label><input class="form-input" id="pa-nombre" value="${escapeHtml(p.nombre||'')}" placeholder="Tu nombre"></div>
      <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cerrar</button><button class="btn-gold" onclick="savePerfil()">Guardar</button></div>`;
    return;
  }
  host.innerHTML=`<div class="modal-title">🧑‍⚖️ Mi perfil de abogado</div>
    <div style="font-size:12px;color:var(--gray2);margin-bottom:14px">Se usa en el patrocinio y poder, las notificaciones y la firma de los escritos.</div>
    <div class="form-grid">
      <div class="form-row"><label class="form-label">Nombre</label><input class="form-input" id="pa-nombre" value="${escapeHtml(p.nombre||'')}"></div>
      <div class="form-row"><label class="form-label">RUT</label><input class="form-input" id="pa-rut" value="${escapeHtml(p.rut||'')}"></div>
    </div>
    <div class="form-row"><label class="form-label">Domicilio profesional</label><input class="form-input" id="pa-domicilio" value="${escapeHtml(p.domicilio||'')}"></div>
    <div class="form-grid">
      <div class="form-row"><label class="form-label">Correo</label><input class="form-input" id="pa-email" value="${escapeHtml(p.email||'')}"></div>
      <div class="form-row"><label class="form-label">Calidad / cargo (cómo compareces)</label><input class="form-input" id="pa-cargo" list="pa-cargo-dl" value="${escapeHtml(p.cargo||'Abogado')}" placeholder="Abogado / Apoderado / Habilitado en Derecho"><datalist id="pa-cargo-dl"><option value="Abogado"><option value="Apoderado"><option value="Habilitado en Derecho"></datalist></div>
    </div>
    <div class="partes-sec"><div class="partes-h">🖋️ Membrete y pie (para los escritos que lo lleven)</div>
      <div style="font-size:12px;color:var(--gray2);margin-bottom:10px">El admin decide qué tipos de documento lo usan. El logo va arriba y el pie abajo.</div>
      <div class="form-row"><label class="form-label">Logo (imagen)</label>
        <div style="display:flex;gap:10px;align-items:center">
          <div id="mb-logo-prev">${(STATE.membrete&&STATE.membrete.logo)?`<img src="${STATE.membrete.logo}" style="max-height:60px;max-width:160px;border-radius:6px">`:'<span style="font-size:12px;color:var(--gray2)">Sin logo</span>'}</div>
          <button class="btn-ghost" onclick="document.getElementById('mb-logo-input').click()">Subir logo</button>
          ${(STATE.membrete&&STATE.membrete.logo)?`<button class="btn-ghost" style="color:var(--danger)" onclick="quitarLogo()">Quitar</button>`:''}
          <input type="file" id="mb-logo-input" accept="image/*" style="display:none" onchange="subirLogo(this.files[0])">
        </div>
      </div>
      <button type="button" class="btn-gold" style="width:100%;margin:6px 0" onclick="openMembreteEditor()">🎨 Acomodar en la hoja (arrastrar logo y pie)</button>
      <div style="font-size:11px;color:var(--gray2);margin-bottom:8px">Con el editor visual lo mueves libre (hasta el borde), como en Word. La alineación y el "subir/bajar" de abajo son un ajuste alternativo si NO usas el editor visual.</div>
      <div class="form-row"><label class="form-label">Posición del membrete</label><select class="form-select" id="pa-logoalign">${[['left','⬅ Izquierda'],['center','↔ Centro'],['right','➡ Derecha']].map(([v,l])=>`<option value="${v}" ${((STATE.membrete&&STATE.membrete.logoAlign)||'center')===v?'selected':''}>${l}</option>`).join('')}</select></div>
      <div class="form-row"><label class="form-label">Pie de página (texto)</label><textarea class="form-textarea" id="pa-pie" style="min-height:60px" placeholder="Estudio Jurídico · Av. Siempre Viva 123, Santiago · +56 9 … · www.tuweb.cl">${escapeHtml((STATE.membrete&&STATE.membrete.pie)||'')}</textarea></div>
      <div class="form-row"><label class="form-label">Posición del pie</label><select class="form-select" id="pa-piealign">${[['left','⬅ Izquierda'],['center','↔ Centro'],['right','➡ Derecha']].map(([v,l])=>`<option value="${v}" ${((STATE.membrete&&STATE.membrete.pieAlign)||'center')===v?'selected':''}>${l}</option>`).join('')}</select></div>
      <div style="font-size:11px;color:var(--gray2);margin:2px 0 6px">Ajuste fino global (se aplica a TODOS los documentos con membrete):</div>
      <div class="form-grid">
        <div class="form-row"><label class="form-label">Membrete subir/bajar (mm)</label><input class="form-input" type="number" id="pa-logoy" step="1" value="${(STATE.membrete&&STATE.membrete.logoY)||0}"></div>
        <div class="form-row"><label class="form-label">Tamaño del logo (%)</label><input class="form-input" type="number" id="pa-logoscale" step="5" min="20" max="300" value="${(STATE.membrete&&STATE.membrete.logoScale)||100}"></div>
      </div>
      <div class="form-row"><label class="form-label">Pie subir/bajar (mm)</label><input class="form-input" type="number" id="pa-piey" step="1" value="${(STATE.membrete&&STATE.membrete.pieY)||0}"></div>
      ${STATE.isAdmin?`<div class="form-row" style="background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);border-radius:9px;padding:10px;margin-top:8px">
        <label class="rw-check"><input type="checkbox" id="pa-wm-on" ${((STATE.membrete&&STATE.membrete.wm&&STATE.membrete.wm.on))?'checked':''}> 💧 Marca de agua en la hoja</label>
        <div class="form-grid" style="margin-top:8px">
          <div class="form-row"><label class="form-label">Qué poner</label><select class="form-select" id="pa-wm-type">${[['texto','Texto (ej. BORRADOR)'],['imagen','Imagen (logo)']].map(([v,l])=>`<option value="${v}" ${(((STATE.membrete&&STATE.membrete.wm&&STATE.membrete.wm.type)||'texto')===v)?'selected':''}>${l}</option>`).join('')}</select></div>
          <div class="form-row"><label class="form-label">Opacidad (%)</label><input class="form-input" type="number" id="pa-wm-opacity" min="3" max="60" value="${Math.round((((STATE.membrete&&STATE.membrete.wm&&STATE.membrete.wm.opacity)||0.12))*100)}"></div>
        </div>
        <div class="form-row"><label class="form-label">Texto</label><input class="form-input" id="pa-wm-text" placeholder="BORRADOR / COPIA / RESERVADO" value="${escapeHtml((STATE.membrete&&STATE.membrete.wm&&STATE.membrete.wm.text)||'BORRADOR')}"></div>
        <div class="form-grid">
          <div class="form-row"><label class="form-label">Tamaño</label><input class="form-input" type="number" id="pa-wm-size" value="${(STATE.membrete&&STATE.membrete.wm&&STATE.membrete.wm.size)||60}"></div>
          <div class="form-row"><label class="form-label">Ángulo (texto)</label><input class="form-input" type="number" id="pa-wm-angle" value="${(STATE.membrete&&STATE.membrete.wm&&STATE.membrete.wm.angle)!==undefined?STATE.membrete.wm.angle:45}"></div>
        </div>
        <div class="form-row"><label class="form-label">Imagen de marca de agua</label><input type="file" class="form-input" id="pa-wm-img" accept="image/*" onchange="onMembreteWmImg(this)"> ${(STATE.membrete&&STATE.membrete.wm&&STATE.membrete.wm.img)?'<span style="font-size:11px;color:var(--gold)">✓ imagen cargada</span>':''}</div>
      </div>`:''}
    </div>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals();gotoClientes()">👥 Ver clientes</button><button class="btn-gold" onclick="savePerfil()">Guardar perfil</button></div>`;
}
function subirLogo(file){
  if(!file) return;
  if(file.size>600000){ toast('El logo es muy pesado; usa una imagen más liviana (< 600 KB).','error'); return; }
  const r=new FileReader();
  r.onload=ev=>{ STATE.membrete=STATE.membrete||{}; STATE.membrete.logo=ev.target.result; const prev=document.getElementById('mb-logo-prev'); if(prev) prev.innerHTML=`<img src="${ev.target.result}" style="max-height:60px;max-width:160px;border-radius:6px">`; saveState(); toast('Logo cargado (recuerda Guardar perfil)','success'); };
  r.readAsDataURL(file);
}
function quitarLogo(){ STATE.membrete=STATE.membrete||{}; STATE.membrete.logo=''; saveState(); renderPartes(); }
function onMembreteWmImg(input){ const f=input.files&&input.files[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ STATE.membrete=STATE.membrete||{}; STATE.membrete.wm=STATE.membrete.wm||{}; STATE.membrete.wm.img=r.result; toast('Imagen de marca de agua cargada','success'); }; r.readAsDataURL(f); }
function gotoClientes(){ const b=document.querySelector('.view-btn[title="Personas"]')||document.querySelector('.view-btn[title="Clientes"]'); switchView('clientes', b); }
function savePerfil(){
  const p0=STATE.perfilAbogado||{}; const gv=id=>{const e=document.getElementById(id); return e?e.value.trim():undefined;};
  const keep=(id,prev)=>{ const v=gv(id); return v!==undefined?v:(prev||''); };   // no pisar lo que no está en pantalla (modo estudio)
  STATE.perfilAbogado={ nombre:keep('pa-nombre',p0.nombre), rut:keep('pa-rut',p0.rut), domicilio:keep('pa-domicilio',p0.domicilio), email:keep('pa-email',p0.email), cargo:(gv('pa-cargo')||p0.cargo)||'Abogado' };
  if(document.getElementById('pa-pie')){   // sección membrete: solo en modo completo
    STATE.membrete=STATE.membrete||{}; const pieEl=document.getElementById('pa-pie'); if(pieEl) STATE.membrete.pie=pieEl.value;
    STATE.membrete.logoAlign=val('pa-logoalign')||'center'; STATE.membrete.pieAlign=val('pa-piealign')||'center';
    STATE.membrete.logoY=Number(val('pa-logoy'))||0; STATE.membrete.logoScale=Number(val('pa-logoscale'))||100; STATE.membrete.pieY=Number(val('pa-piey'))||0;
    const wm=STATE.membrete.wm=STATE.membrete.wm||{};
    wm.on=!!(document.getElementById('pa-wm-on')||{}).checked; wm.type=val('pa-wm-type')||'texto'; wm.text=val('pa-wm-text')||'';
    wm.opacity=(Number(val('pa-wm-opacity'))||12)/100; wm.size=Number(val('pa-wm-size'))||60; wm.angle=Number(val('pa-wm-angle'));
    if(wm.angle===undefined||isNaN(wm.angle)) wm.angle=45;
  }
  saveState(); pushMiFirma(); toast('Perfil guardado','success'); renderPartes();
}
// Comparte mis datos (nombre, RUT, domicilio, correo) a la ficha: para que el admin los vea y para que el EQUIPO me agregue como colaborador sin re-escribirlos
async function pushMiFirma(){
  if(typeof sb==='undefined'||!sb||!STATE.uid) return;
  const p=STATE.perfilAbogado||{};
  const firma={ nombre:p.nombre||'', rut:p.rut||'', domicilio:p.domicilio||'', correo:p.email||'' };
  const upd={firma};
  if((p.nombre||'').trim()) upd.display_name=p.nombre.trim();   // así el admin ve tu nombre, no el correo
  if((p.rut||'').trim())    upd.rut=p.rut.trim();
  try{ await sb.from('profiles').update(upd).eq('id',STATE.uid); }
  catch(_){ // por si la columna 'firma' aún no existe: al menos guarda nombre y RUT
    const u2={}; if(upd.display_name) u2.display_name=upd.display_name; if(upd.rut) u2.rut=upd.rut;
    if(Object.keys(u2).length){ try{ await sb.from('profiles').update(u2).eq('id',STATE.uid); }catch(__){} }
  }
}

// ── Editor unificado de cliente (natural / jurídica) ──
function val(id){ const el=document.getElementById(id); return el?el.value.trim():''; }
function editCliente(id, ret){
  _clienteReturn = ret===true?'rw':(ret||null);
  const c = id ? findCliente(id) : {id:'cl'+Date.now()+Math.floor(Math.random()*999), tipo:'natural', nombre:'',rut:'',domicilio:'',correo:'',apodo:'',nacionalidad:'Chileno/a',estadoCivil:'',profesion:'',giro:'',representante:'',rutRepresentante:'',cargoRepresentante:'Representante Legal'};
  _ME=JSON.parse(JSON.stringify(c)); _ME._isNew=!id; if(!_ME.tipo) _ME.tipo='natural';
  renderClienteEditor(); openModal('modal-parte-edit');
}
function readClienteForm(){
  const g=id=>{const el=document.getElementById(id);return el?el.value:undefined;};
  ['nombre','rut','domicilio','correo','telefono','nacionalidad','estadoCivil','profesion','giro','representante','rutRepresentante','cargoRepresentante','genero','fechaNac','claveUnica'].forEach(k=>{ const v=g('pe-'+k); if(v!==undefined) _ME[k]=v.trim(); });
}
function clienteSetTipo(t){ readClienteForm(); _ME.tipo=t; renderClienteEditor(); }
// Pegar la individualización completa y separarla en los campos (reglas, formato chileno)
function _cap(s){ s=(s||'').trim(); return s?s[0].toUpperCase()+s.slice(1):s; }
function parseIndividualizacion(txt){
  const orig=(txt||''); let t=orig.replace(/\s+/g,' ').trim(); const out={};
  // Correo electrónico
  const em=t.match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i);
  if(em){ out.correo=em[0].toLowerCase(); t=t.replace(new RegExp('(?:,?\\s*(?:correo|e[\\-\\s]?mail|mail)\\s*(?:electr[oó]nico)?\\s*[:=]?\\s*)?'+em[0].replace(/[.+\-]/g,'\\$&'),'i'),' '); }
  // Clave Única (etiquetada) — credencial del Estado; solo si viene rotulada explícitamente
  const cu=t.match(/clave\s*[uú]nica\s*[:=]?\s*([^\s,;]{3,40})/i);
  if(cu && !/^n[°ºo.:]/i.test(cu[1])){ out.claveUnica=cu[1].replace(/[.,;]+$/,''); t=t.replace(cu[0],' '); }
  // Teléfono chileno (+56 9 XXXX XXXX / 9XXXXXXXX)
  const ph=t.match(/(?:,?\s*(?:tel[eé]fono|fono|cel(?:ular)?|contacto)\s*[:=]?\s*)?(\+?56\s?)?(?:\(?0?9\)?[\s.\-]?)(\d[\d\s.\-]{7,10}\d)/i);
  if(ph){ const digits=(ph[0].match(/\d/g)||[]).join(''); if(digits.length>=8 && digits.length<=11){ out.telefono='+56 9 '+digits.slice(-8,-4)+' '+digits.slice(-4); t=t.replace(ph[0],' '); } }
  // RUT (tolera espacios). Quitamos SOLO el número; la frase "cédula…" se limpia aparte.
  const rm=t.match(/(\d{1,2}[.\s]*\d{3}[.\s]*\d{3}\s*-\s*[\dkK])/);
  if(rm){ out.rut=fmtRut(rm[1].replace(/\s+/g,'')); t=t.replace(rm[1],''); }
  // Limpia la frase de la cédula/RUT/RUN completa (aunque el número ya no esté y venga pegado "No10…")
  t=t.replace(/,?\s*(?:c[eé]dula(?:\s+de\s+identidad)?(?:\s+nacional)?|r\.?u\.?[tn]\.?|rol\s+[úu]nico\s+(?:nacional|tributario))\s*(?:n[°ºo.:]*)?\s*/gi, ', ');
  // Domicilio: "con domicilio en X", "domicilio en X", "domiciliado/a en X" (incluye el resto de la línea con comas)
  const dm=t.match(/,?\s*(?:con\s+)?domicili[oa][a-z]*\s+en\s+(.+)$/i);
  if(dm){ out.domicilio=dm[1].replace(/[.,;\s]+$/,'').trim(); t=t.slice(0,dm.index).trim(); }
  if(/\bdomiciliada\b|\bchilena\b|\bcasada\b|\bsoltera\b|\bviuda\b|\bdivorciada\b|\bnacida\b/i.test(orig)) out.genero='Femenino';
  t=t.replace(/\s*,\s*,\s*/g,', ').replace(/^[,;\s]+|[,;\s]+$/g,'').trim();
  const segs=t.split(',').map(s=>s.trim()).filter(Boolean);
  if(segs.length) out.nombre=segs.shift();
  const NAC=/(chilen|argentin|peruan|bolivian|colombian|venezolan|ecuatorian|brasile|espa|mexican|estadounidense|hait|extranjer)/i;
  const EC=/(solter|casad|viud|divorciad|separad|conviviente)/i;
  const CEDJUNK=/(c[eé]dula|identidad|^nacional$|^n[°ºo.:]+$|^r\.?u\.?[tn]\.?$|rol\s+[úu]nico|tributario)/i;
  segs.forEach(s=>{
    if(CEDJUNK.test(s) && !/\d/.test(s)) return;   // restos de "cédula de identidad nacional No"
    if(!out.nacionalidad && NAC.test(s)){ out.nacionalidad=s.toLowerCase(); if(!out.genero) out.genero=/a\b/i.test(s.trim())?'Femenino':'Masculino'; return; }
    if(!out.estadoCivil && EC.test(s)){ out.estadoCivil=s.toLowerCase(); return; }
    if(!out.profesion){ out.profesion=s.toLowerCase(); return; }
    if(out.profesion.length<60) out.profesion+=', '+s.toLowerCase();   // no acumular un párrafo entero
  });
  if(!out.genero) out.genero='Masculino';
  // Tope de largo por campo: NUNCA pegar un párrafo entero en un dato (corta en palabra)
  const _cap=(s,n)=>{ s=(s||'').trim(); if(s.length<=n) return s; const c=s.slice(0,n); const sp=c.lastIndexOf(' '); return (sp>n*0.6?c.slice(0,sp):c).trim(); };
  if(out.nombre)      out.nombre     =_cap(out.nombre,80);
  if(out.domicilio)   out.domicilio  =_cap(out.domicilio,160);
  if(out.profesion)   out.profesion  =_cap(out.profesion,80);
  if(out.nacionalidad)out.nacionalidad=_cap(out.nacionalidad,40);
  if(out.estadoCivil) out.estadoCivil =_cap(out.estadoCivil,40);
  return out;
}
// Separa un texto con VARIAS individualizaciones corridas → un chunk por persona (inicio = nombre en MAYÚSCULAS)
function splitIndividualizaciones(text){
  const t=(text||'').replace(/\s+/g,' ').trim(); if(!t) return [];
  const rx=/(?:\bdo[nñ]a?\b\s+)?[A-ZÑÁÉÍÓÚ][A-ZÑÁÉÍÓÚ'.]+(?:\s+[A-ZÑÁÉÍÓÚ][A-ZÑÁÉÍÓÚ'.]+)+/g;
  const starts=[]; let m; while((m=rx.exec(t))) starts.push(m.index);
  if(starts.length<=1) return [t];
  const out=[]; for(let i=0;i<starts.length;i++){ out.push(t.slice(starts[i], i+1<starts.length?starts[i+1]:undefined).replace(/^[\s,;]+|[\s,;]+$/g,'')); }
  return out.filter(Boolean);
}
// Convierte una individualización parseada en un ítem de la pantalla de detectados
function _indivAItem(p){
  return { rut:p.rut||'', ok:p.rut?rutValido(p.rut):false, nombre:p.nombre||'', tipo:p.tipo||'natural', add:true, docs:['Pegado'],
    extra:{ nacionalidad:p.nacionalidad||'', profesion:p.profesion||'', domicilio:p.domicilio||'', estadoCivil:p.estadoCivil||'', genero:p.genero||'Masculino', correo:p.correo||'', telefono:p.telefono||'', claveUnica:p.claveUnica||'' } };
}
function parseIndivInto(){
  const el=document.getElementById('pe-pegar'); const txt=el?el.value:'';
  if(!(txt||'').trim()){ toast('Pega el texto primero','error'); return; }
  const chunks=splitIndividualizaciones(txt);
  if(chunks.length>1){   // VARIAS personas → pantalla de revisión
    const list=chunks.map(ch=>_indivAItem(parseIndividualizacion(ch)));
    closeAllModals();
    openDetectados(_pegarExpId||null, list, false, {clientes:!!_pegarExpId});   // en causa permite marcar clientes; sin causa → solo crea personas
    return;
  }
  readClienteForm();   // una sola → rellena el editor
  const p=parseIndividualizacion(txt);
  Object.keys(p).forEach(k=>{ if(p[k]) _ME[k]=p[k]; });
  renderClienteEditor();
  toast('Datos separados · revísalos antes de guardar','success');
}
let _pegarExpId=null;
// Pegar varias personas (en Personas o dentro de una causa) → separa y abre la revisión
function openPegarPersonas(exId){
  _pegarExpId=exId||null;
  document.getElementById('pegar-body').innerHTML=`<div class="modal-title">📋 Pegar personas</div>
    <div style="font-size:12.5px;color:var(--gray2);margin-bottom:10px">Pega la individualización de una o varias personas (aunque vengan corridas). Las separo por sus nombres y las revisas antes de guardar.${exId?' Podrás marcar cuáles son cliente y su calidad.':''}</div>
    <textarea class="form-textarea" id="pegar-txt" style="min-height:130px;font-size:12.5px" placeholder="Ej: JUAN PÉREZ SOTO, chileno, abogado, cédula 12.345.678-9, domiciliado en calle X 123, Santiago  MARÍA SOTO ROJAS, chilena, cédula 13.456.789-0, domiciliada en pasaje Y 45, Maipú"></textarea>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" onclick="pegarPersonasGo()">✂️ Separar y revisar</button></div>`;
  openModal('modal-pegar');
}
function pegarPersonasGo(){
  const txt=(document.getElementById('pegar-txt')||{}).value||'';
  const chunks=splitIndividualizaciones(txt);
  if(!chunks.length){ toast('Pega el texto primero','error'); return; }
  const list=chunks.map(ch=>_indivAItem(parseIndividualizacion(ch)));
  closeAllModals();
  openDetectados(_pegarExpId||null, list, false, {clientes:!!_pegarExpId});
}
function renderClienteEditor(){
  const host=document.getElementById('parte-edit-body'); if(!host) return;
  const c=_ME, jur=c.tipo==='juridica', nino=c.tipo==='nino';
  const ec=['Soltero/a','Casado/a','Divorciado/a','Viudo/a','Conviviente civil'];
  const cargos=['Gerente General','Director','Representante Legal','Apoderado','Presidente','Socio Administrador'];
  const especificos = jur
    ? `<div class="form-grid"><div class="form-row"><label class="form-label">Giro</label><input class="form-input" id="pe-giro" value="${escapeHtml(c.giro||'')}"></div><div class="form-row"><label class="form-label">Representante legal</label><input class="form-input" id="pe-representante" value="${escapeHtml(c.representante||'')}" placeholder="Nombre del representante"></div></div>
       <div class="form-grid"><div class="form-row"><label class="form-label">RUT representante</label><input class="form-input" id="pe-rutRepresentante" value="${escapeHtml(c.rutRepresentante||'')}"></div><div class="form-row"><label class="form-label">Cargo</label><select class="form-select" id="pe-cargoRepresentante">${cargos.map(x=>`<option ${c.cargoRepresentante===x?'selected':''}>${x}</option>`).join('')}</select></div></div>`
    : nino
    ? `<div class="form-grid"><div class="form-row"><label class="form-label">Fecha de nacimiento</label><input class="form-input" id="pe-fechaNac" value="${escapeHtml(c.fechaNac||'')}" placeholder="dd/mm/aaaa"></div><div class="form-row"><label class="form-label">Representado/a por</label><input class="form-input" id="pe-representante" value="${escapeHtml(c.representante||'')}" placeholder="Padre / madre / tutor"></div></div>`
    : `<div class="form-grid"><div class="form-row"><label class="form-label">Nacionalidad</label><input class="form-input" id="pe-nacionalidad" value="${escapeHtml(c.nacionalidad||'')}"></div><div class="form-row"><label class="form-label">Estado civil</label><select class="form-select" id="pe-estadoCivil"><option value="">—</option>${ec.map(x=>`<option ${c.estadoCivil===x?'selected':''}>${x}</option>`).join('')}</select></div></div>
       <div class="form-row"><label class="form-label">Profesión / oficio</label><input class="form-input" id="pe-profesion" value="${escapeHtml(c.profesion||'')}"></div>`;
  host.innerHTML=`<div class="modal-title">${c._isNew?'Nueva persona':'Editar persona'}</div>
    <div class="rw-toggle"><button class="rw-pill ${(!jur&&!nino)?'on':''}" onclick="clienteSetTipo('natural')">👤 Natural</button><button class="rw-pill ${jur?'on':''}" onclick="clienteSetTipo('juridica')">🏢 Jurídica</button><button class="rw-pill ${nino?'on':''}" onclick="clienteSetTipo('nino')">🧒 Niño/a</button></div>
    ${(!jur&&!nino)?`<div class="form-row" style="background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);border-radius:9px;padding:9px 10px"><label class="form-label">📋 Pegar individualización <span style="color:var(--gray2);font-weight:400">— pega el texto completo y lo separo en los campos</span></label>
      <textarea class="form-textarea" id="pe-pegar" style="min-height:44px;font-size:12.5px" placeholder="Ej: Juan Pérez Soto, chileno, casado, abogado, cédula de identidad 12.345.678-9, domiciliado en calle X 123, comuna de Y"></textarea>
      <button type="button" class="btn-gold" style="margin-top:6px;padding:5px 12px;font-size:12.5px" onclick="parseIndivInto()">✂️ Separar</button></div>`:''}
    <div class="form-grid"><div class="form-row"><label class="form-label">${jur?'Razón social *':(nino?'Nombre del niño/a *':'Nombre *')}</label><input class="form-input" id="pe-nombre" value="${escapeHtml(c.nombre||'')}"></div><div class="form-row"><label class="form-label">${nino?'RUN (si tiene)':'RUT *'}</label><input class="form-input" id="pe-rut" value="${escapeHtml(c.rut||'')}"></div></div>
    ${especificos}
    <div class="form-grid"><div class="form-row"><label class="form-label">${jur?'Género del representante':'Género'}</label><select class="form-select" id="pe-genero" title="Para escribir en masculino/femenino (chileno/a, don/doña…)">${['Masculino','Femenino'].map(x=>`<option ${ (c.genero||'Masculino')===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="form-row"><label class="form-label">Domicilio</label><input class="form-input" id="pe-domicilio" value="${escapeHtml(c.domicilio||'')}"></div></div>
    <div class="form-grid"><div class="form-row"><label class="form-label">Correo</label><input class="form-input" id="pe-correo" value="${escapeHtml(c.correo||'')}"></div><div class="form-row"><label class="form-label">Teléfono</label><input class="form-input" id="pe-telefono" value="${escapeHtml(c.telefono||'')}"></div></div>
    <div class="form-row"><label class="form-label">🔐 Clave Única <span style="color:var(--gray2);font-weight:400">(para ingresar en su nombre · no se comparte con colegas)</span></label>
      <div style="display:flex;gap:8px"><input class="form-input" id="pe-claveUnica" type="password" autocomplete="new-password" value="${escapeHtml(c.claveUnica||'')}" placeholder="Clave Única del cliente"><button type="button" class="btn-ghost" onmousedown="const i=document.getElementById('pe-claveUnica');i.type='text'" onmouseup="document.getElementById('pe-claveUnica').type='password'" onmouseleave="document.getElementById('pe-claveUnica').type='password'" title="Ver mientras presionas">👁</button></div></div>
    <div class="modal-footer"><button class="btn-ghost" onclick="backFromCliente()">Cancelar</button><button class="btn-gold" onclick="saveCliente()">Guardar</button></div>`;
}
function saveCliente(){
  readClienteForm();
  const needRut=_ME.tipo!=='nino';   // los niños pueden no tener RUN a mano
  if(!(_ME.nombre||'').trim()||(needRut&&!(_ME.rut||'').trim())){ toast(_ME.tipo==='juridica'?'Razón social y RUT son obligatorios':(_ME.tipo==='nino'?'El nombre es obligatorio':'Nombre y RUT son obligatorios'),'error'); return; }
  const isNew=_ME._isNew; const o=JSON.parse(JSON.stringify(_ME)); delete o._isNew;
  o.updated=Date.now(); if(isNew) o.created=Date.now();
  const i=CLIENTES.findIndex(x=>String(x.id)===String(o.id)); if(i>=0) CLIENTES[i]=o; else CLIENTES.push(o);
  toast('Persona guardada','success'); finishCliente(o.id);
}
function finishCliente(id){
  saveState();
  const ret=_clienteReturn; _clienteReturn=null;
  if(ret==='rw' && _RW){ _RW.cx.clienteId=id; openModal('modal-redactar'); renderRW(); return; }
  if(ret==='exp'){ openModal('modal-exp'); refreshExpClienteSelect(id); return; }
  if(ret==='parte'){ _expPartes.push({personaId:id, rol:'demandado'}); openModal('modal-exp'); renderExpPartes(); return; }
  closeAllModals(); renderClientesTab();
}
function backFromCliente(){
  const ret=_clienteReturn; _clienteReturn=null;
  if(ret==='rw' && _RW){ openModal('modal-redactar'); renderRW(); return; }
  if(ret==='exp'||ret==='parte'){ openModal('modal-exp'); renderExpPartes(); return; }
  closeAllModals();
}
function deleteCliente(id){
  const n=causasDeCliente(id).length;
  if(n){ if(!confirm(`Este cliente tiene ${n} causa(s) asociada(s). Si lo borras, esas causas quedarán sin cliente. ¿Continuar?`)) return; }
  else if(!confirm('¿Borrar este cliente?')) return;
  const c=CLIENTES.find(x=>String(x.id)===String(id));
  if(c) trashAdd('cliente', c.nombre||c.name||'Persona', {cliente:c});   // a la papelera
  const i=CLIENTES.findIndex(x=>String(x.id)===String(id)); if(i>=0) CLIENTES.splice(i,1);
  saveState(); renderClientesTab(); toast('Persona movida a la papelera 🗑');
}

// ── Pestaña 👥 Clientes ──
let _cliQuery='';
function renderClientesTab(){
  ensureModelos(); migrateClientes();
  const host=document.getElementById('clientes-list'); if(!host) return;
  // El buscador se dibuja UNA vez (no se reconstruye al teclear → no pierde el foco); solo se re-renderizan las filas.
  host.innerHTML=`<div class="cli-toolbar"><input class="form-input" id="cli-search" style="max-width:320px" placeholder="🔎 Buscar por nombre, RUT, profesión…" value="${escapeHtml(_cliQuery)}" oninput="_cliQuery=this.value;renderClientesRows()"><span id="cli-count" style="font-size:12px;color:var(--gray2)"></span></div><div id="clientes-rows"></div>`;
  renderClientesRows();
}
function renderClientesRows(){
  const box=document.getElementById('clientes-rows'); if(!box) return;
  const q=_cliQuery.trim().toLowerCase();
  let list=CLIENTES.slice();
  if(q) list=list.filter(c=>[c.nombre,c.rut,c.profesion,c.giro,c.correo].some(v=>(v||'').toLowerCase().includes(q)));
  list.sort((a,b)=>(a.nombre||'').localeCompare(b.nombre||''));
  const cnt=document.getElementById('cli-count'); if(cnt) cnt.textContent=`${list.length} de ${CLIENTES.length}`;
  if(!CLIENTES.length){ box.innerHTML=`<div class="favs-empty" style="width:100%"><div>👥</div><p>Aún no tienes personas.<br>Crea una con <b>＋ Nueva persona</b> o usa <b>⬆ Importar</b> para pegar desde Excel.</p></div>`; return; }
  if(isMobile()){
    box.innerHTML=list.map(c=>{ const nc=causasDeCliente(c.id).length; const ico=c.tipo==='juridica'?'🏢':(c.tipo==='nino'?'🧒':'👤');
      const meta=[c.rut, c.tipo==='juridica'?(c.giro||'persona jurídica'):(c.tipo==='nino'?'niño/a':(c.profesion||'persona natural'))].filter(Boolean).map(escapeHtml).join(' · ');
      return `<div class="mcard" onclick="verCliente('${c.id}')">
        <div class="mcard-title">${ico} ${escapeHtml(c.nombre||'(sin nombre)')}</div>
        <div class="mcard-row">${meta}${c.correo?' · '+escapeHtml(c.correo):''}${c.domicilio?' · '+escapeHtml(c.domicilio):''} · ${nc} causa${nc===1?'':'s'}</div>
        <div class="mcard-acts"><button class="btn-ghost" onclick="event.stopPropagation();openRedactarCliente('${c.id}')">✍️</button><button class="btn-ghost" onclick="event.stopPropagation();editCliente('${c.id}',null)">Editar</button><button class="btn-ghost" style="color:var(--danger)" onclick="event.stopPropagation();deleteCliente('${c.id}')">🗑</button></div>
      </div>`; }).join('');
    return;
  }
  const rows=list.map(c=>{
    const nc=causasDeCliente(c.id).length;
    const ico=c.tipo==='juridica'?'🏢':(c.tipo==='nino'?'🧒':'👤');
    const meta=[c.rut, c.tipo==='juridica'?(c.giro||'persona jurídica'):(c.tipo==='nino'?'niño/a':(c.profesion||'persona natural'))].filter(Boolean).map(escapeHtml).join(' · ');
    return `<tr>
      <td style="cursor:pointer" onclick="verCliente('${c.id}')" title="Ver ficha de la persona">${ico} <b>${escapeHtml(c.nombre||'(sin nombre)')}</b><div class="cli-meta">${meta}</div></td>
      <td>${escapeHtml(c.correo||'')}<div class="cli-meta">${escapeHtml(c.domicilio||'')}</div></td>
      <td style="text-align:center">${nc?`<button class="redactar-esc" onclick="verCliente('${c.id}')">${nc} causa${nc>1?'s':''}</button>`:`<button class="redactar-esc" style="opacity:.6" onclick="verCliente('${c.id}')">0</button>`}</td>
      <td style="text-align:right;white-space:nowrap"><button class="btn-ghost" onclick="openRedactarCliente('${c.id}')">✍️</button> <button class="btn-ghost" onclick="editCliente('${c.id}',null)">Editar</button> <button class="btn-ghost" style="color:var(--danger)" onclick="deleteCliente('${c.id}')">🗑</button></td>
    </tr>`;
  }).join('');
  box.innerHTML=`<table class="cli-table"><thead><tr><th>Cliente</th><th>Contacto</th><th style="text-align:center">Causas</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
}
// Crea una causa nueva ya asociada a un cliente, o redacta si ya tiene causas
function openRedactarCliente(id){
  const causas=causasDeCliente(id);
  if(causas.length===1){ openRedactar(causas[0].id); return; }
  // si tiene varias o ninguna, abre el asistente con el cliente preseleccionado
  ensureModelos();
  _RW={ tipoDoc:null, cx:{expId:null, rol:'',caratula:'',tribunal:'',tipo:'',submateria:'', tienePoder:false, rolProcesal:'demandante', clienteId:id, esCAJ:false}, fixedCausa:false, mode:(causas.length?'exist':'nueva'), escs:[], step:'tipo' };
  openModal('modal-redactar'); renderRW();
}
function verCausasCliente(id){ verCliente(id); }
function verCliente(id){
  const c=findCliente(id); if(!c) return;
  const causas=causasDeCliente(id);
  const causaIds=causas.map(e=>e.id);
  const docs=EXDOCS.filter(x=>x.kind==='exescrito' && x.redactado && ((x.clientes&&x.clientes.map(String).includes(String(id))) || causaIds.includes(x.expediente)))
    .sort((a,b)=>(b.created||0)-(a.created||0));
  const body=document.getElementById('partes-body'); if(!body) return;
  const meta=[c.rut, c.tipo==='juridica'?(c.giro||'persona jurídica'):(c.profesion||'persona natural'), c.domicilio, c.correo].filter(Boolean).map(escapeHtml).join(' · ');
  const causasH=causas.length?causas.map(e=>`<div class="mdl-card"><div style="flex:1"><div class="mdl-name">📁 ${escapeHtml(causaLabel(e))}</div><div class="mdl-suma">${[e.rol||e.rit,e.tribunal].filter(Boolean).map(escapeHtml).join(' · ')||'—'}</div></div><div style="display:flex;gap:6px"><button class="btn-ghost" onclick="closeAllModals();openExpediente('${e.id}')">Abrir</button><button class="btn-gold" onclick="closeAllModals();openRedactar('${e.id}')">✍️</button></div></div>`).join(''):'<div style="font-size:12px;color:var(--gray2)">Sin causas.</div>';
  const docsH=docs.length?docs.map(x=>{const e=EXPEDIENTES.find(p=>p.id===x.expediente); const snip=(stripHtml(x.content||'').slice(0,90)); return `<div class="mdl-card"><div style="flex:1"><div class="mdl-name">📄 ${escapeHtml(x.title||'Documento')} <span style="font-size:10px;color:var(--gray2)">${escapeHtml(tipoNombre(x.tipoDoc)||'')}${e?' · '+escapeHtml(e.name||''):''}</span></div><div class="mdl-suma">${escapeHtml(snip)}</div></div><div style="display:flex;gap:6px"><button class="btn-ghost" onclick="closeAllModals();openExdoc('${x.id}')">Abrir</button><button class="btn-ghost" onclick="printRedaccion('${x.id}')">🖨️</button></div></div>`;}).join(''):'<div style="font-size:12px;color:var(--gray2)">Sin documentos redactados.</div>';
  body.innerHTML=`<div class="modal-title">${c.tipo==='juridica'?'🏢':'👤'} ${escapeHtml(c.nombre||'Cliente')}</div>
    <div style="font-size:12.5px;color:var(--gray);margin-bottom:8px">${meta||'—'}</div>
    <button class="btn-ghost" onclick="editCliente('${id}',null)">✏️ Editar datos</button>
    <div class="partes-sec"><div class="partes-h">📁 Causas (${causas.length})</div>${causasH}</div>
    <div class="partes-sec"><div class="partes-h">📄 Documentos (${docs.length})</div>${docsH}</div>
    <div class="modal-footer"><button class="btn-gold" onclick="openRedactarCliente('${id}')">✍️ Redactar</button><button class="btn-ghost" onclick="closeAllModals()">Cerrar</button></div>`;
  openModal('modal-partes');
}

// ── Importar clientes (pegar desde Excel / TSV-CSV) ──
const CLI_IMPORT_COLS=['tipo','nombre','rut','genero','domicilio','correo','telefono','nacionalidad','estado_civil','profesion','giro','representante','rut_representante','cargo','clave_unica'];
let _cliImport=[];
// Campos de persona en Acervo + sinónimos para auto-detectar la columna
const CLI_IMPORT_FIELDS=[
  {key:'tipo',        label:'Tipo (natural / jurídica)', syn:['tipo','tipo persona','tipo cliente','natural juridica']},
  {key:'nombre',      label:'Nombre / Razón social *', syn:['nombre','razon social','cliente','nombre cliente','nombre completo','razon','nombres']},
  {key:'rut',         label:'RUT / RUN', syn:['rut','run','cedula','ci','rut cliente','cedula identidad']},
  {key:'correo',      label:'Correo', syn:['correo','email','mail','correo electronico','e mail']},
  {key:'telefono',    label:'Teléfono', syn:['telefono','fono','celular','cel','movil','contacto','numero','whatsapp']},
  {key:'domicilio',   label:'Domicilio', syn:['domicilio','direccion','domicilio cliente','direccion cliente']},
  {key:'nacionalidad',label:'Nacionalidad', syn:['nacionalidad']},
  {key:'estado_civil',label:'Estado civil', syn:['estado civil','estado_civil']},
  {key:'profesion',   label:'Profesión / oficio', syn:['profesion','oficio','ocupacion','profesion u oficio']},
  {key:'genero',      label:'Género', syn:['genero','sexo']},
  {key:'giro',        label:'Giro (jurídica)', syn:['giro','rubro','actividad','actividad economica']},
  {key:'representante',label:'Representante legal', syn:['representante','representante legal','rep legal']},
  {key:'rut_representante',label:'RUT del representante', syn:['rut representante','rut rep','run representante']},
  {key:'cargo',       label:'Cargo del representante', syn:['cargo','cargo representante']},
  {key:'clave_unica', label:'🔐 Clave Única', syn:['clave unica','clave','claveunica','clave u']},
];
function openImportClientes(){
  const prev=document.getElementById('import-ta'); const keep=prev?prev.value:'';
  document.getElementById('import-body').innerHTML=`<div class="modal-title">⬆ Importar / pegar personas</div>
    <div style="font-size:13px;color:var(--gray2);line-height:1.6;margin-bottom:10px">Pega lo que tengas y <b>detecto solo</b> qué es:<br>· una <b>tabla</b> de Excel/Sheets (cada fila una persona) → te dejo asignar columnas;<br>· o la <b>individualización</b> escrita de una o varias personas (aunque vengan corridas) → las separo y revisas.</div>
    <textarea class="form-textarea" id="import-ta" style="min-height:150px;font-size:12.5px" placeholder="Pega aquí (Ctrl/Cmd+V) una tabla…  o  «JUAN PÉREZ SOTO, chileno, abogado, cédula 12.345.678-9, domiciliado en calle X 123, Santiago»">${escapeHtml(keep)}</textarea>
    <div style="font-size:11px;color:var(--gray2);margin-top:6px">¿Prefieres una base de tabla? <a href="#" onclick="descargarPlantillaClientes();return false" style="color:var(--gold)">⬇ Descargar plantilla CSV</a></div>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" onclick="importClientesGo()">Detectar →</button></div>`;
  openModal('modal-import');
}
// Detecta solo si el pegado es TABLA (→ asignar columnas) o INDIVIDUALIZACIÓN en prosa (→ separar y revisar)
function importClientesGo(){
  const text=(document.getElementById('import-ta')||{}).value||'';
  if(!text.trim()){ toast('Pega primero los datos','error'); return; }
  const rows=splitRows(text);
  const indivWords=/c[eé]dula|domicili|nacionalidad|estado\s+civil|profesi[oó]n|chilen[oa]|argentin|casad[oa]|solter[oa]|viud[oa]|divorciad[oa]|r\.?u\.?[tn]\.?\s*n[°ºo]/i;
  const hasTab=text.includes('\t');
  const looksIndiv = !hasTab && (rows.length<2 || rows.some(r=>indivWords.test(r)));
  if(looksIndiv){
    const chunks=splitIndividualizaciones(text);
    const list=chunks.map(ch=>_indivAItem(parseIndividualizacion(ch)));
    if(!list.length){ toast('No pude separar personas del texto','error'); return; }
    closeAllModals();
    openDetectados(null, list, false, {clientes:false});
    return;
  }
  mapImportClientes();
}
let _cliRows=[], _cliHasHeader=false, _cliCols=[];
function mapImportClientes(){
  const text=(document.getElementById('import-ta')||{}).value||'';
  const rows=splitRows(text);
  if(!rows.length){ toast('Pega primero las filas de tu tabla','error'); return; }
  const grid=rows.map(splitCells);
  const ncols=Math.max(...grid.map(r=>r.length));
  const firstNorm=(grid[0]||[]).map(_normMatch);
  _cliHasHeader = firstNorm.filter(h=>_guessField(h,CLI_IMPORT_FIELDS)).length>=2;
  _cliRows=grid;
  const used=new Set(); _cliCols=[];
  for(let c=0;c<ncols;c++){
    const header=_cliHasHeader ? (grid[0][c]||('Columna '+(c+1))) : ('Columna '+(c+1));
    const sample=(grid[_cliHasHeader?1:0]||[])[c]||'';
    let guess=_cliHasHeader ? _guessField(_normMatch(grid[0][c]||''),CLI_IMPORT_FIELDS) : '';
    if(!guess){ const vals=grid.slice(_cliHasHeader?1:0).map(r=>r[c]); guess=_guessCliByContent(vals); }   // sin encabezado (o no reconocido) → adivina por el contenido
    if(guess && used.has(guess)) guess='';
    if(guess) used.add(guess);
    _cliCols.push({idx:c, header, sample, guess});
  }
  const opts=sel=>`<option value="">— ignorar —</option>`+CLI_IMPORT_FIELDS.map(f=>`<option value="${f.key}" ${sel===f.key?'selected':''}>${f.label}</option>`).join('');
  const rowsHtml=_cliCols.map(col=>`<tr>
      <td style="max-width:160px"><b>${escapeHtml(col.header)}</b><div style="font-size:11px;color:var(--gray2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(col.sample||'')||'—'}</div></td>
      <td><select class="form-select cli-map" data-idx="${col.idx}" style="font-size:12px">${opts(col.guess)}</select></td>
    </tr>`).join('');
  document.getElementById('import-body').innerHTML=`<div class="modal-title">Asignar columnas — personas</div>
    <div style="font-size:12px;color:var(--gray2);margin-bottom:8px">Acervo detectó tus columnas y adivinó a qué campo va cada una. Corrige lo que falte; lo que no uses, déjalo en <b>— ignorar —</b>. Obligatorio asignar <b>Nombre</b>. ${_cliHasHeader?'<span style="color:var(--gold)">(1ª fila = encabezados)</span>':'<span style="color:var(--warn)">(sin encabezados: se mapea por posición)</span>'}</div>
    <div style="max-height:44vh;overflow:auto"><table class="cli-table imp-table"><thead><tr><th>Tu columna (ejemplo)</th><th>Campo en Acervo</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
    <div class="modal-footer"><button class="btn-ghost" onclick="openImportClientes()">← Atrás</button><button class="btn-gold" onclick="previewImportClientesMapped()">Previsualizar →</button></div>`;
}
function previewImportClientesMapped(){
  const map={}; document.querySelectorAll('.cli-map').forEach(s=>{ if(s.value) map[s.value]=parseInt(s.dataset.idx); });
  if(map.nombre==null){ toast('Asigna una columna a "Nombre"','error'); return; }
  const start=_cliHasHeader?1:0;
  const get=(cells,key)=> map[key]!=null ? (cells[map[key]]||'').trim() : '';
  _cliImport=[];
  for(let i=start;i<_cliRows.length;i++){
    const cells=_cliRows[i]; const nombre=get(cells,'nombre'); if(!nombre) continue;
    const tipo=get(cells,'tipo').toLowerCase().startsWith('j')?'juridica':'natural';
    _cliImport.push({ tipo, nombre, rut:get(cells,'rut'), correo:get(cells,'correo'), telefono:get(cells,'telefono'),
      domicilio:get(cells,'domicilio'), nacionalidad:get(cells,'nacionalidad'), estadoCivil:get(cells,'estado_civil'),
      profesion:get(cells,'profesion'), genero:get(cells,'genero'), giro:get(cells,'giro'),
      representante:get(cells,'representante'), rutRepresentante:get(cells,'rut_representante'),
      cargoRepresentante:get(cells,'cargo')||(get(cells,'representante')?'Representante Legal':''), claveUnica:get(cells,'clave_unica') });
  }
  if(!_cliImport.length){ toast('No se armaron personas. Revisa la columna Nombre.','error'); return; }
  renderClientesPreview(true);
}
function renderClientesPreview(fromMap){
  const norm=s=>(s||'').replace(/[.\-\s]/g,'').toLowerCase();
  const rows=_cliImport.map((c,i)=>{
    const dup = c.rut && CLIENTES.some(x=>norm(x.rut)===norm(c.rut));
    const extra=[c.correo,c.telefono].filter(Boolean).map(escapeHtml).join(' · ');
    return `<tr class="${dup?'imp-dup':''}"><td>${i+1}</td><td>${c.tipo==='juridica'?'🏢':'👤'}</td><td>${escapeHtml(c.nombre)}${extra?`<div style="font-size:10.5px;color:var(--gray2)">${extra}</div>`:''}</td><td>${escapeHtml(c.rut)}</td><td>${dup?'<span style="color:var(--warn)">ya existe (se omite)</span>':'nuevo'}</td></tr>`;
  }).join('');
  const nuevos=_cliImport.filter(c=>!(c.rut && CLIENTES.some(x=>norm(x.rut)===norm(c.rut)))).length;
  document.getElementById('import-body').innerHTML=`<div class="modal-title">Vista previa — ${_cliImport.length} fila(s), ${nuevos} nueva(s)</div>
    <div style="max-height:46vh;overflow:auto"><table class="cli-table imp-table"><thead><tr><th>#</th><th></th><th>Nombre</th><th>RUT</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div style="font-size:12px;color:var(--gray2);margin-top:8px">Se omiten los RUT que ya existen. ¿Confirmas importar ${nuevos} cliente(s)?</div>
    <div class="modal-footer"><button class="btn-ghost" onclick="${fromMap?'mapImportClientes()':'openImportClientes()'}">← Atrás</button><button class="btn-gold" onclick="confirmImportClientes()">Importar ${nuevos}</button></div>`;
}
function splitRows(text){ return text.replace(/\r/g,'').split('\n').filter(r=>r.trim()!==''); }
function splitCells(row){ return row.includes('\t') ? row.split('\t') : row.split(','); }
function normHeader(h){ let n=(h||'').trim().toLowerCase().replace(/\s+/g,'_').replace(/[áéíóú]/g,m=>({'á':'a','é':'e','í':'i','ó':'o','ú':'u'}[m]));
  const syn={fono:'telefono',celular:'telefono',cel:'telefono',movil:'telefono',contacto:'telefono',mail:'correo',email:'correo',correo_electronico:'correo',e_mail:'correo',clave:'clave_unica',claveunica:'clave_unica',clave_u:'clave_unica'};
  return syn[n]||n; }
function confirmImportClientes(){
  const norm=s=>(s||'').replace(/[.\-\s]/g,'').toLowerCase();
  let n=0;
  _cliImport.forEach(c=>{
    if(c.rut && CLIENTES.some(x=>norm(x.rut)===norm(c.rut))) return;
    CLIENTES.push(Object.assign({id:'cl'+Date.now()+Math.floor(Math.random()*99999), apodo:'', created:Date.now(), updated:Date.now()}, c));
    n++;
  });
  _cliImport=[]; saveState(); closeAllModals(); renderClientesTab();
  toast(n+' cliente(s) importado(s)','success');
}
function descargarPlantillaClientes(){
  const ej='natural,Juan Pérez,12.345.678-9,Masculino,Av. Siempre Viva 1,juan@correo.cl,+56 9 1234 5678,Chileno/a,Soltero/a,Comerciante,,,,,\njuridica,Comercial Soto SpA,76.111.222-3,Femenino,Calle Falsa 2,contacto@soto.cl,,,,,Venta al por menor,Pedro Soto,9.876.543-2,Gerente General,';
  const csv=CLI_IMPORT_COLS.join(',')+'\n'+ej;
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='plantilla_clientes.csv'; a.click(); URL.revokeObjectURL(url);
}

// ── Importar CAUSAS (pegar desde Excel / TSV-CSV) — cada fila = una carpeta ──
const CAU_IMPORT_COLS=['caratulado','rit','ruc','rol','tribunal','materia','estado','cliente_rut','cliente_nombre','contraparte','con_poder','rol_procesal','plazo','obs'];
let _cauImport=[];
function openImportCausas(){
  const prev=document.getElementById('import-ta');
  const keep = prev ? prev.value : '';
  document.getElementById('import-body').innerHTML=`<div class="modal-title">⬆ Importar causas desde tu plantilla</div>
    <div style="font-size:13px;color:var(--gray2);line-height:1.6;margin-bottom:10px">Pega las filas copiadas de tu Excel/Sheets (con o sin encabezados). <b>Cada fila = una causa</b>. No importa el orden ni que tenga columnas de más: en el siguiente paso <b>asignas qué columna es cada dato</b> y Acervo se queda solo con lo que usa.</div>
    <textarea class="form-textarea" id="import-ta" style="min-height:150px;font-family:monospace;font-size:12px" placeholder="Pega aquí tu tabla (Ctrl/Cmd+V)…">${escapeHtml(keep)}</textarea>
    <div style="font-size:11px;color:var(--gray2);margin-top:6px">¿Prefieres una base? <a href="#" onclick="descargarPlantillaCausas();return false" style="color:var(--gold)">⬇ Descargar plantilla CSV</a></div>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" onclick="mapImportCausas()">Asignar columnas →</button></div>`;
  openModal('modal-import');
}
// Campos de causa en Acervo + sinónimos de encabezado para auto-detectar
const CAU_FIELDS=[
  {key:'caratulado',     label:'Caratulado / Carátula *', syn:['caratulado','caratula','causa','juicio','autos','caratula de la causa','nombre causa']},
  {key:'rit',            label:'RIT',            syn:['rit']},
  {key:'ruc',            label:'RUC',            syn:['ruc','rol unico','rol unico nacional']},
  {key:'rol',            label:'Rol / N° causa', syn:['rol','rol interno','rol causa','n causa','numero causa','numero de causa','ingreso','n ingreso']},
  {key:'tribunal',       label:'Tribunal',       syn:['tribunal','juzgado','corte','tribunal competente']},
  {key:'tipo',           label:'Tipo (área del derecho)', syn:['tipo','area','competencia','tipo causa','tipo de causa','materia legal']},
  {key:'materia',        label:'Materia / acción', syn:['materia','accion','accion deducida','objeto','pretension']},
  {key:'estado',         label:'Estado',         syn:['estado','etapa','estado causa','estado de la causa','situacion']},
  {key:'cliente_rut',    label:'RUT del cliente',syn:['cliente rut','rut cliente','rut del cliente','rut mandante','rut','run']},
  {key:'cliente_nombre', label:'Nombre del cliente', syn:['cliente nombre','cliente','nombre cliente','mandante','representado','nombre del cliente','parte']},
  {key:'cliente_correo', label:'Correo del cliente', syn:['correo','email','mail','correo electronico','e mail','correo cliente']},
  {key:'cliente_telefono', label:'Teléfono del cliente', syn:['telefono','fono','celular','cel','movil','contacto','telefono cliente','numero']},
  {key:'cliente_domicilio', label:'Domicilio del cliente', syn:['domicilio','direccion','domicilio cliente','direccion cliente']},
  {key:'cliente_nacionalidad', label:'Nacionalidad del cliente', syn:['nacionalidad']},
  {key:'cliente_estadoCivil', label:'Estado civil del cliente', syn:['estado civil','estado_civil']},
  {key:'cliente_profesion', label:'Profesión del cliente', syn:['profesion','oficio','profesion u oficio','ocupacion']},
  {key:'cliente_clave',  label:'🔐 Clave Única del cliente', syn:['clave unica','clave','claveunica','clave u']},
  {key:'contraparte',    label:'Contraparte',    syn:['contraparte','demandado','parte contraria','contra','demandante contrario']},
  {key:'con_poder',      label:'¿Con poder? (sí/no)', syn:['con poder','poder','tiene poder','patrocinio y poder','patrocinio']},
  {key:'rol_procesal',   label:'Rol procesal (demandante/demandado)', syn:['rol procesal','calidad','posicion','calidad procesal']},
  {key:'plazo',          label:'Plazo / próxima actuación', syn:['plazo','proximo','proxima','vencimiento','audiencia','fecha','proxima actuacion']},
  {key:'obs',            label:'Observaciones',  syn:['obs','observaciones','observacion','notas','comentarios','detalle']},
];
function _normMatch(s){ return (s||'').toLowerCase().replace(/[áàä]/g,'a').replace(/[éèë]/g,'e').replace(/[íìï]/g,'i').replace(/[óòö]/g,'o').replace(/[úùü]/g,'u').replace(/ñ/g,'n').replace(/[^a-z0-9]+/g,' ').trim(); }
let _cauRows=[], _cauHasHeader=false, _cauCols=[];
function _guessField(hnorm, FIELDS){
  if(!hnorm) return '';
  // 1) igualdad EXACTA (gana globalmente: "estado civil" → estado civil, no "estado")
  for(const f of FIELDS){ if(f.syn.some(s=>_normMatch(s)===hnorm)) return f.key; }
  // 2) el encabezado contiene un sinónimo como palabra completa
  for(const f of FIELDS){ if(f.syn.some(s=>{ const n=_normMatch(s); return n && hnorm.split(' ').includes(n); })) return f.key; }
  // 3) substring en cualquier dirección
  for(const f of FIELDS){ if(f.syn.some(s=>{ const n=_normMatch(s); return n.length>=3 && (hnorm.includes(n)||n.includes(hnorm)); })) return f.key; }
  return '';
}
// Adivina el campo mirando el CONTENIDO de la columna (sirve cuando la tabla no trae encabezados)
function _guessCliByContent(vals){
  const s=(vals||[]).map(v=>(v||'').trim()).filter(Boolean); if(s.length<1) return '';
  const frac=re=>s.filter(v=>re.test(v)).length/s.length;
  const RUT=/^\d{1,2}\.?\d{3}\.?\d{3}\s*-?\s*[\dkK]$/;
  if(frac(/@/)>=.6) return 'correo';
  if(frac(RUT)>=.6) return 'rut';
  if(frac(/^(\+?56)?[\s-]?9[\s-]?\d{4}[\s-]?\d{4}$|^\+?\d[\d\s().-]{6,13}$/)>=.6) return 'telefono';
  if(frac(/^(m|f|masculino|femenino|hombre|mujer)$/i)>=.7) return 'genero';
  if(frac(/^(natural|jur[ií]dica|persona\s+(natural|jur[ií]dica))$/i)>=.7) return 'tipo';
  if(frac(/^(solter|casad|viud|divorciad|conviv|separad|union)/i)>=.6) return 'estado_civil';
  if(frac(/^(chilen|argentin|peruan|bolivian|colombian|venezolan|extranjer|brasiler|ecuatorian)/i)>=.6) return 'nacionalidad';
  if(frac(/\d/)>=.5 && frac(/[a-záéíóúñ]{3,}/i)>=.7 && frac(/\s/)>=.6) return 'domicilio';   // letras + número + espacios = dirección
  if(frac(/^[a-záéíóúñ'.\s]{5,}$/i)>=.7 && frac(/\s/)>=.6) return 'nombre';                  // solo letras y espacios (2+ palabras) = nombre
  return '';
}
function _cauGuess(hnorm){ return _guessField(hnorm, CAU_FIELDS); }
function mapImportCausas(){
  const text=(document.getElementById('import-ta')||{}).value||'';
  const rows=splitRows(text);
  if(!rows.length){ toast('Pega primero las filas de tu plantilla','error'); return; }
  const grid=rows.map(splitCells);
  const ncols=Math.max(...grid.map(r=>r.length));
  const firstNorm=(grid[0]||[]).map(_normMatch);
  const headerHits=firstNorm.filter(h=>_cauGuess(h)).length;
  _cauHasHeader = headerHits>=2;
  _cauRows = grid;
  const used=new Set(); _cauCols=[];
  for(let c=0;c<ncols;c++){
    const header=_cauHasHeader ? (grid[0][c]||('Columna '+(c+1))) : ('Columna '+(c+1));
    const sample=(grid[_cauHasHeader?1:0]||[])[c]||'';
    let guess=_cauHasHeader ? _cauGuess(_normMatch(grid[0][c]||'')) : '';
    if(guess && used.has(guess)) guess='';
    if(guess) used.add(guess);
    _cauCols.push({idx:c, header, sample, guess});
  }
  const opts=sel=>`<option value="">— ignorar —</option>`+CAU_FIELDS.map(f=>`<option value="${f.key}" ${sel===f.key?'selected':''}>${f.label}</option>`).join('');
  const rowsHtml=_cauCols.map(col=>`<tr>
      <td style="max-width:160px"><b>${escapeHtml(col.header)}</b><div style="font-size:11px;color:var(--gray2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(col.sample||'')||'—'}</div></td>
      <td><select class="form-select cau-map" data-idx="${col.idx}" style="font-size:12px">${opts(col.guess)}</select></td>
    </tr>`).join('');
  document.getElementById('import-body').innerHTML=`<div class="modal-title">Asignar columnas — causas</div>
    <div style="font-size:12px;color:var(--gray2);margin-bottom:8px">Acervo detectó tus columnas y adivinó a qué campo va cada una. Corrige lo que falte; lo que no uses, déjalo en <b>— ignorar —</b>. Obligatorio asignar <b>Caratulado</b>. ${_cauHasHeader?'<span style="color:var(--gold)">(1ª fila = encabezados)</span>':'<span style="color:var(--warn)">(sin encabezados: se mapea por posición)</span>'}</div>
    <div style="max-height:44vh;overflow:auto"><table class="cli-table imp-table"><thead><tr><th>Tu columna (ejemplo)</th><th>Campo en Acervo</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
    <div class="modal-footer"><button class="btn-ghost" onclick="openImportCausas()">← Atrás</button><button class="btn-gold" onclick="previewImportCausasMapped()">Previsualizar →</button></div>`;
}
function previewImportCausasMapped(){
  const map={}; document.querySelectorAll('.cau-map').forEach(s=>{ if(s.value) map[s.value]=parseInt(s.dataset.idx); });
  if(map.caratulado==null){ toast('Asigna una columna a "Caratulado"','error'); return; }
  const start=_cauHasHeader?1:0;
  const get=(cells,key)=> map[key]!=null ? (cells[map[key]]||'').trim() : '';
  _cauImport=[];
  for(let i=start;i<_cauRows.length;i++){
    const cells=_cauRows[i]; const name=get(cells,'caratulado'); if(!name) continue;
    _cauImport.push({ name, rit:get(cells,'rit'), ruc:get(cells,'ruc'), rol:get(cells,'rol'), tribunal:get(cells,'tribunal'),
      tipo:get(cells,'tipo'), materia:get(cells,'materia'), estado:get(cells,'estado'), cliente_rut:get(cells,'cliente_rut'), cliente_nombre:get(cells,'cliente_nombre'),
      cliente_correo:get(cells,'cliente_correo'), cliente_telefono:get(cells,'cliente_telefono'), cliente_domicilio:get(cells,'cliente_domicilio'),
      cliente_nacionalidad:get(cells,'cliente_nacionalidad'), cliente_estadoCivil:get(cells,'cliente_estadoCivil'), cliente_profesion:get(cells,'cliente_profesion'), cliente_clave:get(cells,'cliente_clave'),
      contraparte:get(cells,'contraparte'), tienePoder:/^(si|sí|s|1|true|x)$/i.test(get(cells,'con_poder')),
      rolProcesal:(get(cells,'rol_procesal')||'demandante').toLowerCase(), plazo:get(cells,'plazo'), obs:get(cells,'obs') });
  }
  if(!_cauImport.length){ toast('No se armaron causas. Revisa la columna Caratulado.','error'); return; }
  renderCausasPreview(true);
}
function renderCausasPreview(fromMap){
  const rows=_cauImport.map((e,i)=>{
    const c=_matchCliente(e.cliente_rut,e.cliente_nombre);
    const cliEstado = c ? escapeHtml(c.nombre) : (e.cliente_nombre? '<span style="color:var(--warn)">se creará: '+escapeHtml(e.cliente_nombre)+'</span>' : '<span style="color:var(--gray2)">sin cliente</span>');
    return `<tr><td>${i+1}</td><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.rit||e.rol||'')}</td><td>${cliEstado}</td><td>${e.tienePoder?'con poder':'sin poder'}</td></tr>`;
  }).join('');
  document.getElementById('import-body').innerHTML=`<div class="modal-title">Vista previa — ${_cauImport.length} causa(s)</div>
    <div style="max-height:46vh;overflow:auto"><table class="cli-table imp-table"><thead><tr><th>#</th><th>Caratulado</th><th>RIT/Rol</th><th>Cliente</th><th>Poder</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div style="font-size:12px;color:var(--gray2);margin-top:8px">Cada fila crea una carpeta. Los clientes que no existan se crearán. ¿Confirmas?</div>
    <div class="modal-footer"><button class="btn-ghost" onclick="${fromMap?'mapImportCausas()':'openImportCausas()'}">← Atrás</button><button class="btn-gold" onclick="confirmImportCausas()">Importar ${_cauImport.length}</button></div>`;
}
function parseImportCausas(text){
  const rows=splitRows(text); if(!rows.length) return [];
  let cols=CAU_IMPORT_COLS, start=0;
  const first=splitCells(rows[0]).map(normHeader);
  const known=first.filter(h=>CAU_IMPORT_COLS.includes(h));
  if(known.length>=2){ cols=first; start=1; }
  const out=[];
  for(let i=start;i<rows.length;i++){
    const cells=splitCells(rows[i]); const o={};
    cols.forEach((c,idx)=>{ o[c]=(cells[idx]||'').trim(); });
    if(!(o.caratulado||'').trim()) continue;
    out.push({ name:o.caratulado, rit:o.rit||'', ruc:o.ruc||'', rol:o.rol||'', tribunal:o.tribunal||'', materia:o.materia||'', estado:o.estado||'',
      cliente_rut:o.cliente_rut||'', cliente_nombre:o.cliente_nombre||'', contraparte:o.contraparte||'',
      tienePoder:/^(si|sí|s|1|true|x)$/i.test((o.con_poder||'').trim()), rolProcesal:(o.rol_procesal||'demandante').toLowerCase(), plazo:o.plazo||'', obs:o.obs||'' });
  }
  return out;
}
function _matchCliente(rut,nombre){
  const norm=s=>(s||'').replace(/[.\-\s]/g,'').toLowerCase();
  if(rut){ const c=CLIENTES.find(x=>norm(x.rut)===norm(rut)); if(c) return c; }
  if(nombre){ const c=CLIENTES.find(x=>norm(x.nombre)===norm(nombre)); if(c) return c; }
  return null;
}
function previewImportCausas(){
  const text=document.getElementById('import-ta').value||'';
  _cauImport=parseImportCausas(text);
  if(!_cauImport.length){ toast('No se reconocieron filas. Revisa el formato.','error'); return; }
  const rows=_cauImport.map((e,i)=>{
    const c=_matchCliente(e.cliente_rut,e.cliente_nombre);
    const cliEstado = c ? escapeHtml(c.nombre) : (e.cliente_nombre? '<span style="color:var(--warn)">se creará: '+escapeHtml(e.cliente_nombre)+'</span>' : '<span style="color:var(--danger)">sin cliente</span>');
    return `<tr><td>${i+1}</td><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.rit||e.rol||'')}</td><td>${cliEstado}</td><td>${e.tienePoder?'con poder':'sin poder'}</td></tr>`;
  }).join('');
  document.getElementById('import-body').innerHTML=`<div class="modal-title">Vista previa — ${_cauImport.length} causa(s)</div>
    <div style="max-height:46vh;overflow:auto"><table class="cli-table imp-table"><thead><tr><th>#</th><th>Caratulado</th><th>RIT/Rol</th><th>Cliente</th><th>Poder</th></tr></thead><tbody>${rows}</tbody></table></div>
    <div style="font-size:12px;color:var(--gray2);margin-top:8px">Cada fila crea una carpeta. Los clientes que no existan se crearán. ¿Confirmas?</div>
    <div class="modal-footer"><button class="btn-ghost" onclick="openImportCausas()">← Atrás</button><button class="btn-gold" onclick="confirmImportCausas()">Importar ${_cauImport.length}</button></div>`;
}
let _lastCausaIds=[];
function confirmImportCausas(){
  let n=0; _lastCausaIds=[];
  _cauImport.forEach(e=>{
    let c=_matchCliente(e.cliente_rut,e.cliente_nombre);
    const cliData={ correo:e.cliente_correo||'', telefono:e.cliente_telefono||'', domicilio:e.cliente_domicilio||'', nacionalidad:e.cliente_nacionalidad||'', estadoCivil:e.cliente_estadoCivil||'', profesion:e.cliente_profesion||'', claveUnica:e.cliente_clave||'' };
    if(!c && (e.cliente_nombre||e.cliente_rut)){
      c={id:'cl'+Date.now()+Math.floor(Math.random()*99999), tipo:'natural', nombre:e.cliente_nombre||e.cliente_rut, rut:e.cliente_rut||'', apodo:'', created:Date.now(), updated:Date.now()};
      Object.keys(cliData).forEach(k=>{ if(cliData[k]) c[k]=cliData[k]; });
      CLIENTES.push(c);
    } else if(c){ Object.keys(cliData).forEach(k=>{ if(cliData[k] && !c[k]) c[k]=cliData[k]; }); }   // completa datos faltantes del cliente ya existente
    const comp={ tienePoder:e.tienePoder, rolProcesal:e.rolProcesal||'demandante', esCAJ:false };
    const ex={ id:'ex'+Date.now()+Math.floor(Math.random()*99999), created:Date.now(), updated:Date.now(),
      name:e.name, rit:e.rit, ruc:e.ruc, rol:e.rol, tribunal:e.tribunal, tipo:e.tipo||'', materia:e.materia, estado:e.estado, contraparte:e.contraparte, plazo:e.plazo, obs:e.obs,
      clienteId:c?c.id:'', cliente:c?c.nombre:'' };
    Object.assign(ex,comp); ex.red=Object.assign({clienteId:c?c.id:''},comp);
    EXPEDIENTES.push(ex); _lastCausaIds.push(ex.id); n++;
  });
  _cauImport=[]; saveState(); closeAllModals(); renderExpedientes();
  toast(n+' causa(s) importada(s)','success');
}
function descargarPlantillaCausas(){
  const ej='Pérez con Soto,,,C-123-2025,1º Juzgado Civil de Santiago,Civil,En tramitación,12.345.678-9,Juan Pérez,Comercial Soto SpA,no,demandante,Audiencia 12/07,';
  const csv=CAU_IMPORT_COLS.join(',')+'\n'+ej;
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='plantilla_causas.csv'; a.click(); URL.revokeObjectURL(url);
}

// ══════ Documento (PDF/Word del PJUD) → datos de causa ══════
function openImportCausaDoc(){
  document.getElementById('import-body').innerHTML=`<div class="modal-title">📄 Crear causa desde un documento</div>
    <div style="font-size:13px;color:var(--gray2);line-height:1.6;margin-bottom:10px">Sube un escrito, resolución o carátula (PDF o Word) — por ejemplo el que descargas del PJUD. Acervo <b>detecta RIT, RUC, rol, tribunal, caratulado y partes</b>; tú revisas y confirmas.</div>
    <input id="caudoc-file" type="file" accept=".pdf,.docx,.doc,.txt" onchange="onCausaDocPick(event)" style="font-size:13px;color:var(--gray);padding:8px;border:1px dashed rgba(201,168,76,.35);border-radius:8px;width:100%;background:rgba(255,255,255,.03);cursor:pointer">
    <div id="caudoc-status" style="font-size:12px;color:var(--gray2);margin-top:8px"></div>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button></div>`;
  openModal('modal-import');
}
let _causaDocFile=null;
async function onCausaDocPick(e){
  const file=e.target.files[0]; if(!file) return;
  _causaDocFile=file;                     // guardamos el archivo para adjuntarlo a la causa creada
  const st=document.getElementById('caudoc-status'); if(st) st.textContent='Leyendo el documento…';
  let text='';
  try{
    const ext=(file.name.split('.').pop()||'').toLowerCase();
    if(ext==='pdf'){ if(!window.pdfjsLib) await waitFor(()=>window.pdfjsLib); const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise; for(let i=1;i<=Math.min(pdf.numPages,6);i++){ const pg=await pdf.getPage(i); const tc=await pg.getTextContent(); text+=tc.items.map(it=>it.str).join(' ')+'\n'; } }
    else if(ext==='docx'){ if(!window.mammoth) await waitFor(()=>window.mammoth); const r=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()}); text=r.value||''; }
    else { text=await file.text(); }
  }catch(err){ if(st) st.textContent='No se pudo leer: '+err.message; return; }
  text=text.replace(/\r/g,'').replace(/[ \t]+/g,' ').trim();
  if(!text){ if(st) st.textContent='El documento no tiene texto extraíble (¿PDF escaneado?).'; return; }
  renderCausaDocForm(extractCausaData(text));
}
// Extractor por reglas (convenciones chilenas / PJUD)
function extractCausaData(t){
  const one=t.replace(/\n+/g,' ');
  const grab=re=>{ const m=one.match(re); return m?(m[1]||m[0]).trim():''; };
  const rit=grab(/\bRIT[\s:ºN°]*([A-ZÑ]?-?\s?\d{1,6}\s?-\s?\d{4})/i) || grab(/\b([A-Z]-\d{1,6}-\d{4})\b/);
  const ruc=grab(/\bRUC[\s:ºN°]*([\d]{6,}-[\dkK])/i);
  const rol=grab(/\bRol[\s:ºN°]*(?:Ingreso\s*)?([A-Z]?-?\s?\d{1,6}\s?-\s?\d{4})/i) || grab(/\bIngreso[\s:ºN°]*([\d]{1,6}-\d{4})/i);
  let tribunal=grab(/((?:\d+[º°]?\s*)?(?:Juzgado|Tribunal|Corte)[^,.;]{0,60})/i);
  tribunal=tribunal.replace(/\s+/g,' ').trim();
  // caratulado: "caratulad(o/a) ... "X con Y"" o patrón "Apellido con Apellido"
  let carat=grab(/caratulad[oa]s?\s*["“]?([^"”,;.]{4,70})["”]?/i);
  if(!carat) carat=grab(/\b([A-ZÑÁÉÍÓÚ][\wáéíóúñ.]+(?:\s+[A-ZÑÁÉÍÓÚ][\wáéíóúñ.]+)*\s+con\s+[A-ZÑÁÉÍÓÚ][\wáéíóúñ.]+(?:\s+[A-ZÑÁÉÍÓÚ][\wáéíóúñ.]+)*)/);
  const rutCliente=grab(/(\d{1,2}\.\d{3}\.\d{3}-[\dkK])/);
  // TIPO = área del derecho por palabras clave (la MATERIA/acción se completa a mano)
  const low=one.toLowerCase();
  let tipo=''; [['penal','Penal'],['laboral','Laboral'],['familia','Familia'],['cobranza','Cobranza'],['civil','Civil'],['comercial','Comercial'],['policía local','Policía Local'],['protección','Protección']].forEach(([k,v])=>{ if(!tipo && low.includes(k)) tipo=v; });
  return { name:carat, rit, ruc, rol, tribunal, tipo, materia:'', cliente_rut:rutCliente, cliente_nombre:'', contraparte:'', rol_procesal:'demandante', estado:'', plazo:'', obs:'' };
}
function renderCausaDocForm(d){
  const F=(k,l,ph)=>`<div class="form-row"><label class="form-label">${l}</label><input class="form-input caudoc-f" data-k="${k}" value="${escapeHtml(d[k]||'')}" placeholder="${ph||''}" style="font-size:13px"></div>`;
  document.getElementById('import-body').innerHTML=`<div class="modal-title">Revisar datos detectados</div>
    <div style="font-size:12px;color:var(--gray2);margin-bottom:8px">Corrige lo que haga falta. Se creará una causa con estos datos.</div>
    <div style="max-height:46vh;overflow:auto">
      ${F('name','Caratulado / Nombre *','Pérez con Soto')}
      <div class="form-grid">${F('rit','RIT')}${F('ruc','RUC')}</div>
      <div class="form-grid">${F('rol','Rol / N° causa')}${F('tipo','Tipo (área del derecho)')}</div>
      ${F('materia','Materia / acción (va en la suma)','Ej: Cumplimiento de contrato')}
      ${F('tribunal','Tribunal')}
      <div class="form-grid">${F('cliente_nombre','Cliente')}${F('cliente_rut','RUT cliente')}</div>
      ${F('contraparte','Contraparte')}
      <div class="form-grid">${F('estado','Estado')}${F('plazo','Plazo / próxima')}</div>
    </div>
    <div class="modal-footer"><button class="btn-ghost" onclick="openImportCausaDoc()">← Otro documento</button><button class="btn-gold" onclick="confirmCausaDoc()">Crear causa</button></div>`;
}
async function confirmCausaDoc(){
  const o={}; document.querySelectorAll('.caudoc-f').forEach(el=>o[el.dataset.k]=el.value.trim());
  if(!o.name){ toast('El caratulado es obligatorio','error'); return; }
  _cauImport=[{ name:o.name, rit:o.rit||'', ruc:o.ruc||'', rol:o.rol||'', tribunal:o.tribunal||'', tipo:o.tipo||'', materia:o.materia||'', estado:o.estado||'',
    cliente_rut:o.cliente_rut||'', cliente_nombre:o.cliente_nombre||'', contraparte:o.contraparte||'',
    tienePoder:false, rolProcesal:(o.rol_procesal||'demandante'), plazo:o.plazo||'', obs:o.obs||'' }];
  confirmImportCausas();
  // adjuntar el documento que subiste a la causa recién creada
  const exId=_lastCausaIds && _lastCausaIds[0];
  if(exId && _causaDocFile){ try{ await addFilesToExpediente(exId, [_causaDocFile]); }catch(err){ toast('Causa creada, pero no se pudo adjuntar el documento','error'); } }
  _causaDocFile=null;
}
