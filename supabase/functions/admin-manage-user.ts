// Edge Function: admin-manage-user
// Permite al ADMIN editar (correo/contraseña) o ELIMINAR un usuario.
// La clave service_role vive en el servidor (nunca en el navegador).
// Los campos de perfil (nombre, rut, rol, aprobado, permisos) se actualizan
// directo desde la app; aquí solo van las operaciones que exigen service_role.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(url, serviceKey)

    // 1) Identificar a quien llama y verificar que sea admin
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    if (!jwt) return json({ error: 'Falta autorización' }, 401)
    const { data: who, error: uErr } = await admin.auth.getUser(jwt)
    if (uErr || !who?.user) return json({ error: 'Sesión inválida' }, 401)
    const { data: prof } = await admin.from('profiles').select('role').eq('id', who.user.id).maybeSingle()
    if (!prof || prof.role !== 'admin') return json({ error: 'Solo el administrador' }, 403)

    const { action, id, email, password } = await req.json()
    if (!id) return json({ error: 'Falta el id del usuario' }, 400)
    if (id === who.user.id) return json({ error: 'No puedes hacer esta operación sobre tu propia cuenta' }, 400)

    // 2a) Eliminar usuario (borra Auth; el perfil cae por FK on delete cascade)
    if (action === 'delete') {
      const { error: dErr } = await admin.auth.admin.deleteUser(id)
      if (dErr) return json({ error: dErr.message }, 400)
      await admin.from('profiles').delete().eq('id', id)   // por si no hay cascade
      return json({ ok: true, deleted: id })
    }

    // 2b) Actualizar correo y/o contraseña
    if (action === 'update') {
      const attrs: Record<string, unknown> = {}
      if (email) { attrs.email = email; attrs.email_confirm = true }
      if (password) attrs.password = password
      if (!Object.keys(attrs).length) return json({ ok: true })   // nada que cambiar en Auth
      const { error: eErr } = await admin.auth.admin.updateUserById(id, attrs)
      if (eErr) return json({ error: eErr.message }, 400)
      if (email) await admin.from('profiles').update({ email }).eq('id', id)
      return json({ ok: true, updated: id })
    }

    return json({ error: 'Acción no reconocida' }, 400)
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
