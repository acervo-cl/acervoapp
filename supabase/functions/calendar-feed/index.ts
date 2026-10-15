// ACERVO · Private read-only calendar feed
// Deploy with JWT verification disabled because calendar clients cannot send a
// Supabase user JWT. The long random token is the credential for this endpoint.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TIME_ZONE = 'America/Santiago'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-store',
}

function response(body: BodyInit, status = 200, headers: Record<string, string> = {}) {
  return new Response(body, { status, headers: { ...cors, ...headers } })
}

function icsEscape(value: unknown) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function isoDate(value: unknown) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${match[1]}${match[2]}${match[3]}` : ''
}

function addDays(value: unknown, amount: number) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ''
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  date.setDate(date.getDate() + amount)
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
}

function dateTime(value: unknown, time: unknown) {
  const date = isoDate(value)
  const match = String(time || '').match(/^(\d{2}):(\d{2})/)
  return date && match ? `${date}T${match[1]}${match[2]}00` : ''
}

function endDateTime(value: unknown, time: unknown) {
  const dateMatch = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const timeMatch = String(time || '').match(/^(\d{2}):(\d{2})/)
  if (!dateMatch || !timeMatch) return ''
  const date = new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]), Number(timeMatch[1]), Number(timeMatch[2]))
  date.setHours(date.getHours() + 1)
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}00`
}

function causeLabel(cause: any) {
  return cause?.name || cause?.caratulado || cause?.titulo || 'Causa'
}

function calendarEvents(data: any) {
  const causes = Array.isArray(data?.expedientes) ? data.expedientes : []
  const events = (Array.isArray(data?.recordatorios) ? data.recordatorios : [])
    .filter((event: any) => event && isoDate(event.date))
    .map((event: any) => {
      const cause = event.causaId ? causes.find((item: any) => String(item?.id) === String(event.causaId)) : null
      return {
        ...event,
        summary: event.text || 'Evento Acervo',
        description: cause ? `Causa: ${causeLabel(cause)}` : 'Evento personal de Acervo',
      }
    })

  causes.filter((cause: any) => cause && isoDate(cause.plazo)).forEach((cause: any) => {
    events.push({
      id: `plazo-${cause.id}`,
      date: cause.plazo,
      summary: `Plazo: ${causeLabel(cause)}`,
      description: `Plazo de la causa ${causeLabel(cause)}`,
    })
  })
  return events
}

function calendarICS(events: any[]) {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Acervo//Agenda//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape('Acervo')}`,
    `X-WR-TIMEZONE:${TIME_ZONE}`,
  ]

  events.forEach((event, index) => {
    const start = isoDate(event.date)
    if (!start) return
    lines.push('BEGIN:VEVENT', `UID:${icsEscape(`acervo-${event.id || `${event.date}-${index}`}@acervoapp.cl`)}`, `DTSTAMP:${now}`)
    if (event.dateEnd && isoDate(event.dateEnd)) {
      lines.push(`DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${addDays(event.dateEnd, 1)}`)
    } else if (event.time && dateTime(event.date, event.time)) {
      lines.push(`DTSTART;TZID=${TIME_ZONE}:${dateTime(event.date, event.time)}`, `DTEND;TZID=${TIME_ZONE}:${endDateTime(event.date, event.time)}`)
    } else {
      lines.push(`DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${addDays(event.date, 1)}`)
    }
    lines.push(`SUMMARY:${icsEscape(event.summary || event.text || 'Evento Acervo')}`)
    if (event.description) lines.push(`DESCRIPTION:${icsEscape(event.description)}`)
    if (event.location) lines.push(`LOCATION:${icsEscape(event.location)}`)
    if (event.done) lines.push('STATUS:COMPLETED')
    lines.push('END:VEVENT')
  })
  lines.push('END:VCALENDAR')
  return `${lines.join('\r\n')}\r\n`
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return response('ok')
  if (req.method !== 'GET') return response('Method not allowed', 405)

  const token = new URL(req.url).searchParams.get('token') || ''
  if (!/^[A-Za-z0-9_-]{40,200}$/.test(token)) return response('Not found', 404)

  try {
    const url = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!url || !serviceKey) return response('Feed unavailable', 503)
    const admin = createClient(url, serviceKey)
    const tokenHash = await sha256Hex(token)
    const { data: feed, error: feedError } = await admin
      .from('calendar_feed_tokens')
      .select('id,user_id')
      .eq('token_hash', tokenHash)
      .is('revoked_at', null)
      .maybeSingle()
    if (feedError || !feed) return response('Not found', 404)

    const { data: state, error: stateError } = await admin
      .from('acervo_state')
      .select('data')
      .eq('user_id', feed.user_id)
      .maybeSingle()
    if (stateError) return response('Feed unavailable', 503)
    await admin.from('calendar_feed_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', feed.id)

    return response(calendarICS(calendarEvents(state?.data || {})), 200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="acervo-agenda.ics"',
    })
  } catch (_) {
    return response('Feed unavailable', 503)
  }
})
