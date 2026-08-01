let authMode = 'login';

function toggleAuthMode(e) {
  if (e) e.preventDefault();
  authMode = authMode === 'login' ? 'signup' : 'login';
  document.getElementById('login-btn').textContent = authMode === 'signup' ? 'CREAR CUENTA →' : 'INGRESAR →';
  document.getElementById('auth-toggle-text').textContent = authMode === 'signup' ? '¿Ya tienes cuenta?' : '¿Primera vez?';
  document.getElementById('auth-toggle').textContent = authMode === 'signup' ? 'Iniciar sesión' : 'Crear cuenta';
}

async function doLogin() {
  const email = document.getElementById('li-user').value.trim();
  const pass = document.getElementById('li-pass').value.trim();
  if (!email || !pass) {
    toast('Ingresa tu correo y contraseña', 'error');
    return;
  }
  const remEl = document.getElementById('li-remember');
  const keep = remEl ? remEl.checked : true;
  try {
    localStorage.setItem('acervo_remember', keep ? '1' : '0');
  } catch (_) {}
  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  const orig = btn.textContent;
  btn.textContent = 'Conectando…';

  try {
    if (authMode === 'signup') {
      const { data, error } = await sb.auth.signUp({ email, password: pass });
      if (error) {
        toast(`No se pudo crear la cuenta: ${error.message}`, 'error');
        return;
      }
      if (!data.session) {
        toast('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.', 'success');
        toggleAuthMode();
        return;
      }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) {
        toast(`No se pudo entrar: ${error.message}`, 'error');
        return;
      }
    }
    await enterApp();
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
}

async function fetchMyProfile() {
  try {
    const { data, error } = await sb.from('profiles')
      .select('role,approved,display_name,email,rut,perms')
      .eq('id', STATE.uid)
      .maybeSingle();
    if (error) {
      console.warn('perfil:', error.message);
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

async function enterApp() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    showScreen('login-screen');
    return;
  }
  STATE.uid = user.id;
  STATE.user = user.email;

  const prof = await fetchMyProfile();
  STATE.role = (prof && prof.role) || 'user';
  STATE.approved = !!(prof && prof.approved);
  STATE.isAdmin = STATE.role === 'admin';

  if (!STATE.approved) {
    const pe = document.getElementById('pending-email');
    if (pe) pe.textContent = user.email;
    showScreen('pending-screen');
    return;
  }

  await loadState();
  if (prof) {
    const pa = STATE.perfilAbogado || (STATE.perfilAbogado = { nombre: '', rut: '', domicilio: '', email: '', cargo: 'Abogado' });
    let seeded = false;
    if (!(pa.nombre || '').trim() && (prof.display_name || '').trim()) {
      pa.nombre = prof.display_name;
      seeded = true;
    }
    if (!(pa.rut || '').trim() && (prof.rut || '').trim()) {
      pa.rut = prof.rut;
      seeded = true;
    }
    if (!(pa.email || '').trim() && (prof.email || STATE.user || '').trim()) {
      pa.email = prof.email || STATE.user;
      seeded = true;
    }
    if (seeded) saveState();
  }
  await loadSharedBooks();
  await loadSharedCausas();
  await loadSharedDocs();
  await loadMasterConfig();
  await loadBaseBooks();
  await loadConnections();
  ensureModelos();
  initMasterBaseline();
  if (STATE.isAdmin && !STATE.tiposComunidadReset) {
    TIPOSDOC.forEach((t) => {
      if (t.builtin) t.paraTodos = false;
    });
    STATE.tiposComunidadReset = true;
    try {
      saveState();
    } catch (_) {}
  }
  try {
    _rtSig = _rtSignature();
  } catch (_) {}
  startRealtime();

  STATE.currentPerms = STATE.isAdmin ? allPerms() : (prof && prof.perms ? prof.perms : {});
  document.body.classList.toggle('is-admin', STATE.isAdmin);
  applyAccessLevel();

  const initials = (user.email || 'U').slice(0, 2).toUpperCase();
  document.getElementById('avatar-btn').childNodes[0].textContent = initials;

  document.getElementById('admin-badge-wrap').innerHTML = STATE.isAdmin ? '<div class="admin-badge">ADMIN</div>' : '';
  document.getElementById('admin-menu-item').style.display = STATE.isAdmin ? 'flex' : 'none';
  document.getElementById('reset-menu-item').style.display = STATE.isAdmin ? 'flex' : 'none';

  applyPermsUI();
  buildSearchIndex();
  renderAll();
  moveTopbarTo('app');
  showScreen('app-screen');
  renderTabs();
  setTimeout(renderUnified, 80);
  setTimeout(backfillFilesToCloud, 2500);
  document.getElementById('pomo-wrap').style.display = 'block';
  pomoInit();
  initMinimap();
  initEditor();
  initReaderMenu();
  initReaderPinch();
  if (STATE.isAdmin) populateLibSwitcher();
  setTimeout(checkProfileAlert, 800);
  maybeShowConfid();
}

async function doLogout() {
  try {
    await sb.auth.signOut();
  } catch (e) {}
  try {
    await idbDel('kmic_data');
  } catch (e) {}
  try {
    localStorage.removeItem('kmic_data');
    localStorage.removeItem('kmic_uid');
  } catch (e) {}
  STATE.user = null;
  STATE.uid = null;
  STATE.isAdmin = false;
  location.reload();
}

async function forgotPassword(e) {
  if (e) e.preventDefault();
  const email = (document.getElementById('li-user').value || '').trim();
  if (!email || !email.includes('@')) {
    toast('Escribe tu correo en el campo de arriba y vuelve a tocar el enlace', 'error');
    return;
  }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
  if (error) {
    toast(`Error: ${error.message}`, 'error');
    return;
  }
  toast('Te enviamos un correo para restablecer la contraseña. Revisa tu bandeja.', 'success');
}

async function submitNewPassword() {
  const pass = (document.getElementById('rp-pass').value || '').trim();
  if (pass.length < 6) {
    toast('La contraseña debe tener al menos 6 caracteres', 'error');
    return;
  }
  const { error } = await sb.auth.updateUser({ password: pass });
  if (error) {
    toast(`Error: ${error.message}`, 'error');
    return;
  }
  toast('Contraseña actualizada', 'success');
  history.replaceState(null, '', window.location.pathname);
  await enterApp();
}

sb.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') showScreen('reset-screen');
});

(async function boot() {
  if (location.hash.includes('type=recovery')) {
    showScreen('reset-screen');
    return;
  }
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      await enterApp();
    } else {
      const r = document.getElementById('li-remember');
      if (r) r.checked = _rememberSession();
      showScreen('login-screen');
    }
  } catch (e) {
    console.warn('Boot:', e.message);
    showScreen('login-screen');
  }
})();
