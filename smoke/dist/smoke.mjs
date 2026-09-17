import assert from "node:assert/strict";
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const src = String(text).replace(/^﻿/, "");
  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      if (field === "") {
        inQuotes = true;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  const headers = (rows.shift() || []).map((h) => h.trim());
  return rows.filter((r) => r.some((c) => c.trim() !== "")).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });
}
function parseCsvList(value) {
  return String(value || "").split(",").map((s) => s.trim()).filter(Boolean);
}
function parseCsvBool(value) {
  return String(value || "").toLowerCase() === "true";
}
function parseCsvNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
const cuisinesCsv = "cuisine_id,cuisine_name\r\nCU01,American\r\nCU02,Bangladeshi\r\nCU03,Chinese\r\nCU04,French\r\nCU05,Greek\r\nCU06,Indian\r\nCU07,Italian\r\nCU08,Japanese\r\nCU09,Korean\r\nCU10,Mediterranean\r\nCU11,Mexican\r\nCU12,Middle Eastern\r\nCU13,Thai\r\nCU14,Vietnamese\r\nCU15,Other\r\n";
const dietaryTagsCsv = "dietary_tag_id,dietary_tag_name\r\nDT01,Vegetarian\r\nDT02,Vegan\r\nDT03,Gluten-free\r\nDT04,Dairy-free\r\nDT05,Nut-free\r\nDT06,High-protein\r\nDT07,Low-carb\r\nDT08,Pescatarian\r\nDT09,Halal-friendly\r\n";
const ingredientsCsv = "ingredient_id,ingredient_name,shopping_category\r\nING001,Chicken thigh,Meat & seafood\r\nING002,Chicken breast,Meat & seafood\r\nING003,Salmon,Meat & seafood\r\nING004,Shrimp,Meat & seafood\r\nING005,Ground beef,Meat & seafood\r\nING006,Egg,Dairy & eggs\r\nING007,Greek yogurt,Dairy & eggs\r\nING008,Butter,Dairy & eggs\r\nING009,Parmesan cheese,Dairy & eggs\r\nING010,Heavy cream,Dairy & eggs\r\nING011,Bell pepper,Produce\r\nING012,Onion,Produce\r\nING013,Garlic,Produce\r\nING014,Carrot,Produce\r\nING015,Broccoli,Produce\r\nING016,Spinach,Produce\r\nING017,Zucchini,Produce\r\nING018,Asparagus,Produce\r\nING019,Mushroom,Produce\r\nING020,Green onion,Produce\r\nING021,Tomato,Produce\r\nING022,Lemon,Produce\r\nING023,Ginger,Produce\r\nING024,Potato,Produce\r\nING025,Rice,Grains & pantry\r\nING026,Pasta,Grains & pantry\r\nING027,Noodles,Grains & pantry\r\nING028,Bread,Grains & pantry\r\nING029,Flour,Grains & pantry\r\nING030,Olive oil,Oils & condiments\r\nING031,Soy sauce,Oils & condiments\r\nING032,Sesame oil,Oils & condiments\r\nING033,Honey,Oils & condiments\r\nING034,Miso paste,Oils & condiments\r\nING035,Coconut milk,Canned & jarred\r\nING036,Chickpeas,Canned & jarred\r\nING037,Black beans,Canned & jarred\r\nING038,Canned tomatoes,Canned & jarred\r\nING039,Cumin,Spices\r\nING040,Paprika,Spices\r\nING041,Turmeric,Spices\r\nING042,Chili flakes,Spices\r\nING043,Black pepper,Spices\r\nING044,Salt,Spices\r\n";
const mealTypesCsv = "meal_type_id,meal_type_name\r\nMT01,Breakfast\r\nMT02,Lunch\r\nMT03,Dinner\r\nMT04,Snack\r\nMT05,Dessert\r\nMT06,Side dish\r\n";
const recipeCategoriesCsv = "category_id,category_name\r\nRC01,Weeknight\r\nRC02,Meal prep\r\nRC03,One-pot\r\nRC04,Quick\r\nRC05,Comfort food\r\nRC06,Budget-friendly\r\nRC07,Family-style\r\nRC08,Party food\r\nRC09,Freezer-friendly\r\nRC10,Healthy\r\n";
const recipeIngredientsCsv = "recipe_id,display_order,section_name,ingredient_id,ingredient_name,quantity,unit,notes,optional\r\nR001,1,Main,ING003,Salmon,1.5,lb,,False\r\nR001,2,Main,ING025,Rice,1.5,cup,uncooked,False\r\nR001,3,Sauce,ING033,Honey,3,tbsp,,False\r\nR001,4,Sauce,ING031,Soy sauce,3,tbsp,,False\r\nR001,5,Sauce,ING013,Garlic,4,clove,minced,False\r\nR001,6,Sauce,ING022,Lemon,1,piece,juiced,False\r\nR001,7,Vegetables,ING015,Broccoli,2,cup,florets,False\r\nR001,8,Vegetables,ING020,Green onion,2,piece,sliced,True\r\nR002,1,Main,ING026,Pasta,12,oz,,False\r\nR002,2,Main,ING036,Chickpeas,1,can,drained and rinsed,False\r\nR002,3,Sauce,ING013,Garlic,3,clove,minced,False\r\nR002,4,Sauce,ING010,Heavy cream,0.5,cup,,False\r\nR002,5,Sauce,ING009,Parmesan cheese,0.5,cup,grated,False\r\nR002,6,Vegetables,ING016,Spinach,4,cup,fresh,False\r\nR002,7,Seasoning,ING043,Black pepper,0.5,tsp,,True\r\n";
const recipeStepsCsv = 'recipe_id,step_number,instruction,timer_minutes\r\nR001,1,Cook the rice according to package directions.,0\r\nR001,2,"Whisk honey, soy sauce, garlic, and lemon juice together.",3\r\nR001,3,"Cook the salmon until nearly done, then add the glaze and reduce until glossy.",10\r\nR001,4,Steam or sauté the broccoli until crisp-tender.,6\r\nR001,5,"Assemble rice, salmon, and broccoli in bowls and garnish with green onion.",2\r\nR002,1,"Cook the pasta until al dente, reserving some pasta water.",10\r\nR002,2,"Sauté garlic briefly, then add chickpeas and warm through.",4\r\nR002,3,"Add cream, Parmesan, and a splash of pasta water; stir until smooth.",4\r\nR002,4,"Fold in spinach until wilted, then toss with the cooked pasta.",3\r\nR002,5,Season to taste and serve.,1\r\n';
const recipesCsv = 'recipe_id,title,short_description,source_name,source_url,servings,prep_time_minutes,cook_time_minutes,total_time_minutes,cuisine_id,meal_type_id,dietary_tag_ids,category_ids,difficulty_1_to_5,spice_level_0_to_5,accent_color,cover_image_url,include_in_meal_suggestions\nR001,Honey Garlic Salmon Bowls,A quick salmon-and-rice bowl with a sweet-savory honey garlic glaze and fresh vegetables.,OpenAI Demo Kitchen,,4,15,25,40,CU08,MT03,"DT06,DT05","RC01,RC04,RC10",2,3,#D97757,https://upload.wikimedia.org/wikipedia/commons/c/cc/Salmon_with_Rice_and_Sauce_finished_dish.jpg,true\nR002,Creamy Chickpea Spinach Pasta,"A simple weeknight pasta with chickpeas, spinach, garlic, and a light creamy Parmesan sauce.",OpenAI Demo Kitchen,,4,10,25,35,CU07,MT03,DT01,"RC01,RC04,RC06",1,2,#8A9A5B,https://upload.wikimedia.org/wikipedia/commons/7/7b/Creamy_spinach_pasta_%284463852122%29.jpg,true\n';
const unitsCsv = "unit_id,unit_name\r\nU01,g\r\nU02,kg\r\nU03,oz\r\nU04,lb\r\nU05,ml\r\nU06,L\r\nU07,tsp\r\nU08,tbsp\r\nU09,cup\r\nU10,piece\r\nU11,clove\r\nU12,can\r\nU13,package\r\nU14,pinch\r\nU15,to taste\r\n";
const CUISINES = parseCsv(cuisinesCsv).map((r) => ({
  id: r.cuisine_id,
  name: r.cuisine_name
}));
const MEAL_TYPES = parseCsv(mealTypesCsv).map((r) => ({
  id: r.meal_type_id,
  name: r.meal_type_name
}));
const DIETARY_TAGS = parseCsv(dietaryTagsCsv).map((r) => ({
  id: r.dietary_tag_id,
  name: r.dietary_tag_name
}));
const CATEGORIES = parseCsv(recipeCategoriesCsv).map((r) => ({
  id: r.category_id,
  name: r.category_name
}));
const INGREDIENTS = parseCsv(ingredientsCsv).map((r) => ({
  id: r.ingredient_id,
  name: r.ingredient_name,
  shoppingCategory: r.shopping_category
}));
const UNITS = parseCsv(unitsCsv).map((r) => ({
  id: r.unit_id,
  name: r.unit_name
}));
const byId = (list2) => Object.fromEntries(list2.map((item) => [item.id, item]));
byId(CUISINES);
byId(MEAL_TYPES);
byId(DIETARY_TAGS);
byId(CATEGORIES);
const INGREDIENT_BY_ID = byId(INGREDIENTS);
const SHOPPING_CATEGORY_ORDER = [
  "Produce",
  "Meat & seafood",
  "Dairy & eggs",
  "Grains & pantry",
  "Oils & condiments",
  "Canned & jarred",
  "Spices",
  "Other"
];
function shoppingCategoryFor(ingredientId, ingredientName) {
  const ing = INGREDIENT_BY_ID[ingredientId];
  if (ing && ing.shoppingCategory) return ing.shoppingCategory;
  const byName = INGREDIENTS.find(
    (i) => i.name.toLowerCase() === String(ingredientName || "").toLowerCase()
  );
  return (byName == null ? void 0 : byName.shoppingCategory) || "Other";
}
const DEFAULT_RECIPE_OPTIONS = Object.freeze({
  includeInShoppingList: true,
  showNutrition: false,
  allowSubstitutions: false,
  unitSystem: "us"
  // 'us' | 'metric'
});
const seedIngredients = parseCsv(recipeIngredientsCsv);
const seedSteps = parseCsv(recipeStepsCsv);
function buildSeedRecipes() {
  return parseCsv(recipesCsv).map((r) => {
    const recipeId = r.recipe_id;
    const items = seedIngredients.filter((ri) => ri.recipe_id === recipeId).sort((a, b) => parseCsvNumber(a.display_order) - parseCsvNumber(b.display_order));
    const sections = [];
    for (const item of items) {
      const sectionName = item.section_name || "Ingredients";
      let section = sections[sections.length - 1];
      if (!section || section.name !== sectionName) {
        section = { name: sectionName, items: [] };
        sections.push(section);
      }
      section.items.push({
        ingredientId: item.ingredient_id || null,
        ingredientName: item.ingredient_name,
        quantity: parseCsvNumber(item.quantity, 0),
        unit: item.unit || "",
        notes: item.notes || "",
        optional: parseCsvBool(item.optional)
      });
    }
    const steps = seedSteps.filter((rs) => rs.recipe_id === recipeId).sort((a, b) => parseCsvNumber(a.step_number) - parseCsvNumber(b.step_number)).map((rs) => ({
      instruction: rs.instruction,
      timerMinutes: parseCsvNumber(rs.timer_minutes, 0)
    }));
    const prep = parseCsvNumber(r.prep_time_minutes, 0);
    const cook = parseCsvNumber(r.cook_time_minutes, 0);
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
      cuisineId: r.cuisine_id || "",
      mealTypeId: r.meal_type_id || "",
      dietaryTagIds: parseCsvList(r.dietary_tag_ids),
      categoryIds: parseCsvList(r.category_ids),
      difficulty: parseCsvNumber(r.difficulty_1_to_5, 0),
      spiceLevel: parseCsvNumber(r.spice_level_0_to_5, 0),
      accentColor: r.accent_color || "#D97757",
      coverImageUrl: r.cover_image_url || "",
      includeInMealSuggestions: parseCsvBool(r.include_in_meal_suggestions),
      options: { ...DEFAULT_RECIPE_OPTIONS },
      ingredientSections: sections,
      steps,
      isUser: false
    };
  });
}
const SEED_RECIPES = buildSeedRecipes();
SEED_RECIPES.map((r) => r.id);
SEED_RECIPES.map((r) => r.coverImageUrl).filter(Boolean);
function slotLabel(slot) {
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}
const US_VOLUME_TO_ML = {
  tsp: 5,
  tbsp: 15,
  cup: 240
};
const US_WEIGHT_TO_G = {
  oz: 28,
  lb: 454
};
const COUNT_UNITS = /* @__PURE__ */ new Set(["piece", "clove", "can", "package", "pinch", "to taste"]);
function roundQty(n) {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? r : r;
}
function formatQty(n, fractions = false) {
  if (!Number.isFinite(n)) return "";
  const r = Math.round(n * 1e3) / 1e3;
  if (fractions) {
    const whole = Math.floor(r);
    const frac = r - whole;
    const fractionTable = [
      [0.125, "⅛"],
      [0.25, "¼"],
      [0.333, "⅓"],
      [0.5, "½"],
      [0.667, "⅔"],
      [0.75, "¾"]
    ];
    for (const [value, glyph] of fractionTable) {
      if (Math.abs(frac - value) < 0.03) {
        return whole > 0 ? `${whole}${glyph}` : glyph;
      }
    }
  }
  return String(r);
}
function metricVolume(ml) {
  if (ml >= 1e3) return { quantity: roundQty(ml / 1e3), unit: "L" };
  return { quantity: roundQty(ml), unit: "ml" };
}
function metricWeight(g) {
  if (g >= 1e3) return { quantity: roundQty(g / 1e3), unit: "kg" };
  return { quantity: roundQty(g), unit: "g" };
}
function usVolume(ml) {
  if (ml >= 240) return { quantity: roundQty(ml / 240), unit: "cup", fractions: true };
  if (ml >= 15 && Math.abs(ml % 15) < 3) return { quantity: roundQty(ml / 15), unit: "tbsp", fractions: true };
  if (ml >= 5 && Math.abs(ml % 5) < 1.5) return { quantity: roundQty(ml / 5), unit: "tsp", fractions: true };
  return { quantity: roundQty(ml), unit: "ml" };
}
function usWeight(g) {
  if (g >= 454) return { quantity: roundQty(g / 454), unit: "lb" };
  if (g >= 28) return { quantity: roundQty(g / 28), unit: "oz" };
  return { quantity: roundQty(g), unit: "g" };
}
function convertQuantity(quantity, unit, targetSystem) {
  const u = String(unit || "").toLowerCase();
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || COUNT_UNITS.has(u)) {
    return { quantity: qty, unit: unit || "" };
  }
  if (targetSystem === "metric") {
    if (US_VOLUME_TO_ML[u]) return metricVolume(qty * US_VOLUME_TO_ML[u]);
    if (US_WEIGHT_TO_G[u]) return metricWeight(qty * US_WEIGHT_TO_G[u]);
    if (u === "g" || u === "kg" || u === "ml" || u === "l") {
      if (u === "kg") return metricWeight(qty * 1e3);
      if (u === "l") return metricVolume(qty * 1e3);
      return { quantity: roundQty(qty), unit };
    }
    return { quantity: roundQty(qty), unit: unit || "" };
  }
  if (u === "ml" || u === "l") return usVolume(qty * (u === "l" ? 1e3 : 1));
  if (u === "g" || u === "kg") return usWeight(qty * (u === "kg" ? 1e3 : 1));
  return { quantity: roundQty(qty), unit: unit || "" };
}
function formatQuantity(quantity, unit, unitSystem) {
  const converted = convertQuantity(quantity, unit, unitSystem);
  const useFractions = unitSystem !== "metric" || Boolean(converted.fractions);
  const q = formatQty(converted.quantity, useFractions);
  if (!converted.unit || converted.unit === "to taste" || converted.unit === "pinch") {
    return converted.unit === "to taste" ? `${q || ""} ${converted.unit}`.trim() : `${q} ${converted.unit}`.trim();
  }
  return `${q} ${converted.unit}`.trim();
}
function canonicalForAggregation(quantity, unit, unitSystem) {
  const u = String(unit || "").toLowerCase();
  const qty = Number(quantity) || 0;
  if (COUNT_UNITS.has(u) || u === "") {
    return { key: u || "unit", quantity: qty, unit: unit || "", countable: true, kind: "count" };
  }
  const converted = convertQuantity(qty, unit, unitSystem);
  const cu = String(converted.unit || "").toLowerCase();
  if (["g", "kg"].includes(cu)) {
    return { key: "weight-g", quantity: cu === "kg" ? converted.quantity * 1e3 : converted.quantity, unit: "g", countable: false, kind: "weight" };
  }
  if (["ml", "l"].includes(cu)) {
    return { key: "volume-ml", quantity: cu === "l" ? converted.quantity * 1e3 : converted.quantity, unit: "ml", countable: false, kind: "volume" };
  }
  if (US_VOLUME_TO_ML[cu]) {
    return { key: "volume-ml", quantity: qty * US_VOLUME_TO_ML[u] || converted.quantity * US_VOLUME_TO_ML[cu], unit: "ml", countable: false, kind: "volume" };
  }
  if (US_WEIGHT_TO_G[cu]) {
    return { key: "weight-g", quantity: qty * US_WEIGHT_TO_G[u] || converted.quantity * US_WEIGHT_TO_G[cu], unit: "g", countable: false, kind: "weight" };
  }
  return { key: cu || "unit", quantity: converted.quantity, unit: converted.unit || "", countable: true, kind: "count" };
}
function renderAggregated(kind, quantity, unitSystem, unit = "") {
  if (kind === "weight") {
    const c = unitSystem === "metric" ? metricWeight(quantity) : usWeight(quantity);
    return `${formatQty(c.quantity, c.fractions)} ${c.unit}`;
  }
  if (kind === "volume") {
    const c = unitSystem === "metric" ? metricVolume(quantity) : usVolume(quantity);
    return `${formatQty(c.quantity, c.fractions)} ${c.unit}`;
  }
  return `${formatQty(quantity)}${unit && unit !== "unit" ? ` ${unit}` : ""}`.trim();
}
function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function fromKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function todayKey() {
  return toKey(/* @__PURE__ */ new Date());
}
function addDays(date, days2) {
  const next = new Date(date);
  next.setDate(next.getDate() + days2);
  return next;
}
function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  return addDays(d, -day);
}
function startOfWeekKey(key) {
  return toKey(startOfWeek(fromKey(key)));
}
function weekDays(weekStartKey) {
  const start = fromKey(weekStartKey);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return { key: toKey(date), date };
  });
}
function fmtShort(key) {
  return fromKey(key).toLocaleDateString(void 0, { month: "short", day: "numeric" });
}
function fmtMedium(key) {
  return fromKey(key).toLocaleDateString(void 0, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}
function weekLabel(weekStartKey) {
  const days2 = weekDays(weekStartKey);
  const start = days2[0].date;
  const end = days2[6].date;
  const sameMonth = start.getMonth() === end.getMonth();
  const startText = start.toLocaleDateString(void 0, {
    month: "short",
    day: "numeric"
  });
  const endText = end.toLocaleDateString(void 0, {
    month: sameMonth ? void 0 : "short",
    day: "numeric",
    year: "numeric"
  });
  return `${startText} – ${endText}`;
}
function shiftWeek(weekStartKey, deltaWeeks) {
  return toKey(addDays(fromKey(weekStartKey), deltaWeeks * 7));
}
function weekOptions(weeksBack = 2, weeksAhead = 12) {
  const current = startOfWeekKey(todayKey());
  const options = [];
  for (let i = -weeksBack; i <= weeksAhead; i++) {
    const key = shiftWeek(current, i);
    options.push({
      key,
      label: `Week of ${fmtMedium(key)}${i === 0 ? " (this week)" : ""}`
    });
  }
  return options;
}
function formatTime12(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m || 0).padStart(2, "0")} ${ampm}`;
}
function buildShoppingList({
  assignments: assignments2,
  getRecipe: getRecipe2,
  displayUnitSystem = "us",
  pantrySet,
  excludePantry = true
}) {
  var _a;
  const groups = /* @__PURE__ */ new Map();
  for (const asg of assignments2) {
    const recipe = getRecipe2(asg.recipeId);
    if (!recipe) continue;
    if (recipe.options && recipe.options.includeInShoppingList === false) continue;
    for (const section of recipe.ingredientSections || []) {
      for (const item of section.items || []) {
        if (!item.ingredientName) continue;
        const ingredientId = item.ingredientId || `custom:${item.ingredientName.toLowerCase()}`;
        const canonical = canonicalForAggregation(
          item.quantity,
          item.unit,
          ((_a = recipe.options) == null ? void 0 : _a.unitSystem) || "us"
        );
        const groupKey = `${ingredientId}|${canonical.key}`;
        let group = groups.get(groupKey);
        if (!group) {
          group = {
            key: groupKey,
            ingredientId: item.ingredientId || null,
            ingredientName: item.ingredientName,
            category: shoppingCategoryFor(item.ingredientId, item.ingredientName),
            kind: canonical.kind,
            quantity: 0,
            unit: canonical.unit,
            notes: /* @__PURE__ */ new Set(),
            optional: true,
            sources: [],
            toTaste: false
          };
          groups.set(groupKey, group);
        }
        const unitLower = String(item.unit || "").toLowerCase();
        if (unitLower === "to taste") {
          group.toTaste = true;
        } else {
          group.quantity += canonical.quantity || 0;
        }
        if (canonical.unit) group.unit = canonical.unit;
        if (item.notes) group.notes.add(item.notes);
        if (!item.optional) group.optional = false;
        group.sources.push(`${recipe.title} · ${fmtShort(asg.date)} ${slotLabel(asg.slot)}`);
      }
    }
  }
  const items = [...groups.values()].map((g) => {
    const displayAmount = g.toTaste ? g.quantity > 0 ? `${renderAggregated(g.kind, g.quantity, displayUnitSystem, g.unit)} + to taste` : "To taste" : renderAggregated(g.kind, g.quantity, displayUnitSystem, g.unit);
    const inPantry = g.ingredientId ? pantrySet.has(g.ingredientId) : false;
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
      excluded: excludePantry && inPantry
    };
  });
  const categories = [];
  const byCat = /* @__PURE__ */ new Map();
  for (const item of items) {
    if (!byCat.has(item.category)) byCat.set(item.category, []);
    byCat.get(item.category).push(item);
  }
  const orderedCats = [
    ...SHOPPING_CATEGORY_ORDER.filter((c) => byCat.has(c)),
    ...[...byCat.keys()].filter((c) => !SHOPPING_CATEGORY_ORDER.includes(c))
  ];
  for (const category of orderedCats) {
    const list2 = byCat.get(category).filter((i) => !i.excluded).sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
    if (list2.length) categories.push({ category, items: list2 });
  }
  const excludedItems = items.filter((i) => i.excluded).sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
  return { categories, excludedItems, totalItems: items.length };
}
const NUTRITION_PER_100G = {
  ING001: [230, 24, 0, 15],
  ING002: [165, 31, 0, 3.6],
  ING003: [208, 20, 0, 13],
  ING004: [99, 24, 0.2, 0.3],
  ING005: [250, 26, 0, 15],
  ING006: [143, 13, 1.1, 9.5],
  ING007: [59, 10, 3.6, 0.4],
  ING008: [717, 0.9, 0.1, 81],
  ING009: [431, 38, 4.1, 29],
  ING010: [340, 2.8, 2.8, 36],
  ING011: [31, 1, 6, 0.3],
  ING012: [40, 1.1, 9.3, 0.1],
  ING013: [149, 6.4, 33, 0.5],
  ING014: [41, 0.9, 10, 0.2],
  ING015: [34, 2.8, 7, 0.4],
  ING016: [23, 2.9, 3.6, 0.4],
  ING017: [17, 1.2, 3.1, 0.3],
  ING018: [20, 2.2, 3.9, 0.1],
  ING019: [22, 3.1, 3.3, 0.3],
  ING020: [32, 1.8, 7.3, 0.2],
  ING021: [18, 0.9, 3.9, 0.2],
  ING022: [29, 1.1, 9.3, 0.3],
  ING023: [80, 1.8, 18, 0.8],
  ING024: [77, 2, 17, 0.1],
  ING025: [365, 7.1, 80, 0.7],
  ING026: [371, 13, 75, 1.5],
  ING027: [356, 10, 71, 2.3],
  ING028: [265, 9, 49, 3.2],
  ING029: [364, 10, 76, 1],
  ING030: [884, 0, 0, 100],
  ING031: [53, 8.1, 4.9, 0.6],
  ING032: [884, 0, 0, 100],
  ING033: [304, 0.3, 82, 0],
  ING034: [198, 12.8, 26, 6],
  ING035: [197, 2, 2.8, 21],
  ING036: [139, 8.9, 27, 2.6],
  ING037: [132, 8.9, 24, 0.5],
  ING038: [32, 1.6, 7, 0.3],
  ING039: [375, 18, 44, 22],
  ING040: [282, 14, 54, 13],
  ING041: [312, 9.7, 67, 3.3],
  ING042: [318, 12, 57, 9],
  ING043: [251, 10, 64, 3.3],
  ING044: [0, 0, 0, 0]
};
const UNIT_GRAMS = {
  g: 1,
  kg: 1e3,
  oz: 28,
  lb: 454,
  ml: 1,
  l: 1e3,
  tsp: 5,
  tbsp: 15,
  cup: 240,
  piece: 100,
  clove: 5,
  can: 400,
  package: 300,
  pinch: 0.5,
  "to taste": 2
};
const PIECE_GRAMS = {
  ING006: 50,
  // egg
  ING011: 120,
  // bell pepper
  ING012: 110,
  // onion
  ING020: 15,
  // green onion
  ING021: 123,
  // tomato
  ING022: 58,
  // lemon
  ING024: 150
  // potato
};
function gramsFor(item, unitSystem) {
  const converted = convertQuantity(item.quantity, item.unit, "metric");
  const unit = String(converted.unit || "").toLowerCase();
  const qty = Number(converted.quantity) || 0;
  if (unit === "piece") return qty * (PIECE_GRAMS[item.ingredientId] || UNIT_GRAMS.piece);
  const per = UNIT_GRAMS[unit];
  if (per == null) return 0;
  return qty * per;
}
function estimateNutrition(recipe) {
  var _a;
  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  let known = 0;
  let count = 0;
  for (const section of recipe.ingredientSections || []) {
    for (const item of section.items || []) {
      count++;
      const macros = NUTRITION_PER_100G[item.ingredientId];
      if (!macros) continue;
      known++;
      const grams = gramsFor(item, (_a = recipe == null ? void 0 : recipe.options) == null ? void 0 : _a.unitSystem);
      const factor = grams / 100;
      totals.kcal += macros[0] * factor;
      totals.protein += macros[1] * factor;
      totals.carbs += macros[2] * factor;
      totals.fat += macros[3] * factor;
    }
  }
  const servings = Math.max(1, Number(recipe.servings) || 1);
  const round = (n) => Math.round(n);
  return {
    perServing: {
      kcal: round(totals.kcal / servings),
      protein: round(totals.protein / servings * 10) / 10,
      carbs: round(totals.carbs / servings * 10) / 10,
      fat: round(totals.fat / servings * 10) / 10
    },
    total: {
      kcal: round(totals.kcal),
      protein: round(totals.protein),
      carbs: round(totals.carbs),
      fat: round(totals.fat)
    },
    coverage: count ? known / count : 0
  };
}
const SUBSTITUTIONS = {
  ING001: ["ING002"],
  ING002: ["ING001"],
  ING003: ["ING004"],
  ING004: ["ING003", "ING002"],
  ING007: ["ING010"],
  ING008: ["ING030"],
  ING010: ["ING035", "ING007"],
  ING016: ["ING015"],
  ING025: ["ING027"],
  ING026: ["ING027"],
  ING027: ["ING026", "ING025"],
  ING030: ["ING032", "ING008"],
  ING031: ["ING034"],
  ING035: ["ING010"],
  ING036: ["ING037"],
  ING037: ["ING036"]
};
function substitutionsFor(ingredientId) {
  const ids = SUBSTITUTIONS[ingredientId] || [];
  return ids.map((id) => {
    var _a;
    return (_a = INGREDIENT_BY_ID[id]) == null ? void 0 : _a.name;
  }).filter(Boolean);
}
const parsed = parseCsv('a,b,c\n1,"x,y",say "hi"\n2,,\n');
assert.equal(parsed.length, 2);
assert.equal(parsed[0].b, "x,y");
assert.equal(parsed[0].c, 'say "hi"');
assert.equal(parsed[1].b, "");
assert.equal(INGREDIENTS.length, 44, "44 ingredients");
assert.equal(UNITS.length, 15, "15 units");
assert.equal(CUISINES.length, 15);
assert.equal(MEAL_TYPES.length, 6);
assert.equal(DIETARY_TAGS.length, 9);
assert.equal(CATEGORIES.length, 10);
assert.equal(SEED_RECIPES.length, 2, "2 seed recipes");
const r1 = SEED_RECIPES.find((r) => r.id === "R001");
assert.equal(r1.title, "Honey Garlic Salmon Bowls");
assert.deepEqual(r1.dietaryTagIds, ["DT06", "DT05"]);
assert.deepEqual(r1.categoryIds, ["RC01", "RC04", "RC10"]);
assert.equal(r1.totalMinutes, 40);
assert.equal(r1.spiceLevel, 3);
assert.equal(r1.includeInMealSuggestions, true);
assert.equal(r1.accentColor, "#D97757");
assert.equal(r1.ingredientSections.length, 3, "R001 sections: Main, Sauce, Vegetables");
assert.deepEqual(r1.ingredientSections.map((s) => s.name), ["Main", "Sauce", "Vegetables"]);
assert.equal(r1.ingredientSections[0].items.length, 2);
assert.equal(r1.steps.length, 5);
assert.equal(r1.steps[2].timerMinutes, 10);
const greenOnion = r1.ingredientSections[2].items[1];
assert.equal(greenOnion.optional, true, "green onion is optional");
const r2 = SEED_RECIPES.find((r) => r.id === "R002");
assert.equal(r2.ingredientSections.length, 4);
assert.equal(r2.steps.length, 5);
assert.equal(shoppingCategoryFor("ING003"), "Meat & seafood");
assert.equal(shoppingCategoryFor("ING012"), "Produce");
assert.equal(shoppingCategoryFor(null, "Dragon fruit"), "Other");
assert.equal(SHOPPING_CATEGORY_ORDER[0], "Produce");
assert.deepEqual(convertQuantity(1.5, "lb", "metric"), { quantity: 681, unit: "g" });
assert.deepEqual(convertQuantity(0.5, "cup", "metric"), { quantity: 120, unit: "ml" });
assert.deepEqual(convertQuantity(2, "clove", "metric"), { quantity: 2, unit: "clove" });
assert.equal(formatQuantity(3, "tbsp", "us"), "3 tbsp");
assert.equal(formatQuantity(1, "kg", "us"), "2.2 lb");
assert.equal(formatQuantity(0.5, "cup", "metric"), "120 ml");
assert.equal(formatQuantity(1.5, "cup", "metric"), "360 ml");
assert.equal(formatQuantity(2, "kg", "metric"), "2 kg");
assert.equal(formatQuantity(1, "", "metric"), "1");
assert.deepEqual(canonicalForAggregation(3, "tbsp", "us"), { key: "volume-ml", quantity: 45, unit: "ml", countable: false, kind: "volume" });
assert.deepEqual(canonicalForAggregation(4, "clove", "us"), { key: "clove", quantity: 4, unit: "clove", countable: true, kind: "count" });
assert.equal(renderAggregated("weight", 1362, "us"), "3 lb");
assert.equal(renderAggregated("volume", 45, "metric"), "45 ml");
assert.equal(renderAggregated("volume", 30, "us"), "2 tbsp");
assert.equal(renderAggregated("count", 4, "us", "clove"), "4 clove");
const getRecipe = (id) => SEED_RECIPES.find((r) => r.id === id) || null;
const assignments = [
  { id: "a1", date: "2026-09-14", slot: "dinner", recipeId: "R001" },
  { id: "a2", date: "2026-09-15", slot: "dinner", recipeId: "R001" },
  { id: "a3", date: "2026-09-16", slot: "lunch", recipeId: "R002" }
];
const list = buildShoppingList({
  assignments,
  getRecipe,
  displayUnitSystem: "us",
  pantrySet: /* @__PURE__ */ new Set(["ING044"]),
  excludePantry: true
});
const allItems = list.categories.flatMap((c) => c.items);
const salmon = allItems.find((i) => i.ingredientName === "Salmon");
assert.ok(salmon, "salmon present");
assert.equal(salmon.displayAmount, "3 lb", `salmon combined to 3 lb, got ${salmon.displayAmount}`);
assert.equal(salmon.sources.length, 2);
assert.equal(salmon.category, "Meat & seafood");
const garlic = allItems.find((i) => i.ingredientName === "Garlic");
assert.equal(garlic.displayAmount, "11 clove", `garlic 11 clove, got ${garlic.displayAmount}`);
assert.equal(garlic.sources.length, 3);
const pepper = allItems.find((i) => i.ingredientName === "Black pepper");
assert.equal(pepper.optional, true);
const catNames = list.categories.map((c) => c.category);
assert.deepEqual(
  catNames,
  [...catNames].sort((a, b) => SHOPPING_CATEGORY_ORDER.indexOf(a) - SHOPPING_CATEGORY_ORDER.indexOf(b)),
  "categories in canonical order"
);
assert.ok(catNames.includes("Produce") && catNames.includes("Grains & pantry"));
const listMetric = buildShoppingList({ assignments, getRecipe, displayUnitSystem: "metric", pantrySet: /* @__PURE__ */ new Set(), excludePantry: false });
const salmonM = listMetric.categories.flatMap((c) => c.items).find((i) => i.ingredientName === "Salmon");
assert.equal(salmonM.displayAmount, "1.36 kg", `metric salmon, got ${salmonM.displayAmount}`);
const noShopRecipe = { ...r2, options: { ...r2.options, includeInShoppingList: false } };
const listSkip = buildShoppingList({
  assignments,
  getRecipe: (id) => id === "R002" ? noShopRecipe : getRecipe(id),
  displayUnitSystem: "us",
  pantrySet: /* @__PURE__ */ new Set(),
  excludePantry: false
});
assert.ok(!listSkip.categories.flatMap((c) => c.items).some((i) => i.ingredientName === "Pasta"), "pasta skipped");
const listPantry = buildShoppingList({ assignments, getRecipe, displayUnitSystem: "us", pantrySet: /* @__PURE__ */ new Set(["ING025"]), excludePantry: true });
assert.ok(!listPantry.categories.flatMap((c) => c.items).some((i) => i.ingredientName === "Rice"), "rice excluded (pantry)");
assert.equal(listPantry.excludedItems.length, 1);
const nut = estimateNutrition(r1);
assert.ok(nut.perServing.kcal > 200 && nut.perServing.kcal < 1500, `kcal plausible: ${nut.perServing.kcal}`);
assert.ok(nut.perServing.protein > 10, "protein plausible");
assert.equal(nut.coverage, 1);
assert.deepEqual(substitutionsFor("ING036"), ["Black beans"]);
assert.deepEqual(substitutionsFor("ING999"), []);
assert.equal(startOfWeekKey("2026-09-16"), "2026-09-14", "Wed 2026-09-16 → Monday 2026-09-14");
assert.equal(startOfWeekKey("2026-09-14"), "2026-09-14", "Monday is its own week start");
const days = weekDays("2026-09-14");
assert.equal(days.length, 7);
assert.equal(days[0].key, "2026-09-14");
assert.equal(days[6].key, "2026-09-20");
assert.match(weekLabel("2026-09-14"), /Sep 14/);
assert.equal(weekOptions(2, 12).length, 15);
assert.equal(formatTime12("19:30"), "7:30 PM");
assert.equal(formatTime12("09:05"), "9:05 AM");
assert.equal(toKey(addDays(new Date(2026, 8, 14), 3)), "2026-09-17");
console.log("ALL SMOKE TESTS PASSED");
