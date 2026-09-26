// Rough nutrition estimates used when a recipe's "Show nutrition information"
// option is enabled. Values are approximations per 100 g/ml of each catalog
// ingredient: [kcal, protein g, carbs g, fat g]. Estimates only, not lab data.
const PER_100G = {
  ING001: [120, 20, 0, 4],
  ING002: [110, 23, 0, 1.5],
  ING003: [208, 20, 0, 13],
  ING004: [99, 24, 0.2, 0.3],
  ING005: [250, 26, 0, 15],
  ING006: [143, 13, 0.7, 9.5],
  ING007: [59, 10, 3.6, 0.4],
  ING008: [717, 0.9, 0.1, 81],
  ING009: [431, 38, 4.1, 29],
  ING010: [340, 2.8, 2.8, 36],
  ING011: [31, 1, 6, 0.3],
  ING012: [40, 1.1, 9.3, 0.1],
  ING013: [149, 6.4, 33, 0.5],
  ING014: [41, 0.9, 10, 0.2],
  ING015: [34, 2.8, 7, 0.4],
  ING016: [23, 2.9, 3.6, 0.4],
  ING017: [17, 1.2, 3.1, 0.3],
  ING018: [20, 2.2, 3.9, 0.1],
  ING019: [22, 3.1, 3.3, 0.3],
  ING020: [32, 1.8, 7.3, 0.2],
  ING021: [18, 0.9, 3.9, 0.2],
  ING022: [29, 1.1, 9.3, 0.3],
  ING023: [80, 1.8, 18, 0.8],
  ING024: [77, 2, 17, 0.1],
  ING025: [365, 7.1, 80, 0.7],
  ING026: [371, 13, 75, 1.5],
  ING027: [352, 10, 71, 1.5],
  ING028: [265, 9, 49, 3.2],
  ING029: [364, 10, 76, 1],
  ING030: [884, 0, 0, 100],
  ING031: [53, 8.1, 4.9, 0.6],
  ING032: [884, 0, 0, 100],
  ING033: [304, 0.3, 82, 0],
  ING034: [198, 12.8, 26, 6],
  ING035: [230, 2.3, 5.5, 24],
  ING036: [164, 8.9, 27, 2.6],
  ING037: [132, 8.9, 24, 0.5],
  ING038: [32, 1.6, 7, 0.2],
  ING039: [375, 18, 44, 22],
  ING040: [282, 14, 54, 13],
  ING041: [312, 9.7, 67, 3.3],
  ING042: [318, 12, 58, 17],
  ING043: [251, 10, 64, 3.3],
  ING044: [0, 0, 0, 0],
}

// Approximate grams for each unit (defaults), with per-ingredient overrides
// for units whose weight varies a lot (cup of rice vs cup of spinach, etc.).
const UNIT_GRAMS = {
  g: 1, kg: 1000, oz: 28.35, lb: 453.6,
  ml: 1, L: 1000,
  cup: 150, tbsp: 15, tsp: 5,
  piece: 100, clove: 5, can: 400, package: 300, pinch: 0.3,
  'to taste': 0,
}
const UNIT_OVERRIDES = {
  'ING006:piece': 50, 'ING011:piece': 120, 'ING012:piece': 110, 'ING013:clove': 5,
  'ING014:piece': 61, 'ING015:cup': 91, 'ING016:cup': 30, 'ING019:cup': 70,
  'ING020:piece': 15, 'ING021:piece': 123, 'ING022:piece': 58, 'ING024:piece': 213,
  'ING025:cup': 185, 'ING026:cup': 90, 'ING027:cup': 60, 'ING028:piece': 30,
  'ING028:cup': 45, 'ING029:cup': 125, 'ING036:can': 240, 'ING037:can': 240,
  'ING038:can': 400, 'ING035:can': 400, 'ING009:cup': 100, 'ING007:cup': 245,
  'ING010:cup': 238, 'ING008:tbsp': 14, 'ING033:tbsp': 21,
}

function gramsFor(ingredientId, unit, qty) {
  const override = UNIT_OVERRIDES[`${ingredientId}:${unit}`]
  const perUnit = override != null ? override : UNIT_GRAMS[unit]
  if (perUnit == null) return null // unknown unit — cannot estimate
  return perUnit * qty
}

export function estimateNutrition(recipe) {
  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  let estimable = 0
  let total = 0
  for (const ing of recipe.ingredients || []) {
    const qty = typeof ing.quantity === 'number' ? ing.quantity : parseFloat(ing.quantity)
    if (!ing.ingredientId || !Number.isFinite(qty)) { total++; continue }
    const per100 = PER_100G[ing.ingredientId]
    const grams = gramsFor(ing.ingredientId, ing.unit, qty)
    if (!per100 || grams == null) { total++; continue }
    const factor = grams / 100
    totals.kcal += per100[0] * factor
    totals.protein += per100[1] * factor
    totals.carbs += per100[2] * factor
    totals.fat += per100[3] * factor
    estimable++; total++
  }
  const servings = Math.max(1, Number(recipe.servings) || 1)
  return {
    perServing: {
      kcal: Math.round(totals.kcal / servings),
      protein: Math.round(totals.protein / servings),
      carbs: Math.round(totals.carbs / servings),
      fat: Math.round(totals.fat / servings),
    },
    complete: total > 0 && estimable === total,
  }
}
