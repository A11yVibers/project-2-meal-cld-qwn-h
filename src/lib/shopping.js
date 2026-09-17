// Builds the shopping list from the recipes currently placed in the meal
// plan: aggregates repeated ingredients, groups by shopping category
// (from the supplied ingredients.csv), and applies pantry exclusions.
import { SHOPPING_CATEGORY_ORDER, shoppingCategoryFor, slotLabel } from './data.js'
import { canonicalForAggregation, renderAggregated } from './units.js'
import { fmtShort } from './dates.js'

export function buildShoppingList({
  assignments,
  getRecipe,
  displayUnitSystem = 'us',
  pantrySet,
  excludePantry = true,
}) {
  const groups = new Map()

  for (const asg of assignments) {
    const recipe = getRecipe(asg.recipeId)
    if (!recipe) continue
    if (recipe.options && recipe.options.includeInShoppingList === false) continue

    for (const section of recipe.ingredientSections || []) {
      for (const item of section.items || []) {
        if (!item.ingredientName) continue
        const ingredientId = item.ingredientId || `custom:${item.ingredientName.toLowerCase()}`
        const canonical = canonicalForAggregation(
          item.quantity,
          item.unit,
          recipe.options?.unitSystem || 'us',
        )
        const groupKey = `${ingredientId}|${canonical.key}`
        let group = groups.get(groupKey)
        if (!group) {
          group = {
            key: groupKey,
            ingredientId: item.ingredientId || null,
            ingredientName: item.ingredientName,
            category: shoppingCategoryFor(item.ingredientId, item.ingredientName),
            kind: canonical.kind,
            quantity: 0,
            unit: canonical.unit,
            notes: new Set(),
            optional: true,
            sources: [],
            toTaste: false,
          }
          groups.set(groupKey, group)
        }
        const unitLower = String(item.unit || '').toLowerCase()
        if (unitLower === 'to taste') {
          group.toTaste = true
        } else {
          group.quantity += canonical.quantity || 0
        }
        if (canonical.unit) group.unit = canonical.unit
        if (item.notes) group.notes.add(item.notes)
        if (!item.optional) group.optional = false
        group.sources.push(`${recipe.title} · ${fmtShort(asg.date)} ${slotLabel(asg.slot)}`)
      }
    }
  }

  const items = [...groups.values()].map((g) => {
    const displayAmount = g.toTaste
      ? g.quantity > 0
        ? `${renderAggregated(g.kind, g.quantity, displayUnitSystem, g.unit)} + to taste`
        : 'To taste'
      : renderAggregated(g.kind, g.quantity, displayUnitSystem, g.unit)
    const inPantry = g.ingredientId ? pantrySet.has(g.ingredientId) : false
    return {
      key: g.key,
      ingredientId: g.ingredientId,
      ingredientName: g.ingredientName,
      category: g.category,
      displayAmount,
      notes: [...g.notes],
      optional: g.optional,
      sources: g.sources,
      inPantry,
      excluded: excludePantry && inPantry,
    }
  })

  const categories = []
  const byCat = new Map()
  for (const item of items) {
    if (!byCat.has(item.category)) byCat.set(item.category, [])
    byCat.get(item.category).push(item)
  }
  const orderedCats = [
    ...SHOPPING_CATEGORY_ORDER.filter((c) => byCat.has(c)),
    ...[...byCat.keys()].filter((c) => !SHOPPING_CATEGORY_ORDER.includes(c)),
  ]
  for (const category of orderedCats) {
    const list = byCat
      .get(category)
      .filter((i) => !i.excluded)
      .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))
    if (list.length) categories.push({ category, items: list })
  }

  const excludedItems = items
    .filter((i) => i.excluded)
    .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))

  return { categories, excludedItems, totalItems: items.length }
}
