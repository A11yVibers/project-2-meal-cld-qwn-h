// Unit conversion + quantity formatting for the US customary / metric display
// preference (the mutually-exclusive choice in the Recipe Options menu).

export const MEASUREMENT_SYSTEMS = [
  { id: 'us', label: 'US customary' },
  { id: 'metric', label: 'Metric' },
]

const US_VOLUME = new Set(['cup', 'tbsp', 'tsp'])
const US_WEIGHT = new Set(['oz', 'lb'])
const METRIC_VOLUME = new Set(['ml', 'L'])
const METRIC_WEIGHT = new Set(['g', 'kg'])

function roundSmart(n) {
  if (!Number.isFinite(n)) return n
  if (Math.abs(n) >= 100) return Math.round(n)
  if (Math.abs(n) >= 10) return Math.round(n * 10) / 10
  const r = Math.round(n * 100) / 100
  return r
}

export function formatQuantity(q) {
  if (q === null || q === undefined || !Number.isFinite(Number(q))) return ''
  const n = roundSmart(Number(q))
  // Render common cooking fractions nicely.
  const frac = { 0.25: '¼', 0.5: '½', 0.75: '¾', 0.33: '⅓', 0.67: '⅔' }
  const whole = Math.floor(n)
  const rest = Math.round((n - whole) * 100) / 100
  if (frac[rest] !== undefined) return whole > 0 ? `${whole}${frac[rest]}` : frac[rest]
  return String(n)
}

// Converts a {quantity, unit} pair into the requested measurement system.
// Non-convertible units (piece, clove, can, pinch, to taste, …) pass through.
export function convertQuantity(quantity, unit, system) {
  const q = Number(quantity)
  if (!Number.isFinite(q) || !unit) return { quantity, unit: unit || '' }

  const u = String(unit).trim()

  if (system === 'metric') {
    if (u === 'cup') return { quantity: roundSmart(q * 240), unit: 'ml' }
    if (u === 'tbsp') return { quantity: roundSmart(q * 15), unit: 'ml' }
    if (u === 'tsp') return { quantity: roundSmart(q * 5), unit: 'ml' }
    if (u === 'oz') return { quantity: roundSmart(q * 28.35), unit: 'g' }
    if (u === 'lb') return { quantity: roundSmart(q * 453.6), unit: 'g' }
    return { quantity: q, unit: u }
  }

  if (system === 'us') {
    if (u === 'ml') {
      if (q < 15) return { quantity: roundSmart(q / 5), unit: 'tsp' }
      if (q < 80) return { quantity: roundSmart(q / 15), unit: 'tbsp' }
      return { quantity: roundSmart(q / 240), unit: 'cup' }
    }
    if (u === 'L') return { quantity: roundSmart((q * 1000) / 240), unit: 'cup' }
    if (u === 'g') {
      if (q >= 453.6) return { quantity: roundSmart(q / 453.6), unit: 'lb' }
      return { quantity: roundSmart(q / 28.35), unit: 'oz' }
    }
    if (u === 'kg') return { quantity: roundSmart(q * 2.2046), unit: 'lb' }
    return { quantity: q, unit: u }
  }

  return { quantity: q, unit: u }
}

// "1½ lb", "400 g", "to taste" …
export function formatMeasure(quantity, unit, system) {
  const converted = convertQuantity(quantity, unit, system)
  const q = formatQuantity(converted.quantity)
  const u = converted.unit || ''
  return [q, u].filter(Boolean).join(' ')
}

export function isVolumeUnit(unit) {
  return US_VOLUME.has(unit) || METRIC_VOLUME.has(unit)
}
export function isWeightUnit(unit) {
  return US_WEIGHT.has(unit) || METRIC_WEIGHT.has(unit)
}

// Combines two quantities of the same unit (used by the shopping list).
export function combineQuantities(a, b) {
  const na = Number(a)
  const nb = Number(b)
  if (Number.isFinite(na) && Number.isFinite(nb)) return na + nb
  if (Number.isFinite(na)) return na
  if (Number.isFinite(nb)) return nb
  return null
}
