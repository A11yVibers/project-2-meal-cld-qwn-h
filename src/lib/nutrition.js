// Rough, clearly-labeled nutrition estimates derived from the recipe's own
// ingredients (the supplied CSVs contain no nutrition data). Values are
// approximate per 100 g, plus typical weights for countable units.
import { INGREDIENT_BY_ID } from './data.js'
import { convertQuantity } from './units.js'

// ingredientId -> [kcal, protein g, carbs g, fat g] per 100 g
const NUTRITION_PER_100G = {
  ING001: [230, 24, 0, 15],
  ING002: [165, 31, 0, 3.6],
  ING003: [208, 20, 0, 13],
  ING004: [99, 24, 0.2, 0.3],
  ING005: [250, 26, 0, 15],
  ING006: [143, 13, 1.1, 9.5],
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
  ING027: [356, 10, 71, 2.3],
  ING028: [265, 9, 49, 3.2],
  ING029: [364, 10, 76, 1],
  ING030: [884, 0, 0, 100],
  ING031: [53, 8.1, 4.9, 0.6],
  ING032: [884, 0, 0, 100],
  ING033: [304, 0.3, 82, 0],
  ING034: [198, 12.8, 26, 6],
  ING035: [197, 2, 2.8, 21],
  ING036: [139, 8.9, 27, 2.6],
  ING037: [132, 8.9, 24, 0.5],
  ING038: [32, 1.6, 7, 0.3],
  ING039: [375, 18, 44, 22],
  ING040: [282, 14, 54, 13],
  ING041: [312, 9.7, 67, 3.3],
  ING042: [318, 12, 57, 9],
  ING043: [251, 10, 64, 3.3],
  ING044: [0, 0, 0, 0],
}

// Typical weight in grams for countable units (defaults per unit).
const UNIT_GRAMS = {
  g: 1,
  kg: 1000,
  oz: 28,
  lb: 454,
  ml: 1,
  l: 1000,
  tsp: 5,
  tbsp: 15,
  cup: 240,
  piece: 100,
  clove: 5,
  can: 400,
  package: 300,
  pinch: 0.5,
  'to taste': 2,
}

// Per-ingredient overrides for "piece".
const PIECE_GRAMS = {
  ING006: 50, // egg
  ING011: 120, // bell pepper
  ING012: 110, // onion
  ING020: 15, // green onion
  ING021: 123, // tomato
  ING022: 58, // lemon
  ING024: 150, // potato
}

function gramsFor(item, unitSystem) {
  // Normalize into metric first so estimates are system-independent.
  const converted = convertQuantity(item.quantity, item.unit, 'metric')
  const unit = String(converted.unit || '').toLowerCase()
  const qty = Number(converted.quantity) || 0
  if (unit === 'piece') return qty * (PIECE_GRAMS[item.ingredientId] || UNIT_GRAMS.piece)
  const per = UNIT_GRAMS[unit]
  if (per == null) return 0
  return qty * per
}

export function estimateNutrition(recipe) {
  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  let known = 0
  let count = 0
  for (const section of recipe.ingredientSections || []) {
    for (const item of section.items || []) {
      count++
      const macros = NUTRITION_PER_100G[item.ingredientId]
      if (!macros) continue
      known++
      const grams = gramsFor(item, recipe?.options?.unitSystem)
      const factor = grams / 100
      totals.kcal += macros[0] * factor
      totals.protein += macros[1] * factor
      totals.carbs += macros[2] * factor
      totals.fat += macros[3] * factor
    }
  }
  const servings = Math.max(1, Number(recipe.servings) || 1)
  const round = (n) => Math.round(n)
  return {
    perServing: {
      kcal: round(totals.kcal / servings),
      protein: round((totals.protein / servings) * 10) / 10,
      carbs: round((totals.carbs / servings) * 10) / 10,
      fat: round((totals.fat / servings) * 10) / 10,
    },
    total: {
      kcal: round(totals.kcal),
      protein: round(totals.protein),
      carbs: round(totals.carbs),
      fat: round(totals.fat),
    },
    coverage: count ? known / count : 0,
  }
}

// Suggested ingredient substitutions (only shown when a recipe enables
// "Allow ingredient substitutions"). Uses ingredients from the supplied data.
const SUBSTITUTIONS = {
  ING001: ['ING002'],
  ING002: ['ING001'],
  ING003: ['ING004'],
  ING004: ['ING003', 'ING002'],
  ING007: ['ING010'],
  ING008: ['ING030'],
  ING010: ['ING035', 'ING007'],
  ING016: ['ING015'],
  ING025: ['ING027'],
  ING026: ['ING027'],
  ING027: ['ING026', 'ING025'],
  ING030: ['ING032', 'ING008'],
  ING031: ['ING034'],
  ING035: ['ING010'],
  ING036: ['ING037'],
  ING037: ['ING036'],
}

export function substitutionsFor(ingredientId) {
  const ids = SUBSTITUTIONS[ingredientId] || []
  return ids.map((id) => INGREDIENT_BY_ID[id]?.name).filter(Boolean)
}
