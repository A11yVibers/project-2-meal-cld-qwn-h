// US customary <-> metric quantity conversion and display formatting.
const US_TO_METRIC = {
  lb: ['g', 453.592],
  oz: ['g', 28.3495],
  cup: ['ml', 240],
  tbsp: ['ml', 15],
  tsp: ['ml', 5],
}
const G_PER_LB = 453.592
const G_PER_OZ = 28.3495

function round2(n) {
  return Math.round(n * 100) / 100
}

function mlToUs(ml) {
  if (ml >= 60) return { qty: round2(ml / 240), unit: 'cup' }
  if (ml >= 15) return { qty: round2(ml / 15), unit: 'tbsp' }
  return { qty: round2(ml / 5), unit: 'tsp' }
}

export function convertQuantity(qty, unit, system) {
  const n = typeof qty === 'number' ? qty : parseFloat(qty)
  if (!Number.isFinite(n) || !unit) return { qty: n, unit }
  if (system === 'metric') {
    const t = US_TO_METRIC[unit]
    if (t) {
      const converted = n * t[1]
      if (t[0] === 'g' && converted >= 1000) return { qty: round2(converted / 1000), unit: 'kg' }
      if (t[0] === 'ml' && converted >= 1000) return { qty: round2(converted / 1000), unit: 'L' }
      return { qty: round2(converted), unit: t[0] }
    }
    if (unit === 'g' && n >= 1000) return { qty: round2(n / 1000), unit: 'kg' }
    if (unit === 'ml' && n >= 1000) return { qty: round2(n / 1000), unit: 'L' }
    return { qty: n, unit }
  }
  if (system === 'us') {
    if (unit === 'g') {
      return n >= G_PER_LB
        ? { qty: round2(n / G_PER_LB), unit: 'lb' }
        : { qty: round2(n / G_PER_OZ), unit: 'oz' }
    }
    if (unit === 'kg') return { qty: round2((n * 1000) / G_PER_LB), unit: 'lb' }
    if (unit === 'ml') return mlToUs(n)
    if (unit === 'L') return mlToUs(n * 1000)
    return { qty: n, unit }
  }
  return { qty: n, unit }
}

export function formatQty(n) {
  if (n == null || !Number.isFinite(n)) return ''
  const r = Math.round(n * 100) / 100
  return String(r)
}

// Returns e.g. "1.5 lb" / "3 tbsp" / "to taste" for display in the chosen system.
export function displayQuantity(qty, unit, system) {
  const u = String(unit || '').trim()
  const n = typeof qty === 'number' ? qty : parseFloat(qty)
  if (!u) return Number.isFinite(n) ? formatQty(n) : ''
  if (!Number.isFinite(n)) return u // e.g. unit "to taste" with no quantity
  const c = convertQuantity(n, u, system)
  return `${formatQty(c.qty)} ${c.unit}`.trim()
}
