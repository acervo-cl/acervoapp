function applyLibraryData(d) {
  d = d || {};
  SUBJECTS.length = 0;    (d.subjects || []).forEach(s => SUBJECTS.push(s));
  DOCUMENTS.length = 0;   (d.documents || []).forEach(x => DOCUMENTS.push(x));
  ANNOTATIONS.length = 0; (d.annotations || []).forEach(a => ANNOTATIONS.push(a));
  APUNTES.length = 0;     (d.apuntes || []).forEach(a => APUNTES.push(a));
  EXPEDIENTES.length = 0; (d.expedientes || []).forEach(e => EXPEDIENTES.push(e));
  EXDOCS.length = 0;      (d.exdocs || []).forEach(x => EXDOCS.push(x));
  DOCUMENTOS.length = 0;  (d.documentos || []).forEach(x => DOCUMENTOS.push(x));
  STATE.favorites = new Set(d.favorites || []);
  STATE.docOrder = d.docOrder || [];
  STATE.readingLists = d.readingLists || [];
  mmPos = d.mmPos || {};
  centerLabel = d.centerLabel || 'TU SEGUNDO CEREBRO';
  STATE.mmExpanded = new Set(d.mmExpanded || []);
  STATE.annOrder = d.annOrder || {};
  STATE.bookPos = d.bookPos || {};
  STATE.flashcards = d.flashcards || [];
  STATE.sessions = d.sessions || [];
  STATE.goal = d.goal || { date: null, label: '' };
  STATE.bookmarks = d.bookmarks || {};
  STATE.lastScroll = d.lastScroll || {};
  MODELOS.length = 0; (d.modelos || []).forEach(m => MODELOS.push(m));
  CLIENTES.length = 0; (d.clientes || []).forEach(c => CLIENTES.push(c));
  EMPRESAS.length = 0; (d.empresas || []).forEach(e => EMPRESAS.push(e));
  STATE.perfilAbogado = Object.assign({ nombre: '', rut: '', domicilio: '', email: '', cargo: 'Abogado' }, d.perfilAbogado || {});
  STATE.indivTpl = d.indivTpl || null;
  STATE.tabs = Array.isArray(d.tabs) ? d.tabs : [];
  STATE.tabActive = d.tabActive || null;
  STATE.redaccionDraft = d.redaccionDraft || null;
  STATE.redFormat = Object.assign({ font: 'Times New Roman', size: 12, lineHeight: 1.5, align: 'justify' }, d.redFormat || {});
  STATE.membrete = Object.assign({ logo: '', pie: '' }, d.membrete || {});
  STATE.expView = d.expView || 'grid';
  STATE.recordatorios = d.recordatorios || [];
  STATE.todos = d.todos || [];
  STATE.copias = d.copias || [];
  STATE.papelera = d.papelera || [];
  STATE.railNotes = typeof d.railNotes === 'string' ? d.railNotes : '';
  STATE.railCfg = Object.assign({ monitor: true, recordatorios: true, notas: true, hoy: true, favoritos: false, repasar: false }, d.railCfg || {});
  TIPOSDOC.length = 0; (d.tiposDoc || []).forEach(t => TIPOSDOC.push(t));
  ensureModelos();
  migrateClientes();
  if (d.mmWidth) STATE.mmWidth = d.mmWidth;
}

async function populateLibSwitcher() {
  const sel = document.getElementById('lib-switcher');
  if (!sel || !STATE.isAdmin) return;
  if (!STATE.profiles.length) {
    try {
      const { data } = await sb.from('profiles').select('id,email,role').order('email');
      STATE.profiles = data || [];
    } catch (e) {}
  }
  const others = STATE.profiles.filter(p => p.id !== STATE.uid)
    .map(p => `<option value="${p.id}">👤 ${escapeHtml(p.email || '(sin correo)')}</option>`).join('');
  sel.innerHTML = `<option value="${STATE.uid}">📚 Mi biblioteca</option>${others}`;
  sel.value = STATE.viewingUid || STATE.uid;
}

async function onLibSwitch(uid) {
  if (!uid || uid === STATE.uid) return backToMyLibrary();
  await viewUserLibrary(uid);
}

async function viewUserLibrary(uid) {
  if (!STATE.isAdmin) return;
  const prof = STATE.profiles.find(p => p.id === uid);
  const { data, error } = await sb.from('acervo_state').select('data').eq('user_id', uid).maybeSingle();
  if (error) { toast('No se pudo cargar la biblioteca: ' + error.message, 'error'); return; }
  STATE.viewingUid = uid;
  STATE.viewingEmail = prof ? (prof.email || '(usuario)') : '(usuario)';
  STATE.viewingRaw = (data && data.data) ? data.data : {};
  STATE.editOther = false;
  applyLibraryData(STATE.viewingRaw);
  STATE.currentDocId = null;
  buildSearchIndex();
  renderAll();
  goToApp();
  goHome();
  showLibBanner();
  const sel = document.getElementById('lib-switcher');
  if (sel) sel.value = uid;
  toast('Viendo la biblioteca de ' + STATE.viewingEmail);
}

async function backToMyLibrary() {
  if (!STATE.viewingUid) { hideLibBanner(); return; }
  STATE.viewingUid = null;
  STATE.viewingEmail = '';
  STATE.viewingRaw = null;
  STATE.editOther = false;
  await loadState();
  await loadSharedBooks();
  STATE.currentDocId = null;
  buildSearchIndex();
  renderAll();
  goToApp();
  goHome();
  hideLibBanner();
  const sel = document.getElementById('lib-switcher');
  if (sel) sel.value = STATE.uid;
}

function toggleEditOther() {
  if (!STATE.viewingUid) return;
  STATE.editOther = !STATE.editOther;
  showLibBanner();
  toast(
    STATE.editOther
      ? '✏️ Modo edición: tus cambios se guardan en la biblioteca de ' + STATE.viewingEmail
      : '🔒 Solo lectura',
    'success'
  );
}

function showLibBanner() {
  const b = document.getElementById('lib-banner');
  if (!b) return;
  const editing = STATE.editOther;
  b.querySelector('#lib-banner-email').textContent = STATE.viewingEmail;
  b.querySelector('#lib-banner-mode').textContent = editing ? '· EDITANDO' : '· solo lectura';
  b.querySelector('#lib-banner-toggle').textContent = editing ? '🔒 Pasar a solo lectura' : '✏️ Editar';
  b.classList.toggle('editing', editing);
  b.classList.add('show');
  document.body.classList.add('viewing-other');
}

function hideLibBanner() {
  const b = document.getElementById('lib-banner');
  if (b) b.classList.remove('show');
  document.body.classList.remove('viewing-other');
}
