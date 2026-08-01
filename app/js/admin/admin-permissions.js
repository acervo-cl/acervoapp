const PERMS = [
  { key: 'addBooks', label: 'Agregar libros' },
  { key: 'editOwn', label: 'Editar y eliminar sus propios libros' },
  { key: 'editAdmin', label: 'Editar libros del admin (si están liberados)' },
  { key: 'deleteAdmin', label: 'Eliminar libros del admin (si están liberados)' },
  { key: 'manageAreas', label: 'Gestionar áreas / carpetas' },
];

function allPerms() {
  const out = {};
  PERMS.forEach((p) => {
    out[p.key] = true;
  });
  return out;
}

const DEFAULT_PERMS = { addBooks: true, editOwn: true, manageAreas: true };

function permDefault(key) {
  return !!DEFAULT_PERMS[key];
}

function perm(key) {
  if (STATE.isAdmin) return true;
  const perms = STATE.currentPerms || {};
  return key in perms ? !!perms[key] : permDefault(key);
}

function isOfficial(doc) {
  return !doc || !doc.owner || doc.owner === 'admin';
}

function canEditDoc(doc) {
  if (STATE.isAdmin) return true;
  if (!doc || doc.shared || doc.baseLib) return false;
  return true;
}

function canDeleteDoc(doc) {
  if (STATE.isAdmin) return true;
  if (!doc) return false;
  return true;
}

function canAddBooks() {
  return perm('addBooks');
}

function canManageAreas() {
  return perm('manageAreas');
}

function canEditForms() {
  return !!STATE.isAdmin;
}

function _needAdminForms() {
  if (canEditForms()) return true;
  toast('Solo el administrador puede modificar las estructuras, el formato y los colores.', 'error');
  return false;
}

function applyPermsUI() {
  document.querySelectorAll('.perm-add').forEach((el) => {
    el.style.display = canAddBooks() ? '' : 'none';
  });
  document.querySelectorAll('.perm-areas').forEach((el) => {
    el.style.display = canManageAreas() ? '' : 'none';
  });
  document.querySelectorAll('.admin-ctrl').forEach((el) => {
    el.style.display = STATE.isAdmin ? '' : 'none';
  });
}

let _storageBusy = false;

async function calcStorageUsage() {
  const host = document.getElementById('admin-storage');
  if (!host) return;
  if (!STATE.isAdmin) {
    host.innerHTML = '<div style="font-size:12.5px;color:var(--gray2)">Solo el administrador.</div>';
    return;
  }
  if (_storageBusy) return;
  _storageBusy = true;
  host.innerHTML = '<div style="font-size:12.5px;color:var(--gray2)">Calculando…</div>';
  try {
    const { data, error } = await sb.functions.invoke('admin-storage-usage');
    if (error) throw error;
    const used = Number((data && data.bytes) || 0);
    host.innerHTML = `<div style="font-size:13px"><b>${_fmtBytes(used)}</b> usados en archivos</div>`;
  } catch (e) {
    host.innerHTML = `<div style="font-size:12.5px;color:#f88">No se pudo calcular: ${escapeHtml(e.message || String(e))}</div>`;
  }
  _storageBusy = false;
}

function togglePermsPanel(uid) {
  const panel = document.getElementById(`perms-${uid}`);
  if (!panel) return;
  panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
}

async function setUserPerm(uid, key, val) {
  const profile = STATE.profiles.find((x) => x.id === uid);
  if (!profile) return;
  const perms = Object.assign({}, profile.perms || {});
  perms[key] = !!val;
  const { error } = await sb.from('profiles').update({ perms }).eq('id', uid);
  if (error) {
    toast(`Error: ${error.message}`, 'error');
    return;
  }
  profile.perms = perms;
  toast('Permisos actualizados', 'success');
}

async function setUserAccess(uid, val) {
  const profile = STATE.profiles.find((x) => x.id === uid);
  if (!profile) {
    toast('Usuario no encontrado', 'error');
    return;
  }
  const perms = Object.assign({}, profile.perms || {});
  perms.access = val === 'study' ? 'study' : 'full';
  const { error } = await sb.from('profiles').update({ perms }).eq('id', uid);
  if (error) {
    toast(`Error: ${error.message}`, 'error');
    return;
  }
  profile.perms = perms;
  toast(perms.access === 'study' ? 'Acceso: solo Estudio 📚' : 'Acceso completo 💼', 'success');
}

async function setUserApproved(id, val) {
  const { error } = await sb.from('profiles').update({ approved: val }).eq('id', id);
  if (error) {
    toast(`Error: ${error.message}`, 'error');
    return;
  }
  toast(val ? 'Acceso aprobado ✓' : 'Acceso retirado', 'success');
  renderUsersAdmin();
}
