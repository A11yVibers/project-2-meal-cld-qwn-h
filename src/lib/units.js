// Unit system conversion helpers for displaying ingredient quantities in
// either US customary or metric units.

const US_VOLUME_TO_ML = {
  tsp: 5,
  tbsp: 15,
  cup: 240,
}
const US_WEIGHT_TO_G = {
  oz: 28,
  lb: 454,
}
// Countable / non-convertible units.
const COUNT_UNITS = new Set(['piece', 'clove', 'can', 'package', 'pinch', 'to taste'])

export function roundQty(n) {
  const r = Math.round(n * 100) / 100
  return Number.isInteger(r) ? r : r
}

export function formatQty(n, fractions = false) {
  if (!Number.isFinite(n)) return ''
  const r = Math.round(n * 1000) / 1000
  if (fractions) {
    // Show common kitchen fractions for cup/spoon amounts.
    const whole = Math.floor(r)
    const frac = r - whole
    const fractionTable = [
      [0.125, '⅛'],
      [0.25, '¼'],
      [0.333, '⅓'],
      [0.5, '½'],
      [0.667, '⅔'],
      [0.75, '¾'],
    ]
    for (const [value, glyph] of fractionTable) {
      if (Math.abs(frac - value) < 0.03) {
        return whole > 0 ? `${whole}${glyph}` : glyph
      }
    }
  }
  return String(r)
}

function metricVolume(ml) {
  if (ml >= 1000) return { quantity: roundQty(ml / 1000), unit: 'L' }
  return { quantity: roundQty(ml), unit: 'ml' }
}

function metricWeight(g) {
  if (g >= 1000) return { quantity: roundQty(g / 1000), unit: 'kg' }
  return { quantity: roundQty(g), unit: 'g' }
}

function usVolume(ml) {
  if (ml >= 240) return { quantity: roundQty(ml / 240), unit: 'cup', fractions: true }
  if (ml >= 15 && Math.abs(ml % 15) < 3) return { quantity: roundQty(ml / 15), unit: 'tbsp', fractions: true }
  if (ml >= 5 && Math.abs(ml % 5) < 1.5) return { quantity: roundQty(ml / 5), unit: 'tsp', fractions: true }
  return { quantity: roundQty(ml), unit: 'ml' }
}

function usWeight(g) {
  if (g >= 454) return { quantity: roundQty(g / 454), unit: 'lb' }
  if (g >= 28) return { quantity: roundQty(g / 28), unit: 'oz' }
  return { quantity: roundQty(g), unit: 'g' }
}

// Convert a quantity+unit into the target unit system ('us' | 'metric').
// Returns { quantity, unit } unchanged for countable units.
export function convertQuantity(quantity, unit, targetSystem) {
  const u = String(unit || '').toLowerCase()
  const qty = Number(quantity)
  if (!Number.isFinite(qty) || COUNT_UNITS.has(u)) {
    return { quantity: qty, unit: unit || '' }
  }
  if (targetSystem === 'metric') {
    if (US_VOLUME_TO_ML[u]) return metricVolume(qty * US_VOLUME_TO_ML[u])
    if (US_WEIGHT_TO_G[u]) return metricWeight(qty * US_WEIGHT_TO_G[u])
    if (u === 'g' || u === 'kg' || u === 'ml' || u === 'l') {
      if (u === 'kg') return metricWeight(qty * 1000)
      if (u === 'l') return metricVolume(qty * 1000)
      return { quantity: roundQty(qty), unit: unit }
    }
    return { quantity: roundQty(qty), unit: unit || '' }
  }
  // target US
  if (u === 'ml' || u === 'l') return usVolume(qty * (u === 'l' ? 1000 : 1))
  if (u === 'g' || u === 'kg') return usWeight(qty * (u === 'kg' ? 1000 : 1))
  return { quantity: roundQty(qty), unit: unit || '' }
}

export function formatQuantity(quantity, unit, unitSystem) {
  const converted = convertQuantity(quantity, unit, unitSystem)
  // US customary kitchen amounts read best as fractions (1½ lb, ½ cup);
  // metric amounts stay decimal.
  const useFractions = unitSystem !== 'metric' || Boolean(converted.fractions)
  const q = formatQty(converted.quantity, useFractions)
  if (!converted.unit || converted.unit === 'to taste' || converted.unit === 'pinch') {
    return converted.unit === 'to taste'
      ? `${q || ''} ${converted.unit}`.trim()
      : `${q} ${converted.unit}`.trim()
  }
  return `${q} ${converted.unit}`.trim()
}

// Normalize a quantity+unit into a canonical form for aggregation in the
// shopping list (metric base for convertible units so repeated ingredients
// across recipes with different unit systems can be combined).
export function canonicalForAggregation(quantity, unit, unitSystem) {
  const u = String(unit || '').toLowerCase()
  const qty = Number(quantity) || 0
  if (COUNT_UNITS.has(u) || u === '') {
    return { key: u || 'unit', quantity: qty, unit: unit || '', countable: true, kind: 'count' }
  }
  const converted = convertQuantity(qty, unit, unitSystem)
  const cu = String(converted.unit || '').toLowerCase()
  if (['g', 'kg'].includes(cu)) {
    return { key: 'weight-g', quantity: cu === 'kg' ? converted.quantity * 1000 : converted.quantity, unit: 'g', countable: false, kind: 'weight' }
  }
  if (['ml', 'l'].includes(cu)) {
    return { key: 'volume-ml', quantity: cu === 'l' ? converted.quantity * 1000 : converted.quantity, unit: 'ml', countable: false, kind: 'volume' }
  }
  // US units that did not convert (cup/tbsp/tsp/oz/lb/fl oz) — canonicalize.
  if (US_VOLUME_TO_ML[cu]) {
    return { key: 'volume-ml', quantity: qty * US_VOLUME_TO_ML[u] || converted.quantity * US_VOLUME_TO_ML[cu], unit: 'ml', countable: false, kind: 'volume' }
  }
  if (US_WEIGHT_TO_G[cu]) {
    return { key: 'weight-g', quantity: qty * US_WEIGHT_TO_G[u] || converted.quantity * US_WEIGHT_TO_G[cu], unit: 'g', countable: false, kind: 'weight' }
  }
  return { key: cu || 'unit', quantity: converted.quantity, unit: converted.unit || '', countable: true, kind: 'count' }
}

// Render an aggregated canonical amount in the preferred display system.
export function renderAggregated(kind, quantity, unitSystem, unit = '') {
  if (kind === 'weight') {
    const c = unitSystem === 'metric' ? metricWeight(quantity) : usWeight(quantity)
    return `${formatQty(c.quantity, c.fractions)} ${c.unit}`
  }
  if (kind === 'volume') {
    const c = unitSystem === 'metric' ? metricVolume(quantity) : usVolume(quantity)
    return `${formatQty(c.quantity, c.fractions)} ${c.unit}`
  }
  return `${formatQty(quantity)}${unit && unit !== 'unit' ? ` ${unit}` : ''}`.trim()
}
