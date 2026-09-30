// Builds the shopping list from the recipes currently placed in the meal plan.
import { INGREDIENT_BY_ID } from '../data/seed';

export const CATEGORY_ORDER = [
  'Produce',
  'Meat & seafood',
  'Dairy & eggs',
  'Grains & pantry',
  'Oils & condiments',
  'Canned & jarred',
  'Spices',
  'Other',
];

export function buildShoppingList({ mealPlan, getRecipe, getOptions, dateFilter }) {
  const items = new Map();
  for (const [dateISO, slots] of Object.entries(mealPlan || {})) {
    if (dateFilter && !dateFilter(dateISO)) continue;
    for (const entry of Object.values(slots || {})) {
      const recipe = entry && getRecipe(entry.recipeId);
      if (!recipe) continue;
      const options = getOptions(recipe);
      if (options && options.includeInShoppingList === false) continue;
      for (const section of recipe.sections || []) {
        for (const ing of section.items || []) {
          const name = (ing.name || '').trim();
          if (!name) continue;
          const ingredientKey = ing.ingredientId || `name:${name.toLowerCase()}`;
          const unit = (ing.unit || '').trim();
          const itemKey = `${ingredientKey}::${unit}`;
          const known = ing.ingredientId ? INGREDIENT_BY_ID.get(ing.ingredientId) : null;
          let item = items.get(itemKey);
          if (!item) {
            item = {
              itemKey,
              ingredientKey,
              name,
              unit,
              category: known ? known.shopping_category : 'Other',
              quantity: 0,
              hasQty: false,
              recipes: new Set(),
              optionalHits: 0,
              hits: 0,
            };
            items.set(itemKey, item);
          }
          const qty = parseFloat(ing.quantity);
          if (isFinite(qty) && qty > 0 && unit !== 'to taste') {
            item.quantity += qty;
            item.hasQty = true;
          }
          item.recipes.add(recipe.title);
          item.hits++;
          if (ing.optional) item.optionalHits++;
        }
      }
    }
  }

  const list = [...items.values()].map((item) => ({
    ...item,
    recipes: [...item.recipes].sort(),
    optional: item.hits > 0 && item.optionalHits === item.hits,
  }));

  const groups = [];
  for (const category of CATEGORY_ORDER) {
    const categoryItems = list
      .filter((i) => (i.category || 'Other') === category)
      .sort((a, b) => a.name.localeCompare(b.name));
    if (categoryItems.length) groups.push({ category, items: categoryItems });
  }
  return { groups, items: list };
}
