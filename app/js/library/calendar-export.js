const ACERVO_CALENDAR_TZ = 'America/Santiago';

function _icsEscape(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function _icsDate(iso) {
  const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}${match[2]}${match[3]}` : '';
}

function _icsAddDays(iso, amount) {
  const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setDate(date.getDate() + amount);
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

function _icsDateTime(iso, time) {
  const date = _icsDate(iso);
  const match = String(time || '').match(/^(\d{2}):(\d{2})/);
  return date && match ? `${date}T${match[1]}${match[2]}00` : '';
}

function _icsEndDateTime(iso, time) {
  const dateMatch = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = String(time || '').match(/^(\d{2}):(\d{2})/);
  if (!dateMatch || !timeMatch) return '';
  const date = new Date(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]), Number(timeMatch[1]), Number(timeMatch[2]));
  date.setHours(date.getHours() + 1);
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}00`;
}

function buildCalendarICS(events) {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Acervo//Agenda//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${_icsEscape('Acervo')}`,
    `X-WR-TIMEZONE:${ACERVO_CALENDAR_TZ}`,
  ];
  (Array.isArray(events) ? events : []).forEach((event, index) => {
    if (!event || !_icsDate(event.date)) return;
    const uid = _icsEscape(event.id || `acervo-${event.date}-${index}@acervoapp.cl`);
    const summary = event.summary || event.text || 'Evento Acervo';
    lines.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${now}`);
    if (event.dateEnd && _icsDate(event.dateEnd)) {
      lines.push(`DTSTART;VALUE=DATE:${_icsDate(event.date)}`, `DTEND;VALUE=DATE:${_icsAddDays(event.dateEnd, 1)}`);
    } else if (event.time && _icsDateTime(event.date, event.time)) {
      lines.push(`DTSTART;TZID=${ACERVO_CALENDAR_TZ}:${_icsDateTime(event.date, event.time)}`, `DTEND;TZID=${ACERVO_CALENDAR_TZ}:${_icsEndDateTime(event.date, event.time)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${_icsDate(event.date)}`, `DTEND;VALUE=DATE:${_icsAddDays(event.date, 1)}`);
    }
    lines.push(`SUMMARY:${_icsEscape(summary)}`);
    if (event.description) lines.push(`DESCRIPTION:${_icsEscape(event.description)}`);
    if (event.location) lines.push(`LOCATION:${_icsEscape(event.location)}`);
    if (event.done) lines.push('STATUS:COMPLETED');
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

function calendarExportEvents() {
  const events = (STATE.recordatorios || [])
    .filter(event => event && event.date)
    .map(event => {
      const causa = event.causaId ? EXPEDIENTES.find(item => String(item.id) === String(event.causaId)) : null;
      return {
        ...event,
        summary: event.text || 'Evento Acervo',
        description: causa ? `Causa: ${causaLabel(causa)}` : 'Evento personal de Acervo',
      };
    });
  EXPEDIENTES.filter(causa => causa && causa.plazo).forEach(causa => {
    events.push({
      id: `plazo-${causa.id}`,
      date: causa.plazo,
      summary: `Plazo: ${causaLabel(causa)}`,
      description: `Plazo de la causa ${causaLabel(causa)}`,
    });
  });
  return events;
}

function downloadCalendarICS() {
  const events = calendarExportEvents();
  const blob = new Blob([buildCalendarICS(events)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `acervo-agenda-${new Date().toISOString().slice(0, 10)}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`${events.length} evento(s) exportado(s)`, 'success');
}
