const MATERIAS_DEFAULT=['Familia','Civil','Penal','Laboral','Policía Local','Cobranza'];
function materias(){ const m=STATE.materias; return (Array.isArray(m)&&m.length)?m:MATERIAS_DEFAULT.slice(); }
function materiaOptions(sel, conGeneral){
  const list=(conGeneral?['general']:[]).concat(materias());
  let extra=''; if(sel && list.map(o=>o.toLowerCase()).indexOf(String(sel).toLowerCase())<0) extra=`<option selected>${escapeHtml(sel)}</option>`;
  return extra+list.map(o=>`<option value="${o==='general'?'general':escapeHtml(o)}" ${String(sel||'')===o?'selected':''}>${o==='general'?'General (todas las materias)':escapeHtml(o)}</option>`).join('');
}
function fillMateriaSelect(id,val,conGeneral){ const el=document.getElementById(id); if(el) el.innerHTML=materiaOptions(val,conGeneral); }

const ROLES_PROC_DEFAULT=['demandante','demandada','querellante','querellada','imputada','solicitante','requerido'];
function rolesProcesales(){ const r=STATE.rolesProcesales; return (Array.isArray(r)&&r.length)?r:ROLES_PROC_DEFAULT.slice(); }
function rolOptions(sel){ return rolesProcesales().map(r=>`<option ${String(sel||'')===r?'selected':''}>${escapeHtml(r)}</option>`).join(''); }
function fillRolSelect(id,val){ const el=document.getElementById(id); if(el) el.innerHTML=rolOptions(val); }
function openRolesEditor(){
  if(!_needAdminForms()) return;
  const host=document.getElementById('roles-body'); if(!host) return;
  host.innerHTML=`<div class="modal-title">⚖️ Calidades / roles procesales del cliente</div>
    <div style="font-size:12px;color:var(--gray2);margin-bottom:8px">Uno por línea. Aparecen en "Calidad del cliente" de las causas. Edítalos, agrega o quita.</div>
    <textarea id="roles-ta" class="form-textarea" style="min-height:200px;font-size:14px;line-height:1.7">${escapeHtml(rolesProcesales().join('\n'))}</textarea>
    <div class="modal-footer"><button class="btn-ghost" onclick="STATE.rolesProcesales=null;saveState();openRolesEditor()">↺ Por defecto</button><button class="btn-ghost" onclick="openModelosPanel()">Cancelar</button><button class="btn-gold" onclick="saveRolesEditor()">Guardar</button></div>`;
  openModal('modal-roles');
}
function saveRolesEditor(){
  if(!_needAdminForms()) return;
  const ta=document.getElementById('roles-ta'); if(!ta) return;
  const list=ta.value.split('\n').map(s=>s.trim()).filter(Boolean);
  if(!list.length){ toast('Deja al menos un rol','error'); return; }
  STATE.rolesProcesales=list; saveState(); toast('Roles guardados','success'); openModelosPanel();
}

function _taInsert(id,tok){ const ta=document.getElementById(id); if(!ta) return; const s=ta.selectionStart!=null?ta.selectionStart:ta.value.length, e=ta.selectionEnd!=null?ta.selectionEnd:ta.value.length; ta.value=ta.value.slice(0,s)+tok+ta.value.slice(e); try{ta.dispatchEvent(new Event('input',{bubbles:true}));}catch(_){} ta.focus(); const p=s+tok.length; try{ta.setSelectionRange(p,p);}catch(_){} }
function _taFmt(id,kind){ const ta=document.getElementById(id); if(!ta) return; const M={b:['[[B]]','[[/B]]'],i:['[[I]]','[[/I]]'],u:['[[U]]','[[/U]]']}; const pp=M[kind]||['[[ALIGN:'+kind+']]\n','\n[[/ALIGN]]']; const s=ta.selectionStart!=null?ta.selectionStart:ta.value.length, e=ta.selectionEnd!=null?ta.selectionEnd:ta.value.length; const sel=ta.value.slice(s,e)||'texto'; ta.value=ta.value.slice(0,s)+pp[0]+sel+pp[1]+ta.value.slice(e); try{ta.dispatchEvent(new Event('input',{bubbles:true}));}catch(_){} ta.focus(); const p=s+pp[0].length; try{ta.setSelectionRange(p,p+sel.length);}catch(_){} }

const TRIB_DEFAULT=[
  {k:'familia',  label:'Familia',        syn:['familia'],              ficha:'{n}º Juzgado de Familia de {ciudad}',                       head:'S.J.L. DE FAMILIA DE {ciudad} ({n}º)'},
  {k:'civil',    label:'Civil',          syn:['civil'],                ficha:'{n}º Juzgado Civil de {ciudad}',                            head:'S.J.L. EN LO CIVIL DE {ciudad} ({n}º)'},
  {k:'garantia', label:'Garantía',       syn:['garantia','garantía'],  ficha:'{n}º Juzgado de Garantía de {ciudad}',                      head:'S.J.L. DE GARANTÍA DE {ciudad} ({n}º)'},
  {k:'trabajo',  label:'Trabajo',        syn:['trabajo','laboral'],    ficha:'{n}º Juzgado de Letras del Trabajo de {ciudad}',            head:'S.J.L. DEL TRABAJO DE {ciudad} ({n}º)'},
  {k:'cobranza', label:'Cobranza',       syn:['cobranza'],             ficha:'{n}º Juzgado de Cobranza Laboral y Previsional de {ciudad}',head:'S.J.L. DE COBRANZA LABORAL Y PREVISIONAL DE {ciudad} ({n}º)'},
  {k:'policia',  label:'Policía Local',  syn:['policia','policía'],    ficha:'{n}º Juzgado de Policía Local de {ciudad}',                 head:'S.J.L. DE POLICÍA LOCAL DE {ciudad} ({n}º)'},
  {k:'oral',     label:'Oral penal',     syn:['oral','juicio oral','top'], ficha:'{n}º Tribunal de Juicio Oral en lo Penal de {ciudad}',  head:'S.J.L. DE JUICIO ORAL EN LO PENAL DE {ciudad} ({n}º)'},
  {k:'letras',   label:'De Letras',      syn:['letras'],               ficha:'{n}º Juzgado de Letras de {ciudad}',                        head:'S.J. DE LETRAS DE {ciudad} ({n}º)'},
];
function tribTipos(){ const t=STATE.tribTipos; return (Array.isArray(t)&&t.length)?t:TRIB_DEFAULT.slice(); }
function _ordNum(n){ return n+'º'; }
function _capCiudad(str){ return String(str||'').toLowerCase().replace(/\b([a-záéíóúñ])/g, m=>m.toUpperCase()); }
function _fillTrib(pat,n,city){ return String(pat||'').replace(/\{n\}/g,n).replace(/\{ciudad\}/g,city); }
function _reWord(w){ return new RegExp('\\b'+String(w).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'); }
const _ORD_U={primer:1,primero:1,segundo:2,tercer:3,tercero:3,cuarto:4,quinto:5,sexto:6,septimo:7,'séptimo':7,octavo:8,noveno:9,decimo:10,'décimo':10,undecimo:11,'undécimo':11,duodecimo:12,'duodécimo':12,decimotercero:13,decimocuarto:14,decimoquinto:15,decimosexto:16,decimoseptimo:17,'decimoséptimo':17,decimoctavo:18,decimonoveno:19};
const _ORD_T={vigesimo:20,'vigésimo':20,trigesimo:30,'trigésimo':30};
const _ORD_KEYS=Object.keys(_ORD_U).concat(Object.keys(_ORD_T));
function _tribNum(s){
  const d=s.match(/(\d{1,3})\s*[º°]?/); if(d) return parseInt(d[1],10);
  const low=' '+s.toLowerCase().replace(/[º°]/g,' ')+' ';
  for(const t in _ORD_T){ if(low.includes(' '+t+' ')){ const base=_ORD_T[t]; for(const u in _ORD_U){ if(_ORD_U[u]<10 && low.includes(' '+u+' ')) return base+_ORD_U[u]; } return base; } }
  const keys=Object.keys(_ORD_U).sort((a,b)=>b.length-a.length);
  for(const k of keys){ if(low.includes(' '+k+' ')) return _ORD_U[k]; }
  return null;
}
function parseTribunal(raw){
  const s=String(raw||'').trim(); if(!s) return null;
  if(/^s\.?\s*j\.?/i.test(s)) return null;
  const n=_tribNum(s);
  const tipos=tribTipos();
  const tipo=tipos.find(t=>(t.syn||[]).some(w=>_reWord(w).test(s)));
  if(!n || !tipo) return null;
  const allSyn=tipos.reduce((a,t)=>a.concat(t.syn||[]),[]).concat(['previsional','penal','juicio','local']).concat(_ORD_KEYS);
  const synRe=new RegExp('\\b('+allSyn.map(w=>String(w).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')\\b','gi');
  let city=s.replace(/\d{1,3}\s*[º°]?/g,' ')
            .replace(/\b(juzgado|tribunal|corte|de\s+letras|en\s+lo|del|de\s+la|de\s+los|de|en|lo|la|el|los)\b/gi,' ')
            .replace(synRe,' ')
            .replace(/\s+/g,' ').trim();
  if(!city) return null;
  const nombre=_fillTrib(tipo.ficha, n, _capCiudad(city));
  const heading=_fillTrib(tipo.head, n, city.toUpperCase());
  return { n, tipo:tipo.k, ciudad:_capCiudad(city), nombre, heading };
}
function tribunalHeading(raw){ const p=parseTribunal(raw); return p?p.heading:''; }
function tribPreview(v){
  const h=document.getElementById('fe-tribunal-hint'); if(!h) return;
  const p=parseTribunal(v);
  if(p){ h.innerHTML=`✓ Ficha: <b style="color:var(--gold3)">${escapeHtml(p.nombre)}</b> · En el escrito: <b style="color:var(--gold3)">${escapeHtml(p.heading)}</b>`; }
  else if((v||'').trim()){ h.innerHTML='<span style="color:var(--gray2)">Se usará tal cual lo escribiste. Prueba: «3 familia santiago», «30 civil santiago», «4 garantía santiago».</span>'; }
  else h.innerHTML='';
}
function tribunalNombre(raw){ const p=parseTribunal(raw); return p?p.nombre:(raw||''); }
function openTribunalesEditor(){
  if(!_needAdminForms()) return;
  const host=document.getElementById('tribunales-body'); if(!host) return;
  const rows=tribTipos().map((t,i)=>`<div style="border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:9px">
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:7px"><input class="form-input trib-label" data-i="${i}" value="${escapeHtml(t.label||'')}" placeholder="Nombre del tipo" style="max-width:180px;font-weight:600"><button class="rw-mini" style="margin-left:auto;color:var(--danger)" onclick="tribDelRow(${i})">✕ Quitar</button></div>
    <div style="display:grid;grid-template-columns:1fr;gap:6px">
      <label style="font-size:11px;color:var(--gray2)">Palabras que lo detectan (separadas por coma)<input class="form-input trib-syn" data-i="${i}" value="${escapeHtml((t.syn||[]).join(', '))}" placeholder="familia"></label>
      <label style="font-size:11px;color:var(--gray2)">Nombre en la ficha<input class="form-input trib-ficha" data-i="${i}" value="${escapeHtml(t.ficha||'')}" placeholder="{n}º Juzgado de Familia de {ciudad}"></label>
      <label style="font-size:11px;color:var(--gray2)">Encabezado del escrito<input class="form-input trib-head" data-i="${i}" value="${escapeHtml(t.head||'')}" placeholder="S.J.L. DE FAMILIA DE {ciudad} ({n}º)"></label>
    </div></div>`).join('');
  host.innerHTML=`<div class="modal-title">🏛️ Tribunales (bases del detector)</div>
    <div style="font-size:12px;color:var(--gray2);margin-bottom:8px;line-height:1.6">El usuario escribe suelto (ej. <b>3 familia santiago</b>, <b>tercero de familia de santiago</b>) y el sistema arma solo el nombre y el encabezado. Aquí defines cada tipo. Usa <code>{n}</code> (número) y <code>{ciudad}</code> (en el escrito sale en MAYÚSCULAS). El orden importa: los genéricos (ej. “De Letras”) van al final.</div>
    <div style="background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.18);border-radius:9px;padding:9px 11px;margin-bottom:10px">
      <label style="font-size:11px;color:var(--gold3)">Probar</label>
      <input class="form-input" id="trib-test" placeholder="Escribe: 3 familia santiago" oninput="tribTest(this.value)" style="margin:4px 0">
      <div id="trib-test-out" style="font-size:12px;color:var(--gray2)"></div></div>
    <div style="max-height:44vh;overflow:auto">${rows}</div>
    <button class="btn-ghost" style="margin-top:6px" onclick="tribAddRow()">＋ Agregar tipo</button>
    <div class="modal-footer"><button class="btn-ghost" onclick="STATE.tribTipos=null;saveState();openTribunalesEditor()">↺ Por defecto</button><button class="btn-ghost" onclick="openModelosPanel()">Cancelar</button><button class="btn-gold" onclick="saveTribunalesEditor()">Guardar</button></div>`;
  openModal('modal-tribunales');
}
function _readTribRows(){
  const rows=[]; document.querySelectorAll('.trib-label').forEach(el=>{
    const i=el.dataset.i;
    const q=sel=>{const e=document.querySelector('.'+sel+'[data-i="'+i+'"]'); return e?e.value.trim():'';};
    const syn=q('trib-syn').split(',').map(x=>x.trim()).filter(Boolean);
    const label=el.value.trim(); const ficha=q('trib-ficha'); const head=q('trib-head');
    if(label||syn.length||ficha||head) rows.push({k:'t'+i, label, syn, ficha, head});
  });
  return rows;
}
function tribAddRow(){ STATE.tribTipos=_readTribRows(); STATE.tribTipos.push({k:'t'+Date.now(), label:'Nuevo tipo', syn:[], ficha:'{n}º Juzgado de {ciudad}', head:'S.J.L. DE {ciudad} ({n}º)'}); openTribunalesEditor(); }
function tribDelRow(i){ const r=_readTribRows(); r.splice(i,1); STATE.tribTipos=r.length?r:null; openTribunalesEditor(); }
function tribTest(v){ const out=document.getElementById('trib-test-out'); if(!out) return;
  const saved=STATE.tribTipos; STATE.tribTipos=_readTribRows();
  const p=parseTribunal(v); STATE.tribTipos=saved;
  out.innerHTML = p ? `Ficha: <b style="color:var(--gold3)">${escapeHtml(p.nombre)}</b> · Escrito: <b style="color:var(--gold3)">${escapeHtml(p.heading)}</b>` : ((v||'').trim()?'<span style="color:var(--warn)">No lo reconozco todavía (revisa las palabras que lo detectan)</span>':'');
}
function saveTribunalesEditor(){
  if(!_needAdminForms()) return;
  const rows=_readTribRows().filter(t=>t.syn.length && t.ficha && t.head);
  if(!rows.length){ toast('Deja al menos un tipo con palabras, ficha y encabezado','error'); return; }
  STATE.tribTipos=rows; saveState(); toast('Tribunales guardados','success'); openModelosPanel();
}
function openMateriasEditor(){
  if(!_needAdminForms()) return;
  const host=document.getElementById('materias-body'); if(!host) return;
  host.innerHTML=`<div class="modal-title">📂 Materias de las causas</div>
    <div style="font-size:12px;color:var(--gray2);margin-bottom:8px">Una por línea. Se usan en la causa y para que cada escrito aparezca solo en su materia (o en “General”).</div>
    <textarea id="materias-ta" class="form-textarea" style="min-height:200px;font-size:14px;line-height:1.7">${escapeHtml(materias().join('\n'))}</textarea>
    <div class="modal-footer"><button class="btn-ghost" onclick="STATE.materias=null;saveState();openMateriasEditor()">↺ Por defecto</button><button class="btn-ghost" onclick="openModelosPanel()">Cancelar</button><button class="btn-gold" onclick="saveMateriasEditor()">Guardar</button></div>`;
  openModal('modal-materias');
}
function saveMateriasEditor(){
  if(!_needAdminForms()) return;
  const ta=document.getElementById('materias-ta'); if(!ta) return;
  const list=ta.value.split('\n').map(s=>s.trim()).filter(Boolean);
  if(!list.length){ toast('Deja al menos una materia','error'); return; }
  STATE.materias=list; saveState(); toast('Materias guardadas','success'); openModelosPanel();
}
