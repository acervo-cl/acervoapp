const PARTES_CON_TEXTO=['comparecencia','portanto'];
function defaultPresumaRows(){ return [
  {label:'Procedimiento',token:''},{label:'Materia',token:'{{causa.materia}}'},
  {label:'Demandante',token:'{{cliente.nombre}}'},{label:'RUT',token:'{{cliente.rut}}'},
  {label:'Abogado patrocinante',token:'{{abogado.nombre}}'},{label:'RUT',token:'{{abogado.rut}}'},
  {label:'Demandado',token:'{{demandado.nombre}}'},{label:'RUT',token:'{{demandado.rut}}'}
]; }
let _presumaMigrada=false;
function migratePresumaDemanda(){
  if(_presumaMigrada) return; _presumaMigrada=true;
  const t=TIPOSDOC.find(x=>x.id==='demanda'); if(!t||!t.partes) return;
  const p=t.partes.find(x=>x.key==='presuma'); if(!p||!p.rows) return;
  let ch=false;
  p.rows.forEach((r,i)=>{
    if(!r.token && /^demandad[oa]$/i.test((r.label||'').trim())){
      r.token='{{demandado.nombre}}'; ch=true;
      const nx=p.rows[i+1];
      if(nx && !nx.token && /^rut$/i.test((nx.label||'').trim())){ nx.token='{{demandado.rut}}'; ch=true; }
    }
  });
  if(ch){ try{ saveState(); }catch(_){} }
}
function defaultPartes(t){
  const motor=t.motor||'judicial';
  if(motor==='documental') return [{key:'titulo',on:true},{key:'cuerpo',on:true},{key:'pie',on:true}];
  const base=[
    {key:'titulo',on:true},
    {key:'tribunal',on:true,align:'center'},
    {key:'comparecencia',on:true,texto:'{{compareciente}} en autos sobre {{causa}}, a U.S., respetuosamente digo:'},
    {key:'cuerpo',on:true},
    {key:'portanto',on:true,texto:'POR TANTO,\nSOLICITO A U.S., {{portanto}}'},
    {key:'otrosies',on:true}
  ];
  if(t.id==='demanda') base.unshift({key:'presuma',on:true,rows:defaultPresumaRows()});
  return base;
}
function ensureTiposDoc(){
  const removed = new Set(Array.isArray(STATE.removedTiposDoc) ? STATE.removedTiposDoc : []);
  if(!TIPOSDOC.length){ TIPOSDOC_DEFAULT.forEach(t=>{ if(!removed.has(t.id)) TIPOSDOC.push(JSON.parse(JSON.stringify(t))); }); }
  TIPOSDOC_DEFAULT.forEach(d=>{ if(!removed.has(d.id) && !TIPOSDOC.some(t=>t.id===d.id)) TIPOSDOC.push(JSON.parse(JSON.stringify(d))); });
  TIPOSDOC.forEach(t=>{ if(!t.partes||!t.partes.length) t.partes=defaultPartes(t); if(t.enCausa===undefined) t.enCausa=(t.id==='escrito'); (t.partes||[]).forEach(p=>{ if(p.key==='tribunal' && p.align===undefined) p.align='center'; }); });
  MODELOS.forEach(m=>{ if(!m.tipoId) m.tipoId=m.categoria||'escrito'; });
  migratePresumaDemanda();
}
function tipoById(id){ return TIPOSDOC.find(t=>t.id===id); }
let _mdlDrag=null;
function mdlDragStart(ev,id){ _mdlDrag=id; if(ev&&ev.dataTransfer){ ev.dataTransfer.effectAllowed='move'; try{ev.dataTransfer.setData('text/plain',id);}catch(_){}} }
function mdlDrop(toId){ document.querySelectorAll('.mdl-over').forEach(el=>el.classList.remove('mdl-over')); if(!_mdlDrag||_mdlDrag===toId) return;
  const from=MODELOS.findIndex(m=>m.id===_mdlDrag); if(from<0) return; const it=MODELOS.splice(from,1)[0];
  const to=MODELOS.findIndex(m=>m.id===toId); MODELOS.splice(to<0?MODELOS.length:to,0,it); _mdlDrag=null; saveState(); renderModelos(); }
function longDateCL(d){ d=d||new Date(); const M=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']; return `${d.getDate()} de ${M[d.getMonth()]} de ${d.getFullYear()}`; }
const CLI_FIELDS=['nombre','rut','domicilio','profesion','nacionalidad','estadoCivil','giro','representante','cargoRepresentante','correo'];
const INDIV_DEFAULT={
  natural:'{{nombre}}|{{nacionalidad}}|{{estadoCivil}}|{{profesion}}|cédula de identidad nacional Nº{{rut}}|{{domiciliado}} en {{domicilio}}',
  juridica:'{{nombre}}|RUT Nº{{rut}}|representada por su {{cargoRepresentante}} {{representante}}|cédula de identidad nacional Nº{{rutRepresentante}}|domiciliada en {{domicilio}}',
  nino:'su {{hijo}} {{nombre}}|{{nacionalidad}}|cédula de identidad nacional Nº{{rut}}|{{domiciliado}} en {{domicilio}}',
  abogado:'{{nombre}}|{{nacionalidad}}|{{estadoCivil}}|{{cargo}}|cédula de identidad nacional Nº{{rut}}|{{domiciliado}} en {{domicilio}}'
};
function indivTpl(){ return Object.assign({}, INDIV_DEFAULT, STATE.indivTpl||{}); }
const _INDIV_HELPERS=['don','tratamiento','el','domiciliado','hijo'];
function stripMarks(s){ return String(s||'').replace(/\[\[\/?[A-Za-z]+(?::\w+)?\]\]/g,''); }
function buildIndividualizacion(c){
  if(!c || !(c.nombre||'').trim()) return '';
  const g=generoDe(c);
  const tipo = c.tipo==='juridica' ? 'juridica' : (c.tipo==='nino' ? 'nino' : 'natural');
  const tpl = indivTpl()[tipo] || INDIV_DEFAULT[tipo];
  const data={
    nombre:_nomFmt(c.nombre), rut:c.rut||'', domicilio:c.domicilio||'', profesion:c.profesion||'',
    nacionalidad:pickGender(c.nacionalidad||'',g), estadoCivil:pickGender(c.estadoCivil||'',g),
    giro:c.giro||'', representante:c.representante||'', rutRepresentante:c.rutRepresentante||'',
    cargoRepresentante:(c.cargoRepresentante||'').toLowerCase(), correo:c.correo||'', fechaNac:c.fechaNac||'',
    don:(g==='f')?'doña':'don', tratamiento:(g==='f')?'Doña':'Don', el:(g==='f')?'ella':'él',
    domiciliado:(g==='f')?'domiciliada':'domiciliado', hijo:(g==='f')?'hija':'hijo'
  };
  const segs=String(tpl).split('|').map(s=>s.trim()).filter(Boolean).map(seg=>{
    const toks=(seg.match(/\{\{\s*[a-zA-Z]+\s*\}\}/g)||[]).map(m=>m.replace(/[{}\s]/g,''));
    const datos=toks.filter(t=>!_INDIV_HELPERS.includes(t));
    if(datos.length && datos.every(t=>!String(data[t]||'').trim())) return '';
    return seg.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g,(m,k)=>data[k]!==undefined?data[k]:'').replace(/\s+/g,' ').trim();
  }).filter(Boolean);
  return segs.join(', ');
}
function pickGender(str,g){ if(!str||str.indexOf('/')<0) return str||''; const i=str.indexOf('/'); const base=str.slice(0,i), suf=str.slice(i+1); const fem=base.slice(0,Math.max(0,base.length-suf.length))+suf; return (g==='f')?fem:base; }
function generoDe(c){ return (c && /^(f|fem|muj)/i.test(c.genero||'')) ? 'f' : 'm'; }
function _nomFmt(n){ n=(n||'').trim(); if(!n) return ''; return (STATE.nombreMayusNegrita!==false) ? '[[B]]'+n.toUpperCase()+'[[/B]]' : n; }
function addPersona(map, key, c){
  const g=generoDe(c);
  CLI_FIELDS.forEach(f=>{ map[key+'.'+f]=c[f]||''; });
  map[key+'.nombre']=_nomFmt(c.nombre);
  map[key+'.nacionalidad']=pickGender(c.nacionalidad||'', g);
  map[key+'.estadoCivil']=pickGender(c.estadoCivil||'', g);
  map[key+'.don']=(g==='f')?'doña':'don';
  map[key+'.tratamiento']=(g==='f')?'Doña':'Don';
  map[key+'.el']=(g==='f')?'ella':'él';
  map[key+'.domiciliado']=(g==='f')?'domiciliada':'domiciliado';
  map[key+'.hijo']=(g==='f')?'hija':'hijo';
  map[key+'.fechaNac']=c.fechaNac||'';
  map[key+'.edad']=edadDe(c.fechaNac);
  map[key+'.individualizacion']=buildIndividualizacion(c);
  map[key+'.cargo']=(c.cargo||'').toLowerCase();
  return g;
}
function edadDe(fechaNac){
  const s=String(fechaNac||'').trim(); if(!s) return '';
  let d,m,a;
  let x=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if(x){ d=+x[1]; m=+x[2]; a=+x[3]; }
  else { x=s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/); if(!x) return ''; a=+x[1]; m=+x[2]; d=+x[3]; }
  const nac=new Date(a, m-1, d);
  if(isNaN(nac) || nac.getDate()!==d || nac.getMonth()!==m-1) return '';
  const hoy=new Date(); let e=hoy.getFullYear()-a;
  const dm=hoy.getMonth()-(m-1);
  if(dm<0 || (dm===0 && hoy.getDate()<d)) e--;
  return (e>=0 && e<130) ? String(e) : '';
}
const VINC_PAL={ progenitor:['padre','madre'], hijo:['hijo','hija'], conyuge:['cónyuge','cónyuge'], conviviente:['conviviente civil','conviviente civil'], abuelo:['abuelo','abuela'], tio:['tío','tía'], hermano:['hermano','hermana'], tutor:['tutor','tutora'], curador:['curador','curadora'], empleador:['empleador','empleadora'], trabajador:['trabajador','trabajadora'], repLegal:['representante legal','representante legal'], arrendador:['arrendador','arrendadora'], arrendatario:['arrendatario','arrendataria'], comprador:['comprador','compradora'], vendedor:['vendedor','vendedora'], acreedor:['acreedor','acreedora'], deudor:['deudor','deudora'], propietario:['propietario','propietaria'], poseedor:['poseedor','poseedora'] };
const VINC_AREA={ familia:['progenitor','hijo','conyuge','conviviente','abuelo','tio','hermano','tutor','curador','repLegal'], laboral:['empleador','trabajador','repLegal'], civil:['arrendador','arrendatario','comprador','vendedor','acreedor','deudor','propietario','poseedor','repLegal'], comercial:['comprador','vendedor','acreedor','deudor','repLegal'], cobranza:['acreedor','deudor','repLegal'] };
function vincLbl(v){ const p=VINC_PAL[v]; return p ? (p[0]===p[1]?p[0]:p[0]+' / '+p[1]) : v; }
function vincPalabra(v, g){ const p=VINC_PAL[v]; return p ? (g==='f'?p[1]:p[0]) : ''; }
function vinculosDe(area){ const a=(area||'').toLowerCase(); for(const k in VINC_AREA) if(a.includes(k)) return VINC_AREA[k]; return Object.keys(VINC_PAL); }
function addVinculo(map, key, ex, pid){
  map[key+'.vinculo']=''; map[key+'.vinculoDe']='';
  if(!ex || !Array.isArray(ex.partes) || !pid) return;
  const p=ex.partes.find(x=>String(x.personaId)===String(pid));
  if(!p || !p.vinculo) return;
  map[key+'.vinculo']=vincPalabra(p.vinculo, generoDe(findCliente(pid)));
  const otro=findCliente(p.vinculoDe);
  map[key+'.vinculoDe']=otro?(otro.nombre||''):'';
}
function _joinYSemi(arr){ const a=arr.filter(Boolean); if(a.length<=1) return a[0]||''; return a.slice(0,-1).join('; ')+'; y '+a[a.length-1]; }
function _joinNombres(arr){ const a=arr.filter(Boolean); if(a.length<=1) return a[0]||''; return a.slice(0,-1).join(', ')+' y '+a[a.length-1]; }
function buildIndividualizacionGroup(persons){
  const arr=(persons||[]).filter(Boolean);
  const parts=arr.map((c,i)=>{ const ind=buildIndividualizacion(c); if(!ind) return ''; if(i===0) return ind; const g=generoDe(c); return (g==='f'?'doña ':'don ')+ind; }).filter(Boolean);
  return _joinYSemi(parts);
}
const _baseRole=k=>String(k).replace(/\d+$/,'');
function _clienteIds(cx){ if(cx && Array.isArray(cx.clienteIds) && cx.clienteIds.length) return cx.clienteIds.filter(Boolean); return (cx&&cx.clienteId)?[cx.clienteId]:[]; }
function redCtx(cx){
  const ab=STATE.perfilAbogado||{}; const cli=findCliente(cx&&cx.clienteId)||{};
  const map={ 'abogado.nombre':_nomFmt(ab.nombre),'abogado.rut':ab.rut,'abogado.domicilio':ab.domicilio,'abogado.email':ab.email,'abogado.cargo':ab.cargo, 'causa.rol':cx&&cx.rol,'causa.rit':cx&&cx.rol,'causa.tribunal':cx&&cx.tribunal,'causa.caratula':cx&&cx.caratula,'causa.materia':cx&&cx.materia,'causa.area':cx&&cx.area, 'fecha':longDateCL() };
  const gen={};
  const ex=(cx&&cx.expId)?EXPEDIENTES.find(x=>x.id===cx.expId):null;
  gen.cliente=addPersona(map,'cliente',cli);
  addVinculo(map,'cliente',ex,cx&&cx.clienteId);
  if(cx && cx.partes){ Object.keys(cx.partes).forEach(rk=>{ const pid=cx.partes[rk]; gen[rk]=addPersona(map, rk, findCliente(pid)||{}); addVinculo(map, rk, ex, pid); }); }
  if(cx && cx.partes){
    const groups={}; Object.keys(cx.partes).forEach(k=>{ if(!cx.partes[k]) return; (groups[_baseRole(k)]=groups[_baseRole(k)]||[]).push(cx.partes[k]); });
    Object.keys(groups).forEach(b=>{ const persons=groups[b].map(findCliente).filter(Boolean); if(persons.length>1){ map[b+'.individualizacion']=buildIndividualizacionGroup(persons); map[b+'.nombre']=_joinNombres(persons.map(p=>_nomFmt(p.nombre))); map[b+'.esPlural']='1'; }});
  }
  const cliIds=_clienteIds(cx); if(cliIds.length>1){ const cps=cliIds.map(findCliente).filter(Boolean); map['cliente.individualizacion']=buildIndividualizacionGroup(cps); map['cliente.nombre']=_joinNombres(cps.map(p=>_nomFmt(p.nombre))); map['cliente.esPlural']='1'; }
  map['abogados']=abogadosIndiv(cx);
  map['abogados.nombres']=abogadosNombres(cx);
  ((cx&&cx.colaboradores)||[]).forEach((id,i)=>{ const c=findColaborador(id); if(c) addPersona(map, 'colab'+(i+1), c); });
  return {map, gen};
}
function abogadosDe(cx){
  const ab=STATE.perfilAbogado||{};
  const list=[{nombre:ab.nombre||'[ABOGADO]', rut:ab.rut, domicilio:ab.domicilio, correo:ab.email, genero:ab.genero||'m', cargo:ab.cargo||'abogado'}];
  const cargos=(cx&&cx.colaboradorCargos)||{};
  ((cx&&cx.colaboradores)||[]).forEach(id=>{
    const c=findColaborador(id); if(!c) return;
    list.push(Object.assign({},c,{cargo:cargos[id]||c.cargo||'abogado'}));
  });
  return list;
}
function buildAbogadoIndiv(a){
  if(!a || !(a.nombre||'').trim()) return '';
  const g=(/^(f|fem|muj)/i.test(a.genero||'')) ? 'f' : 'm';
  const tpl = indivTpl().abogado || INDIV_DEFAULT.abogado;
  const data={ nombre:_nomFmt(a.nombre), rut:a.rut||'', domicilio:a.domicilio||'', profesion:a.profesion||'', nacionalidad:pickGender(a.nacionalidad||'',g), estadoCivil:pickGender(a.estadoCivil||'',g), cargo:(a.cargo||'abogado').toLowerCase(), don:(g==='f')?'doña':'don', tratamiento:(g==='f')?'Doña':'Don', el:(g==='f')?'ella':'él', domiciliado:(g==='f')?'domiciliada':'domiciliado' };
  const segs=String(tpl).split('|').map(s=>s.trim()).filter(Boolean).map(seg=>{ const toks=(seg.match(/\{\{\s*[a-zA-Z]+\s*\}\}/g)||[]).map(m=>m.replace(/[{}\s]/g,'')); const datos=toks.filter(t=>!_INDIV_HELPERS.includes(t) && t!=='cargo'); if(datos.length && datos.every(t=>!String(data[t]||'').trim())) return ''; return seg.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g,(m,k)=>data[k]!==undefined?data[k]:'').replace(/\s+/g,' ').trim(); }).filter(Boolean);
  return segs.join(', ');
}
function abogadosIndiv(cx){ return abogadosDe(cx).map(a=>buildAbogadoIndiv(a)||a.nombre||'').filter(Boolean).join('; y '); }
function abogadosNombres(cx){ const l=abogadosDe(cx).map(a=>a.nombre).filter(Boolean); return l.length>1 ? l.slice(0,-1).join(', ')+' y '+l[l.length-1] : (l[0]||''); }
function nAbogados(cx){ return abogadosDe(cx).length; }
function resolveTokens(text,cx){ const {map,gen}=redCtx(cx); let t=text||''; t=t.replace(/\{\{\s*(\w+)\s*:\s*([^}]+?)\s*\}\}/g,(m,key,word)=> pickGender(word.trim(), gen[key]||'m')); t=t.replace(/\{\{\s*([\w.]+)\s*\}\}/g,(m,k)=> (map[k]!=null && map[k]!=='') ? map[k] : m); return t; }
function findCliente(id){ return CLIENTES.find(c=>String(c.id)===String(id)); }
function findEmpresa(id){ return EMPRESAS.find(e=>String(e.id)===String(id)); }
function migrateClientes(){
  CLIENTES.forEach(c=>{ if(!c.tipo) c.tipo='natural'; });
  if(EMPRESAS && EMPRESAS.length){
    EMPRESAS.forEach(em=>{ if(findCliente(em.id)) return; const rep=findCliente(em.clienteId); CLIENTES.push({ id:em.id, tipo:'juridica', nombre:em.razonSocial||'', rut:em.rut||'', domicilio:em.domicilio||'', correo:em.correo||'', apodo:'', giro:em.giro||'', representante:rep?rep.nombre:'', rutRepresentante:rep?rep.rut:'', cargoRepresentante:em.cargo||'Representante Legal', created:em.created||Date.now(), updated:Date.now() }); });
    EMPRESAS.length=0;
  }
  EXPEDIENTES.forEach(e=>{ const red=e.red||{}; if(!e.clienteId){ e.clienteId = red.empresaId || red.clienteId || ''; } });
}
function causasDeCliente(id){ return EXPEDIENTES.filter(e=>String(e.clienteId)===String(id)); }
function modCab(m){ return m.cabecera||m.suma||''; }
const ORDINAL_OTROSI=['','PRIMER','SEGUNDO','TERCER','CUARTO','QUINTO','SEXTO','SÉPTIMO','OCTAVO','NOVENO','DÉCIMO','UNDÉCIMO','DUODÉCIMO','DECIMOTERCER','DECIMOCUARTO','DECIMOQUINTO','DECIMOSEXTO','DECIMOSÉPTIMO','DECIMOCTAVO','DECIMONOVENO','VIGÉSIMO','VIGÉSIMO PRIMER','VIGÉSIMO SEGUNDO','VIGÉSIMO TERCER','VIGÉSIMO CUARTO','VIGÉSIMO QUINTO'];
function otrosiOrdinal(n){ return ORDINAL_OTROSI[n] || (ORDINAL_OTROSI[20]+' '+(ORDINAL_OTROSI[n-20]||(''+n))); }
function _upperNoTokens(s){ return String(s||'').replace(/\{\{[^}]+\}\}|[^{}]+/g, seg => seg.indexOf('{{')===0?seg:seg.toUpperCase()); }
function buildSuma(mods){ if(!mods.length) return ""; if(mods.length===1) return '[[B]]'+_upperNoTokens(modCab(mods[0]))+'.-[[/B]]'; const[p,...r]=mods; const otr=r.map((m,i)=> r.length===1 ? `[[B]]EN EL OTROSÍ:[[/B]] ${modCab(m)}` : `[[B]]EN EL ${otrosiOrdinal(i+1)} OTROSÍ:[[/B]] ${modCab(m)}`); return `[[B]]EN LO PRINCIPAL:[[/B]] ${modCab(p)}; ${otr.join("; ")}.-`; }
const CAUSA_DEFAULT='{{materia}}|causa Rol [[B]]{{rol}}[[/B]]|caratulado "[[B]]{{caratula}}[[/B]]"';
function causaTplStr(){ return STATE.causaTpl||CAUSA_DEFAULT; }
function buildCausaStr(cx){
  if(!cx) return "[causa]";
  const data={ materia: cx.materia||'', submateria: cx.submateria||'', tipo: cx.tipo||'', rol: cx.rol||'', caratula: cx.caratula||'', tribunal: cx.tribunal||'' };
  const segs=String(causaTplStr()).split('|').map(s=>s.trim()).filter(Boolean).map(seg=>{ const toks=(seg.match(/\{\{\s*[a-zA-Z]+\s*\}\}/g)||[]).map(m=>m.replace(/[{}\s]/g,'')); if(toks.length && toks.every(t=>!String(data[t]||'').trim())) return ''; return seg.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g,(m,k)=>data[k]!==undefined?data[k]:'').replace(/\s+/g,' ').trim(); }).filter(Boolean);
  return segs.join(", ");
}
const COMPARECE_DEFAULT={ poder:'{{abogado}}, {{calidad}} por la parte {{rol}}', mandato:'{{abogado}}, {{calidad}}, en virtud del mandato judicial conferido, por la parte {{rol}}', cliente:'{{cliente}}, {{rol}}' };
function compareceTpl(){ return Object.assign({}, COMPARECE_DEFAULT, STATE.compareceTpl||{}); }
function buildCompareciente(cx){
  const perfil=STATE.perfilAbogado||{};
  if(!cx) return perfil.nombre||"[COMPARECIENTE]";
  const rol = cx.rolProcesal||"demandante"; const T=compareceTpl();
  if(cx.tienePoder){ return fillMarkers(cx.mandato?T.mandato:T.poder, {abogado:perfil.nombre||"[ABOGADO]", rol, calidad:(perfil.cargo||'abogado').toLowerCase()}); }
  const cliIds=_clienteIds(cx); const clis=cliIds.map(findCliente).filter(Boolean);
  if(!clis.length) return "[CLIENTE]";
  const ind = (clis.length>1 ? buildIndividualizacionGroup(clis) : buildIndividualizacion(clis[0])) || "[CLIENTE]";
  const rolOut = (clis.length>1 && !/s$/i.test(rol)) ? rol+'s' : rol;
  return fillMarkers(T.cliente, {cliente:ind, rol:rolOut});
}
function _sinDon(ind){ return String(ind||'').replace(/(^|;\s*(?:y\s+)?)(?:don|doña|dona)\s+/gi, '$1'); }
function buildPYP(p){ return `Solicito tener presente que confiero patrocinio y poder al abogado/a ${p.nombre||"[abogado]"}${p.rut?`, RUT ${p.rut}`:""}${p.domicilio?`, domicilio en ${p.domicilio}`:""}.`; }
function buildNotif(p){ return `Señalo domicilio para notificaciones${p.email?` y correo ${p.email}`:""}${p.domicilio?` en ${p.domicilio}`:" el señalado en autos"}.`; }
function buildOtroSiPobreza(){ return `Solicito se me conceda el beneficio de privilegio de pobreza, por carecer de los medios necesarios para litigar.`; }
function escRx(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
function fillVars(text,m,v){ let t=text||""; (m.variables||[]).forEach(x=>{ const id=x.id; if(!id)return; const val=(v&&v[id]); const rep=(val!=null&&val!=='')?val:`{{${id}}}`; t=t.replace(new RegExp(`\\{\\{\\s*${escRx(id)}\\s*\\}\\}|\\[${escRx(id)}\\]`,"g"), rep); }); return t; }
function buildCuerpoModelo(m,v){ return fillVars(m.cuerpo, m, v); }
function buildPortantoModelo(m,v){ return fillVars(m.pie!==undefined?m.pie:m.portanto, m, v); }
function buildCuerpoOtrosi(m,v){ const c=buildCuerpoModelo(m,v); const pt=buildPortantoModelo(m,v); return `${c}\n\nPOR TANTO,\nSOLICITO A U.S., ${pt.replace(/^A U\.S\. solicito /i,"")}`; }
function generarEscritoTexto(cx, escs){
  const mA=escs.map(e=>({m:MODELOS.find(x=>x.id===e.modeloId), v:e.vars})).filter(x=>x.m);
  if(!mA.length) return "";
  mA.sort((a,b)=>((a.m.esOtrosi?1:0)-(b.m.esOtrosi?1:0)));
  ensureTiposDoc();
  const tipo = tipoOfModel(mA[0].m) || {motor:'judicial'};
  const motor = tipo.motor||'judicial';
  const partes = (tipo.partes&&tipo.partes.length)?tipo.partes:defaultPartes(tipo);
  const p0=mA[0]; const vals={};
  if(motor==='documental'){
    const fv=txt=>fillVars(txt,p0.m,p0.v);
    vals.titulo=fv(p0.m.cabecera||p0.m.encabezado||''); vals.cuerpo=fv(p0.m.cuerpo||''); vals.pie=fv(p0.m.pie||'');
  } else {
    vals.compareciente=buildCompareciente(cx); vals.causa=buildCausaStr(cx); vals.titulo=buildSuma(mA.map(x=>x.m));
    const nOtro=mA.length-1; const getOrd=i=> nOtro<=1 ? 'OTROSÍ' : (otrosiOrdinal(i+1)+' OTROSÍ'); let numO=0;
    const conPT = (cx.otrosiPT!==undefined)?cx.otrosiPT:(STATE.otrosiPorTanto!==false);
    const ptPart = partes.find(p=>p.key==='portanto')||{}; const ptTpl = ptPart.texto || 'POR TANTO,\nSOLICITO A U.S., {{portanto}}';
    const cuerpoPieza=(m,v)=>{ const plural = m.esPatrocinio && nAbogados(cx)>1 && (m.cuerpoPlural||'').trim(); return fillVars(plural?m.cuerpoPlural:m.cuerpo, m, v); };
    const otroTpl = (partes.find(p=>p.key==='otrosies')||{}).texto || '{{contenido}}';
    const oEsc=mA.slice(1).map(({m,v})=>{ const c=cuerpoPieza(m,v); let cuerpo=fillMarkers(otroTpl, {contenido:c}); if(conPT){ const pt=fillVars(m.pie!==undefined?m.pie:m.portanto, m, v); cuerpo=`${cuerpo}\n\n${fillMarkers(ptTpl, {portanto: pt.replace(/^A U\.S\. solicito /i,'')})}`; } const b=`[[B]]${getOrd(numO)}:[[/B]] ${cuerpo}`; numO++; return b; });
    vals.cuerpo=cuerpoPieza(p0.m,p0.v); vals.portantoRaw=buildPortantoModelo(p0.m,p0.v); vals.otrosies=oEsc.join("\n\n"); vals.tribunal=cx.tribunal||'';
  }
  const blocks=[];
  partes.filter(pt=>pt.on!==false).forEach(pt=>{
    let txt='';
    switch(pt.key){
      case 'presuma': { const lns=(pt.rows||[]).map((r,ri)=>{ const v=r.token?r.token:((cx.presumaVals&&cx.presumaVals['r'+ri])||''); return `${r.label}: ${v}`; }); txt=lns.length?('[[PRESUMA]]\n'+lns.join("\n")+'\n[[/PRESUMA]]'):''; break; }
      case 'titulo': txt=fillMarkers(pt.texto||'{{contenido}}', {contenido:vals.titulo||''}); break;
      case 'tribunal': txt=fillMarkers(pt.texto||'{{contenido}}', {contenido:(tribunalHeading(cx.tribunal)||vals.tribunal||cx.tribunal||'')}); break;
      case 'comparecencia': txt=fillMarkers(pt.texto||'{{compareciente}} en autos sobre {{causa}}, a U.S., respetuosamente digo:', {compareciente:vals.compareciente||'', causa:vals.causa||''}); break;
      case 'cuerpo': txt=fillMarkers(pt.texto||'{{contenido}}', {contenido:vals.cuerpo||''}); break;
      case 'portanto': if(cx.portantoManual){ txt=(cx.portantoTexto||'').trim(); } else txt=(vals.portantoRaw)?fillMarkers(pt.texto||'POR TANTO,\nSOLICITO A U.S., {{portanto}}', {portanto:(vals.portantoRaw||'').replace(/^A U\.S\. solicito /i,'')}):''; break;
      case 'otrosies': txt=vals.otrosies||''; break;
      case 'pie': txt=fillMarkers(pt.texto||'{{contenido}}', {contenido:vals.pie||''}); break;
    }
    if((txt||'').trim()){ if(pt.align) txt=`[[ALIGN:${pt.align}]]\n${txt}\n[[/ALIGN]]`; blocks.push(txt); }
  });
  return blocks.join("\n\n").replace(/\n{3,}/g,"\n\n").trimEnd();
}
function cxFromExpediente(e){
  const red=e.red||{};
  return { expId:e.id, rol:e.rol||e.rit||'', caratula:e.name||e.cliente||'', tribunal:e.tribunal||'', area:e.tipo||'', materia:e.materia||'', tipo:e.tipo||'', submateria:'', tienePoder:(e.tienePoder!==undefined?!!e.tienePoder:!!red.tienePoder), rolProcesal:e.rolProcesal||red.rolProcesal||'demandante', clienteId:e.clienteId||red.clienteId||'', clienteIds:(e.clienteIds&&e.clienteIds.length?e.clienteIds.slice():(e.clienteId?[e.clienteId]:[])), esCAJ:(e.esCAJ!==undefined?!!e.esCAJ:!!red.esCAJ) };
}
