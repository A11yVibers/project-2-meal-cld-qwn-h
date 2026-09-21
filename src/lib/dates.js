// Local-time date helpers (weeks start on Monday). Dates are stored/persisted as
// "YYYY-MM-DD" strings so they survive refreshes without timezone drift.

export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromISODate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function todayISO() {
  return toISODate(new Date())
}

export function addDaysISO(iso, days) {
  const date = fromISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function addWeeksISO(iso, weeks) {
  return addDaysISO(iso, weeks * 7)
}

// Monday of the week containing the given ISO date.
export function weekStartISO(iso) {
  const date = fromISODate(iso)
  const day = date.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return toISODate(date)
}

export function weekDaysISO(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i))
}

const DAY_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const DAY_NUM_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
})
const RANGE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function dayLabel(iso) {
  return DAY_FORMATTER.format(fromISODate(iso)) // e.g. "Mon"
}

export function dayNumberLabel(iso) {
  return DAY_NUM_FORMATTER.format(fromISODate(iso)) // e.g. "Sep 22"
}

export function longDateLabel(iso) {
  return RANGE_FORMATTER.format(fromISODate(iso)) // e.g. "Sep 22, 2026"
}

export function weekRangeLabel(weekStart) {
  const end = addDaysISO(weekStart, 6)
  return `${DAY_NUM_FORMATTER.format(fromISODate(weekStart))} – ${RANGE_FORMATTER.format(
    fromISODate(end),
  )}`
}

export function isToday(iso) {
  return iso === todayISO()
}

export function isSameWeek(isoA, isoB) {
  return weekStartISO(isoA) === weekStartISO(isoB)
}
