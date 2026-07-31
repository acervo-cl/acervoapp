async function renderUsersAdmin() {
  const el = document.getElementById('admin-users-table');
  if (!el) return;
  if (!STATE.isAdmin) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = '<div style="padding:16px;color:var(--gray2);font-size:13px">Cargando usuarios…</div>';
  let { data, error } = await sb.from('profiles')
    .select('id,email,role,approved,perms,created_at,display_name,rut,firma').order('created_at', { ascending: true });
  if (error && /firma/.test(error.message || '')) {
    ({ data, error } = await sb.from('profiles')
      .select('id,email,role,approved,perms,created_at,display_name,rut').order('created_at', { ascending: true }));
  }
  if (error) {
    el.innerHTML = `<div style="padding:16px;color:#f88;font-size:13px">No se pudieron cargar los usuarios: ${escapeHtml(error.message)}</div>`;
    return;
  }
  STATE.profiles = data || [];
  populateLibSwitcher();
  if (!STATE.profiles.length) {
    el.innerHTML = '<div style="padding:16px;color:var(--gray2);font-size:13px">Aún no hay usuarios registrados.</div>';
    return;
  }
  el.innerHTML = STATE.profiles.map((u) => {
    const me = u.id === STATE.uid;
    const estado = u.approved
      ? '<span style="color:var(--success);font-weight:600">✓ aprobado</span>'
      : '<span style="color:var(--gold);font-weight:600">⏳ pendiente</span>';
    const acciones = me
      ? '<span style="font-size:11px;color:var(--gray2)">(tu cuenta)</span>'
      : (u.approved
        ? `<button class="btn-ghost" style="font-size:12px;padding:6px 12px" onclick="setUserApproved('${u.id}',false)">Quitar acceso</button>`
        : `<button class="btn-gold" style="font-size:12px;padding:6px 12px" onclick="setUserApproved('${u.id}',true)">Aprobar</button>`)
        + `<button class="btn-ghost" style="font-size:12px;padding:6px 12px" onclick="openEditUser('${u.id}')">✏ Editar</button>`
        + `<button class="btn-ghost" style="font-size:12px;padding:6px 12px;color:var(--danger)" onclick="deleteUser('${u.id}')">🗑</button>`;
    const perms = u.perms || {};
    const permsBtn = u.role === 'admin'
      ? '<span style="font-size:11px;color:var(--gray2)">acceso total</span>'
      : `<button class="btn-ghost" style="font-size:12px;padding:6px 12px" onclick="togglePermsPanel('${u.id}')">🔧 Permisos</button>`;
    const permsPanel = u.role === 'admin' ? '' : `
      <div class="perms-panel" id="perms-${u.id}" style="display:none">
        ${PERMS.map((p) => {
          const eff = p.key in perms ? perms[p.key] : permDefault(p.key);
          return `<label class="perm-check"><input type="checkbox" ${eff ? 'checked' : ''} onchange="setUserPerm('${u.id}','${p.key}',this.checked)"> ${p.label}${permDefault(p.key) ? ' <span style="color:var(--gray2);font-size:10px">(por defecto)</span>' : ''}</label>`;
        }).join('')}
      </div>`;
    return `<div style="border-bottom:1px solid rgba(201,168,76,.1)">
      <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;flex-wrap:wrap">
        <div style="flex:1 1 200px"><div style="font-weight:600">${escapeHtml(u.display_name || (u.firma && u.firma.nombre) || u.email || '—')}</div><div style="font-size:11px;color:var(--gray2)">${escapeHtml(u.email || '')}${(u.rut || (u.firma && u.firma.rut)) ? ` · ${escapeHtml(u.rut || u.firma.rut)}` : ''}${(u.firma && u.firma.domicilio) ? ` · ${escapeHtml(u.firma.domicilio)}` : ''}</div></div>
        <div style="flex:0 0 auto;font-size:12px">${estado}</div>
        <select onchange="setUserRole('${u.id}',this.value)" ${me ? 'disabled title="No puedes cambiar tu propio rol"' : ''} style="font-size:12px;padding:5px 8px;border-radius:6px">
          <option value="user" ${u.role === 'user' ? 'selected' : ''}>Usuario</option>
          <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
        ${u.role === 'admin' ? '' : `<label style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--gray2)">Acceso:
          <select onchange="setUserAccess('${u.id}',this.value)" title="Qué puede ver este usuario" style="font-size:12px;padding:5px 8px;border-radius:6px">
            <option value="full" ${(perms.access !== 'study') ? 'selected' : ''}>💼 Trabajo + Estudio</option>
            <option value="study" ${(perms.access === 'study') ? 'selected' : ''}>📚 Solo Estudio</option>
          </select></label>`}
        ${permsBtn}
        ${acciones}
      </div>
      ${permsPanel}
    </div>`;
  }).join('');
}

function openCreateUser() {
  document.getElementById('admin-user-body').innerHTML = `
    <div class="modal-title">➕ Crear usuario</div>
    <div class="form-row"><label class="form-label">Nombre</label><input class="form-input" id="cu-nombre" placeholder="Nombre y apellido"></div>
    <div class="form-row"><label class="form-label">RUT</label><input class="form-input" id="cu-rut" placeholder="12.345.678-9"></div>
    <div class="form-row"><label class="form-label">Correo</label><input class="form-input" id="cu-email" type="email" placeholder="usuario@correo.cl"></div>
    <div class="form-row"><label class="form-label">Contraseña inicial</label><input class="form-input" id="cu-pass" type="password" placeholder="Mínimo 6 caracteres"></div>
    <div class="form-row"><label class="form-label">Rol</label>
      <select class="form-select" id="cu-role"><option value="user">Usuario</option><option value="admin">Administrador</option></select></div>
    <label class="rw-check" style="margin-bottom:10px"><input type="checkbox" id="cu-approved" checked> Aprobado (entra ya)</label>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" onclick="adminCreateUser()">Crear</button></div>`;
  openModal('modal-admin-user');
}

async function adminCreateUser() {
  const nombre = (document.getElementById('cu-nombre').value || '').trim();
  const rut = (document.getElementById('cu-rut').value || '').trim();
  const email = (document.getElementById('cu-email').value || '').trim();
  const password = (document.getElementById('cu-pass').value || '').trim();
  const role = (document.getElementById('cu-role').value || 'user').trim();
  const approved = !!(document.getElementById('cu-approved') || {}).checked;
  if (!email || !password) {
    toast('Falta correo o contraseña', 'error');
    return;
  }
  const { error } = await sb.functions.invoke('admin-create-user', {
    body: { email, password, role, approved, display_name: nombre, rut },
  });
  if (error) {
    toast(`Error: ${error.message}`, 'error');
    return;
  }
  closeAllModals();
  toast('Usuario creado ✓', 'success');
  await renderUsersAdmin();
}

async function setUserRole(id, role) {
  const { error } = await sb.from('profiles').update({ role }).eq('id', id);
  if (error) {
    toast(`Error: ${error.message}`, 'error');
    return;
  }
  toast(`Rol actualizado a ${role}`, 'success');
  renderUsersAdmin();
}

function openEditUser(uid) {
  const u = STATE.profiles.find((x) => x.id === uid);
  if (!u) return;
  document.getElementById('admin-user-body').innerHTML = `
    <div class="modal-title">✏ Editar usuario</div>
    <div class="form-row"><label class="form-label">Nombre</label><input class="form-input" id="eu-nombre" value="${escapeHtml(u.display_name || '')}"></div>
    <div class="form-row"><label class="form-label">RUT</label><input class="form-input" id="eu-rut" value="${escapeHtml(u.rut || '')}"></div>
    <div class="form-row"><label class="form-label">Correo</label><input class="form-input" id="eu-email" type="email" value="${escapeHtml(u.email || '')}"></div>
    <div class="form-row"><label class="form-label">Nueva contraseña (opcional)</label><input class="form-input" id="eu-pass" type="password" placeholder="Dejar en blanco para no cambiar"></div>
    <div class="form-row"><label class="form-label">Rol</label>
      <select class="form-select" id="eu-role">
        <option value="user" ${u.role === 'user' ? 'selected' : ''}>Usuario</option>
        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrador</option>
      </select></div>
    <label class="rw-check" style="margin-bottom:14px"><input type="checkbox" id="eu-approved" ${u.approved ? 'checked' : ''}> Aprobado (puede entrar)</label>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cancelar</button><button class="btn-gold" onclick="saveEditUser('${uid}')">Guardar</button></div>`;
  openModal('modal-admin-user');
}

async function saveEditUser(uid) {
  const nombre = (document.getElementById('eu-nombre').value || '').trim();
  const rut = (document.getElementById('eu-rut').value || '').trim();
  const email = (document.getElementById('eu-email').value || '').trim();
  const password = (document.getElementById('eu-pass').value || '').trim();
  const role = (document.getElementById('eu-role').value || 'user').trim();
  const approved = !!document.getElementById('eu-approved').checked;
  const current = STATE.profiles.find((x) => x.id === uid) || {};
  const baseUpd = { display_name: nombre, rut, role, approved, perms: current.perms || {} };
  const { error: pErr } = await sb.from('profiles').update(baseUpd).eq('id', uid);
  if (pErr) {
    toast(`Error: ${pErr.message}`, 'error');
    return;
  }
  if (email || password) {
    const { error } = await sb.functions.invoke('admin-manage-user', {
      body: { action: 'update', user_id: uid, email: email || undefined, password: password || undefined },
    });
    if (error) {
      toast(`Perfil guardado, pero no se pudo actualizar Auth: ${error.message}`, 'error');
      return;
    }
  }
  closeAllModals();
  toast('Usuario actualizado ✓', 'success');
  renderUsersAdmin();
}

async function deleteUser(uid) {
  if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return;
  const { error } = await sb.functions.invoke('admin-manage-user', {
    body: { action: 'delete', user_id: uid },
  });
  if (error) {
    toast(`Error: ${error.message}`, 'error');
    return;
  }
  toast('Usuario eliminado ✓', 'success');
  renderUsersAdmin();
}
