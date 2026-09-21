// Lightweight, heuristic nutrition estimates derived from the ingredients that
// already exist in the supplied CSV data. This does NOT invent new data files;
// it maps master ingredients (ingredients.csv) to approximate per-unit macro
// values so the "Show nutrition information" recipe option has something to
// render. Values are rough approximations for planning only.
import { ingredientById } from './data.js'

// Approximate calories per common unit for a master ingredient.
const CAL_PER_UNIT = {
  cup: 200,
  tbsp: 60,
  tsp: 20,
  oz: 160,
  lb: 2560,
  g: 5.6,
  kg: 5600,
  ml: 5,
  L: 5000,
  piece: 70,
  clove: 5,
  can: 400,
  package: 800,
  pinch: 2,
  'to taste': 10,
}

// Macro split by shopping category (percent of calories).
const MACRO_SPLIT = {
  'Meat & seafood': { protein: 0.55, carbs: 0.02, fat: 0.43 },
  'Dairy & eggs': { protein: 0.28, carbs: 0.12, fat: 0.6 },
  'Grains & pantry': { protein: 0.12, carbs: 0.78, fat: 0.1 },
  Produce: { protein: 0.15, carbs: 0.75, fat: 0.1 },
  'Oils & condiments': { protein: 0.02, carbs: 0.18, fat: 0.8 },
  'Canned & jarred': { protein: 0.18, carbs: 0.6, fat: 0.22 },
  Spices: { protein: 0.1, carbs: 0.7, fat: 0.2 },
  Other: { protein: 0.15, carbs: 0.6, fat: 0.25 },
}

function caloriesFor(quantity, unit) {
  const q = Number(quantity)
  if (!Number.isFinite(q) || q <= 0) return 0
  const per = CAL_PER_UNIT[String(unit ?? '').trim().toLowerCase()] ?? 60
  return q * per
}

// Returns { calories, protein, carbs, fat } for a whole recipe, and per-serving.
export function estimateNutrition(recipe) {
  let calories = 0
  const macros = { protein: 0, carbs: 0, fat: 0 }

  for (const section of recipe.sections ?? []) {
    for (const ing of section.ingredients ?? []) {
      if (ing.optional) continue // conservative: exclude optional garnishes
      const cal = caloriesFor(ing.quantity, ing.unit)
      calories += cal
      const master = ing.ingredientId ? ingredientById[ing.ingredientId] : null
      const category = master?.shoppingCategory ?? 'Other'
      const split = MACRO_SPLIT[category] ?? MACRO_SPLIT.Other
      macros.protein += (cal * split.protein) / 4
      macros.carbs += (cal * split.carbs) / 4
      macros.fat += (cal * split.fat) / 9
    }
  }

  const servings = Math.max(1, Number(recipe.servings) || 1)
  return {
    servings,
    perServing: {
      calories: Math.round(calories / servings),
      protein: Math.round(macros.protein / servings),
      carbs: Math.round(macros.carbs / servings),
      fat: Math.round(macros.fat / servings),
    },
    isEstimate: true,
  }
}
