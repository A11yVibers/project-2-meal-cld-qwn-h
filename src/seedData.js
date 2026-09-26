// Seed data derived from the immutable CSV files in project-assets/.
// The CSVs are imported raw at build time and parsed here — lookup data is
// never duplicated by hand in application code.
import { parseCsv } from './csv.js'
import { APPROVED_IMAGES } from './approved-images.js'

import cuisinesCsv from '../project-assets/cuisines.csv?raw'
import dietaryTagsCsv from '../project-assets/dietary_tags.csv?raw'
import ingredientsCsv from '../project-assets/ingredients.csv?raw'
import mealTypesCsv from '../project-assets/meal_types.csv?raw'
import recipeCategoriesCsv from '../project-assets/recipe_categories.csv?raw'
import recipeIngredientsCsv from '../project-assets/recipe_ingredients.csv?raw'
import recipeStepsCsv from '../project-assets/recipe_steps.csv?raw'
import recipesCsv from '../project-assets/recipes.csv?raw'
import unitsCsv from '../project-assets/units.csv?raw'

export const CUISINES = parseCsv(cuisinesCsv)
export const DIETARY_TAGS = parseCsv(dietaryTagsCsv)
export const INGREDIENTS = parseCsv(ingredientsCsv)
export const MEAL_TYPES = parseCsv(mealTypesCsv)
export const RECIPE_CATEGORIES = parseCsv(recipeCategoriesCsv)
export const UNITS = parseCsv(unitsCsv)

export const CUISINE_BY_ID = Object.fromEntries(CUISINES.map((c) => [c.cuisine_id, c.cuisine_name]))
export const MEAL_TYPE_BY_ID = Object.fromEntries(MEAL_TYPES.map((m) => [m.meal_type_id, m.meal_type_name]))
export const TAG_BY_ID = Object.fromEntries(DIETARY_TAGS.map((t) => [t.dietary_tag_id, t.dietary_tag_name]))
export const CATEGORY_BY_ID = Object.fromEntries(RECIPE_CATEGORIES.map((c) => [c.category_id, c.category_name]))
export const INGREDIENT_BY_ID = Object.fromEntries(INGREDIENTS.map((i) => [i.ingredient_id, i]))

export const INGREDIENT_NAMES = INGREDIENTS.map((i) => i.ingredient_name)
export const UNIT_NAMES = UNITS.map((u) => u.unit_name)

// Planner slots come from the meal-type lookup (Breakfast, Lunch, Dinner, Snack).
export const PLAN_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
  .map((name) => MEAL_TYPES.find((t) => t.meal_type_name === name))
  .filter(Boolean)
export const PLAN_SLOT_NAMES = PLAN_SLOTS.map((s) => s.meal_type_name)

export const SHOPPING_CATEGORY_ORDER = [
  'Produce',
  'Meat & seafood',
  'Dairy & eggs',
  'Grains & pantry',
  'Oils & condiments',
  'Canned & jarred',
  'Spices',
  'Other',
]

export const SPICE_LEVELS = ['Not spicy', 'Mild', 'Medium', 'Spicy', 'Hot', 'Very spicy']

export const DEFAULT_RECIPE_OPTIONS = Object.freeze({
  includeInShoppingList: true,
  showNutrition: false,
  allowSubstitutions: true,
  unitSystem: 'us',
})

// Recipe options that the Recipe Options menu can control.
export const RECIPE_OPTION_DEFS = [
  { key: 'includeInShoppingList', label: 'Include ingredients in shopping lists', type: 'toggle' },
  { key: 'showNutrition', label: 'Show nutrition information', type: 'toggle' },
  { key: 'allowSubstitutions', label: 'Allow ingredient substitutions', type: 'toggle' },
]

function splitList(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const recipeRows = parseCsv(recipesCsv)
const ingredientRows = parseCsv(recipeIngredientsCsv)
const stepRows = parseCsv(recipeStepsCsv)

export const SEED_RECIPES = recipeRows.map((r) => {
  const prep = Number(r.prep_time_minutes) || 0
  const cook = Number(r.cook_time_minutes) || 0
  const ingredients = ingredientRows
    .filter((x) => x.recipe_id === r.recipe_id)
    .sort((a, b) => Number(a.display_order) - Number(b.display_order))
    .map((x) => ({
      sectionName: x.section_name || 'Main',
      ingredientId: x.ingredient_id || '',
      ingredientName: x.ingredient_name || '',
      quantity: x.quantity === '' ? null : Number(x.quantity),
      unit: x.unit || '',
      notes: x.notes || '',
      optional: String(x.optional).toLowerCase() === 'true',
    }))
  const steps = stepRows
    .filter((x) => x.recipe_id === r.recipe_id)
    .sort((a, b) => Number(a.step_number) - Number(b.step_number))
    .map((x) => ({
      instruction: x.instruction || '',
      timerMinutes: Number(x.timer_minutes) || 0,
    }))
  return {
    id: r.recipe_id,
    source: 'seed',
    title: r.title,
    shortDescription: r.short_description || '',
    sourceName: r.source_name || '',
    sourceUrl: r.source_url || '',
    servings: Number(r.servings) || 1,
    prepMinutes: prep,
    cookMinutes: cook,
    totalMinutes: Number(r.total_time_minutes) || prep + cook,
    cuisineId: r.cuisine_id || '',
    mealTypeId: r.meal_type_id || '',
    dietaryTagIds: splitList(r.dietary_tag_ids),
    categoryIds: splitList(r.category_ids),
    difficulty: r.difficulty_1_to_5 === '' ? null : Number(r.difficulty_1_to_5),
    spiceLevel: Number(r.spice_level_0_to_5) || 0,
    accentColor: r.accent_color || '#D97757',
    coverImageUrl: r.cover_image_url || '',
    includeInMealSuggestions: String(r.include_in_meal_suggestions).toLowerCase() === 'true',
    options: { ...DEFAULT_RECIPE_OPTIONS },
    ingredients,
    steps,
  }
})

export const SEED_RECIPE_BY_ID = Object.fromEntries(SEED_RECIPES.map((r) => [r.id, r]))

// Image policy: only remote URLs present in project-assets files or exported by
// src/approved-images.js may be used. The form offers exactly this pool.
export const PLACEHOLDER_IMAGE = APPROVED_IMAGES.placeholder
export const AVAILABLE_IMAGES = [...new Set([
  ...Object.values(APPROVED_IMAGES),
  ...SEED_RECIPES.map((r) => r.coverImageUrl).filter(Boolean),
])]

// Convenience lookups for display
export function cuisineName(id) {
  return CUISINE_BY_ID[id] || ''
}
export function mealTypeName(id) {
  return MEAL_TYPE_BY_ID[id] || ''
}
export function tagNames(ids) {
  return (ids || []).map((id) => TAG_BY_ID[id]).filter(Boolean)
}
export function categoryNames(ids) {
  return (ids || []).map((id) => CATEGORY_BY_ID[id]).filter(Boolean)
}
export function shoppingCategoryFor(ingredientId, ingredientName) {
  const ing = INGREDIENT_BY_ID[ingredientId]
  if (ing?.shopping_category) return ing.shopping_category
  if (!ingredientId) {
    const byName = INGREDIENTS.find(
      (i) => i.ingredient_name.toLowerCase() === String(ingredientName || '').toLowerCase()
    )
    if (byName?.shopping_category) return byName.shopping_category
  }
  return 'Other'
}
// Alternative catalog ingredients in the same shopping category (for substitutions).
export function substitutesFor(ingredientId, limit = 3) {
  const ing = INGREDIENT_BY_ID[ingredientId]
  if (!ing) return []
  return INGREDIENTS.filter(
    (i) => i.ingredient_id !== ingredientId && i.shopping_category === ing.shopping_category
  )
    .slice(0, limit)
    .map((i) => i.ingredient_name)
}
