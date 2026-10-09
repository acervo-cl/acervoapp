const _SYNC_DEFAULTS = {
  status: 'idle',
  source: 'none',
  pending: false,
  remoteExists: false,
  localUpdatedAt: null,
  remoteUpdatedAt: null,
  lastError: '',
};

function _syncMeta() {
  if (!STATE.sync || typeof STATE.sync !== 'object') STATE.sync = {};
  Object.keys(_SYNC_DEFAULTS).forEach((key) => {
    if (STATE.sync[key] === undefined) STATE.sync[key] = _SYNC_DEFAULTS[key];
  });
  return STATE.sync;
}

function _renderSyncIndicator() {
  const el = document.getElementById('sync-status');
  if (!el) return;
  const sync = _syncMeta();
  const labels = {
    idle: 'Sin sincronizar',
    loading: 'Cargando',
    local: 'Solo en este equipo',
    pending: 'Pendiente de sincronizar',
    synced: 'Sincronizado',
    error: 'Error de sincronización',
    conflict: 'Conflicto de sincronización',
  };
  const label = labels[sync.status] || labels.idle;
  el.className = `sync-status ${sync.status}`;
  el.title = sync.lastError ? `${label}: ${sync.lastError}` : label;
  const text = el.querySelector('.sync-status-label');
  if (text) text.textContent = label;
}

function _setSync(patch) {
  Object.assign(_syncMeta(), patch || {});
  _renderSyncIndicator();
}

function _payloadWithSync(payload, patch) {
  const sync = _syncMeta();
  return Object.assign({}, payload, {
    syncMeta: Object.assign({
      version: 1,
      localUpdatedAt: sync.localUpdatedAt || null,
      remoteUpdatedAt: sync.remoteUpdatedAt || null,
      pending: !!sync.pending,
    }, patch || {}),
  });
}

async function _writeLocalCache(payload) {
  let idbOk = false;
  try {
    await idbPut('kmic_data', payload);
    await idbPut('kmic_uid', STATE.uid || '');
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
    syncMeta: {
      version: 1,
      localUpdatedAt: _syncMeta().localUpdatedAt || null,
      remoteUpdatedAt: _syncMeta().remoteUpdatedAt || null,
      pending: !!_syncMeta().pending,
    },
  };
}

let _persistT = null;
let _saveWarned = false;
let _persistBusy = false;
let _persistAgain = false;
let _retrySyncT = null;
let _syncConflict = null;

function saveState() {
  if (STATE.viewingUid && !STATE.editOther) return;
  if (!STATE.viewingUid) {
    _setSync({
      status: 'pending',
      pending: true,
      localUpdatedAt: new Date().toISOString(),
      lastError: '',
    });
  }
  clearTimeout(_persistT);
  _persistT = setTimeout(_persistNow, 350);
  syncMaster();
  if (typeof syncSharedShelfIndexIfMine === 'function') syncSharedShelfIndexIfMine();
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

function _syncConflictError(message) {
  const error = new Error(message || 'La nube cambió antes de guardar.');
  error.code = 'SYNC_CONFLICT';
  return error;
}

async function _writeCloudState(uid, payload, remoteUpdatedAt) {
  const sync = _syncMeta();
  const row = {user_id: uid, data: payload, updated_at: remoteUpdatedAt};

  if (!sync.remoteExists) {
    const {data, error} = await sb
      .from('acervo_state')
      .insert(row)
      .select('updated_at')
      .maybeSingle();
    if (error) {
      if (error.code === '23505') throw _syncConflictError();
      throw error;
    }
    if (!data) throw _syncConflictError();
    return data;
  }

  let query = sb
    .from('acervo_state')
    .update({data: payload, updated_at: remoteUpdatedAt})
    .eq('user_id', uid);
  query = sync.remoteUpdatedAt === null || sync.remoteUpdatedAt === undefined
    ? query.is('updated_at', null)
    : query.eq('updated_at', sync.remoteUpdatedAt);
  const {data, error} = await query.select('updated_at').maybeSingle();
  if (error) throw error;
  if (!data) throw _syncConflictError();
  return data;
}

async function _loadRemoteForConflict(uid) {
  const {data, error} = await sb
    .from('acervo_state')
    .select('data,updated_at')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function _showSyncConflict(uid, localPayload) {
  let remote = null;
  try {
    remote = await _loadRemoteForConflict(uid);
  } catch (_) {}
  _syncConflict = {
    uid,
    localPayload,
    remoteData: remote && remote.data ? remote.data : null,
    remoteUpdatedAt: remote ? (remote.updated_at || null) : null,
    remoteExists: remote ? true : _syncMeta().remoteExists,
  };
  _setSync({
    status: 'conflict',
    source: 'local',
    pending: true,
    remoteExists: remote ? true : _syncMeta().remoteExists,
    remoteUpdatedAt: remote ? (remote.updated_at || null) : _syncMeta().remoteUpdatedAt,
    lastError: 'Otro dispositivo guardó cambios antes que este equipo.',
  });
  const stamp = document.getElementById('sync-conflict-remote-time');
  if (stamp) stamp.textContent = remote && remote.updated_at ? remote.updated_at : 'fecha no disponible';
  if (typeof openModal === 'function') openModal('modal-sync-conflict');
  else toast('Hay cambios de otro dispositivo. Revisa la sincronización.', 'error');
}

function closeSyncConflict() {
  closeAllModals();
}

function exportSyncConflict() {
  if (!_syncConflict) return;
  const contents = JSON.stringify({
    exportedAt: new Date().toISOString(),
    local: _syncConflict.localPayload,
    remote: _syncConflict.remoteData,
  }, null, 2);
  const blob = new Blob([contents], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `acervo-sync-conflict-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast('Se exportaron ambas versiones', 'success');
}

async function resolveSyncConflict(choice) {
  if (!_syncConflict) return;
  const conflict = _syncConflict;
  if (choice === 'export') {
    exportSyncConflict();
    return;
  }
  if (choice === 'remote') {
    if (conflict.remoteData) {
      await _writeLocalCache(Object.assign({}, conflict.remoteData, {
        syncMeta: {
          version: 1,
          localUpdatedAt: _syncMeta().localUpdatedAt || null,
          remoteUpdatedAt: conflict.remoteUpdatedAt,
          pending: false,
        },
      }));
    }
    _syncConflict = null;
    closeAllModals();
    await loadState();
    try { await _writeLocalCache(_payloadWithSync(_statePayload(), {pending: false})); } catch (_) {}
    try { renderAll(); } catch (_) {}
    toast('Se conservó la versión de la nube', 'success');
    return;
  }
  if (choice === 'local') {
    _syncConflict = null;
    _setSync({
      status: 'pending',
      pending: true,
      remoteExists: conflict.remoteExists,
      remoteUpdatedAt: conflict.remoteUpdatedAt,
      lastError: '',
    });
    closeAllModals();
    await _persistNow();
    if (_syncMeta().status === 'synced') toast('Se conservó la versión de este equipo', 'success');
  }
}

async function _persistNow() {
  if (_persistBusy) {
    _persistAgain = true;
    return;
  }
  _persistBusy = true;
  const editingOther = !!(STATE.viewingUid && STATE.editOther);
  const targetUid = editingOther ? STATE.viewingUid : STATE.uid;
  const payload = editingOther ? buildViewingPayload() : _statePayload();

  try {
    if (!editingOther) {
      await _writeLocalCache(_payloadWithSync(payload, {pending: true}));
    }

    if (targetUid) {
      const remoteUpdatedAt = new Date().toISOString();
      const cloudPayload = editingOther
        ? payload
        : _payloadWithSync(payload, {pending: false, remoteUpdatedAt});
      try {
        if (editingOther) {
          const {error} = await sb
            .from('acervo_state')
            .upsert({user_id: targetUid, data: cloudPayload, updated_at: remoteUpdatedAt});
          if (error) throw error;
        } else {
          await _writeCloudState(targetUid, cloudPayload, remoteUpdatedAt);
        }
        if (!editingOther) {
          _setSync({status: 'synced', source: 'remote', pending: false, remoteExists: true, remoteUpdatedAt, lastError: ''});
          await _writeLocalCache(_payloadWithSync(_statePayload(), {pending: false, remoteUpdatedAt}));
        }
      } catch (error) {
        if (!editingOther) {
          const localPayload = _payloadWithSync(_statePayload(), {pending: true});
          if (error && error.code === 'SYNC_CONFLICT') {
            await _writeLocalCache(localPayload);
            await _showSyncConflict(targetUid, localPayload);
          } else {
            _setSync({status: 'error', source: 'local', pending: true, lastError: error && error.message ? error.message : 'No se pudo guardar en la nube.'});
            await _writeLocalCache(localPayload);
          }
        }
        console.warn('Sin conexión a la nube; guardado solo local.', error);
      }
    }
  } finally {
    _persistBusy = false;
    if (_persistAgain) {
      _persistAgain = false;
      clearTimeout(_persistT);
      _persistT = setTimeout(_persistNow, 0);
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
  STATE.sync = Object.assign({}, _SYNC_DEFAULTS);
  _syncConflict = null;
  try {
    mmPos = {};
  } catch (_) {}
}

async function loadState() {
  resetLibraryFresh();
  _setSync({status: 'loading', source: 'none', pending: false, remoteExists: false, localUpdatedAt: null, remoteUpdatedAt: null, lastError: ''});
  try {
    let data = null;
    let dataSource = 'none';
    let remoteReadFailed = false;
    let remoteUpdatedAt = null;
    let remoteExists = false;
    let remoteRecord = null;
    let localData = null;
    let localSource = 'none';
    let pendingRemoteConflict = null;

    const cachedUid = localStorage.getItem('kmic_uid');
    const cacheOk = !STATE.uid || !cachedUid || cachedUid === STATE.uid;
    if (cacheOk) {
      try {
        const idbUid = await idbGet('kmic_uid');
        if (!STATE.uid || !idbUid || idbUid === STATE.uid) {
          localData = await idbGet('kmic_data');
          if (localData) localSource = 'indexeddb';
        }
      } catch (_) {}
    }
    if (!localData && cacheOk) {
      const raw = localStorage.getItem('kmic_data');
      if (raw) {
        localData = JSON.parse(raw);
        if (localData) localSource = 'localstorage';
      }
    }

    if (STATE.uid) {
      try {
        const { data: remote, error } = await sb
          .from('acervo_state')
          .select('data,updated_at')
          .eq('user_id', STATE.uid)
          .maybeSingle();
        if (error) throw error;
        remoteRecord = remote || null;
        remoteExists = !!remote;
        remoteUpdatedAt = remote ? (remote.updated_at || null) : null;
        if (remote && remote.data && Object.keys(remote.data).length) {
          data = remote.data;
          dataSource = 'remote';
        }
      } catch (error) {
        remoteReadFailed = true;
        console.warn('No se pudo leer de la nube; usando caché local.');
      }
    }

    const localSync = localData && localData.syncMeta && typeof localData.syncMeta === 'object'
      ? localData.syncMeta
      : {};
    const localPending = !!localSync.pending;
    const sameRemoteVersion = (localSync.remoteUpdatedAt || null) === (remoteUpdatedAt || null);
    if (localData && localPending && (!data || sameRemoteVersion)) {
      data = localData;
      dataSource = localSource;
    } else if (localData && localPending && dataSource === 'remote') {
      data = localData;
      dataSource = localSource;
      pendingRemoteConflict = remoteRecord;
    } else if (!data && localData) {
      data = localData;
      dataSource = localSource;
    }
    if (pendingRemoteConflict && !remoteRecord) {
      pendingRemoteConflict = null;
    }
    if (!data) {
      _setSync({
        status: remoteReadFailed ? 'error' : 'idle',
        source: 'none',
        pending: false,
        remoteExists,
        lastError: remoteReadFailed ? 'No se pudo leer Supabase; no hay caché disponible.' : '',
      });
      ensureModelos();
      migrateClientes();
      applyAppFont();
      return;
    }

    const cachedSync = data.syncMeta && typeof data.syncMeta === 'object' ? data.syncMeta : {};
    _setSync({
      status: pendingRemoteConflict ? 'conflict' : (dataSource === 'remote' ? 'synced' : (cachedSync.pending ? 'pending' : 'local')),
      source: dataSource,
      pending: dataSource === 'remote' ? false : !!cachedSync.pending,
      remoteExists,
      localUpdatedAt: cachedSync.localUpdatedAt || null,
      remoteUpdatedAt: remoteUpdatedAt || cachedSync.remoteUpdatedAt || null,
      lastError: pendingRemoteConflict
        ? 'Otro dispositivo guardó cambios antes que este equipo.'
        : (dataSource === 'remote' ? '' : (remoteReadFailed ? 'Trabajando con la copia local.' : '')),
    });
    if (dataSource !== 'remote' && cachedSync.pending && STATE.uid && !pendingRemoteConflict) {
      clearTimeout(_retrySyncT);
      _retrySyncT = setTimeout(retryPendingSync, 1000);
    }

    if (pendingRemoteConflict) {
      _syncConflict = {
        uid: STATE.uid,
        localPayload: data,
        remoteData: pendingRemoteConflict.data || null,
        remoteUpdatedAt: pendingRemoteConflict.updated_at || null,
        remoteExists: true,
      };
      const stamp = document.getElementById('sync-conflict-remote-time');
      if (stamp) stamp.textContent = pendingRemoteConflict.updated_at || 'fecha no disponible';
      if (typeof openModal === 'function') setTimeout(() => openModal('modal-sync-conflict'), 0);
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
  _renderSyncIndicator();
}

function retryPendingSync() {
  const sync = _syncMeta();
  if (!STATE.uid || STATE.viewingUid || !sync.pending || !navigator.onLine) return;
  clearTimeout(_retrySyncT);
  _retrySyncT = setTimeout(_persistNow, 100);
}

window.addEventListener('online', retryPendingSync);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') retryPendingSync();
});
