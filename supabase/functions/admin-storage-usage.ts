// Edge Function: admin-storage-usage
// Devuelve el espacio TOTAL usado en el bucket de archivos (todos los usuarios),
// solo si quien llama es admin. Usa service_role → ve todo, sin límite de RLS.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BUCKET = 'acervo-files'
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

    // Verificar que quien llama sea admin
    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    if (!jwt) return json({ error: 'Falta autorización' }, 401)
    const { data: who, error: uErr } = await admin.auth.getUser(jwt)
    if (uErr || !who?.user) return json({ error: 'Sesión inválida' }, 401)
    const { data: prof } = await admin.from('profiles').select('role').eq('id', who.user.id).maybeSingle()
    if (!prof || prof.role !== 'admin') return json({ error: 'Solo el administrador' }, 403)

    // Opción rápida y exacta: sumar metadata->size directo de la tabla storage.objects
    const { data: rows, error: qErr } = await admin
      .schema('storage').from('objects')
      .select('metadata').eq('bucket_id', BUCKET)
    if (!qErr && rows) {
      let total = 0, count = 0
      for (const r of rows) { const s = (r as any)?.metadata?.size; if (typeof s === 'number') { total += s; count++ } }
      return json({ ok: true, total, count })
    }

    // Respaldo: recorrer el bucket con list() (service_role ve todo)
    const bucket = admin.storage.from(BUCKET)
    let total = 0, count = 0
    async function walk(prefix: string) {
      let offset = 0
      while (true) {
        const { data, error } = await bucket.list(prefix, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } })
        if (error || !data || !data.length) break
        for (const it of data as any[]) {
          if (it.id === null) await walk(prefix ? prefix + '/' + it.name : it.name)
          else total += (it.metadata && it.metadata.size) || 0, count++
        }
        if (data.length < 100) break
        offset += 100
      }
    }
    await walk('')
    return json({ ok: true, total, count })
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500)
  }
})
