// Rough nutrition estimates + substitution hints for the recipe options.
// Not part of the supplied CSV data — values are generic approximations and
// are always labeled as estimates in the UI.

const KCAL_PER_100G = {
  ING001: 209, ING002: 165, ING003: 208, ING004: 99, ING005: 250,
  ING006: 155, ING007: 59, ING008: 717, ING009: 431, ING010: 340,
  ING011: 31, ING012: 40, ING013: 149, ING014: 41, ING015: 34,
  ING016: 23, ING017: 17, ING018: 20, ING019: 22, ING020: 32,
  ING021: 18, ING022: 29, ING023: 80, ING024: 77, ING025: 365,
  ING026: 371, ING027: 370, ING028: 265, ING029: 364, ING030: 884,
  ING031: 53, ING032: 884, ING033: 304, ING034: 199, ING035: 197,
  ING036: 164, ING037: 132, ING038: 32, ING039: 375, ING040: 282,
  ING041: 312, ING042: 318, ING043: 251, ING044: 0,
};

const UNIT_GRAMS = {
  g: 1, kg: 1000, oz: 28.3495, lb: 453.592,
  ml: 1, L: 1000, tsp: 5, tbsp: 15, cup: 240,
  piece: 100, clove: 5, can: 400, package: 250, pinch: 0.3,
};

const PIECE_GRAMS = {
  ING006: 50, ING011: 120, ING012: 110, ING020: 15,
  ING021: 120, ING022: 58, ING024: 200,
};

export function estimateCalories(recipe) {
  let total = 0;
  let known = 0;
  let all = 0;
  for (const section of recipe.sections || []) {
    for (const ing of section.items || []) {
      if (!ing.name) continue;
      all++;
      const kcal = KCAL_PER_100G[ing.ingredientId];
      const qty = parseFloat(ing.quantity);
      if (kcal == null || !isFinite(qty) || qty <= 0) continue;
      let grams = qty * (UNIT_GRAMS[ing.unit] ?? 100);
      if (ing.unit === 'piece' || ing.unit === 'clove') {
        grams = qty * (PIECE_GRAMS[ing.ingredientId] ?? UNIT_GRAMS[ing.unit]);
      }
      total += (grams * kcal) / 100;
      known++;
    }
  }
  if (!known) return null;
  return {
    totalKcal: Math.round(total),
    perServingKcal: Math.round(total / (recipe.servings || 1)),
    known,
    all,
  };
}

export const SUBSTITUTIONS = {
  ING001: 'Chicken breast or firm tofu',
  ING002: 'Chicken thigh or firm tofu',
  ING003: 'Arctic char or a firm white fish',
  ING004: 'Chicken breast or tofu',
  ING005: 'Ground turkey or lentils',
  ING006: 'Flax egg (1 tbsp ground flax + 3 tbsp water)',
  ING007: 'Sour cream or skyr',
  ING008: 'Olive oil or ghee',
  ING009: 'Pecorino or nutritional yeast',
  ING010: 'Coconut milk or cashew cream',
  ING013: '1/4 tsp garlic powder per clove',
  ING016: 'Kale or Swiss chard',
  ING019: 'Zucchini or eggplant',
  ING025: 'Quinoa or cauliflower rice',
  ING026: 'Gluten-free pasta or zucchini noodles',
  ING027: 'Rice noodles or pasta',
  ING028: 'Gluten-free bread or wraps',
  ING029: 'Gluten-free flour blend',
  ING031: 'Tamari or coconut aminos',
  ING033: 'Maple syrup or agave',
  ING034: 'Soy sauce with a pinch of sugar',
  ING035: 'Heavy cream or oat cream',
  ING036: 'White beans or lentils',
  ING037: 'Pinto beans or lentils',
  ING038: 'Fresh tomatoes with a spoon of tomato paste',
  ING042: 'Cayenne or your favorite hot sauce',
};

export function substitutionFor(ingredient) {
  return SUBSTITUTIONS[ingredient.ingredientId] || null;
}
