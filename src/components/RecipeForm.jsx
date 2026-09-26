import React, { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import {
  CUISINES, MEAL_TYPES, DIETARY_TAGS, RECIPE_CATEGORIES, INGREDIENT_NAMES, UNIT_NAMES, INGREDIENTS,
  SPICE_LEVELS, PLAN_SLOT_NAMES, AVAILABLE_IMAGES, PLACEHOLDER_IMAGE, DEFAULT_RECIPE_OPTIONS,
} from '../seedData.js'
import {
  todayISO, startOfWeekISO, addWeeksISO, fmtWeekRange, fmtDateShort, fmtWeekdayShort,
} from '../dates.js'
import RecipeOptionsMenu from './RecipeOptionsMenu.jsx'
import { Combobox, Chip, uid } from './ui.jsx'

const SECTION_PRESETS = ['Main', 'Sauce', 'Garnish', 'Vegetables', 'Seasoning', 'Marinade', 'Topping']
const ACCENT_PRESETS = ['#D97757', '#8A9A5B', '#C2703D', '#3E7C8F', '#B0577C', '#6B8E23', '#D9A441', '#5B6ABF']

function emptyIngredient(sectionName = 'Main') {
  return { key: uid('ing'), sectionName, ingredientName: '', quantity: '', unit: '', optional: false, notes: '' }
}
function emptyStep() {
  return { key: uid('step'), instruction: '', timerMinutes: '' }
}

function initialForm() {
  const today = todayISO()
  return {
    // Recipe details
    title: '',
    shortDescription: '',
    sourceUrl: '',
    cuisineId: '',
    mealTypeId: '',
    dietaryTagIds: [],
    categoryIds: [],
    // Timing & yield
    servings: 4,
    prepMinutes: '',
    cookMinutes: '',
    spiceLevel: 1,
    // Image & appearance
    coverImageUrl: '',
    accentColor: '#D97757',
    // Ingredients & method
    ingredients: [emptyIngredient('Main')],
    steps: [emptyStep()],
    // Meal planning
    includeInMealSuggestions: true,
    addToPlan: false,
    planWeek: 'this',
    planDate: today,
    planSlot: 'Dinner',
    planServingTime: '',
    // Recipe options
    options: { ...DEFAULT_RECIPE_OPTIONS },
  }
}

export default function RecipeForm({ onCancel, onSaved, showToast }) {
  const store = useStore()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')

  const thisWeek = startOfWeekISO(todayISO())
  const weekStartFor = (w) => (w === 'next' ? addWeeksISO(thisWeek, 1) : thisWeek)

  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const sectionOptions = useMemo(() => {
    const used = form.ingredients.map((i) => i.sectionName).filter(Boolean)
    return [...new Set([...SECTION_PRESETS, ...used])]
  }, [form.ingredients])

  const totalMinutes = (Number(form.prepMinutes) || 0) + (Number(form.cookMinutes) || 0)

  // ---- Ingredients ----
  function updateIngredient(key, patch) {
    setForm((f) => ({
      ...f,
      ingredients: f.ingredients.map((i) => (i.key === key ? { ...i, ...patch } : i)),
    }))
  }
  function removeIngredient(key) {
    setForm((f) => ({ ...f, ingredients: f.ingredients.filter((i) => i.key !== key) }))
  }
  function moveIngredient(index, dir) {
    setForm((f) => {
      const list = [...f.ingredients]
      const target = index + dir
      if (target < 0 || target >= list.length) return f
      ;[list[index], list[target]] = [list[target], list[index]]
      return { ...f, ingredients: list }
    })
  }
  function addIngredient() {
    setForm((f) => {
      const lastSection = f.ingredients[f.ingredients.length - 1]?.sectionName || 'Main'
      return { ...f, ingredients: [...f.ingredients, emptyIngredient(lastSection)] }
    })
  }
  function addSection() {
    setForm((f) => {
      const used = new Set(f.ingredients.map((i) => i.sectionName))
      let name = SECTION_PRESETS.find((s) => !used.has(s))
      if (!name) {
        let n = f.ingredients.length
        do { n += 1; name = `Section ${n}` } while (used.has(name))
      }
      return { ...f, ingredients: [...f.ingredients, emptyIngredient(name)] }
    })
  }

  // ---- Steps ----
  function updateStep(key, patch) {
    setForm((f) => ({ ...f, steps: f.steps.map((s) => (s.key === key ? { ...s, ...patch } : s)) }))
  }
  function removeStep(key) {
    setForm((f) => ({ ...f, steps: f.steps.filter((s) => s.key !== key) }))
  }
  function moveStep(index, dir) {
    setForm((f) => {
      const list = [...f.steps]
      const target = index + dir
      if (target < 0 || target >= list.length) return f
      ;[list[index], list[target]] = [list[target], list[index]]
      return { ...f, steps: list }
    })
  }

  // ---- Meal planning ----
  function changePlanWeek(w) {
    const ws = weekStartFor(w)
    const today = todayISO()
    const within = today >= ws && today <= addDaysLocal(ws, 6)
    set({ planWeek: w, planDate: within ? today : ws })
  }

  // ---- Save ----
  function handleSave(e) {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) {
      setError('Please provide a recipe title.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setError('')
    const ingredients = form.ingredients
      .filter((i) => String(i.ingredientName).trim() !== '')
      .map((i, idx) => ({
        displayOrder: idx + 1,
        sectionName: String(i.sectionName).trim() || 'Main',
        ingredientId: '',
        ingredientName: String(i.ingredientName).trim(),
        quantity: i.quantity === '' || i.quantity == null ? null : Number(i.quantity),
        unit: String(i.unit).trim(),
        notes: '',
        optional: !!i.optional,
      }))
      // link catalog ingredients by id when the name matches the CSV lookup
      .map((i) => ({ ...i, ingredientId: ingredientIdForName(i.ingredientName) }))
    const steps = form.steps
      .filter((s) => String(s.instruction).trim() !== '')
      .map((s, idx) => ({
        stepNumber: idx + 1,
        instruction: String(s.instruction).trim(),
        timerMinutes: Number(s.timerMinutes) || 0,
      }))

    const recipe = {
      id: uid('U'),
      source: 'user',
      createdAt: Date.now(),
      title,
      shortDescription: form.shortDescription.trim(),
      sourceName: '',
      sourceUrl: form.sourceUrl.trim(),
      servings: Math.max(1, Number(form.servings) || 1),
      prepMinutes: Number(form.prepMinutes) || 0,
      cookMinutes: Number(form.cookMinutes) || 0,
      totalMinutes,
      cuisineId: form.cuisineId,
      mealTypeId: form.mealTypeId,
      dietaryTagIds: [...form.dietaryTagIds],
      categoryIds: [...form.categoryIds],
      difficulty: null,
      spiceLevel: Number(form.spiceLevel) || 0,
      accentColor: form.accentColor,
      coverImageUrl: form.coverImageUrl,
      includeInMealSuggestions: !!form.includeInMealSuggestions,
      options: { ...form.options },
      ingredients,
      steps,
    }

    store.addUserRecipe(recipe)
    if (form.addToPlan && form.planDate) {
      store.assignMeal(form.planDate, form.planSlot, recipe.id, form.planServingTime)
      showToast(`“${recipe.title}” saved and added to ${form.planSlot} on ${fmtWeekdayShort(form.planDate)} ${fmtDateShort(form.planDate)}`)
    } else {
      showToast(`“${recipe.title}” added to your recipe catalog`)
    }
    onSaved(recipe.id, { addToPlan: !!form.addToPlan && !!form.planDate })
  }

  return (
    <form className="recipe-form" onSubmit={handleSave} noValidate>
      <div className="form-head">
        <h2>New recipe</h2>
        <p className="subtitle">Fill in the sections below. Only the title is required.</p>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      {/* 1. Recipe details */}
      <fieldset className="form-section">
        <legend><span className="legend-num">1</span> Recipe details</legend>
        <div className="form-grid">
          <label className="field span-2">
            <span>Recipe title *</span>
            <input className="input" type="text" value={form.title} placeholder="e.g. Weeknight Miso Noodles"
              onChange={(e) => set({ title: e.target.value })} required />
          </label>
          <label className="field span-2">
            <span>Short description</span>
            <textarea className="input" rows="2" value={form.shortDescription}
              placeholder="A one-line summary shown on the recipe card"
              onChange={(e) => set({ shortDescription: e.target.value })} />
          </label>
          <label className="field span-2">
            <span>Source link</span>
            <input className="input" type="url" value={form.sourceUrl} placeholder="https://…"
              onChange={(e) => set({ sourceUrl: e.target.value })} />
          </label>
          <label className="field">
            <span>Cuisine</span>
            <select className="input" value={form.cuisineId} onChange={(e) => set({ cuisineId: e.target.value })}>
              <option value="">Select cuisine…</option>
              {CUISINES.map((c) => <option key={c.cuisine_id} value={c.cuisine_id}>{c.cuisine_name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Primary meal type</span>
            <select className="input" value={form.mealTypeId} onChange={(e) => set({ mealTypeId: e.target.value })}>
              <option value="">Select meal type…</option>
              {MEAL_TYPES.map((m) => <option key={m.meal_type_id} value={m.meal_type_id}>{m.meal_type_name}</option>)}
            </select>
          </label>
          <div className="field span-2">
            <span>Dietary suitability <em>(select all that apply)</em></span>
            <div className="chip-row">
              {DIETARY_TAGS.map((t) => (
                <Chip key={t.dietary_tag_id}
                  active={form.dietaryTagIds.includes(t.dietary_tag_id)}
                  onClick={() => setForm((f) => ({
                    ...f,
                    dietaryTagIds: f.dietaryTagIds.includes(t.dietary_tag_id)
                      ? f.dietaryTagIds.filter((id) => id !== t.dietary_tag_id)
                      : [...f.dietaryTagIds, t.dietary_tag_id],
                  }))}>
                  {t.dietary_tag_name}
                </Chip>
              ))}
            </div>
          </div>
          <div className="field span-2">
            <span>Recipe categories <em>(select any)</em></span>
            <div className="chip-row">
              {RECIPE_CATEGORIES.map((c) => (
                <Chip key={c.category_id}
                  active={form.categoryIds.includes(c.category_id)}
                  onClick={() => setForm((f) => ({
                    ...f,
                    categoryIds: f.categoryIds.includes(c.category_id)
                      ? f.categoryIds.filter((id) => id !== c.category_id)
                      : [...f.categoryIds, c.category_id],
                  }))}>
                  {c.category_name}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      {/* 2. Timing & yield */}
      <fieldset className="form-section">
        <legend><span className="legend-num">2</span> Timing &amp; yield</legend>
        <div className="form-grid">
          <div className="field">
            <span>Servings</span>
            <div className="stepper">
              <button type="button" className="btn ghost step-btn" aria-label="Fewer servings"
                onClick={() => set({ servings: Math.max(1, (Number(form.servings) || 1) - 1) })}>−</button>
              <input className="input stepper-input" type="number" min="1" value={form.servings}
                onChange={(e) => set({ servings: Math.max(1, Number(e.target.value) || 1) })} aria-label="Servings" />
              <button type="button" className="btn ghost step-btn" aria-label="More servings"
                onClick={() => set({ servings: (Number(form.servings) || 1) + 1 })}>＋</button>
            </div>
          </div>
          <label className="field">
            <span>Prep time (minutes)</span>
            <input className="input" type="number" min="0" value={form.prepMinutes}
              onChange={(e) => set({ prepMinutes: e.target.value })} placeholder="0" />
          </label>
          <label className="field">
            <span>Cook time (minutes)</span>
            <input className="input" type="number" min="0" value={form.cookMinutes}
              onChange={(e) => set({ cookMinutes: e.target.value })} placeholder="0" />
          </label>
          <div className="field">
            <span>Total time</span>
            <div className="input readonly" aria-live="polite">{totalMinutes} min <em className="hint">(auto)</em></div>
          </div>
          <div className="field span-2">
            <span>Spice level — <strong>{SPICE_LEVELS[Number(form.spiceLevel) || 0]}</strong></span>
            <input type="range" min="0" max="5" step="1" value={form.spiceLevel}
              onChange={(e) => set({ spiceLevel: Number(e.target.value) })}
              aria-label="Spice level" className="spice-range" />
            <div className="range-labels"><span>Mild</span><span>Very spicy</span></div>
          </div>
        </div>
      </fieldset>

      {/* 3. Image & appearance */}
      <fieldset className="form-section">
        <legend><span className="legend-num">3</span> Image &amp; appearance</legend>
        <div className="field">
          <span>Cover image <em>(choose an approved remote image; the placeholder is used when none)</em></span>
          <div className="image-picker" role="radiogroup" aria-label="Cover image">
            <button type="button" role="radio" aria-checked={form.coverImageUrl === ''}
              className={`image-option none${form.coverImageUrl === '' ? ' selected' : ''}`}
              onClick={() => set({ coverImageUrl: '' })}>
              <img src={PLACEHOLDER_IMAGE} alt="" className="image-option-img placeholder-faded" />
              <span>No image (use placeholder)</span>
            </button>
            {AVAILABLE_IMAGES.map((url) => (
              <button type="button" key={url} role="radio" aria-checked={form.coverImageUrl === url}
                className={`image-option${form.coverImageUrl === url ? ' selected' : ''}`}
                onClick={() => set({ coverImageUrl: url })}>
                <img src={url} alt="Cover option" className="image-option-img" loading="lazy" />
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Recipe card accent color</span>
          <div className="color-picker">
            <input type="color" value={form.accentColor} aria-label="Accent color"
              onChange={(e) => set({ accentColor: e.target.value })} />
            {ACCENT_PRESETS.map((c) => (
              <button type="button" key={c} aria-label={`Accent ${c}`}
                className={`swatch${form.accentColor.toLowerCase() === c.toLowerCase() ? ' selected' : ''}`}
                style={{ background: c }} onClick={() => set({ accentColor: c })} />
            ))}
            <span className="swatch-preview" style={{ '--accent': form.accentColor }}>
              Card preview <strong style={{ color: form.accentColor }}>{form.accentColor}</strong>
            </span>
          </div>
        </div>
      </fieldset>

      {/* 4. Ingredients */}
      <fieldset className="form-section">
        <legend><span className="legend-num">4</span> Ingredients</legend>
        <div className="ingredient-editor">
          {form.ingredients.map((ing, idx) => {
            const prev = form.ingredients[idx - 1]
            const showSectionHead = !prev || prev.sectionName !== ing.sectionName
            return (
              <React.Fragment key={ing.key}>
                {showSectionHead && (
                  <div className="section-head">
                    <span className="section-name">{ing.sectionName || 'Unnamed section'}</span>
                    <span className="hint">section names are editable per row</span>
                  </div>
                )}
                <div className="ingredient-edit-row">
                  <Combobox className="ing-section" value={ing.sectionName} options={sectionOptions}
                    placeholder="Section" onChange={(v) => updateIngredient(ing.key, { sectionName: v })} />
                  <Combobox className="ing-name" value={ing.ingredientName} options={INGREDIENT_NAMES}
                    placeholder="Search ingredient…" onChange={(v) => updateIngredient(ing.key, { ingredientName: v })} />
                  <input className="input ing-qty" type="number" min="0" step="0.25" placeholder="Qty"
                    value={ing.quantity} aria-label="Quantity"
                    onChange={(e) => updateIngredient(ing.key, { quantity: e.target.value })} />
                  <Combobox className="ing-unit" value={ing.unit} options={UNIT_NAMES}
                    placeholder="Unit" onChange={(v) => updateIngredient(ing.key, { unit: v })} />
                  <label className="checkbox-inline ing-optional" title="This ingredient is optional">
                    <input type="checkbox" checked={ing.optional}
                      onChange={(e) => updateIngredient(ing.key, { optional: e.target.checked })} />
                    Optional
                  </label>
                  <span className="row-actions">
                    <button type="button" className="icon-btn" aria-label="Move ingredient up" disabled={idx === 0}
                      onClick={() => moveIngredient(idx, -1)}>↑</button>
                    <button type="button" className="icon-btn" aria-label="Move ingredient down"
                      disabled={idx === form.ingredients.length - 1}
                      onClick={() => moveIngredient(idx, 1)}>↓</button>
                    <button type="button" className="icon-btn danger" aria-label="Remove ingredient"
                      onClick={() => removeIngredient(ing.key)}>✕</button>
                  </span>
                </div>
              </React.Fragment>
            )
          })}
          {form.ingredients.length === 0 && <p className="empty-note">No ingredients yet.</p>}
          <div className="editor-actions">
            <button type="button" className="btn ghost" onClick={addIngredient}>＋ Add ingredient</button>
            <button type="button" className="btn ghost" onClick={addSection}>＋ Add section</button>
          </div>
        </div>
      </fieldset>

      {/* 5. Method */}
      <fieldset className="form-section">
        <legend><span className="legend-num">5</span> Method</legend>
        <div className="steps-editor">
          {form.steps.map((step, idx) => (
            <div className="step-edit-row" key={step.key}>
              <span className="step-num" aria-hidden="true">{idx + 1}</span>
              <textarea className="input step-text" rows="2" placeholder="Describe this step…"
                value={step.instruction} aria-label={`Step ${idx + 1} instruction`}
                onChange={(e) => updateStep(step.key, { instruction: e.target.value })} />
              <div className="step-timer">
                <input className="input timer-input" type="number" min="0" placeholder="—"
                  value={step.timerMinutes} aria-label={`Step ${idx + 1} timer minutes`}
                  onChange={(e) => updateStep(step.key, { timerMinutes: e.target.value })} />
                <span className="hint">min timer</span>
              </div>
              <span className="row-actions">
                <button type="button" className="icon-btn" aria-label="Move step up" disabled={idx === 0}
                  onClick={() => moveStep(idx, -1)}>↑</button>
                <button type="button" className="icon-btn" aria-label="Move step down"
                  disabled={idx === form.steps.length - 1} onClick={() => moveStep(idx, 1)}>↓</button>
                <button type="button" className="icon-btn danger" aria-label="Remove step"
                  onClick={() => removeStep(step.key)}>✕</button>
              </span>
            </div>
          ))}
          {form.steps.length === 0 && <p className="empty-note">No steps yet.</p>}
          <div className="editor-actions">
            <button type="button" className="btn ghost"
              onClick={() => setForm((f) => ({ ...f, steps: [...f.steps, emptyStep()] }))}>＋ Add step</button>
          </div>
        </div>
      </fieldset>

      {/* 6. Meal planning */}
      <fieldset className="form-section">
        <legend><span className="legend-num">6</span> Meal planning</legend>
        <div className="form-grid">
          <div className="field span-2">
            <label className="checkbox-inline big">
              <input type="checkbox" checked={form.includeInMealSuggestions}
                onChange={(e) => set({ includeInMealSuggestions: e.target.checked })} />
              Make this recipe available in meal-plan suggestions
            </label>
          </div>
          <div className="field span-2">
            <label className="checkbox-inline big">
              <input type="checkbox" checked={form.addToPlan}
                onChange={(e) => set({ addToPlan: e.target.checked })} />
              Add this recipe to my meal plan right away
            </label>
          </div>
          {form.addToPlan && (
            <>
              <label className="field">
                <span>Meal-planning week</span>
                <select className="input" value={form.planWeek} onChange={(e) => changePlanWeek(e.target.value)}>
                  <option value="this">This week ({fmtWeekRange(thisWeek)})</option>
                  <option value="next">Next week ({fmtWeekRange(addWeeksISO(thisWeek, 1))})</option>
                </select>
              </label>
              <label className="field">
                <span>Planned cooking date</span>
                <input className="input" type="date" value={form.planDate}
                  min={weekStartFor(form.planWeek)} max={addDaysLocal(weekStartFor(form.planWeek), 6)}
                  onChange={(e) => set({ planDate: e.target.value })} />
              </label>
              <label className="field">
                <span>Planned meal slot</span>
                <select className="input" value={form.planSlot} onChange={(e) => set({ planSlot: e.target.value })}>
                  {PLAN_SLOT_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Planned serving time <em>(optional)</em></span>
                <input className="input" type="time" value={form.planServingTime}
                  onChange={(e) => set({ planServingTime: e.target.value })} />
              </label>
            </>
          )}
        </div>
      </fieldset>

      {/* 7. Recipe options menu */}
      <fieldset className="form-section">
        <legend><span className="legend-num">7</span> Recipe options</legend>
        <p className="hint">
          Shopping-list inclusion, nutrition display, substitutions and the measurement system for this recipe.
        </p>
        <RecipeOptionsMenu options={form.options} onChange={(o) => set({ options: o })} label="Recipe options" />
        <div className="options-summary">
          {form.options.includeInShoppingList && <span className="mini-chip active-chip">In shopping lists</span>}
          {form.options.showNutrition && <span className="mini-chip active-chip">Nutrition shown</span>}
          {form.options.allowSubstitutions && <span className="mini-chip active-chip">Substitutions allowed</span>}
          <span className="mini-chip active-chip">{form.options.unitSystem === 'metric' ? 'Metric' : 'US customary'}</span>
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="btn primary big-btn">Save recipe</button>
        <button type="button" className="btn ghost big-btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

// small local helper: add days to an ISO date string
function addDaysLocal(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}

function ingredientIdForName(name) {
  const found = INGREDIENTS.find((i) => i.ingredient_name.toLowerCase() === String(name).toLowerCase())
  return found ? found.ingredient_id : ''
}
