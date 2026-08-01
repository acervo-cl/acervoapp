function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const bottomNav = document.getElementById('mobile-bottomnav');
  if (bottomNav) bottomNav.classList.toggle('nav-show', id === 'app-screen');
  if (id !== 'app-screen' && id !== 'reader-screen') closeAvatarMenu();
  try {
    _setAppVHsoon();
  } catch (_) {}
}

const NAV = {
  estudio: {
    label: '📚 Estudio',
    def: 'estante',
    dashView: 'mapa',
    sections: [
      { key: 'libros', label: '📖 Libros', views: ['estante', 'grid', 'lista', 'kanban'], def: 'estante' },
      { key: 'documentos', label: '📄 Documentos', views: ['documentos'], def: 'documentos' },
      { key: 'apuntes', label: '📝 Apuntes', views: ['apuntes'], def: 'apuntes' },
      { key: 'flashcards', label: '🃏 Flashcards', views: ['flashcards'], def: 'flashcards' },
      { key: 'favoritos', label: '★ Favoritos', views: ['favoritos'], def: 'favoritos' },
    ],
  },
  agenda: {
    label: '📅 Agenda',
    def: 'agenda',
    dashView: 'agenda',
    sections: [{ key: 'agenda', label: '📅 Agenda', views: ['agenda'], def: 'agenda' }],
  },
  oficina: {
    label: '💼 Trabajo',
    def: 'expedientes',
    dashView: 'oficinadash',
    sections: [
      { key: 'causas', label: '📁 Causas', views: ['expedientes'], def: 'expedientes' },
      { key: 'clientes', label: '👥 Personas', views: ['clientes'], def: 'clientes' },
      { key: 'redaccion', label: '✍️ Redacción', views: ['redactar'], def: 'redactar' },
    ],
  },
};

function accessLevel() {
  if (STATE.isAdmin) return 'full';
  const perms = STATE.currentPerms || {};
  return perms.access === 'study' ? 'study' : 'full';
}

function spaceAllowed(space) {
  if (accessLevel() === 'full') return true;
  return space === 'inicio' || space === 'estudio' || space === 'agenda';
}

function applyAccessLevel() {
  const study = accessLevel() === 'study';
  document.body.classList.toggle('access-study', study);
  document.querySelectorAll('[data-sp="oficina"]').forEach((btn) => {
    btn.style.display = study ? 'none' : '';
  });
  if (study && !spaceAllowed(STATE.space || 'inicio')) {
    try {
      switchView('inicio');
    } catch (_) {}
  }
}

function dashViewOf(space) {
  return (NAV[space] && NAV[space].dashView) || `${space}dash`;
}

const VIEW_META = {
  inicio: ['🏠', 'Inicio'],
  estante: ['📖', 'Libros'],
  grid: ['📖', 'Libros'],
  lista: ['📖', 'Libros'],
  kanban: ['📖', 'Libros'],
  documentos: ['📄', 'Documentos'],
  apuntes: ['📝', 'Apuntes'],
  flashcards: ['🃏', 'Flashcards'],
  favoritos: ['★', 'Favoritos'],
  expedientes: ['📁', 'Causas'],
  agenda: ['📅', 'Agenda'],
  clientes: ['👥', 'Personas'],
  redactar: ['✍️', 'Redacción'],
  mapa: ['🗺️', 'Mapa'],
  progreso: ['📊', 'Progreso'],
  admin: ['⚙️', 'Admin'],
  estudiodash: ['📚', 'Estudio'],
  oficinadash: ['💼', 'Trabajo'],
};

let _tabNav = false;
let _tabNew = false;

function tabNueva() {
  _tabNew = true;
  switchView('inicio');
}

function touchTab(kind, ref, title, icon) {
  if (_tabNav || isMobile()) return;
  STATE.tabs = STATE.tabs || [];
  const key = `${kind}:${ref || ''}`;
  const existing = _tabNew ? null : STATE.tabs.find((x) => `${x.kind}:${x.ref || ''}` === key);
  if (existing) {
    if (title) {
      existing.title = title;
      existing.icon = icon || existing.icon;
    }
    STATE.tabActive = existing.id;
    _tabNew = false;
    saveState();
    renderTabs();
    return;
  }
  const active = _tabNew ? null : STATE.tabs.find((x) => x.id === STATE.tabActive);
  if (active) {
    active.kind = kind;
    active.ref = ref || '';
    active.title = title || '';
    active.icon = icon || '📄';
  } else {
    const tab = { id: `tb${Date.now()}${Math.floor(Math.random() * 999)}`, kind, ref: ref || '', title: title || '', icon: icon || '📄' };
    STATE.tabs.push(tab);
    STATE.tabActive = tab.id;
  }
  _tabNew = false;
  saveState();
  renderTabs();
}

function renderTabs() {
  const bar = document.getElementById('tabbar');
  if (!bar) return;
  const tabs = STATE.tabs || [];
  bar.classList.toggle('has', tabs.length > 0);
  bar.innerHTML =
    tabs
      .map(
        (tab) => `<div class="tabx ${tab.id === STATE.tabActive ? 'on' : ''}" onclick="tabGo('${tab.id}')" title="${escapeHtml(tab.title || '')}">
    <span>${tab.icon || '📄'}</span><span class="tabx-t">${escapeHtml((tab.title || '').slice(0, 26))}</span>
    <button class="tabx-x" onclick="event.stopPropagation();tabClose('${tab.id}')" title="Cerrar pestaña">✕</button></div>`,
      )
      .join('') + `<button class="tabx-add" onclick="tabNueva()" title="Nueva pestaña">＋</button>`;
}

function tabGo(id) {
  const tab = (STATE.tabs || []).find((x) => x.id === id);
  if (!tab) return;
  STATE.tabActive = id;
  saveState();
  _tabNav = true;
  try {
    if (tab.kind === 'doc') openReader(tab.ref);
    else if (tab.kind === 'causa') {
      switchView('expedientes');
      openExpediente(tab.ref);
    } else switchView(tab.ref);
  } finally {
    _tabNav = false;
  }
  renderTabs();
}

function tabClose(id) {
  const tabs = STATE.tabs || [];
  const index = tabs.findIndex((x) => x.id === id);
  if (index < 0) return;
  const wasActive = STATE.tabActive === id;
  tabs.splice(index, 1);
  if (wasActive) {
    const next = tabs[Math.min(index, tabs.length - 1)];
    STATE.tabActive = next ? next.id : null;
    saveState();
    renderTabs();
    if (next) tabGo(next.id);
    return;
  }
  saveState();
  renderTabs();
}

const LIBROS_VIEWS = [
  ['estante', '▤', 'Estante'],
  ['grid', '⊞', 'Carpetas'],
  ['lista', '☰', 'Lista'],
  ['kanban', '⬛', 'Kanban'],
];

function spaceOfView(view) {
  for (const space in NAV) {
    for (const section of NAV[space].sections) {
      if (section.views.includes(view)) return { space, section: section.key };
    }
  }
  return null;
}

function goSec(view, space) {
  if (space) STATE.space = space;
  switchView(view);
}

const _NAV_ICON_OF = {
  inicio: 'inicio',
  expedientes: 'expedientes',
  clientes: 'clientes',
  redactar: 'redactar',
  agenda: 'agenda',
  estante: 'estante',
  grid: 'estante',
  lista: 'estante',
  kanban: 'estante',
  documentos: 'documentos',
  favoritos: 'estante',
  apuntes: 'apuntes',
  flashcards: 'flashcards',
  estudiodash: 'estante',
  oficinadash: 'expedientes',
  mapa: 'inicio',
  progreso: 'inicio',
};

function highlightUnifiedNav() {
  const cur = document.querySelector('.view-panel.active');
  const view = cur ? cur.id.replace('view-', '') : '';
  const target = _NAV_ICON_OF[view] || view;
  document.querySelectorAll('#unified-nav .unav-btn').forEach((btn) => btn.classList.toggle('on', btn.dataset.view === target));
  const info = spaceOfView(view);
  let space = info ? info.space : null;
  if (!space) {
    for (const key in NAV) {
      if (dashViewOf(key) === view) {
        space = key;
        break;
      }
    }
  }
  if (!space) space = 'inicio';
  document.querySelectorAll('.mobile-bottomnav .pnav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.sp === space));
}

function openSpace(space) {
  if (!spaceAllowed(space)) {
    toast('Tu acceso es solo de Estudio', 'error');
    switchView('inicio');
    return;
  }
  if (space === 'inicio') {
    switchView('inicio');
    return;
  }
  const navSpace = NAV[space];
  if (!navSpace) return;
  STATE.space = space;
  const first = (navSpace.sections[0] || {}).def || dashViewOf(space);
  switchView(first);
}

function openSpaceDash(space) {
  STATE.space = space;
  switchView(dashViewOf(space));
}

function renderSubNav() {
  const bar = document.getElementById('sub-nav');
  if (!bar) return;
  const cur = document.querySelector('.view-panel.active');
  const curView = cur ? cur.id.replace('view-', '') : '';
  const info = spaceOfView(curView);
  let space = info ? info.space : null;
  if (!space) {
    for (const key in NAV) {
      if (dashViewOf(key) === curView) {
        space = key;
        break;
      }
    }
  }
  const activeSpace = space || 'inicio';
  document.querySelectorAll('.pnav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.sp === activeSpace));
  if (!space) {
    bar.classList.remove('show');
    bar.innerHTML = '';
    return;
  }
  const sections = NAV[space].sections;
  const isDash = curView === dashViewOf(space);
  let html = `<button class="snav-btn ${isDash ? 'on' : ''}" onclick="openSpaceDash('${space}')">◎ Todo</button>`;
  html += sections.map((section) => `<button class="snav-btn ${info && info.section === section.key ? 'on' : ''}" onclick="switchView('${section.def}')">${section.label}</button>`).join('');
  if (info && info.section === 'libros') {
    html += `<span class="snav-vsep"></span>${LIBROS_VIEWS.map(([view, icon, title]) => `<button class="snav-vbtn ${curView === view ? 'on' : ''}" title="${title}" onclick="switchView('${view}')">${icon}</button>`).join('')}`;
  }
  bar.innerHTML = html;
  bar.classList.add('show');
}

function switchView(name, btn) {
  if (!_readerFloat && document.getElementById('reader-screen').classList.contains('active')) goToApp();
  document.querySelectorAll('.view-panel').forEach((panel) => panel.classList.remove('active'));
  document.querySelectorAll('.view-btn').forEach((button) => button.classList.remove('active'));
  const panel = document.getElementById(`view-${name}`);
  if (panel) panel.classList.add('active');
  if (btn) btn.classList.add('active');
  if (name === 'inicio') renderInicio();
  if (name === 'estudiodash') renderEstudioDash();
  if (name === 'oficinadash') renderOficinaDash();
  if (name === 'admin') renderAdminList();
  if (name === 'flashcards') renderFlashcards();
  if (name === 'progreso') renderProgreso();
  if (name === 'apuntes') renderApuntes();
  if (name === 'expedientes') renderExpedientes();
  if (name === 'agenda') renderAgenda();
  if (name === 'redactar') {
    ensureModelos();
    _redView = 'chooser';
    renderRedactarList();
  }
  if (name === 'clientes') renderClientesTab();
  if (name === 'documentos') renderDocumentos();
  if (name === 'mapa') renderUnified();
  const info = spaceOfView(name);
  if (info) STATE.space = info.space;
  renderSubNav();
  highlightUnifiedNav();
  renderRail();
  const vm = VIEW_META[name];
  touchTab('view', name, vm ? vm[1] : name, vm ? vm[0] : '📄');
}

function dashCard(icon, title, sub, onclick) {
  return `<button class="dash-card" onclick="${onclick}"><div class="dash-ic">${icon}</div><div><div class="dash-t">${title}</div><div class="dash-s">${sub}</div></div></button>`;
}

function renderEstudioDash() {
  const host = document.getElementById('estudiodash-body');
  if (!host) return;
  const nLibros = DOCUMENTS.filter((d) => !d.shared).length;
  const nDocs = DOCUMENTOS.length;
  const nAp = APUNTES.length;
  const nDue = STATE.flashcards.filter(isDue).length;
  const nFav = [...STATE.favorites].length;
  host.innerHTML = `<div class="dash-grid">
    ${dashCard('📖', 'Libros', `${nLibros} en tu biblioteca`, "switchView('estante')")}
    ${dashCard('📄', 'Documentos', `${nDocs} PDF`, "switchView('documentos')")}
    ${dashCard('📝', 'Apuntes', `${nAp} apuntes`, "switchView('apuntes')")}
    ${dashCard('🃏', 'Flashcards', `${nDue} para repasar hoy`, "switchView('flashcards')")}
    ${dashCard('★', 'Favoritos', `${nFav} marcados`, "switchView('favoritos')")}
    ${dashCard('◎', 'Mapa', 'Ver todo en abanico', "switchView('mapa')")}
  </div>`;
}

function renderOficinaDash() {
  const host = document.getElementById('oficinadash-body');
  if (!host) return;
  const causas = EXPEDIENTES.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0)).slice(0, 5);
  const redact = EXDOCS.filter((x) => x.redactado).sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, 5);
  host.innerHTML = `<div class="dash-grid" style="margin-bottom:18px">
    ${dashCard('📁', 'Causas', `${EXPEDIENTES.length} carpetas`, "switchView('expedientes')")}
    ${dashCard('👥', 'Clientes', `${CLIENTES.length} en cartera`, "switchView('clientes')")}
    ${dashCard('✍️', 'Redacción', 'Crear un documento', "switchView('redactar')")}
  </div>
  <div class="dash-cols">
    <div class="dash-col"><div class="dash-col-h">📁 Causas recientes</div>${causas.length ? causas.map((e) => `<div class="dash-row" onclick="openExpediente('${e.id}')"><b>${escapeHtml(causaLabel(e))}</b><div class="dash-row-s">${escapeHtml([e.rol || e.rit, e.estado].filter(Boolean).join(' · ') || '—')}</div></div>`).join('') : '<div class="dash-empty">Sin causas.</div>'}</div>
    <div class="dash-col"><div class="dash-col-h">📜 Últimas redacciones</div>${redact.length ? redact.map((x) => { const e = EXPEDIENTES.find((p) => p.id === x.expediente); return `<div class="dash-row" onclick="openExdoc('${x.id}')"><b>${escapeHtml(x.title || 'Documento')}</b><div class="dash-row-s">${escapeHtml(e ? e.name : '—')}</div></div>`; }).join('') : '<div class="dash-empty">Aún no generas documentos.</div>'}</div>
  </div>`;
}

function toggleAvatarMenu() {
  const head = document.getElementById('avatar-head');
  if (head) head.textContent = STATE.user || STATE.viewingEmail || 'Mi cuenta';
  const open = document.getElementById('avatar-menu').classList.toggle('open');
  const user = document.getElementById('mbn-user');
  if (user) user.classList.toggle('on', open);
}

function closeAvatarMenu() {
  document.getElementById('avatar-menu').classList.remove('open');
  const user = document.getElementById('mbn-user');
  if (user) user.classList.remove('on');
}

function goHome() {
  switchView('inicio');
}
