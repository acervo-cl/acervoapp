let _rtChannel = null;
let _rtTimer = null;
let _rtPoll = null;
let _rtBusy = false;
let _rtSig = null;
let _rtMasterT = null;

function _rtSignature() {
  try {
    return JSON.stringify([
      EXPEDIENTES.filter((e) => e.shared).map((e) => e.id).sort(),
      DOCUMENTS.concat(APUNTES, DOCUMENTOS).filter((d) => d.sharedDoc).map((d) => d.id).sort(),
      (typeof _connections !== 'undefined' ? _connections : []).map((c) => `${String(c.id)}:${c.status || ''}`).sort(),
      STATE.flashcards.length,
    ]);
  } catch (_) {
    return Math.random().toString();
  }
}

function _rtRefresh() {
  clearTimeout(_rtTimer);
  _rtTimer = setTimeout(async () => {
    if (typeof sb === 'undefined' || !sb || !STATE.uid || STATE.viewingUid) return;
    if (_rtBusy) return;
    _rtBusy = true;
    try {
      await loadSharedCausas();
      await loadSharedDocs();
      await loadConnections();
      const sig = _rtSignature();
      const changed = sig !== _rtSig;
      if (changed) {
        const ms = document.getElementById('modal-social');
        if (ms && ms.classList.contains('open')) {
          try {
            renderSocial();
          } catch (_) {}
        }
        const modalOpen = !!document.querySelector('.modal.open');
        const rs = document.getElementById('reader-screen');
        const reading = rs && rs.classList.contains('active');
        if (!modalOpen && !reading) {
          _rtSig = sig;
          try {
            buildSearchIndex();
          } catch (_) {}
          try {
            renderAll();
          } catch (_) {}
        }
      }
    } catch (_) {}
    _rtBusy = false;
  }, 800);
}

function _rtMaster() {
  if (STATE.isAdmin) return;
  clearTimeout(_rtMasterT);
  _rtMasterT = setTimeout(async () => {
    if (typeof sb === 'undefined' || !sb) return;
    try {
      const { data } = await sb.from('acervo_master').select('data').eq('id', 'master').maybeSingle();
      if (data && data.data) {
        applyMasterToSession(data.data);
        try {
          ensureModelos();
        } catch (_) {}
        const rv = document.getElementById('view-redactar');
        if (rv && rv.classList.contains('active')) {
          try {
            renderRedactarList();
          } catch (_) {}
        }
        toast('Se actualizaron las plantillas del estudio', 'success');
      }
    } catch (_) {}
  }, 700);
}

function startRealtime() {
  if (typeof sb === 'undefined' || !sb || !STATE.uid) return;
  stopRealtime();
  try {
    _rtChannel = sb.channel(`acervo-rt-${STATE.uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_docs' }, _rtRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_doc_members' }, _rtRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_causas' }, _rtRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shared_causa_members' }, _rtRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'acervo_connections' }, _rtRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'acervo_master' }, _rtMaster)
      .subscribe();
  } catch (e) {
    console.warn('realtime', e);
  }
  clearInterval(_rtPoll);
  _rtPoll = setInterval(() => {
    if (document.visibilityState === 'visible') _rtRefresh();
  }, 30000);
}

function stopRealtime() {
  try {
    if (_rtChannel) sb.removeChannel(_rtChannel);
  } catch (_) {}
  _rtChannel = null;
  clearInterval(_rtPoll);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') _rtRefresh();
});
