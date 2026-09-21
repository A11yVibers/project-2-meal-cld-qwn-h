// Data layer: parses the immutable CSV files in project-assets/ (imported as raw
// text so the CSVs stay the single source of truth) and joins them into recipe
// objects used across the app. Seed recipes come from recipes.csv +
// recipe_ingredients.csv + recipe_steps.csv; lookup data comes from the other CSVs.
import { csvToObjects, parseCsvBool, parseCsvList, parseCsvNumber } from './csv.js'

import cuisinesCsv from '../../project-assets/cuisines.csv?raw'
import dietaryTagsCsv from '../../project-assets/dietary_tags.csv?raw'
import ingredientsCsv from '../../project-assets/ingredients.csv?raw'
import mealTypesCsv from '../../project-assets/meal_types.csv?raw'
import recipeCategoriesCsv from '../../project-assets/recipe_categories.csv?raw'
import recipeIngredientsCsv from '../../project-assets/recipe_ingredients.csv?raw'
import recipeStepsCsv from '../../project-assets/recipe_steps.csv?raw'
import recipesCsv from '../../project-assets/recipes.csv?raw'
import unitsCsv from '../../project-assets/units.csv?raw'

// ---- Lookup tables -------------------------------------------------------

export const CUISINES = csvToObjects(cuisinesCsv).map((r) => ({
  id: r.cuisine_id,
  name: r.cuisine_name,
}))

export const DIETARY_TAGS = csvToObjects(dietaryTagsCsv).map((r) => ({
  id: r.dietary_tag_id,
  name: r.dietary_tag_name,
}))

export const MASTER_INGREDIENTS = csvToObjects(ingredientsCsv).map((r) => ({
  id: r.ingredient_id,
  name: r.ingredient_name,
  shoppingCategory: r.shopping_category,
}))

export const MEAL_TYPES = csvToObjects(mealTypesCsv).map((r) => ({
  id: r.meal_type_id,
  name: r.meal_type_name,
}))

export const RECIPE_CATEGORIES = csvToObjects(recipeCategoriesCsv).map((r) => ({
  id: r.category_id,
  name: r.category_name,
}))

export const UNITS = csvToObjects(unitsCsv).map((r) => ({
  id: r.unit_id,
  name: r.unit_name,
}))

export const cuisineById = Object.fromEntries(CUISINES.map((c) => [c.id, c.name]))
export const mealTypeById = Object.fromEntries(MEAL_TYPES.map((m) => [m.id, m.name]))
export const dietaryTagById = Object.fromEntries(DIETARY_TAGS.map((t) => [t.id, t.name]))
export const categoryById = Object.fromEntries(RECIPE_CATEGORIES.map((c) => [c.id, c.name]))
export const ingredientById = Object.fromEntries(MASTER_INGREDIENTS.map((i) => [i.id, i]))

export function lookupName(map, id, fallback = '') {
  return (id && map[id]) || fallback
}

// Slots used by the weekly planner, mapped to the meal_types.csv entries so the
// recipe form's "primary meal type" can suggest matching slots.
export const PLANNER_SLOTS = [
  { slot: 'Breakfast', mealTypeId: 'MT01', icon: '🌅' },
  { slot: 'Lunch', mealTypeId: 'MT02', icon: '☀️' },
  { slot: 'Dinner', mealTypeId: 'MT03', icon: '🌙' },
  { slot: 'Snack', mealTypeId: 'MT04', icon: '🍎' },
]

// Shopping categories, in the display order requested for the shopping list.
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

export function shoppingCategoryFor(ingredientId, ingredientName) {
  const master = ingredientById[ingredientId]
  if (master?.shoppingCategory) return master.shoppingCategory
  // Free-text ingredient that matches a master ingredient by name.
  const byName = MASTER_INGREDIENTS.find(
    (i) => i.name.toLowerCase() === String(ingredientName ?? '').toLowerCase(),
  )
  return byName?.shoppingCategory || 'Other'
}

// ---- Seed recipes --------------------------------------------------------

const DEFAULT_OPTIONS = Object.freeze({
  includeInShoppingList: true,
  showNutrition: false,
  allowSubstitutions: false,
})

export { DEFAULT_OPTIONS }

export function buildSeedRecipes() {
  const ingredientRows = csvToObjects(recipeIngredientsCsv)
  const stepRows = csvToObjects(recipeStepsCsv)

  return csvToObjects(recipesCsv).map((r) => {
    const id = r.recipe_id

    const ingRows = ingredientRows
      .filter((ri) => ri.recipe_id === id)
      .sort((a, b) => (parseCsvNumber(a.display_order) ?? 0) - (parseCsvNumber(b.display_order) ?? 0))

    // Group ingredient rows into named sections, preserving first-appearance order.
    const sections = []
    const sectionIndex = new Map()
    ingRows.forEach((ri, idx) => {
      const sectionName = ri.section_name || 'Ingredients'
      if (!sectionIndex.has(sectionName)) {
        sectionIndex.set(sectionName, sections.length)
        sections.push({ name: sectionName, ingredients: [] })
      }
      sections[sectionIndex.get(sectionName)].ingredients.push({
        key: `${id}-ing-${idx}`,
        ingredientId: ri.ingredient_id || null,
        name: ri.ingredient_name,
        quantity: parseCsvNumber(ri.quantity),
        unit: ri.unit || '',
        notes: ri.notes || '',
        optional: parseCsvBool(ri.optional),
      })
    })

    const steps = stepRows
      .filter((rs) => rs.recipe_id === id)
      .sort((a, b) => (parseCsvNumber(a.step_number) ?? 0) - (parseCsvNumber(b.step_number) ?? 0))
      .map((rs) => ({
        key: `${id}-step-${rs.step_number}`,
        instruction: rs.instruction,
        timerMinutes: parseCsvNumber(rs.timer_minutes) ?? 0,
      }))

    return {
      id,
      origin: 'seed',
      title: r.title,
      shortDescription: r.short_description || '',
      sourceName: r.source_name || '',
      sourceUrl: r.source_url || '',
      servings: parseCsvNumber(r.servings) ?? 4,
      prepMinutes: parseCsvNumber(r.prep_time_minutes) ?? 0,
      cookMinutes: parseCsvNumber(r.cook_time_minutes) ?? 0,
      totalMinutes:
        parseCsvNumber(r.total_time_minutes) ??
        (parseCsvNumber(r.prep_time_minutes) ?? 0) + (parseCsvNumber(r.cook_time_minutes) ?? 0),
      cuisineId: r.cuisine_id || '',
      mealTypeId: r.meal_type_id || '',
      dietaryTagIds: parseCsvList(r.dietary_tag_ids),
      categoryIds: parseCsvList(r.category_ids),
      difficulty: parseCsvNumber(r.difficulty_1_to_5) ?? 2,
      spiceLevel: parseCsvNumber(r.spice_level_0_to_5) ?? 0,
      accentColor: r.accent_color || '#D97757',
      coverImageUrl: r.cover_image_url || '',
      includeInSuggestions: parseCsvBool(r.include_in_meal_suggestions),
      options: { ...DEFAULT_OPTIONS },
      sections,
      steps,
    }
  })
}

export const SEED_RECIPES = buildSeedRecipes()

export const SPICE_LEVELS = [
  { value: 0, label: 'Not spicy' },
  { value: 1, label: 'Mild' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Spicy' },
  { value: 4, label: 'Very spicy' },
  { value: 5, label: 'Extreme' },
]

export function spiceLabel(level) {
  return SPICE_LEVELS.find((s) => s.value === Number(level))?.label ?? ''
}

// Preset accent colours offered in the recipe form's "image and appearance"
// section (users can also pick any custom colour).
export const ACCENT_SWATCHES = [
  '#D97757',
  '#8A9A5B',
  '#4C6EF5',
  '#E8590C',
  '#2B8A3E',
  '#B197FC',
  '#F06595',
  '#1098AD',
  '#F59F00',
  '#495057',
]

// Remote cover-image presets the form offers. Every URL here comes from the
// supplied project-assets data (seed recipe covers) or the approved-images
// module, so the app never generates or embeds image files itself.
export function coverImagePresets() {
  const urls = SEED_RECIPES.map((r) => r.coverImageUrl).filter(Boolean)
  return [...new Set(urls)]
}

// Simple ingredient substitution suggestions (master ingredient ids) used when a
// recipe's "allow ingredient substitutions" option is enabled.
export const SUBSTITUTIONS = {
  ING001: ['ING002'], // Chicken thigh -> Chicken breast
  ING002: ['ING001'], // Chicken breast -> Chicken thigh
  ING005: ['ING037'], // Ground beef -> Black beans
  ING008: ['ING030'], // Butter -> Olive oil
  ING010: ['ING035'], // Heavy cream -> Coconut milk
  ING025: ['ING027'], // Rice -> Noodles
  ING026: ['ING027'], // Pasta -> Noodles
  ING027: ['ING026'], // Noodles -> Pasta
  ING036: ['ING037'], // Chickpeas -> Black beans
  ING037: ['ING036'], // Black beans -> Chickpeas
  ING039: ['ING040'], // Cumin -> Paprika
  ING042: ['ING040'], // Chili flakes -> Paprika
}

export function substitutionsFor(ingredientId) {
  return (SUBSTITUTIONS[ingredientId] ?? [])
    .map((id) => ingredientById[id])
    .filter(Boolean)
    .map((i) => i.name)
}
