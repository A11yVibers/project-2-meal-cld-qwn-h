// Temporary logic smoke test — bundled with Vite (so ?raw CSV imports work),
// run in Node, then deleted. Not part of the app.
import assert from 'node:assert/strict'
import { parseCsv } from '../src/lib/csv.js'
import {
  SEED_RECIPES, INGREDIENTS, UNITS, CUISINES, MEAL_TYPES, DIETARY_TAGS,
  CATEGORIES, shoppingCategoryFor, SHOPPING_CATEGORY_ORDER,
} from '../src/lib/data.js'
import { convertQuantity, formatQuantity, canonicalForAggregation, renderAggregated } from '../src/lib/units.js'
import { buildShoppingList } from '../src/lib/shopping.js'
import { estimateNutrition, substitutionsFor } from '../src/lib/nutrition.js'
import { startOfWeekKey, weekDays, weekLabel, weekOptions, formatTime12, addDays, toKey } from '../src/lib/dates.js'

// --- CSV parsing -----------------------------------------------------------
const parsed = parseCsv('a,b,c\n1,"x,y",say "hi"\n2,,\n')
assert.equal(parsed.length, 2)
assert.equal(parsed[0].b, 'x,y')
assert.equal(parsed[0].c, 'say "hi"')
assert.equal(parsed[1].b, '')

// --- Seed data ---------------------------------------------------------------
assert.equal(INGREDIENTS.length, 44, '44 ingredients')
assert.equal(UNITS.length, 15, '15 units')
assert.equal(CUISINES.length, 15)
assert.equal(MEAL_TYPES.length, 6)
assert.equal(DIETARY_TAGS.length, 9)
assert.equal(CATEGORIES.length, 10)
assert.equal(SEED_RECIPES.length, 2, '2 seed recipes')

const r1 = SEED_RECIPES.find((r) => r.id === 'R001')
assert.equal(r1.title, 'Honey Garlic Salmon Bowls')
assert.deepEqual(r1.dietaryTagIds, ['DT06', 'DT05'])
assert.deepEqual(r1.categoryIds, ['RC01', 'RC04', 'RC10'])
assert.equal(r1.totalMinutes, 40)
assert.equal(r1.spiceLevel, 3)
assert.equal(r1.includeInMealSuggestions, true)
assert.equal(r1.accentColor, '#D97757')
assert.equal(r1.ingredientSections.length, 3, 'R001 sections: Main, Sauce, Vegetables')
assert.deepEqual(r1.ingredientSections.map((s) => s.name), ['Main', 'Sauce', 'Vegetables'])
assert.equal(r1.ingredientSections[0].items.length, 2)
assert.equal(r1.steps.length, 5)
assert.equal(r1.steps[2].timerMinutes, 10)
const greenOnion = r1.ingredientSections[2].items[1]
assert.equal(greenOnion.optional, true, 'green onion is optional')

const r2 = SEED_RECIPES.find((r) => r.id === 'R002')
assert.equal(r2.ingredientSections.length, 4)
assert.equal(r2.steps.length, 5)

// --- Shopping categories ------------------------------------------------------
assert.equal(shoppingCategoryFor('ING003'), 'Meat & seafood')
assert.equal(shoppingCategoryFor('ING012'), 'Produce')
assert.equal(shoppingCategoryFor(null, 'Dragon fruit'), 'Other')
assert.equal(SHOPPING_CATEGORY_ORDER[0], 'Produce')

// --- Unit conversion -----------------------------------------------------------
assert.deepEqual(convertQuantity(1.5, 'lb', 'metric'), { quantity: 681, unit: 'g' })
assert.deepEqual(convertQuantity(0.5, 'cup', 'metric'), { quantity: 120, unit: 'ml' })
assert.deepEqual(convertQuantity(2, 'clove', 'metric'), { quantity: 2, unit: 'clove' })
assert.equal(formatQuantity(3, 'tbsp', 'us'), '3 tbsp')
assert.equal(formatQuantity(1, 'kg', 'us'), '2.2 lb')
assert.equal(formatQuantity(0.5, 'cup', 'metric'), '120 ml')
assert.equal(formatQuantity(1.5, 'cup', 'metric'), '360 ml')
assert.equal(formatQuantity(2, 'kg', 'metric'), '2 kg')
assert.equal(formatQuantity(1, '', 'metric'), '1')

// Aggregation canonicalization
assert.deepEqual(canonicalForAggregation(3, 'tbsp', 'us'), { key: 'volume-ml', quantity: 45, unit: 'ml', countable: false, kind: 'volume' })
assert.deepEqual(canonicalForAggregation(4, 'clove', 'us'), { key: 'clove', quantity: 4, unit: 'clove', countable: true, kind: 'count' })
assert.equal(renderAggregated('weight', 1362, 'us'), '3 lb')
assert.equal(renderAggregated('volume', 45, 'metric'), '45 ml')
assert.equal(renderAggregated('volume', 30, 'us'), '2 tbsp')
assert.equal(renderAggregated('count', 4, 'us', 'clove'), '4 clove')

// --- Shopping list build ---------------------------------------------------------
const getRecipe = (id) => SEED_RECIPES.find((r) => r.id === id) || null
const assignments = [
  { id: 'a1', date: '2026-09-14', slot: 'dinner', recipeId: 'R001' },
  { id: 'a2', date: '2026-09-15', slot: 'dinner', recipeId: 'R001' },
  { id: 'a3', date: '2026-09-16', slot: 'lunch', recipeId: 'R002' },
]
const list = buildShoppingList({
  assignments,
  getRecipe,
  displayUnitSystem: 'us',
  pantrySet: new Set(['ING044']),
  excludePantry: true,
})
const allItems = list.categories.flatMap((c) => c.items)
// Salmon appears twice (2 dinners) → combined 3 lb
const salmon = allItems.find((i) => i.ingredientName === 'Salmon')
assert.ok(salmon, 'salmon present')
assert.equal(salmon.displayAmount, '3 lb', `salmon combined to 3 lb, got ${salmon.displayAmount}`)
assert.equal(salmon.sources.length, 2)
assert.equal(salmon.category, 'Meat & seafood')
// Garlic appears in both recipes → 4+4 (R001 ×2) + 3 (R002) = 11 clove
const garlic = allItems.find((i) => i.ingredientName === 'Garlic')
assert.equal(garlic.displayAmount, '11 clove', `garlic 11 clove, got ${garlic.displayAmount}`)
assert.equal(garlic.sources.length, 3)
// Black pepper from R002 is optional
const pepper = allItems.find((i) => i.ingredientName === 'Black pepper')
assert.equal(pepper.optional, true)
// Categories ordered per SHOPPING_CATEGORY_ORDER
const catNames = list.categories.map((c) => c.category)
assert.deepEqual(
  catNames,
  [...catNames].sort((a, b) => SHOPPING_CATEGORY_ORDER.indexOf(a) - SHOPPING_CATEGORY_ORDER.indexOf(b)),
  'categories in canonical order',
)
assert.ok(catNames.includes('Produce') && catNames.includes('Grains & pantry'))
// Metric display
const listMetric = buildShoppingList({ assignments, getRecipe, displayUnitSystem: 'metric', pantrySet: new Set(), excludePantry: false })
const salmonM = listMetric.categories.flatMap((c) => c.items).find((i) => i.ingredientName === 'Salmon')
assert.equal(salmonM.displayAmount, '1.36 kg', `metric salmon, got ${salmonM.displayAmount}`)
// Recipes with includeInShoppingList=false are skipped
const noShopRecipe = { ...r2, options: { ...r2.options, includeInShoppingList: false } }
const listSkip = buildShoppingList({
  assignments,
  getRecipe: (id) => (id === 'R002' ? noShopRecipe : getRecipe(id)),
  displayUnitSystem: 'us',
  pantrySet: new Set(),
  excludePantry: false,
})
assert.ok(!listSkip.categories.flatMap((c) => c.items).some((i) => i.ingredientName === 'Pasta'), 'pasta skipped')
// Pantry exclusion
const listPantry = buildShoppingList({ assignments, getRecipe, displayUnitSystem: 'us', pantrySet: new Set(['ING025']), excludePantry: true })
assert.ok(!listPantry.categories.flatMap((c) => c.items).some((i) => i.ingredientName === 'Rice'), 'rice excluded (pantry)')
assert.equal(listPantry.excludedItems.length, 1)

// --- Nutrition + substitutions ------------------------------------------------------
const nut = estimateNutrition(r1)
assert.ok(nut.perServing.kcal > 200 && nut.perServing.kcal < 1500, `kcal plausible: ${nut.perServing.kcal}`)
assert.ok(nut.perServing.protein > 10, 'protein plausible')
assert.equal(nut.coverage, 1)
assert.deepEqual(substitutionsFor('ING036'), ['Black beans'])
assert.deepEqual(substitutionsFor('ING999'), [])

// --- Dates ------------------------------------------------------------------------------
assert.equal(startOfWeekKey('2026-09-16'), '2026-09-14', 'Wed 2026-09-16 → Monday 2026-09-14')
assert.equal(startOfWeekKey('2026-09-14'), '2026-09-14', 'Monday is its own week start')
const days = weekDays('2026-09-14')
assert.equal(days.length, 7)
assert.equal(days[0].key, '2026-09-14')
assert.equal(days[6].key, '2026-09-20')
assert.match(weekLabel('2026-09-14'), /Sep 14/)
assert.equal(weekOptions(2, 12).length, 15)
assert.equal(formatTime12('19:30'), '7:30 PM')
assert.equal(formatTime12('09:05'), '9:05 AM')
assert.equal(toKey(addDays(new Date(2026, 8, 14), 3)), '2026-09-17')

console.log('ALL SMOKE TESTS PASSED')
