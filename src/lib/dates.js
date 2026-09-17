// Small date helpers. Weeks start on Monday and week keys are the ISO-style
// 'YYYY-MM-DD' date of the week's Monday.

export function toKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromKey(key) {
  const [y, m, d] = String(key).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function todayKey() {
  return toKey(new Date())
}

export function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function startOfWeek(date) {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // Monday = 0
  return addDays(d, -day)
}

export function startOfWeekKey(key) {
  return toKey(startOfWeek(fromKey(key)))
}

export function weekDays(weekStartKey) {
  const start = fromKey(weekStartKey)
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i)
    return { key: toKey(date), date }
  })
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function dayShortName(key) {
  return DAY_NAMES[(fromKey(key).getDay() + 6) % 7]
}

export function fmtShort(key) {
  return fromKey(key).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function fmtMedium(key) {
  return fromKey(key).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function fmtLong(key) {
  return fromKey(key).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function weekLabel(weekStartKey) {
  const days = weekDays(weekStartKey)
  const start = days[0].date
  const end = days[6].date
  const sameMonth = start.getMonth() === end.getMonth()
  const startText = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
  const endText = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${startText} – ${endText}`
}

export function shiftWeek(weekStartKey, deltaWeeks) {
  return toKey(addDays(fromKey(weekStartKey), deltaWeeks * 7))
}

// Build a list of selectable weeks (past through future) for forms.
export function weekOptions(weeksBack = 2, weeksAhead = 12) {
  const current = startOfWeekKey(todayKey())
  const options = []
  for (let i = -weeksBack; i <= weeksAhead; i++) {
    const key = shiftWeek(current, i)
    options.push({
      key,
      label: `Week of ${fmtMedium(key)}${i === 0 ? ' (this week)' : ''}`,
    })
  }
  return options
}

export function formatTime12(hhmm) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  if (!Number.isFinite(h)) return hhmm
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m || 0).padStart(2, '0')} ${ampm}`
}
