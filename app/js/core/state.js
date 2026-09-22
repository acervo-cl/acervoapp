function _statePayload() {
  return {
    subjects: SUBJECTS.filter((s) => String(s.id) !== '__shared__'),
    documents: DOCUMENTS.filter((d) => !d.shared),
    apuntes: APUNTES.filter((x) => !x.sharedDoc),
    expedientes: EXPEDIENTES.filter((e) => !e.shared),
    exdocs: EXDOCS.filter((x) => !x.shared),
    documentos: DOCUMENTOS.filter((x) => !x.sharedDoc),
    annotations: ANNOTATIONS.filter((a) => !a.shared),
    favorites: [...STATE.favorites],
    docOrder: STATE.docOrder,
    readingLists: STATE.readingLists,
    mmPos,
    centerLabel,
    mmExpanded: [...STATE.mmExpanded],
    annOrder: STATE.annOrder,
    bookPos: STATE.bookPos,
    flashcards: STATE.flashcards,
    importedPacks: STATE.importedPacks,
    streak: STATE.streak,
    studyMax: STATE.studyMax,
    mazos: STATE.mazos,
    seenSwipeTip: STATE.seenSwipeTip,
    sessions: STATE.sessions,
    goal: STATE.goal,
    bookmarks: STATE.bookmarks,
    lastScroll: STATE.lastScroll,
    pomo: STATE.pomo,
    readerFontPx: STATE.readerFontPx,
    noteFontPx: STATE.noteFontPx,
    hideAuthorNotes: STATE.hideAuthorNotes,
    hideOwnNotes: STATE.hideOwnNotes,
    lastOpened: STATE.lastOpened,
    mmWidth: STATE.mmWidth,
    unifiedOrder: STATE.unifiedOrder,
    users: STATE.users,
    modelos: MODELOS,
    clientes: CLIENTES,
    empresas: EMPRESAS,
    perfilAbogado: STATE.perfilAbogado,
    perfilAlertOff: STATE.perfilAlertOff,
    redaccionDraft: STATE.redaccionDraft,
    redFormat: STATE.redFormat,
    appFont: STATE.appFont,
    otrosiPorTanto: STATE.otrosiPorTanto,
    indivTpl: STATE.indivTpl,
    tribTipos: STATE.tribTipos,
    compareceTpl: STATE.compareceTpl,
    causaTpl: STATE.causaTpl,
    materias: STATE.materias,
    rolesProcesales: STATE.rolesProcesales,
    tabs: STATE.tabs,
    tabActive: STATE.tabActive,
    membrete: STATE.membrete,
    expView: STATE.expView,
    recordatorios: STATE.recordatorios,
    todos: STATE.todos,
    copias: STATE.copias,
    papelera: STATE.papelera,
    railNotes: STATE.railNotes,
    railCfg: STATE.railCfg,
    railW: STATE.railW,
    railOff: STATE.railOff,
    hiddenBooks: STATE.hiddenBooks,
    colaboradores: STATE.colaboradores,
    tiposComunidadReset: STATE.tiposComunidadReset,
    removedTiposDoc: STATE.removedTiposDoc,
    confidAccepted: STATE.confidAccepted,
    tiposDoc: TIPOSDOC,
  };
}

let _persistT = null;
let _saveWarned = false;

function saveState() {
  if (STATE.viewingUid && !STATE.editOther) return;
  clearTimeout(_persistT);
  _persistT = setTimeout(_persistNow, 350);
  syncMaster();
}

function buildViewingPayload() {
  const payload = Object.assign({}, STATE.viewingRaw || {});
  payload.subjects = SUBJECTS.filter((s) => String(s.id) !== '__shared__');
  payload.documents = DOCUMENTS.filter((d) => !d.shared);
  payload.apuntes = APUNTES.filter((x) => !x.sharedDoc);
  payload.expedientes = EXPEDIENTES.filter((e) => !e.shared);
  payload.exdocs = EXDOCS.filter((x) => !x.shared);
  payload.documentos = DOCUMENTOS.filter((x) => !x.sharedDoc);
  payload.annotations = ANNOTATIONS.filter((a) => !a.shared);
  payload.favorites = [...STATE.favorites];
  payload.docOrder = STATE.docOrder;
  payload.readingLists = STATE.readingLists;
  payload.mmPos = mmPos;
  payload.centerLabel = centerLabel;
  payload.mmExpanded = [...STATE.mmExpanded];
  payload.annOrder = STATE.annOrder;
  payload.bookPos = STATE.bookPos;
  payload.flashcards = STATE.flashcards;
  payload.sessions = STATE.sessions;
  payload.goal = STATE.goal;
  payload.bookmarks = STATE.bookmarks;
  payload.lastScroll = STATE.lastScroll;
  payload.modelos = MODELOS;
  payload.clientes = CLIENTES;
  payload.empresas = EMPRESAS;
  payload.perfilAbogado = STATE.perfilAbogado;
  payload.indivTpl = STATE.indivTpl;
  payload.redaccionDraft = STATE.redaccionDraft;
  payload.redFormat = STATE.redFormat;
  payload.membrete = STATE.membrete;
  payload.expView = STATE.expView;
  payload.recordatorios = STATE.recordatorios;
  payload.todos = STATE.todos;
  payload.copias = STATE.copias;
  payload.papelera = STATE.papelera;
  payload.railNotes = STATE.railNotes;
  payload.railCfg = STATE.railCfg;
  payload.tiposDoc = TIPOSDOC;
  payload.removedTiposDoc = STATE.removedTiposDoc;
  if (STATE.mmWidth) payload.mmWidth = STATE.mmWidth;
  return payload;
}

async function _persistNow() {
  const editingOther = !!(STATE.viewingUid && STATE.editOther);
  const targetUid = editingOther ? STATE.viewingUid : STATE.uid;
  const payload = editingOther ? buildViewingPayload() : _statePayload();

  if (!editingOther) {
    let idbOk = false;
    try {
      await idbPut('kmic_data', payload);
      idbOk = true;
    } catch (_) {}
    try {
      localStorage.setItem('kmic_data', JSON.stringify(payload));
      localStorage.setItem('kmic_uid', STATE.uid || '');
    } catch (_) {
      if (!idbOk && !_saveWarned) {
        _saveWarned = true;
        toast('No se pudo guardar localmente: almacenamiento lleno.', 'error');
      }
    }
  }

  if (targetUid) {
    try {
      const { error } = await sb
        .from('acervo_state')
        .upsert({ user_id: targetUid, data: payload, updated_at: new Date().toISOString() });
      if (error) console.warn('Guardado en nube falló:', error.message);
    } catch (_) {
      console.warn('Sin conexión a la nube; guardado solo local.');
    }
  }
}

function resetLibraryFresh() {
  [APUNTES, EXPEDIENTES, EXDOCS, DOCUMENTOS, MODELOS, CLIENTES, EMPRESAS, TIPOSDOC].forEach((arr) => {
    arr.length = 0;
  });
  SUBJECTS.length = 0;
  _SEED_SUBJECTS.forEach((x) => SUBJECTS.push(JSON.parse(JSON.stringify(x))));
  DOCUMENTS.length = 0;
  _SEED_DOCUMENTS.forEach((x) => DOCUMENTS.push(JSON.parse(JSON.stringify(x))));
  ANNOTATIONS.length = 0;
  _SEED_ANNOTATIONS.forEach((x) => ANNOTATIONS.push(JSON.parse(JSON.stringify(x))));
  STATE.favorites = new Set();
  STATE.mmExpanded = new Set();
  STATE.docOrder = [];
  STATE.readingLists = [];
  STATE.flashcards = [];
  STATE.sessions = [];
  STATE.bookmarks = {};
  STATE.lastScroll = {};
  STATE.annOrder = {};
  STATE.bookPos = {};
  STATE.recordatorios = [];
  STATE.todos = [];
  STATE.copias = [];
  STATE.papelera = [];
  STATE.hiddenBooks = [];
  STATE.tabs = [];
  STATE.tabActive = null;
  STATE.colaboradores = [];
  STATE.removedTiposDoc = [];
  STATE.redaccionDraft = null;
  STATE.lastOpened = null;
  STATE.users = [];
  STATE.perfilAbogado = { nombre: '', rut: '', domicilio: '', email: '', cargo: 'Abogado' };
  STATE.membrete = { logo: '', pie: '' };
  STATE.compareceTpl = null;
  STATE.causaTpl = null;
  STATE.materias = null;
  STATE.rolesProcesales = null;
  STATE.indivTpl = null;
  STATE.tribTipos = null;
  try {
    mmPos = {};
  } catch (_) {}
}

async function loadState() {
  resetLibraryFresh();
  try {
    let data = null;

    if (STATE.uid) {
      try {
        const { data: remote, error } = await sb
          .from('acervo_state')
          .select('data')
          .eq('user_id', STATE.uid)
          .maybeSingle();
        if (!error && remote && remote.data && Object.keys(remote.data).length) data = remote.data;
      } catch (_) {
        console.warn('No se pudo leer de la nube; usando caché local.');
      }
    }

    const cachedUid = localStorage.getItem('kmic_uid');
    const cacheOk = !STATE.uid || !cachedUid || cachedUid === STATE.uid;
    if (!data && cacheOk) {
      try {
        data = await idbGet('kmic_data');
      } catch (_) {}
    }
    if (!data && cacheOk) {
      const raw = localStorage.getItem('kmic_data');
      if (raw) data = JSON.parse(raw);
    }
    if (!data) {
      ensureModelos();
      migrateClientes();
      applyAppFont();
      return;
    }

    if (data.subjects) {
      SUBJECTS.length = 0;
      data.subjects.forEach((s) => SUBJECTS.push(s));
    }
    if (data.documents) {
      DOCUMENTS.length = 0;
      data.documents.forEach((x) => DOCUMENTS.push(x));
    }
    if (data.annotations) {
      ANNOTATIONS.length = 0;
      data.annotations.forEach((a) => ANNOTATIONS.push(a));
    }
    if (data.apuntes) {
      APUNTES.length = 0;
      data.apuntes.forEach((a) => APUNTES.push(a));
    } else {
      APUNTES.length = 0;
    }
    EXPEDIENTES.length = 0;
    (data.expedientes || []).forEach((e) => EXPEDIENTES.push(e));
    EXDOCS.length = 0;
    (data.exdocs || []).forEach((x) => EXDOCS.push(x));
    DOCUMENTOS.length = 0;
    (data.documentos || []).forEach((x) => DOCUMENTOS.push(x));
    if (data.favorites) STATE.favorites = new Set(data.favorites);
    if (data.docOrder) STATE.docOrder = data.docOrder;
    if (data.readingLists) STATE.readingLists = data.readingLists;
    if (data.mmPos) mmPos = data.mmPos;
    if (data.centerLabel) centerLabel = data.centerLabel;
    if (data.mmExpanded) STATE.mmExpanded = new Set(data.mmExpanded);
    if (data.annOrder) STATE.annOrder = data.annOrder;
    if (data.bookPos) STATE.bookPos = data.bookPos;
    if (data.flashcards) STATE.flashcards = data.flashcards;
    if (data.importedPacks) STATE.importedPacks = data.importedPacks;
    if (data.streak) STATE.streak = data.streak;
    if (data.studyMax !== undefined) STATE.studyMax = data.studyMax;
    if (data.mazos) STATE.mazos = data.mazos;
    if (data.seenSwipeTip) STATE.seenSwipeTip = true;
    if (data.sessions) STATE.sessions = data.sessions;
    if (data.goal) STATE.goal = data.goal;
    if (data.bookmarks) STATE.bookmarks = data.bookmarks;
    if (data.lastScroll) STATE.lastScroll = data.lastScroll;
    if (data.mmWidth) STATE.mmWidth = data.mmWidth;
    if (data.pomo) Object.assign(STATE.pomo, data.pomo);
    if (data.readerFontPx) STATE.readerFontPx = data.readerFontPx;
    if (data.noteFontPx) STATE.noteFontPx = data.noteFontPx;
    STATE.hideAuthorNotes = !!data.hideAuthorNotes;
    STATE.hideOwnNotes = !!data.hideOwnNotes;
    if (data.lastOpened) STATE.lastOpened = data.lastOpened;
    if (data.unifiedOrder) STATE.unifiedOrder = data.unifiedOrder;
    if (data.users) STATE.users = data.users;
    MODELOS.length = 0;
    (data.modelos || []).forEach((m) => MODELOS.push(m));
    CLIENTES.length = 0;
    (data.clientes || []).forEach((c) => CLIENTES.push(c));
    EMPRESAS.length = 0;
    (data.empresas || []).forEach((e) => EMPRESAS.push(e));
    if (data.perfilAbogado) Object.assign(STATE.perfilAbogado, data.perfilAbogado);
    if (typeof data.perfilAlertOff === 'boolean') STATE.perfilAlertOff = data.perfilAlertOff;
    if (data.redaccionDraft !== undefined) STATE.redaccionDraft = data.redaccionDraft;
    if (data.redFormat) Object.assign(STATE.redFormat, data.redFormat);
    if (typeof data.appFont === 'string') STATE.appFont = data.appFont;
    if (typeof data.otrosiPorTanto === 'boolean') STATE.otrosiPorTanto = data.otrosiPorTanto;
    if (data.indivTpl !== undefined) STATE.indivTpl = data.indivTpl;
    if (data.tribTipos !== undefined) STATE.tribTipos = data.tribTipos;
    if (data.compareceTpl !== undefined) STATE.compareceTpl = data.compareceTpl;
    if (data.causaTpl !== undefined) STATE.causaTpl = data.causaTpl;
    if (data.materias !== undefined) STATE.materias = data.materias;
    if (data.rolesProcesales !== undefined) STATE.rolesProcesales = data.rolesProcesales;
    if (Array.isArray(data.tabs)) {
      STATE.tabs = data.tabs;
      STATE.tabActive = data.tabActive || null;
    }
    if (Array.isArray(data.colaboradores)) STATE.colaboradores = data.colaboradores;
    if (Array.isArray(data.removedTiposDoc)) STATE.removedTiposDoc = data.removedTiposDoc;
    if (data.tiposComunidadReset) STATE.tiposComunidadReset = true;
    if (data.confidAccepted) STATE.confidAccepted = true;
    if (data.membrete) Object.assign(STATE.membrete, data.membrete);
    if (data.expView) STATE.expView = data.expView;
    if (data.recordatorios) STATE.recordatorios = data.recordatorios;
    if (data.todos) STATE.todos = data.todos;
    if (data.copias) STATE.copias = data.copias;
    if (data.papelera) STATE.papelera = data.papelera;
    if (typeof data.railNotes === 'string') STATE.railNotes = data.railNotes;
    if (data.railCfg) Object.assign(STATE.railCfg, data.railCfg);
    if (typeof data.railW === 'number') STATE.railW = data.railW;
    if (typeof data.railOff === 'boolean') STATE.railOff = data.railOff;
    if (Array.isArray(data.hiddenBooks)) STATE.hiddenBooks = data.hiddenBooks;
    TIPOSDOC.length = 0;
    (data.tiposDoc || []).forEach((t) => TIPOSDOC.push(t));
  } catch (_) {}
  ensureModelos();
  migrateClientes();
  applyAppFont();
}
