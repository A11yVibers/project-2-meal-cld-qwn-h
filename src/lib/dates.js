export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayISO() {
  return toISODate(new Date());
}

// Weeks start on Monday.
export function startOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - offset);
  return x;
}

export function currentWeekISO() {
  return toISODate(startOfWeek(new Date()));
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function shiftWeek(weekStartISO, delta) {
  return toISODate(addDays(fromISODate(weekStartISO), delta * 7));
}

export function weekDatesISO(weekStartISO) {
  const start = fromISODate(weekStartISO);
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(start, i)));
}

export function formatWeekLabel(weekStartISO) {
  const s = fromISODate(weekStartISO);
  const e = addDays(s, 6);
  const left = s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const right = e.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${left} – ${right}`;
}

export function formatDayHeader(iso) {
  const d = fromISODate(iso);
  return {
    dow: d.toLocaleDateString(undefined, { weekday: 'short' }),
    dateLabel: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  };
}

export function formatFullDate(iso) {
  return fromISODate(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function upcomingWeeks(count = 8) {
  const start = startOfWeek(new Date());
  return Array.from({ length: count }, (_, i) => {
    const iso = toISODate(addDays(start, i * 7));
    const label =
      i === 0
        ? `This week — ${formatWeekLabel(iso)}`
        : `Week of ${formatWeekLabel(iso)}`;
    return { iso, label };
  });
}

export function dayOffset(weekStartISO, dateISO) {
  return Math.round((fromISODate(dateISO) - fromISODate(weekStartISO)) / 86400000);
}
