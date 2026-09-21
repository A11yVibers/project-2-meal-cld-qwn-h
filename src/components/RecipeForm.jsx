import { useMemo, useState } from 'react'
import RecipeImage from './RecipeImage.jsx'
import RecipeOptionsMenu from './RecipeOptionsMenu.jsx'
import SearchSelect from './SearchSelect.jsx'
import {
  CUISINES,
  MEAL_TYPES,
  DIETARY_TAGS,
  RECIPE_CATEGORIES,
  MASTER_INGREDIENTS,
  UNITS,
  SPICE_LEVELS,
  ACCENT_SWATCHES,
  PLANNER_SLOTS,
  ingredientById,
  coverImagePresets,
} from '../lib/data.js'
import { APPROVED_IMAGES } from '../approved-images.js'
import { useStore } from '../store.jsx'
import { makeId } from '../lib/storage.js'
import {
  todayISO,
  weekStartISO,
  addWeeksISO,
  weekDaysISO,
  weekRangeLabel,
} from '../lib/dates.js'

const MASTER_INGREDIENT_ITEMS = MASTER_INGREDIENTS.map((i) => ({
  value: i.id,
  label: i.name,
  hint: i.shoppingCategory,
}))

const UNIT_ITEMS = UNITS.map((u) => ({ value: u.name, label: u.name }))

const WEEK_CHOICES = [
  { offset: 0, label: 'This week' },
  { offset: 1, label: 'Next week' },
  { offset: 2, label: 'In 2 weeks' },
  { offset: -1, label: 'Last week' },
]

function blankIngredient() {
  return {
    key: makeId('ing'),
    ingredientId: null,
    name: '',
    quantity: '',
    unit: '',
    notes: '',
    optional: false,
  }
}

function blankStep() {
  return { key: makeId('step'), instruction: '', timerMinutes: '' }
}

function emptyDraft() {
  return {
    title: '',
    shortDescription: '',
    sourceName: '',
    sourceUrl: '',
    cuisineId: '',
    mealTypeId: '',
    dietaryTagIds: [],
    categoryIds: [],
    servings: 4,
    prepMinutes: '',
    cookMinutes: '',
    spiceLevel: 0,
    coverImageUrl: '',
    accentColor: ACCENT_SWATCHES[0],
    sections: [{ name: 'Main', ingredients: [blankIngredient()] }],
    steps: [blankStep()],
    includeInSuggestions: true,
    options: {
      includeInShoppingList: true,
      showNutrition: false,
      allowSubstitutions: false,
    },
    // meal-planning
    addToPlan: false,
    planWeekOffset: 0,
    planDate: todayISO(),
    planSlot: 'Dinner',
    planTime: '18:30',
  }
}

function draftFromRecipe(r) {
  return {
    ...emptyDraft(),
    ...r,
    servings: r.servings,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    spiceLevel: r.spiceLevel,
    dietaryTagIds: [...(r.dietaryTagIds || [])],
    categoryIds: [...(r.categoryIds || [])],
    options: { ...emptyDraft().options, ...(r.options || {}) },
    sections: (r.sections || []).map((s) => ({
      name: s.name,
      ingredients: s.ingredients.map((ing) => ({ ...ing })),
    })),
    steps: (r.steps || []).map((st) => ({ ...st })),
    // form-only fields
    addToPlan: false,
    planWeekOffset: 0,
    planDate: todayISO(),
    planSlot: r.mealTypeId
      ? PLANNER_SLOTS.find((s) => s.mealTypeId === r.mealTypeId)?.slot || 'Dinner'
      : 'Dinner',
    planTime: '18:30',
  }
}

function Section({ title, description, children, htmlFor }) {
  return (
    <fieldset className="form-section">
      <legend className="form-section-title">{title}</legend>
      {description && <p className="form-section-desc">{description}</p>}
      {children}
    </fieldset>
  )
}

export default function RecipeForm({ existing, onCancel, onSaved }) {
  const {
    addUserRecipe,
    updateUserRecipe,
    assignRecipe,
    setCurrentWeekStart,
    measurementSystem,
    setMeasurementSystem,
  } = useStore()

  const isEdit = Boolean(existing)
  const [draft, setDraft] = useState(() =>
    isEdit ? draftFromRecipe(existing) : emptyDraft(),
  )
  const [errors, setErrors] = useState({})

  const presets = useMemo(
    () => [APPROVED_IMAGES.placeholder, ...coverImagePresets()],
    [],
  )

  function patch(p) {
    setDraft((d) => ({ ...d, ...p }))
  }

  function toggleInList(listKey, id) {
    setDraft((d) => {
      const list = d[listKey]
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
      return { ...d, [listKey]: next }
    })
  }

  // ---- ingredient section helpers ---------------------------------------
  function updateSection(sectionIdx, patchObj) {
    setDraft((d) => {
      const sections = d.sections.map((s, i) => (i === sectionIdx ? { ...s, ...patchObj } : s))
      return { ...d, sections }
    })
  }

  function addSection() {
    setDraft((d) => ({
      ...d,
      sections: [
        ...d.sections,
        { name: `Section ${d.sections.length + 1}`, ingredients: [blankIngredient()] },
      ],
    }))
  }

  function removeSection(sectionIdx) {
    setDraft((d) => ({
      ...d,
      sections: d.sections.filter((_, i) => i !== sectionIdx),
    }))
  }

  function moveSection(sectionIdx, dir) {
    setDraft((d) => {
      const sections = [...d.sections]
      const target = sectionIdx + dir
      if (target < 0 || target >= sections.length) return d
      ;[sections[sectionIdx], sections[target]] = [sections[target], sections[sectionIdx]]
      return { ...d, sections }
    })
  }

  function addIngredient(sectionIdx) {
    setDraft((d) => {
      const sections = d.sections.map((s, i) =>
        i === sectionIdx ? { ...s, ingredients: [...s.ingredients, blankIngredient()] } : s,
      )
      return { ...d, sections }
    })
  }

  function updateIngredient(sectionIdx, ingIdx, patchObj) {
    setDraft((d) => {
      const sections = d.sections.map((s, i) => {
        if (i !== sectionIdx) return s
        return {
          ...s,
          ingredients: s.ingredients.map((ing, j) => (j === ingIdx ? { ...ing, ...patchObj } : ing)),
        }
      })
      return { ...d, sections }
    })
  }

  function removeIngredient(sectionIdx, ingIdx) {
    setDraft((d) => {
      const sections = d.sections.map((s, i) => {
        if (i !== sectionIdx) return s
        return { ...s, ingredients: s.ingredients.filter((_, j) => j !== ingIdx) }
      })
      return { ...d, sections }
    })
  }

  function moveIngredient(sectionIdx, ingIdx, dir) {
    setDraft((d) => {
      const sections = d.sections.map((s, i) => {
        if (i !== sectionIdx) return s
        const ingredients = [...s.ingredients]
        const target = ingIdx + dir
        if (target < 0 || target >= ingredients.length) return s
        ;[ingredients[ingIdx], ingredients[target]] = [ingredients[target], ingredients[ingIdx]]
        return { ...s, ingredients }
      })
      return { ...d, sections }
    })
  }

  function onIngredientSelect(sectionIdx, ingIdx, value) {
    const master = ingredientById[value]
    if (master) {
      updateIngredient(sectionIdx, ingIdx, { ingredientId: master.id, name: master.name })
    } else {
      updateIngredient(sectionIdx, ingIdx, { ingredientId: null, name: value })
    }
  }

  // ---- step helpers ------------------------------------------------------
  function addStep() {
    setDraft((d) => ({ ...d, steps: [...d.steps, blankStep()] }))
  }
  function updateStep(idx, patchObj) {
    setDraft((d) => ({
      ...d,
      steps: d.steps.map((s, i) => (i === idx ? { ...s, ...patchObj } : s)),
    }))
  }
  function removeStep(idx) {
    setDraft((d) => ({ ...d, steps: d.steps.filter((_, i) => i !== idx) }))
  }
  function moveStep(idx, dir) {
    setDraft((d) => {
      const steps = [...d.steps]
      const target = idx + dir
      if (target < 0 || target >= steps.length) return d
      ;[steps[idx], steps[target]] = [steps[target], steps[idx]]
      return { ...d, steps }
    })
  }

  // ---- derived -----------------------------------------------------------
  const totalTime =
    (Number(draft.prepMinutes) || 0) + (Number(draft.cookMinutes) || 0)

  function onWeekOffsetChange(offset) {
    const base = addWeeksISO(weekStartISO(todayISO()), Number(offset))
    const days = weekDaysISO(base)
    const keep = days.includes(draft.planDate) ? draft.planDate : days[0]
    patch({ planWeekOffset: Number(offset), planDate: keep })
  }

  function validate() {
    const next = {}
    if (!draft.title.trim()) next.title = 'Please enter a recipe title.'
    const hasIngredient = draft.sections.some((s) =>
      s.ingredients.some((i) => i.name.trim()),
    )
    if (!hasIngredient) next.ingredients = 'Add at least one ingredient with a name.'
    const hasStep = draft.steps.some((s) => s.instruction.trim())
    if (!hasStep) next.steps = 'Add at least one method step.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const cleanSections = draft.sections
      .map((s) => ({
        name: s.name.trim() || 'Ingredients',
        ingredients: s.ingredients
          .filter((i) => i.name.trim())
          .map((i) => ({
            key: i.key,
            ingredientId: i.ingredientId || null,
            name: i.name.trim(),
            quantity: i.quantity === '' ? null : Number(i.quantity),
            unit: i.unit || '',
            notes: i.notes || '',
            optional: Boolean(i.optional),
          })),
      }))
      .filter((s) => s.ingredients.length > 0)

    const cleanSteps = draft.steps
      .filter((s) => s.instruction.trim())
      .map((s, i) => ({
        key: s.key,
        instruction: s.instruction.trim(),
        timerMinutes: Number(s.timerMinutes) || 0,
        stepNumber: i + 1,
      }))

    const recipePayload = {
      title: draft.title.trim(),
      shortDescription: draft.shortDescription.trim(),
      sourceName: draft.sourceName.trim(),
      sourceUrl: draft.sourceUrl.trim(),
      cuisineId: draft.cuisineId,
      mealTypeId: draft.mealTypeId,
      dietaryTagIds: draft.dietaryTagIds,
      categoryIds: draft.categoryIds,
      servings: Number(draft.servings) || 1,
      prepMinutes: Number(draft.prepMinutes) || 0,
      cookMinutes: Number(draft.cookMinutes) || 0,
      totalMinutes: totalTime,
      difficulty: existing?.difficulty ?? 2,
      spiceLevel: Number(draft.spiceLevel) || 0,
      accentColor: draft.accentColor,
      coverImageUrl: draft.coverImageUrl.trim(),
      includeInSuggestions: draft.includeInSuggestions,
      options: draft.options,
      sections: cleanSections,
      steps: cleanSteps,
    }

    let savedId
    if (isEdit) {
      updateUserRecipe(existing.id, recipePayload)
      savedId = existing.id
    } else {
      savedId = addUserRecipe(recipePayload)
    }

    if (draft.addToPlan) {
      assignRecipe(draft.planDate, draft.planSlot, savedId)
      setCurrentWeekStart(weekStartISO(draft.planDate))
    }

    onSaved(savedId, { addedToPlan: draft.addToPlan })
  }

  const currentWeekStart = weekStartISO(todayISO())
  const planWeekStart = addWeeksISO(currentWeekStart, draft.planWeekOffset)

  return (
    <form className="recipe-form" onSubmit={handleSubmit} noValidate>
      <div className="form-head">
        <div>
          <h1 className="page-title">{isEdit ? 'Edit recipe' : 'Add a new recipe'}</h1>
          <p className="page-subtitle">
            Fill in the sections below. Only the title is required.
          </p>
        </div>
        <RecipeOptionsMenu
          options={draft.options}
          onToggleOption={(key, val) =>
            patch({ options: { ...draft.options, [key]: val } })
          }
          measurementSystem={measurementSystem}
          onMeasurementChange={setMeasurementSystem}
          idPrefix="form"
        />
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="form-errors" role="alert">
          <strong>Please fix the following:</strong>
          <ul>
            {Object.values(errors).map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- Recipe details ---- */}
      <Section title="Recipe details">
        <div className="form-grid">
          <div className="form-field span-2">
            <label htmlFor="f-title">
              Recipe title <span className="req">*</span>
            </label>
            <input
              id="f-title"
              type="text"
              value={draft.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="e.g. Weeknight stir-fry"
              aria-invalid={Boolean(errors.title)}
            />
          </div>

          <div className="form-field span-2">
            <label htmlFor="f-desc">Short description</label>
            <textarea
              id="f-desc"
              rows={2}
              value={draft.shortDescription}
              onChange={(e) => patch({ shortDescription: e.target.value })}
              placeholder="A one-line summary shown on the recipe card."
            />
          </div>

          <div className="form-field">
            <label htmlFor="f-source-name">Source name</label>
            <input
              id="f-source-name"
              type="text"
              value={draft.sourceName}
              onChange={(e) => patch({ sourceName: e.target.value })}
              placeholder="e.g. Family notebook"
            />
          </div>

          <div className="form-field">
            <label htmlFor="f-source-url">Source link</label>
            <input
              id="f-source-url"
              type="url"
              value={draft.sourceUrl}
              onChange={(e) => patch({ sourceUrl: e.target.value })}
              placeholder="https://…"
            />
          </div>

          <div className="form-field">
            <label htmlFor="f-cuisine">Cuisine</label>
            <select
              id="f-cuisine"
              value={draft.cuisineId}
              onChange={(e) => patch({ cuisineId: e.target.value })}
            >
              <option value="">Select…</option>
              {CUISINES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="f-mealtype">Primary meal type</label>
            <select
              id="f-mealtype"
              value={draft.mealTypeId}
              onChange={(e) => patch({ mealTypeId: e.target.value })}
            >
              <option value="">Select…</option>
              {MEAL_TYPES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-field">
          <span className="label-group" id="diet-group-label">
            Dietary suitability
          </span>
          <div className="check-grid" role="group" aria-labelledby="diet-group-label">
            {DIETARY_TAGS.map((t) => (
              <label key={t.id} className="check-pill">
                <input
                  type="checkbox"
                  checked={draft.dietaryTagIds.includes(t.id)}
                  onChange={() => toggleInList('dietaryTagIds', t.id)}
                />
                <span>{t.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-field">
          <span className="label-group" id="cat-group-label">
            Recipe categories
          </span>
          <div className="check-grid" role="group" aria-labelledby="cat-group-label">
            {RECIPE_CATEGORIES.map((c) => (
              <label key={c.id} className="check-pill">
                <input
                  type="checkbox"
                  checked={draft.categoryIds.includes(c.id)}
                  onChange={() => toggleInList('categoryIds', c.id)}
                />
                <span>{c.name}</span>
              </label>
            ))}
          </div>
        </div>
      </Section>

      {/* ---- Timing & yield ---- */}
      <Section title="Timing & yield">
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="f-servings">Servings</label>
            <div className="stepper">
              <button
                type="button"
                className="stepper-btn"
                aria-label="Decrease servings"
                onClick={() =>
                  patch({ servings: Math.max(1, (Number(draft.servings) || 1) - 1) })
                }
              >
                −
              </button>
              <input
                id="f-servings"
                type="number"
                min="1"
                step="1"
                value={draft.servings}
                onChange={(e) => patch({ servings: e.target.value })}
              />
              <button
                type="button"
                className="stepper-btn"
                aria-label="Increase servings"
                onClick={() =>
                  patch({ servings: Math.max(1, (Number(draft.servings) || 1) + 1) })
                }
              >
                +
              </button>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="f-prep">Prep time (min)</label>
            <input
              id="f-prep"
              type="number"
              min="0"
              step="1"
              value={draft.prepMinutes}
              onChange={(e) => patch({ prepMinutes: e.target.value })}
              placeholder="0"
            />
          </div>

          <div className="form-field">
            <label htmlFor="f-cook">Cook time (min)</label>
            <input
              id="f-cook"
              type="number"
              min="0"
              step="1"
              value={draft.cookMinutes}
              onChange={(e) => patch({ cookMinutes: e.target.value })}
              placeholder="0"
            />
          </div>

          <div className="form-field">
            <label htmlFor="f-total">Total time</label>
            <input
              id="f-total"
              type="text"
              value={`${totalTime} min`}
              readOnly
              tabIndex={-1}
              className="readonly"
              aria-describedby="total-help"
            />
            <span className="help" id="total-help">
              Calculated from prep + cook time.
            </span>
          </div>
        </div>

        <div className="form-field">
          <span className="label-group" id="spice-label">Spice level</span>
          <div
            className="spice-picker"
            role="radiogroup"
            aria-labelledby="spice-label"
          >
            {SPICE_LEVELS.map((s) => {
              const active = Number(draft.spiceLevel) === s.value
              return (
                <button
                  type="button"
                  key={s.value}
                  role="radio"
                  aria-checked={active}
                  className={`spice-pill${active ? ' is-active' : ''}`}
                  onClick={() => patch({ spiceLevel: s.value })}
                >
                  <span aria-hidden="true">
                    {s.value === 0 ? '🚫' : '🌶️'.repeat(s.value)}
                  </span>
                  <span className="spice-pill-label">{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </Section>

      {/* ---- Image & appearance ---- */}
      <Section
        title="Image & appearance"
        description="Cover images use remote URLs (from the supplied data or an approved source). The app never stores or generates image files."
      >
        <div className="form-grid">
          <div className="form-field span-2">
            <label htmlFor="f-cover">Cover image URL</label>
            <input
              id="f-cover"
              type="url"
              value={draft.coverImageUrl}
              onChange={(e) => patch({ coverImageUrl: e.target.value })}
              placeholder="https://… (leave blank to use the placeholder image)"
            />
            <div className="preset-row">
              <span className="preset-caption">Quick pick:</span>
              {presets.map((url) => (
                <button
                  type="button"
                  key={url}
                  className={`preset-thumb${draft.coverImageUrl === url ? ' is-active' : ''}`}
                  onClick={() => patch({ coverImageUrl: url })}
                  aria-label="Use this cover image"
                  aria-pressed={draft.coverImageUrl === url}
                >
                  <RecipeImage src={url} alt="" className="preset-img" />
                </button>
              ))}
            </div>
          </div>

          <div className="form-field">
            <span className="label-group">Preview</span>
            <div className="cover-preview" style={{ '--accent': draft.accentColor }}>
              <RecipeImage
                src={draft.coverImageUrl}
                alt="Cover preview"
                className="cover-preview-img"
                accentColor={draft.accentColor}
              />
            </div>
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="f-accent">Card accent colour</label>
          <div className="accent-row">
            <div className="swatches" role="group" aria-label="Accent colour presets">
              {ACCENT_SWATCHES.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`swatch${draft.accentColor.toLowerCase() === c.toLowerCase() ? ' is-active' : ''}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Accent colour ${c}`}
                  aria-pressed={draft.accentColor.toLowerCase() === c.toLowerCase()}
                  onClick={() => patch({ accentColor: c })}
                />
              ))}
            </div>
            <input
              id="f-accent"
              type="color"
              value={draft.accentColor}
              onChange={(e) => patch({ accentColor: e.target.value })}
              aria-label="Custom accent colour"
            />
          </div>
        </div>
      </Section>

      {/* ---- Ingredients ---- */}
      <Section title="Ingredients">
        {errors.ingredients && <p className="field-error">{errors.ingredients}</p>}
        <div className="sections-stack">
          {draft.sections.map((section, sIdx) => (
            <div className="ing-editor-section" key={sIdx}>
              <div className="ing-section-head">
                <label className="visually-hidden" htmlFor={`sec-name-${sIdx}`}>
                  Section name
                </label>
                <input
                  id={`sec-name-${sIdx}`}
                  type="text"
                  className="section-name-input"
                  value={section.name}
                  placeholder="Section name (e.g. Main, Sauce, Garnish)"
                  onChange={(e) => updateSection(sIdx, { name: e.target.value })}
                />
                <div className="row-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Move section up"
                    disabled={sIdx === 0}
                    onClick={() => moveSection(sIdx, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Move section down"
                    disabled={sIdx === draft.sections.length - 1}
                    onClick={() => moveSection(sIdx, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    aria-label="Remove section"
                    disabled={draft.sections.length === 1}
                    onClick={() => removeSection(sIdx)}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="ing-editor-rows">
                {section.ingredients.map((ing, iIdx) => {
                  const items =
                    ing.name && !ing.ingredientId
                      ? [{ value: ing.name, label: `${ing.name} (custom)` }, ...MASTER_INGREDIENT_ITEMS]
                      : MASTER_INGREDIENT_ITEMS
                  return (
                    <div className="ing-editor-row" key={ing.key}>
                      <div className="row-actions order-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label="Move ingredient up"
                          disabled={iIdx === 0}
                          onClick={() => moveIngredient(sIdx, iIdx, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          aria-label="Move ingredient down"
                          disabled={iIdx === section.ingredients.length - 1}
                          onClick={() => moveIngredient(sIdx, iIdx, 1)}
                        >
                          ↓
                        </button>
                      </div>
                      <div className="ing-col-name">
                        <SearchSelect
                          items={items}
                          value={ing.ingredientId || ing.name}
                          onChange={(val) => onIngredientSelect(sIdx, iIdx, val)}
                          placeholder="Search ingredient…"
                          allowCustom
                          ariaLabel={`Ingredient ${iIdx + 1} in ${section.name}`}
                        />
                      </div>
                      <div className="ing-col-qty">
                        <label className="visually-hidden" htmlFor={`qty-${ing.key}`}>
                          Quantity
                        </label>
                        <input
                          id={`qty-${ing.key}`}
                          type="number"
                          min="0"
                          step="0.25"
                          placeholder="Qty"
                          value={ing.quantity}
                          onChange={(e) =>
                            updateIngredient(sIdx, iIdx, { quantity: e.target.value })
                          }
                        />
                      </div>
                      <div className="ing-col-unit">
                        <SearchSelect
                          items={UNIT_ITEMS}
                          value={ing.unit}
                          onChange={(val) => updateIngredient(sIdx, iIdx, { unit: val })}
                          placeholder="Unit"
                          allowCustom
                          ariaLabel={`Unit for ingredient ${iIdx + 1} in ${section.name}`}
                        />
                      </div>
                      <div className="ing-col-notes">
                        <label className="visually-hidden" htmlFor={`notes-${ing.key}`}>
                          Notes
                        </label>
                        <input
                          id={`notes-${ing.key}`}
                          type="text"
                          placeholder="Notes (e.g. minced)"
                          value={ing.notes}
                          onChange={(e) =>
                            updateIngredient(sIdx, iIdx, { notes: e.target.value })
                          }
                        />
                      </div>
                      <label className="ing-col-optional check-inline">
                        <input
                          type="checkbox"
                          checked={ing.optional}
                          onChange={(e) =>
                            updateIngredient(sIdx, iIdx, { optional: e.target.checked })
                          }
                        />
                        <span>Optional</span>
                      </label>
                      <button
                        type="button"
                        className="icon-btn danger"
                        aria-label="Remove ingredient"
                        onClick={() => removeIngredient(sIdx, iIdx)}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => addIngredient(sIdx)}
              >
                ＋ Add ingredient
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-outline" onClick={addSection}>
          ＋ Add ingredient section
        </button>
      </Section>

      {/* ---- Method ---- */}
      <Section title="Method">
        {errors.steps && <p className="field-error">{errors.steps}</p>}
        <ol className="step-editor">
          {draft.steps.map((step, idx) => (
            <li className="step-editor-row" key={step.key}>
              <span className="step-editor-num">{idx + 1}</span>
              <div className="step-editor-main">
                <label className="visually-hidden" htmlFor={`step-${step.key}`}>
                  Step {idx + 1} instruction
                </label>
                <textarea
                  id={`step-${step.key}`}
                  rows={2}
                  placeholder="Describe this step…"
                  value={step.instruction}
                  onChange={(e) => updateStep(idx, { instruction: e.target.value })}
                />
              </div>
              <div className="step-editor-timer">
                <label className="visually-hidden" htmlFor={`timer-${step.key}`}>
                  Timer minutes for step {idx + 1}
                </label>
                <input
                  id={`timer-${step.key}`}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="⏱ min"
                  value={step.timerMinutes}
                  onChange={(e) => updateStep(idx, { timerMinutes: e.target.value })}
                />
              </div>
              <div className="row-actions">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Move step up"
                  disabled={idx === 0}
                  onClick={() => moveStep(idx, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Move step down"
                  disabled={idx === draft.steps.length - 1}
                  onClick={() => moveStep(idx, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  aria-label="Remove step"
                  onClick={() => removeStep(idx)}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn-outline" onClick={addStep}>
          ＋ Add step
        </button>
      </Section>

      {/* ---- Meal planning options ---- */}
      <Section title="Meal planning">
        <label className="check-inline big">
          <input
            type="checkbox"
            checked={draft.includeInSuggestions}
            onChange={(e) => patch({ includeInSuggestions: e.target.checked })}
          />
          <span>Available in meal-plan suggestions</span>
        </label>

        <label className="check-inline big">
          <input
            type="checkbox"
            checked={draft.addToPlan}
            onChange={(e) => patch({ addToPlan: e.target.checked })}
          />
          <span>Add this recipe to my meal plan immediately</span>
        </label>

        {draft.addToPlan && (
          <div className="plan-options">
            <div className="form-field">
              <label htmlFor="f-plan-week">Planning week</label>
              <select
                id="f-plan-week"
                value={draft.planWeekOffset}
                onChange={(e) => onWeekOffsetChange(e.target.value)}
              >
                {WEEK_CHOICES.map((w) => (
                  <option key={w.offset} value={w.offset}>
                    {w.label} ({weekRangeLabel(addWeeksISO(currentWeekStart, w.offset))})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="f-plan-date">Planned cooking date</label>
              <input
                id="f-plan-date"
                type="date"
                value={draft.planDate}
                onChange={(e) => patch({ planDate: e.target.value })}
              />
            </div>

            <div className="form-field">
              <label htmlFor="f-plan-slot">Planned serving time</label>
              <select
                id="f-plan-slot"
                value={draft.planSlot}
                onChange={(e) => patch({ planSlot: e.target.value })}
              >
                {PLANNER_SLOTS.map((s) => (
                  <option key={s.slot} value={s.slot}>
                    {s.icon} {s.slot}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="f-plan-time">Specific time</label>
              <input
                id="f-plan-time"
                type="time"
                value={draft.planTime}
                onChange={(e) => patch({ planTime: e.target.value })}
              />
            </div>

            <p className="help span-2">
              Week of {weekRangeLabel(planWeekStart)}. The recipe will be placed in
              the {draft.planSlot} slot on {draft.planDate}
              {draft.planTime ? ` at ${draft.planTime}` : ''}.
            </p>
          </div>
        )}
      </Section>

      <div className="form-foot">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {isEdit ? 'Save changes' : 'Add recipe'}
        </button>
      </div>
    </form>
  )
}
