// Edge Function: admin-create-user
// Crea un usuario en Supabase Auth SOLO si quien llama es admin.
// La clave service_role vive en el servidor (nunca en el navegador).
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

    // 1) Identificar a quien llama (por su token) y verificar que sea admin
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    if (!jwt) return json({ error: 'Falta autorización' }, 401)
    const { data: who, error: uErr } = await admin.auth.getUser(jwt)
    if (uErr || !who?.user) return json({ error: 'Sesión inválida' }, 401)
    const { data: prof } = await admin.from('profiles').select('role').eq('id', who.user.id).maybeSingle()
    if (!prof || prof.role !== 'admin') return json({ error: 'Solo el administrador puede crear usuarios' }, 403)

    // 2) Crear el usuario
    const { email, password, role, approved, display_name, rut } = await req.json()
    if (!email || !password) return json({ error: 'Falta correo o contraseña' }, 400)
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: display_name || null, rut: rut || null },
    })
    if (cErr) return json({ error: cErr.message }, 400)

    // 3) Perfil (nombre, rut, rol + aprobación)
    await admin.from('profiles').upsert(
      { id: created.user.id, email, role: role || 'user', approved: approved !== false, display_name: display_name || null, rut: rut || null },
      { onConflict: 'id' },
    )

    return json({ ok: true, id: created.user.id })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
