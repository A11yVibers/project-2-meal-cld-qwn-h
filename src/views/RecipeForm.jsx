import React, { useMemo, useState } from 'react'
import IngredientSearch from '../components/IngredientSearch.jsx'
import RecipeOptionsMenu from '../components/RecipeOptionsMenu.jsx'
import Thumbnail from '../components/Thumbnail.jsx'
import { APPROVED_IMAGES } from '../approved-images.js'
import { useStore } from '../store.jsx'
import {
  ASSET_IMAGE_URLS,
  CATEGORIES,
  CUISINES,
  DEFAULT_RECIPE_OPTIONS,
  DIETARY_TAGS,
  MEAL_SLOTS,
  MEAL_TYPES,
  SPICE_LEVELS,
  UNITS,
  slotLabel,
} from '../lib/data.js'
import {
  startOfWeekKey,
  toKey,
  todayKey,
  weekDays,
  weekOptions,
} from '../lib/dates.js'

const ACCENT_PRESETS = [
  '#D97757', '#C2453D', '#E0A458', '#8A9A5B', '#3E8E7E',
  '#4A7BA6', '#7B5EA7', '#B0578D', '#6B4F3A', '#455A64',
]

function emptyIngredient() {
  return { ingredientId: null, ingredientName: '', quantity: 1, unit: 'piece', notes: '', optional: false }
}

function FormSection({ title, subtitle, children }) {
  return (
    <section className="card form-section">
      <header className="form-section-head">
        <h3>{title}</h3>
        {subtitle && <p className="muted small">{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}

export default function RecipeForm({ editingId = null, onSaved, onCancel }) {
  const { getRecipe, saveUserRecipe, assignRecipe, setCurrentWeekKey } = useStore()
  const editing = editingId ? getRecipe(editingId) : null

  const [form, setForm] = useState(() => {
    if (editing) {
      return {
        ...editing,
        ingredientSections: editing.ingredientSections?.map((s) => ({
          name: s.name,
          items: s.items.map((i) => ({ ...i })),
        })) || [],
        steps: editing.steps?.map((s) => ({ ...s })) || [],
        options: { ...DEFAULT_RECIPE_OPTIONS, ...(editing.options || {}) },
      }
    }
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
      prepMinutes: 10,
      cookMinutes: 20,
      spiceLevel: 1,
      accentColor: ACCENT_PRESETS[0],
      coverImageUrl: '',
      includeInMealSuggestions: true,
      options: { ...DEFAULT_RECIPE_OPTIONS },
      ingredientSections: [{ name: 'Main', items: [emptyIngredient()] }],
      steps: [{ instruction: '', timerMinutes: 0 }],
    }
  })

  // Meal-planning options state
  const [addToPlan, setAddToPlan] = useState(false)
  const [planWeekKey, setPlanWeekKey] = useState(startOfWeekKey(todayKey()))
  const [planDate, setPlanDate] = useState(todayKey())
  const [planSlot, setPlanSlot] = useState('dinner')
  const [planSpecific, setPlanSpecific] = useState('')

  const [errors, setErrors] = useState({})
  const weeks = useMemo(() => weekOptions(2, 12), [])
  const planDays = useMemo(() => weekDays(planWeekKey), [planWeekKey])

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const totalMinutes = (Number(form.prepMinutes) || 0) + (Number(form.cookMinutes) || 0)

  const toggleInList = (key, id) => {
    const list = form[key] || []
    set({ [key]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] })
  }

  // ---- ingredient section helpers ----------------------------------------
  const updateSection = (sIdx, patch) => {
    setForm((prev) => ({
      ...prev,
      ingredientSections: prev.ingredientSections.map((s, i) =>
        i === sIdx ? { ...s, ...patch } : s,
      ),
    }))
  }
  const updateItem = (sIdx, iIdx, patch) => {
    setForm((prev) => ({
      ...prev,
      ingredientSections: prev.ingredientSections.map((s, i) =>
        i === sIdx ? { ...s, items: s.items.map((it, j) => (j === iIdx ? { ...it, ...patch } : it)) } : s,
      ),
    }))
  }
  const addItem = (sIdx) =>
    updateSection(sIdx, {
      items: [...form.ingredientSections[sIdx].items, emptyIngredient()],
    })
  const removeItem = (sIdx, iIdx) => {
    const items = form.ingredientSections[sIdx].items.filter((_, j) => j !== iIdx)
    if (items.length === 0) {
      // Removing the last item removes the whole section if others exist.
      if (form.ingredientSections.length > 1) {
        setForm((prev) => ({
          ...prev,
          ingredientSections: prev.ingredientSections.filter((_, i) => i !== sIdx),
        }))
        return
      }
    }
    updateSection(sIdx, { items })
  }
  const moveItem = (sIdx, iIdx, dir) => {
    const sections = form.ingredientSections.map((s) => ({ ...s, items: [...s.items] }))
    const target = iIdx + dir
    if (target < 0) {
      // Move to the end of the previous section.
      if (sIdx === 0) return
      const [item] = sections[sIdx].items.splice(iIdx, 1)
      sections[sIdx - 1].items.push(item)
    } else if (target >= sections[sIdx].items.length) {
      // Move to the start of the next section.
      if (sIdx >= sections.length - 1) return
      const [item] = sections[sIdx].items.splice(iIdx, 1)
      sections[sIdx + 1].items.unshift(item)
    } else {
      const items = sections[sIdx].items
      ;[items[iIdx], items[target]] = [items[target], items[iIdx]]
    }
    set({ ingredientSections: sections })
  }
  const addSection = () =>
    set({
      ingredientSections: [
        ...form.ingredientSections,
        { name: `Section ${form.ingredientSections.length + 1}`, items: [emptyIngredient()] },
      ],
    })
  const removeSection = (sIdx) =>
    set({ ingredientSections: form.ingredientSections.filter((_, i) => i !== sIdx) })
  const moveSection = (sIdx, dir) => {
    const target = sIdx + dir
    if (target < 0 || target >= form.ingredientSections.length) return
    const sections = [...form.ingredientSections]
    ;[sections[sIdx], sections[target]] = [sections[target], sections[sIdx]]
    set({ ingredientSections: sections })
  }

  // ---- step helpers -------------------------------------------------------
  const updateStep = (idx, patch) =>
    set({ steps: form.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)) })
  const addStep = () => set({ steps: [...form.steps, { instruction: '', timerMinutes: 0 }] })
  const removeStep = (idx) =>
    set({ steps: form.steps.filter((_, i) => i !== idx).length ? form.steps.filter((_, i) => i !== idx) : [{ instruction: '', timerMinutes: 0 }] })
  const moveStep = (idx, dir) => {
    const target = idx + dir
    if (target < 0 || target >= form.steps.length) return
    const steps = [...form.steps]
    ;[steps[idx], steps[target]] = [steps[target], steps[idx]]
    set({ steps })
  }

  const onPlanWeekChange = (key) => {
    setPlanWeekKey(key)
    const prevStart = startOfWeekKey(planDate)
    const offsetDays = Math.round(
      (new Date(planDate + 'T00:00:00') - new Date(prevStart + 'T00:00:00')) / 86400000,
    )
    const d = new Date(key + 'T00:00:00')
    d.setDate(d.getDate() + (Number.isFinite(offsetDays) ? offsetDays : 0))
    setPlanDate(toKey(d))
  }

  const validate = () => {
    const next = {}
    if (!form.title.trim()) next.title = 'Please give the recipe a title.'
    if (Number(form.servings) < 1) next.servings = 'Servings must be at least 1.'
    if (form.sourceUrl && !/^https?:\/\/.+/i.test(form.sourceUrl)) {
      next.sourceUrl = 'Source link must be a valid http(s) URL.'
    }
    if (form.coverImageUrl && !/^https?:\/\/.+/i.test(form.coverImageUrl)) {
      next.coverImageUrl = 'Cover image must be a remote http(s) URL.'
    }
    if (addToPlan) {
      const inWeek = planDays.some((d) => d.key === planDate)
      if (!planDate) next.planDate = 'Choose a planned cooking date.'
      else if (!inWeek) next.planDate = 'Cooking date must fall inside the selected planning week.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = (e) => {
    e.preventDefault()
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const cleaned = {
      ...form,
      title: form.title.trim(),
      prepMinutes: Number(form.prepMinutes) || 0,
      cookMinutes: Number(form.cookMinutes) || 0,
      totalMinutes,
      servings: Math.max(1, Number(form.servings) || 1),
      spiceLevel: Number(form.spiceLevel) || 0,
      ingredientSections: form.ingredientSections
        .map((s) => ({
          name: s.name?.trim() || 'Ingredients',
          items: s.items
            .filter((it) => it.ingredientName && it.ingredientName.trim())
            .map((it) => ({
              ingredientId: it.ingredientId || null,
              ingredientName: it.ingredientName.trim(),
              quantity: Number(it.quantity) || 0,
              unit: it.unit || '',
              notes: (it.notes || '').trim(),
              optional: Boolean(it.optional),
            })),
        }))
        .filter((s) => s.items.length > 0),
      steps: form.steps
        .filter((s) => s.instruction && s.instruction.trim())
        .map((s) => ({ instruction: s.instruction.trim(), timerMinutes: Number(s.timerMinutes) || 0 })),
    }
    const id = saveUserRecipe(cleaned)

    if (addToPlan) {
      assignRecipe({
        date: planDate,
        slot: planSlot,
        recipeId: id,
        at: planSpecific || '',
      })
      setCurrentWeekKey(startOfWeekKey(planDate))
    }
    onSaved(id)
  }

  return (
    <section className="view form-view">
      <div className="view-head">
        <div>
          <h2>{editing ? `Edit “${editing.title}”` : 'Add a new recipe'}</h2>
          <p className="muted">Fill in the sections below, then save. Required field: title.</p>
        </div>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="notice error" role="alert">
          <strong>Please fix the highlighted fields.</strong>
          <ul>
            {Object.values(errors).map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={submit} noValidate>
        {/* ---------- Recipe details ---------- */}
        <FormSection title="Recipe details" subtitle="The basics shown across the catalog and detail views.">
          <label className={`field ${errors.title ? 'field-error' : ''}`}>
            <span className="field-label">Recipe title *</span>
            <input
              className="input"
              type="text"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="e.g. Weeknight Miso Noodles"
              required
            />
            {errors.title && <span className="field-msg">{errors.title}</span>}
          </label>

          <label className="field">
            <span className="field-label">Short description</span>
            <textarea
              className="input"
              rows={2}
              value={form.shortDescription}
              onChange={(e) => set({ shortDescription: e.target.value })}
              placeholder="One or two sentences that make people hungry…"
            />
          </label>

          <div className="field-grid-2">
            <label className="field">
              <span className="field-label">Source name</span>
              <input
                className="input"
                type="text"
                value={form.sourceName}
                onChange={(e) => set({ sourceName: e.target.value })}
                placeholder="Blog, cookbook, family…"
              />
            </label>
            <label className={`field ${errors.sourceUrl ? 'field-error' : ''}`}>
              <span className="field-label">Source link</span>
              <input
                className="input"
                type="url"
                value={form.sourceUrl}
                onChange={(e) => set({ sourceUrl: e.target.value })}
                placeholder="https://…"
              />
              {errors.sourceUrl && <span className="field-msg">{errors.sourceUrl}</span>}
            </label>
          </div>

          <div className="field-grid-2">
            <label className="field">
              <span className="field-label">Cuisine</span>
              <select
                className="input"
                value={form.cuisineId}
                onChange={(e) => set({ cuisineId: e.target.value })}
              >
                <option value="">Select a cuisine…</option>
                {CUISINES.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Primary meal type</span>
              <select
                className="input"
                value={form.mealTypeId}
                onChange={(e) => set({ mealTypeId: e.target.value })}
              >
                <option value="">Select a meal type…</option>
                {MEAL_TYPES.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="field">
            <span className="field-label">Dietary suitability (select all that apply)</span>
            <div className="chip-group">
              {DIETARY_TAGS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`tag-toggle ${form.dietaryTagIds.includes(t.id) ? 'active' : ''}`}
                  aria-pressed={form.dietaryTagIds.includes(t.id)}
                  onClick={() => toggleInList('dietaryTagIds', t.id)}
                >
                  {form.dietaryTagIds.includes(t.id) ? '✓ ' : ''}{t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field-label">Recipe categories (select one or more)</span>
            <div className="chip-group">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`tag-toggle ${form.categoryIds.includes(c.id) ? 'active' : ''}`}
                  aria-pressed={form.categoryIds.includes(c.id)}
                  onClick={() => toggleInList('categoryIds', c.id)}
                >
                  {form.categoryIds.includes(c.id) ? '✓ ' : ''}{c.name}
                </button>
              ))}
            </div>
          </div>
        </FormSection>

        {/* ---------- Timing & yield ---------- */}
        <FormSection title="Timing & yield" subtitle="Total time is generated automatically from prep and cook time.">
          <div className="field-grid-2">
            <div className={`field ${errors.servings ? 'field-error' : ''}`}>
              <span className="field-label">Servings</span>
              <div className="stepper">
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => set({ servings: Math.max(1, (Number(form.servings) || 1) - 1) })}
                  aria-label="Decrease servings"
                >
                  −
                </button>
                <input
                  className="input stepper-input"
                  type="number"
                  min={1}
                  value={form.servings}
                  onChange={(e) => set({ servings: e.target.value })}
                  aria-label="Servings"
                />
                <button
                  type="button"
                  className="stepper-btn"
                  onClick={() => set({ servings: (Number(form.servings) || 0) + 1 })}
                  aria-label="Increase servings"
                >
                  +
                </button>
              </div>
              {errors.servings && <span className="field-msg">{errors.servings}</span>}
            </div>
            <div className="field">
              <span className="field-label">Spice level</span>
              <div className="spice-control" role="radiogroup" aria-label="Spice level">
                {SPICE_LEVELS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={Number(form.spiceLevel) === s.value}
                    className={`spice-btn ${Number(form.spiceLevel) === s.value ? 'selected' : ''}`}
                    onClick={() => set({ spiceLevel: s.value })}
                    title={s.label}
                  >
                    <span className="spice-heat" aria-hidden="true">
                      {'🌶'.repeat(Math.max(s.value, 0)) || '—'}
                    </span>
                    <span className="spice-name">{s.value === 1 ? 'Mild' : s.value === 5 ? 'Very spicy' : s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="field-grid-3">
            <label className="field">
              <span className="field-label">Prep time (minutes)</span>
              <input
                className="input"
                type="number"
                min={0}
                value={form.prepMinutes}
                onChange={(e) => set({ prepMinutes: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">Cook time (minutes)</span>
              <input
                className="input"
                type="number"
                min={0}
                value={form.cookMinutes}
                onChange={(e) => set({ cookMinutes: e.target.value })}
              />
            </label>
            <label className="field">
              <span className="field-label">Total time (auto)</span>
              <input className="input input-auto" type="text" readOnly value={`${totalMinutes} min`} tabIndex={-1} />
            </label>
          </div>
        </FormSection>

        {/* ---------- Image & appearance ---------- */}
        <FormSection
          title="Image & appearance"
          subtitle="Cover images are remote URLs (per this app's image policy, image files are never stored locally). Choose from the approved images or paste a remote URL."
        >
          <div className="image-picker">
            <div className="image-preview">
              <Thumbnail src={form.coverImageUrl} alt="Cover preview" className="preview-img" />
              {!form.coverImageUrl && <span className="preview-label">Placeholder shown</span>}
            </div>
            <div className="image-controls">
              <label className={`field ${errors.coverImageUrl ? 'field-error' : ''}`}>
                <span className="field-label">Upload cover image (remote URL)</span>
                <input
                  className="input"
                  type="url"
                  value={form.coverImageUrl}
                  onChange={(e) => set({ coverImageUrl: e.target.value })}
                  placeholder="https://…"
                />
                {errors.coverImageUrl && <span className="field-msg">{errors.coverImageUrl}</span>}
              </label>
              <div className="field">
                <span className="field-label">…or pick an approved image</span>
                <div className="approved-strip">
                  {[APPROVED_IMAGES.placeholder, ...ASSET_IMAGE_URLS].map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      className={`approved-thumb ${form.coverImageUrl === url ? 'selected' : ''}`}
                      onClick={() => set({ coverImageUrl: form.coverImageUrl === url ? '' : url })}
                      title={i === 0 ? 'Placeholder image' : 'Recipe image from supplied data'}
                    >
                      <img src={url} alt="" loading="lazy" />
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`approved-thumb no-image ${!form.coverImageUrl ? 'selected' : ''}`}
                    onClick={() => set({ coverImageUrl: '' })}
                    title="No image (placeholder will be used)"
                  >
                    <span>∅</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="field">
            <span className="field-label">Recipe card accent color</span>
            <div className="accent-picker">
              {ACCENT_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`accent-swatch ${form.accentColor === color ? 'selected' : ''}`}
                  style={{ background: color }}
                  onClick={() => set({ accentColor: color })}
                  aria-label={`Accent color ${color}`}
                  aria-pressed={form.accentColor === color}
                />
              ))}
              <label className="accent-custom">
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(form.accentColor) ? form.accentColor : '#D97757'}
                  onChange={(e) => set({ accentColor: e.target.value })}
                />
                Custom
              </label>
            </div>
          </div>
        </FormSection>

        {/* ---------- Ingredients ---------- */}
        <FormSection
          title="Ingredients"
          subtitle="Group ingredients into sections such as Main, Sauce, or Garnish. Ingredients are chosen from the supplied ingredient data."
        >
          {form.ingredientSections.length === 0 && (
            <p className="muted">No ingredient sections yet — add one below.</p>
          )}
          {form.ingredientSections.map((section, sIdx) => (
            <div className="ing-section card-inner" key={sIdx}>
              <div className="ing-section-head">
                <input
                  className="input section-name-input"
                  type="text"
                  value={section.name}
                  placeholder="Section name (e.g. Main, Sauce, Garnish)"
                  onChange={(e) => updateSection(sIdx, { name: e.target.value })}
                  aria-label={`Section ${sIdx + 1} name`}
                />
                <div className="row-actions">
                  <button type="button" className="icon-btn" title="Move section up" onClick={() => moveSection(sIdx, -1)} disabled={sIdx === 0}>↑</button>
                  <button type="button" className="icon-btn" title="Move section down" onClick={() => moveSection(sIdx, 1)} disabled={sIdx === form.ingredientSections.length - 1}>↓</button>
                  <button type="button" className="icon-btn danger-text" title="Remove section" onClick={() => removeSection(sIdx)}>🗑</button>
                </div>
              </div>

              {section.items.map((item, iIdx) => (
                <div className="ing-row" key={iIdx}>
                  <div className="ing-row-main">
                    <IngredientSearch
                      value={{ ingredientId: item.ingredientId, ingredientName: item.ingredientName }}
                      onSelect={(sel) => updateItem(sIdx, iIdx, sel)}
                    />
                    <input
                      className="input ing-qty"
                      type="number"
                      min={0}
                      step="0.25"
                      value={item.quantity}
                      onChange={(e) => updateItem(sIdx, iIdx, { quantity: e.target.value })}
                      aria-label="Quantity"
                      placeholder="Qty"
                    />
                    <select
                      className="input ing-unit"
                      value={item.unit}
                      onChange={(e) => updateItem(sIdx, iIdx, { unit: e.target.value })}
                      aria-label="Unit"
                    >
                      {UNITS.map((u) => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                      ))}
                    </select>
                    <input
                      className="input ing-notes"
                      type="text"
                      value={item.notes}
                      onChange={(e) => updateItem(sIdx, iIdx, { notes: e.target.value })}
                      placeholder="Notes (minced, grated…)"
                      aria-label="Preparation notes"
                    />
                    <label className="ing-optional">
                      <input
                        type="checkbox"
                        checked={item.optional}
                        onChange={(e) => updateItem(sIdx, iIdx, { optional: e.target.checked })}
                      />
                      Optional
                    </label>
                  </div>
                  <div className="row-actions">
                    <button type="button" className="icon-btn" title="Move ingredient up" onClick={() => moveItem(sIdx, iIdx, -1)}>↑</button>
                    <button type="button" className="icon-btn" title="Move ingredient down" onClick={() => moveItem(sIdx, iIdx, 1)}>↓</button>
                    <button type="button" className="icon-btn danger-text" title="Remove ingredient" onClick={() => removeItem(sIdx, iIdx)}>✕</button>
                  </div>
                </div>
              ))}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => addItem(sIdx)}>
                ＋ Add ingredient
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-ghost" onClick={addSection}>
            ＋ Add ingredient section
          </button>
        </FormSection>

        {/* ---------- Method ---------- */}
        <FormSection title="Method" subtitle="Numbered cooking steps, each with an optional timer.">
          {form.steps.map((step, idx) => (
            <div className="step-edit-row" key={idx}>
              <span className="step-number">{idx + 1}</span>
              <textarea
                className="input"
                rows={2}
                value={step.instruction}
                onChange={(e) => updateStep(idx, { instruction: e.target.value })}
                placeholder={`Step ${idx + 1} instruction…`}
                aria-label={`Step ${idx + 1} instruction`}
              />
              <label className="step-timer-field">
                <span className="field-label small">Timer (min)</span>
                <input
                  className="input timer-input"
                  type="number"
                  min={0}
                  value={step.timerMinutes}
                  onChange={(e) => updateStep(idx, { timerMinutes: e.target.value })}
                />
              </label>
              <div className="row-actions">
                <button type="button" className="icon-btn" title="Move step up" onClick={() => moveStep(idx, -1)} disabled={idx === 0}>↑</button>
                <button type="button" className="icon-btn" title="Move step down" onClick={() => moveStep(idx, 1)} disabled={idx === form.steps.length - 1}>↓</button>
                <button type="button" className="icon-btn danger-text" title="Remove step" onClick={() => removeStep(idx)}>✕</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-ghost" onClick={addStep}>
            ＋ Add step
          </button>
        </FormSection>

        {/* ---------- Meal-planning options ---------- */}
        <FormSection title="Meal-planning options" subtitle="Make the recipe available to the planner, and/or drop it straight into the weekly plan.">
          <label className="switch-row">
            <input
              type="checkbox"
              checked={Boolean(form.includeInMealSuggestions)}
              onChange={(e) => set({ includeInMealSuggestions: e.target.checked })}
            />
            <span>
              Available in meal-plan suggestions
              <span className="option-hint">Shown first when choosing recipes for planner slots</span>
            </span>
          </label>

          <label className="switch-row">
            <input type="checkbox" checked={addToPlan} onChange={(e) => setAddToPlan(e.target.checked)} />
            <span>
              Add to the meal plan immediately after saving
              <span className="option-hint">Places this recipe into a slot of the weekly planner</span>
            </span>
          </label>

          {addToPlan && (
            <div className="plan-inline card-inner">
              <label className="field">
                <span className="field-label">Meal-planning week</span>
                <select className="input" value={planWeekKey} onChange={(e) => onPlanWeekChange(e.target.value)}>
                  {weeks.map((w) => (
                    <option key={w.key} value={w.key}>{w.label}</option>
                  ))}
                </select>
              </label>
              <div className="field-grid-2">
                <label className={`field ${errors.planDate ? 'field-error' : ''}`}>
                  <span className="field-label">Planned cooking date</span>
                  <input
                    className="input"
                    type="date"
                    value={planDate}
                    min={planDays[0].key}
                    max={planDays[6].key}
                    onChange={(e) => setPlanDate(e.target.value)}
                  />
                  {errors.planDate && <span className="field-msg">{errors.planDate}</span>}
                </label>
                <label className="field">
                  <span className="field-label">Planned serving time</span>
                  <select className="input" value={planSlot} onChange={(e) => setPlanSlot(e.target.value)}>
                    {MEAL_SLOTS.map((s) => (
                      <option key={s} value={s}>{slotLabel(s)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field">
                <span className="field-label">
                  Specific date &amp; time <span className="muted">(optional — when set, shown on the planner card)</span>
                </span>
                <input
                  className="input"
                  type="datetime-local"
                  value={planSpecific}
                  onChange={(e) => setPlanSpecific(e.target.value)}
                />
              </label>
            </div>
          )}
        </FormSection>

        {/* ---------- Recipe options menu ---------- */}
        <FormSection
          title="Recipe options"
          subtitle="A compact options menu with independently toggleable settings and a mutually exclusive measurement choice. These settings are saved with the recipe and can be changed later from the recipe page."
        >
          <div className="inline-options-menu">
            <RecipeOptionsMenu
              options={form.options}
              onChangeOptions={(patch) => set({ options: { ...form.options, ...patch } })}
              align="left"
            />
            <div className="options-summary muted small">
              Current: {form.options.includeInShoppingList ? 'in shopping lists' : 'not in shopping lists'} ·{' '}
              nutrition {form.options.showNutrition ? 'on' : 'off'} · substitutions{' '}
              {form.options.allowSubstitutions ? 'on' : 'off'} ·{' '}
              {form.options.unitSystem === 'metric' ? 'metric' : 'US customary'} units
            </div>
          </div>
        </FormSection>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-lg">
            {editing ? 'Save changes' : 'Add recipe'}
          </button>
        </div>
      </form>
    </section>
  )
}
