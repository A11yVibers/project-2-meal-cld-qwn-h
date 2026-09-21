// Derives the shopping list from the recipes assigned to a given week of the
// meal plan. Repeated ingredients are combined when they share the same unit,
// and items are organized into the shopping categories from ingredients.csv.
import { SHOPPING_CATEGORY_ORDER, shoppingCategoryFor } from './data.js'
import { combineQuantities } from './units.js'

// Stable key for an ingredient line (used for check-off + pantry persistence).
export function ingredientKey(ingredientId, name) {
  return ingredientId || `name:${String(name ?? '').trim().toLowerCase()}`
}

// items: array of {key, name, ingredientId, quantity, unit, notes, optional, category, recipes:[titles]}
export function generateShoppingItems(assignmentsForWeek, getRecipe) {
  const combined = new Map()

  for (const assignment of assignmentsForWeek) {
    const recipe = getRecipe(assignment.recipeId)
    if (!recipe) continue
    const options = recipe.options ?? {}
    if (options.includeInShoppingList === false) continue

    for (const section of recipe.sections ?? []) {
      for (const ing of section.ingredients ?? []) {
        if (!ing.name) continue
        const key = ingredientKey(ing.ingredientId, ing.name)
        const unit = String(ing.unit ?? '').trim().toLowerCase()
        const compositeKey = `${key}|${unit}`
        const category = shoppingCategoryFor(ing.ingredientId, ing.name)

        const existing = combined.get(compositeKey)
        if (existing) {
          existing.quantity = combineQuantities(existing.quantity, ing.quantity)
          if (ing.notes && !existing.notesList.includes(ing.notes)) {
            existing.notesList.push(ing.notes)
          }
          existing.optional = existing.optional && Boolean(ing.optional)
          if (!existing.recipes.includes(recipe.title)) existing.recipes.push(recipe.title)
        } else {
          combined.set(compositeKey, {
            key,
            compositeKey,
            ingredientId: ing.ingredientId ?? null,
            name: ing.name,
            quantity: ing.quantity ?? null,
            unit: unit,
            notesList: ing.notes ? [ing.notes] : [],
            optional: Boolean(ing.optional),
            category,
            recipes: [recipe.title],
          })
        }
      }
    }
  }

  return [...combined.values()].map((item) => ({
    ...item,
    notes: item.notesList.join(', '),
  }))
}

export function groupItemsByCategory(items) {
  const groups = new Map()
  for (const cat of SHOPPING_CATEGORY_ORDER) groups.set(cat, [])
  for (const item of items) {
    if (!groups.has(item.category)) groups.set(item.category, [])
    groups.get(item.category).push(item)
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name))
  }
  return [...groups.entries()].filter(([, list]) => list.length > 0)
}
