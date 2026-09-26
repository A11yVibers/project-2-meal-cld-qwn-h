// Date helpers — all "ISO dates" are local-time YYYY-MM-DD strings.
export function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISODate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function todayISO() {
  return toISODate(new Date())
}

export function addDaysISO(iso, n) {
  const d = fromISODate(iso)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

// Weeks start on Monday.
export function startOfWeekISO(iso) {
  const d = fromISODate(iso)
  const dow = (d.getDay() + 6) % 7
  return addDaysISO(iso, -dow)
}

export function addWeeksISO(weekStartISO, n) {
  return addDaysISO(weekStartISO, n * 7)
}

export function weekDaysISO(weekStartISO) {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(weekStartISO, i))
}

export function fmtWeekdayShort(iso) {
  return fromISODate(iso).toLocaleDateString(undefined, { weekday: 'short' })
}

export function fmtDateShort(iso) {
  return fromISODate(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function fmtWeekRange(weekStartISO) {
  const a = fromISODate(weekStartISO)
  const b = fromISODate(addDaysISO(weekStartISO, 6))
  const left = a.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const right = b.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return `${left} – ${right}`
}
