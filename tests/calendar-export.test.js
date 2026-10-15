import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../app/js/library/calendar-export.js', import.meta.url), 'utf8');
const context = {};
vm.runInNewContext(`${source}\nthis.buildCalendarICS = buildCalendarICS;`, context);

test('buildCalendarICS exports all-day events with an exclusive end date', () => {
  const ics = context.buildCalendarICS([{ id: 'rec1', date: '2026-10-15', text: 'Audiencia; inicial' }]);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261015/);
  assert.match(ics, /DTEND;VALUE=DATE:20261016/);
  assert.match(ics, /SUMMARY:Audiencia\\; inicial/);
  assert.match(ics, /END:VCALENDAR/);
});

test('buildCalendarICS exports timed events with a one-hour duration', () => {
  const ics = context.buildCalendarICS([{ id: 'rec2', date: '2026-10-15', time: '09:30', text: 'Audiencia' }]);
  assert.match(ics, /DTSTART;TZID=America\/Santiago:20261015T093000/);
  assert.match(ics, /DTEND;TZID=America\/Santiago:20261015T103000/);
});
