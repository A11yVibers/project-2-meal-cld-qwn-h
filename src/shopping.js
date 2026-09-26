// Generates the shopping list from the recipes placed in a given week of the
// meal plan. Repeated ingredients are combined per (ingredient, display unit).
import { weekDaysISO } from './dates.js'
import { convertQuantity, formatQty } from './units.js'
import { PLAN_SLOT_NAMES, SHOPPING_CATEGORY_ORDER, shoppingCategoryFor } from './seedData.js'

export function ingredientKeyOf(ing) {
  return ing.ingredientId || `custom:${String(ing.ingredientName || '').trim().toLowerCase()}`
}

export function buildShoppingList(weekStart, store) {
  const { plan, getRecipe, optionsFor } = store
  const map = new Map() // itemKey -> item
  const recipeIds = new Set()

  for (const date of weekDaysISO(weekStart)) {
    const dayPlan = plan[date]
    if (!dayPlan) continue
    for (const slot of PLAN_SLOT_NAMES) {
      const assignment = dayPlan[slot]
      if (!assignment?.recipeId) continue
      const recipe = getRecipe(assignment.recipeId)
      if (!recipe) continue
      const opts = optionsFor(recipe)
      if (opts.includeInShoppingList === false) continue
      recipeIds.add(recipe.id)
      for (const ing of recipe.ingredients || []) {
        const name = String(ing.ingredientName || '').trim()
        if (!name) continue
        const optsUnitSystem = opts.unitSystem || 'us'
        const rawQty = typeof ing.quantity === 'number' ? ing.quantity : parseFloat(ing.quantity)
        const converted = Number.isFinite(rawQty)
          ? convertQuantity(rawQty, ing.unit, optsUnitSystem)
          : { qty: null, unit: ing.unit }
        const ingKey = ingredientKeyOf({ ...ing, ingredientName: name })
        const itemKey = `${ingKey}|${converted.unit || ''}`
        const existing = map.get(itemKey)
        if (existing) {
          if (existing.qty == null || converted.qty == null) {
            existing.qty = null // "to taste" absorbs quantities
          } else {
            existing.qty = Math.round((existing.qty + converted.qty) * 100) / 100
          }
          if (!existing.recipes.includes(recipe.title)) existing.recipes.push(recipe.title)
          existing.allOptional = existing.allOptional && !!ing.optional
        } else {
          map.set(itemKey, {
            itemKey,
            ingKey,
            name,
            qty: Number.isFinite(rawQty) ? converted.qty : null,
            unit: converted.unit || '',
            category: shoppingCategoryFor(ing.ingredientId, name),
            recipes: [recipe.title],
            allOptional: !!ing.optional,
          })
        }
      }
    }
  }

  const items = [...map.values()]
  const catRank = (c) => {
    const i = SHOPPING_CATEGORY_ORDER.indexOf(c)
    return i === -1 ? SHOPPING_CATEGORY_ORDER.length : i
  }
  items.sort((a, b) => catRank(a.category) - catRank(b.category) || a.name.localeCompare(b.name))

  const groups = []
  for (const item of items) {
    const last = groups[groups.length - 1]
    if (last && last.category === item.category) last.items.push(item)
    else groups.push({ category: item.category, items: [item] })
  }
  return { items, groups, recipeCount: recipeIds.size }
}

export function formatItemQty(item) {
  if (item.qty == null) return item.unit === 'to taste' || !item.unit ? 'to taste' : item.unit
  return `${formatQty(item.qty)} ${item.unit}`.trim()
}
