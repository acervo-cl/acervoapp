const CALENDAR_FEED_STORAGE_PREFIX = 'acervo_calendar_feed_token_';

function calendarFeedStorageKey() {
  return `${CALENDAR_FEED_STORAGE_PREFIX}${STATE.uid || 'unknown'}`;
}

function calendarFeedEndpoint(token) {
  const base = String(window.acervoSupabaseUrl || '').replace(/\/$/, '');
  return `${base}/functions/v1/calendar-feed?token=${encodeURIComponent(token)}`;
}

function calendarFeedRandomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function calendarFeedHash(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function calendarFeedStoredToken() {
  try { return localStorage.getItem(calendarFeedStorageKey()) || ''; } catch (_) { return ''; }
}

function calendarFeedSaveToken(token) {
  try { localStorage.setItem(calendarFeedStorageKey(), token); } catch (_) {}
}

function calendarFeedForgetToken() {
  try { localStorage.removeItem(calendarFeedStorageKey()); } catch (_) {}
}

async function calendarFeedActiveToken() {
  const { data, error } = await sb.from('calendar_feed_tokens')
    .select('id,created_at,last_used_at')
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

function calendarFeedFormatDate(value) {
  try { return new Date(value).toLocaleString('es-CL'); } catch (_) { return value || ''; }
}

function renderCalendarFeedSettings(meta, notice = '') {
  const raw = calendarFeedStoredToken();
  const link = raw ? calendarFeedEndpoint(raw) : '';
  const body = document.getElementById('calendar-feed-body');
  if (!body) return;
  body.innerHTML = `<div class="modal-title">🔗 Sincronización de calendario</div>
    <p style="color:var(--gray2);line-height:1.55;margin:0 0 14px">Crea un enlace privado de solo lectura para suscribirte desde Google Calendar, iCloud u Outlook. Los cambios de tu agenda se reflejarán cuando el calendario externo actualice el enlace.</p>
    ${notice ? `<div style="border:1px solid rgba(201,168,76,.35);background:rgba(201,168,76,.08);border-radius:8px;padding:9px 10px;margin-bottom:12px;font-size:12px">${escapeHtml(notice)}</div>` : ''}
    ${meta ? `<div style="font-size:12px;color:var(--gray2);margin-bottom:8px">Enlace activo desde ${escapeHtml(calendarFeedFormatDate(meta.created_at))}${meta.last_used_at ? ` · usado ${escapeHtml(calendarFeedFormatDate(meta.last_used_at))}` : ''}</div>` : '<div style="font-size:12px;color:var(--gray2);margin-bottom:8px">No hay un enlace activo.</div>'}
    ${link ? `<label class="form-label">Enlace privado</label><textarea class="form-textarea" id="calendar-feed-url" readonly style="min-height:80px;word-break:break-all">${escapeHtml(link)}</textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn-gold" onclick="copyCalendarFeedLink()">Copiar enlace</button><button class="btn-ghost" onclick="rotateCalendarFeed()">Regenerar enlace</button><button class="btn-ghost" style="color:var(--danger)" onclick="revokeCalendarFeed()">Revocar</button></div>`
      : `<button class="btn-gold" onclick="createCalendarFeed()">Crear enlace privado</button>`}
    <div style="font-size:11px;color:var(--gray2);line-height:1.5;margin-top:14px">Trata este enlace como una contraseña: cualquiera que lo tenga podrá leer tu agenda. Puedes revocarlo cuando quieras.</div>
    <div class="modal-footer"><button class="btn-ghost" onclick="closeAllModals()">Cerrar</button></div>`;
}

async function openCalendarFeedSettings() {
  openModal('modal-calendar-feed');
  const body = document.getElementById('calendar-feed-body');
  if (body) body.innerHTML = '<div style="color:var(--gray2);padding:12px">Cargando…</div>';
  try {
    renderCalendarFeedSettings(await calendarFeedActiveToken());
  } catch (error) {
    renderCalendarFeedSettings(null, `No se pudo revisar el enlace. ¿Ya ejecutaste la migración calendar-feed.sql? ${error.message || ''}`);
  }
}

async function createCalendarFeed() {
  const token = calendarFeedRandomToken();
  try {
    const current = await calendarFeedActiveToken();
    if (current) {
      const { error: revokeError } = await sb.from('calendar_feed_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', current.id);
      if (revokeError) throw revokeError;
    }
    const tokenHash = await calendarFeedHash(token);
    const { data, error } = await sb.from('calendar_feed_tokens').insert({ user_id: STATE.uid, token_hash: tokenHash }).select('id,created_at,last_used_at').single();
    if (error) throw error;
    calendarFeedSaveToken(token);
    renderCalendarFeedSettings(data, 'Enlace creado. Cópialo ahora y pégalo en tu aplicación de calendario.');
  } catch (error) {
    toast(`No se pudo crear el enlace: ${error.message || error}`, 'error');
  }
}

async function rotateCalendarFeed() {
  if (!confirm('El enlace anterior dejará de funcionar. ¿Regenerar enlace?')) return;
  await createCalendarFeed();
}

async function revokeCalendarFeed() {
  try {
    const current = await calendarFeedActiveToken();
    if (!current) return;
    const { error } = await sb.from('calendar_feed_tokens').update({ revoked_at: new Date().toISOString() }).eq('id', current.id);
    if (error) throw error;
    calendarFeedForgetToken();
    renderCalendarFeedSettings(null, 'Enlace revocado. Los calendarios externos dejarán de recibir datos cuando vuelvan a actualizarse.');
  } catch (error) {
    toast(`No se pudo revocar el enlace: ${error.message || error}`, 'error');
  }
}

async function copyCalendarFeedLink() {
  const input = document.getElementById('calendar-feed-url');
  if (!input) return;
  try {
    await navigator.clipboard.writeText(input.value);
    toast('Enlace copiado', 'success');
  } catch (_) {
    input.select();
    document.execCommand('copy');
    toast('Enlace copiado', 'success');
  }
}
