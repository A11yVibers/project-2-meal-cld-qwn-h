// Loads the immutable CSV data from project-assets/ (imported raw at build
// time — the source files are never modified) and shapes it into the
// lookup tables and seed recipes used by the app.
import { parseCsv, parseCsvBool, parseCsvList, parseCsvNumber } from './csv.js'

import cuisinesCsv from '../../project-assets/cuisines.csv?raw'
import dietaryTagsCsv from '../../project-assets/dietary_tags.csv?raw'
import ingredientsCsv from '../../project-assets/ingredients.csv?raw'
import mealTypesCsv from '../../project-assets/meal_types.csv?raw'
import recipeCategoriesCsv from '../../project-assets/recipe_categories.csv?raw'
import recipeIngredientsCsv from '../../project-assets/recipe_ingredients.csv?raw'
import recipeStepsCsv from '../../project-assets/recipe_steps.csv?raw'
import recipesCsv from '../../project-assets/recipes.csv?raw'
import unitsCsv from '../../project-assets/units.csv?raw'

export const CUISINES = parseCsv(cuisinesCsv).map((r) => ({
  id: r.cuisine_id,
  name: r.cuisine_name,
}))

export const MEAL_TYPES = parseCsv(mealTypesCsv).map((r) => ({
  id: r.meal_type_id,
  name: r.meal_type_name,
}))

export const DIETARY_TAGS = parseCsv(dietaryTagsCsv).map((r) => ({
  id: r.dietary_tag_id,
  name: r.dietary_tag_name,
}))

export const CATEGORIES = parseCsv(recipeCategoriesCsv).map((r) => ({
  id: r.category_id,
  name: r.category_name,
}))

export const INGREDIENTS = parseCsv(ingredientsCsv).map((r) => ({
  id: r.ingredient_id,
  name: r.ingredient_name,
  shoppingCategory: r.shopping_category,
}))

export const UNITS = parseCsv(unitsCsv).map((r) => ({
  id: r.unit_id,
  name: r.unit_name,
}))

const byId = (list) => Object.fromEntries(list.map((item) => [item.id, item]))

export const CUISINE_BY_ID = byId(CUISINES)
export const MEAL_TYPE_BY_ID = byId(MEAL_TYPES)
export const DIETARY_TAG_BY_ID = byId(DIETARY_TAGS)
export const CATEGORY_BY_ID = byId(CATEGORIES)
export const INGREDIENT_BY_ID = byId(INGREDIENTS)

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
  const ing = INGREDIENT_BY_ID[ingredientId]
  if (ing && ing.shoppingCategory) return ing.shoppingCategory
  const byName = INGREDIENTS.find(
    (i) => i.name.toLowerCase() === String(ingredientName || '').toLowerCase(),
  )
  return byName?.shoppingCategory || 'Other'
}

export const DEFAULT_RECIPE_OPTIONS = Object.freeze({
  includeInShoppingList: true,
  showNutrition: false,
  allowSubstitutions: false,
  unitSystem: 'us', // 'us' | 'metric'
})

const seedIngredients = parseCsv(recipeIngredientsCsv)
const seedSteps = parseCsv(recipeStepsCsv)

function buildSeedRecipes() {
  return parseCsv(recipesCsv).map((r) => {
    const recipeId = r.recipe_id
    const items = seedIngredients
      .filter((ri) => ri.recipe_id === recipeId)
      .sort((a, b) => parseCsvNumber(a.display_order) - parseCsvNumber(b.display_order))

    // Group consecutive ingredient rows into named sections, preserving order.
    const sections = []
    for (const item of items) {
      const sectionName = item.section_name || 'Ingredients'
      let section = sections[sections.length - 1]
      if (!section || section.name !== sectionName) {
        section = { name: sectionName, items: [] }
        sections.push(section)
      }
      section.items.push({
        ingredientId: item.ingredient_id || null,
        ingredientName: item.ingredient_name,
        quantity: parseCsvNumber(item.quantity, 0),
        unit: item.unit || '',
        notes: item.notes || '',
        optional: parseCsvBool(item.optional),
      })
    }

    const steps = seedSteps
      .filter((rs) => rs.recipe_id === recipeId)
      .sort((a, b) => parseCsvNumber(a.step_number) - parseCsvNumber(b.step_number))
      .map((rs) => ({
        instruction: rs.instruction,
        timerMinutes: parseCsvNumber(rs.timer_minutes, 0),
      }))

    const prep = parseCsvNumber(r.prep_time_minutes, 0)
    const cook = parseCsvNumber(r.cook_time_minutes, 0)

    return {
      id: recipeId,
      title: r.title,
      shortDescription: r.short_description,
      sourceName: r.source_name,
      sourceUrl: r.source_url,
      servings: parseCsvNumber(r.servings, 4),
      prepMinutes: prep,
      cookMinutes: cook,
      totalMinutes: parseCsvNumber(r.total_time_minutes, prep + cook),
      cuisineId: r.cuisine_id || '',
      mealTypeId: r.meal_type_id || '',
      dietaryTagIds: parseCsvList(r.dietary_tag_ids),
      categoryIds: parseCsvList(r.category_ids),
      difficulty: parseCsvNumber(r.difficulty_1_to_5, 0),
      spiceLevel: parseCsvNumber(r.spice_level_0_to_5, 0),
      accentColor: r.accent_color || '#D97757',
      coverImageUrl: r.cover_image_url || '',
      includeInMealSuggestions: parseCsvBool(r.include_in_meal_suggestions),
      options: { ...DEFAULT_RECIPE_OPTIONS },
      ingredientSections: sections,
      steps,
      isUser: false,
    }
  })
}

export const SEED_RECIPES = buildSeedRecipes()
export const SEED_RECIPE_IDS = SEED_RECIPES.map((r) => r.id)

// Every remote image URL that appears in the supplied project-assets data.
// The image policy only permits these plus src/approved-images.js exports.
export const ASSET_IMAGE_URLS = SEED_RECIPES.map((r) => r.coverImageUrl).filter(Boolean)

export const SPICE_LEVELS = [
  { value: 0, label: 'No heat' },
  { value: 1, label: 'Mild' },
  { value: 2, label: 'Mild+' },
  { value: 3, label: 'Medium' },
  { value: 4, label: 'Spicy' },
  { value: 5, label: 'Very spicy' },
]

export function spiceLabel(level) {
  return SPICE_LEVELS.find((s) => s.value === Number(level))?.label || 'Mild'
}

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack']

export function slotLabel(slot) {
  return slot.charAt(0).toUpperCase() + slot.slice(1)
}
