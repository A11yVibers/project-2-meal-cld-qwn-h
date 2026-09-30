// Loads all lookup + seed recipe data from the immutable CSV files in project-assets/.
// The CSVs are imported as raw text and parsed at runtime — no lookup data is duplicated here.
import { parseCsv, parseList } from '../lib/csv';
import recipesCsv from '../../project-assets/recipes.csv?raw';
import recipeIngredientsCsv from '../../project-assets/recipe_ingredients.csv?raw';
import recipeStepsCsv from '../../project-assets/recipe_steps.csv?raw';
import ingredientsCsv from '../../project-assets/ingredients.csv?raw';
import unitsCsv from '../../project-assets/units.csv?raw';
import cuisinesCsv from '../../project-assets/cuisines.csv?raw';
import dietaryTagsCsv from '../../project-assets/dietary_tags.csv?raw';
import mealTypesCsv from '../../project-assets/meal_types.csv?raw';
import categoriesCsv from '../../project-assets/recipe_categories.csv?raw';
import { APPROVED_IMAGES } from '../approved-images';

export const CUISINES = parseCsv(cuisinesCsv);
export const DIETARY_TAGS = parseCsv(dietaryTagsCsv);
export const MEAL_TYPES = parseCsv(mealTypesCsv);
export const RECIPE_CATEGORIES = parseCsv(categoriesCsv);
export const INGREDIENTS = parseCsv(ingredientsCsv);
export const UNITS = parseCsv(unitsCsv).map((u) => u.unit_name);

export const INGREDIENT_BY_ID = new Map(INGREDIENTS.map((i) => [i.ingredient_id, i]));
const CUISINE_BY_ID = new Map(CUISINES.map((c) => [c.cuisine_id, c]));
const MEAL_TYPE_BY_ID = new Map(MEAL_TYPES.map((m) => [m.meal_type_id, m]));
const DIETARY_TAG_BY_ID = new Map(DIETARY_TAGS.map((d) => [d.dietary_tag_id, d]));
const CATEGORY_BY_ID = new Map(RECIPE_CATEGORIES.map((c) => [c.category_id, c]));

export const cuisineName = (id) => CUISINE_BY_ID.get(id)?.cuisine_name || '';
export const mealTypeName = (id) => MEAL_TYPE_BY_ID.get(id)?.meal_type_name || '';
export const dietaryTagName = (id) => DIETARY_TAG_BY_ID.get(id)?.dietary_tag_name || '';
export const categoryName = (id) => CATEGORY_BY_ID.get(id)?.category_name || '';

// Planner slots come from the meal-type lookup (Breakfast, Lunch, Dinner, Snack).
const SLOT_IDS = ['MT01', 'MT02', 'MT03', 'MT04'];
export const PLANNER_SLOTS = SLOT_IDS
  .map((id) => MEAL_TYPE_BY_ID.get(id)?.meal_type_name)
  .filter(Boolean);

function buildSeedRecipes() {
  const ingredientRows = parseCsv(recipeIngredientsCsv);
  const stepRows = parseCsv(recipeStepsCsv);
  return parseCsv(recipesCsv).map((r) => {
    const ings = ingredientRows
      .filter((i) => i.recipe_id === r.recipe_id)
      .sort((a, b) => Number(a.display_order) - Number(b.display_order));
    const sections = [];
    for (const ing of ings) {
      let section = sections.find((s) => s.name === ing.section_name);
      if (!section) {
        section = { name: ing.section_name, items: [] };
        sections.push(section);
      }
      section.items.push({
        ingredientId: ing.ingredient_id || '',
        name: ing.ingredient_name,
        quantity: parseFloat(ing.quantity) || 0,
        unit: ing.unit || '',
        notes: ing.notes || '',
        optional: ing.optional === 'True',
      });
    }
    const steps = stepRows
      .filter((s) => s.recipe_id === r.recipe_id)
      .sort((a, b) => Number(a.step_number) - Number(b.step_number))
      .map((s) => ({ instruction: s.instruction, timerMinutes: parseInt(s.timer_minutes, 10) || 0 }));
    return {
      id: r.recipe_id,
      title: r.title,
      shortDescription: r.short_description,
      sourceName: r.source_name,
      sourceUrl: r.source_url,
      servings: parseInt(r.servings, 10) || 1,
      prepMinutes: parseInt(r.prep_time_minutes, 10) || 0,
      cookMinutes: parseInt(r.cook_time_minutes, 10) || 0,
      totalMinutes: parseInt(r.total_time_minutes, 10) || 0,
      cuisineId: r.cuisine_id,
      mealTypeId: r.meal_type_id,
      dietaryTagIds: parseList(r.dietary_tag_ids),
      categoryIds: parseList(r.category_ids),
      difficulty: parseInt(r.difficulty_1_to_5, 10) || 1,
      spiceLevel: parseInt(r.spice_level_0_to_5, 10) || 0,
      accentColor: r.accent_color || '',
      coverImageUrl: r.cover_image_url || '',
      includeInMealSuggestions: r.include_in_meal_suggestions === 'true',
      sections,
      steps,
      isUser: false,
      options: null, // resolved through the store (defaults + local overrides)
    };
  });
}

export const SEED_RECIPES = buildSeedRecipes();

// Cover-image choices for the recipe form: only remote URLs that appear in
// project-assets files or are exported by approved-images.js (per image policy).
export const APPROVED_COVER_IMAGES = (() => {
  const seen = new Set();
  const choices = [];
  for (const [label, url] of Object.entries(APPROVED_IMAGES)) {
    if (url && !seen.has(url)) {
      seen.add(url);
      choices.push({ url, label: label === 'placeholder' ? 'Placeholder image' : label });
    }
  }
  for (const r of SEED_RECIPES) {
    if (r.coverImageUrl && !seen.has(r.coverImageUrl)) {
      seen.add(r.coverImageUrl);
      choices.push({ url: r.coverImageUrl, label: r.title });
    }
  }
  return choices;
})();
