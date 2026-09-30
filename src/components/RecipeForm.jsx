import React, { useState } from 'react';
import { DEFAULT_OPTIONS, useStore } from '../store';
import {
  APPROVED_COVER_IMAGES,
  CUISINES,
  DIETARY_TAGS,
  INGREDIENTS,
  MEAL_TYPES,
  PLANNER_SLOTS,
  RECIPE_CATEGORIES,
  UNITS,
} from '../data/seed';
import { SPICE_LABELS } from '../lib/units';
import {
  addDays,
  currentWeekISO,
  dayOffset,
  fromISODate,
  startOfWeek,
  toISODate,
  todayISO,
  upcomingWeeks,
} from '../lib/dates';
import OptionsMenu from './OptionsMenu';

let rowCounter = 0;
const rid = () => `r${Date.now().toString(36)}${(rowCounter++).toString(36)}`;

const ACCENT_PRESETS = ['#D97757', '#8A9A5B', '#5B8DB8', '#C46A9A', '#7A6FB0', '#D9A441', '#4F9A7C', '#B85450'];

function emptyIngredientRow() {
  return { id: rid(), ingredientId: '', name: '', quantity: '', unit: '', optional: false };
}
function emptySection(name = 'Main') {
  return { id: rid(), name, items: [emptyIngredientRow()] };
}
function emptyStep() {
  return { id: rid(), instruction: '', timerMinutes: '' };
}

function IngredientCombobox({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const q = value.name.trim().toLowerCase();
  const matches = q
    ? INGREDIENTS.filter((i) => i.ingredient_name.toLowerCase().includes(q)).slice(0, 8)
    : INGREDIENTS.slice(0, 8);
  return (
    <div className="combobox">
      <input
        type="text"
        value={value.name}
        placeholder="Search ingredients…"
        aria-label="Ingredient name"
        autoComplete="off"
        onChange={(e) => onChange({ name: e.target.value, ingredientId: '' })}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      {open && (
        <div className="combobox-pop">
          {matches.map((m) => (
            <button
              type="button"
              key={m.ingredient_id}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange({ ingredientId: m.ingredient_id, name: m.ingredient_name });
                setOpen(false);
              }}
            >
              <span>{m.ingredient_name}</span>
              <em>{m.shopping_category}</em>
            </button>
          ))}
          {matches.length === 0 && (
            <div className="combobox-empty">No match — the typed name will be used as a custom ingredient.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RecipeForm({ onSaved }) {
  const { addRecipe, assignRecipe } = useStore();
  const weekChoices = upcomingWeeks(8);

  const [form, setForm] = useState(() => ({
    title: '',
    sourceUrl: '',
    cuisineId: '',
    mealTypeId: '',
    dietaryTagIds: [],
    categoryIds: [],
    servings: 4,
    prepMinutes: '',
    cookMinutes: '',
    spiceLevel: 1,
    coverImageUrl: APPROVED_COVER_IMAGES[0]?.url || '',
    accentColor: ACCENT_PRESETS[0],
    sections: [emptySection('Main')],
    steps: [emptyStep()],
    includeInSuggestions: true,
    addNow: false,
    planWeek: currentWeekISO(),
    planDate: todayISO(),
    planSlot: PLANNER_SLOTS[2] || 'Dinner',
    planTime: '18:30',
    options: { ...DEFAULT_OPTIONS },
  }));
  const [error, setError] = useState('');

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleIn = (key, value) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));

  // Section + ingredient row operations
  const mapSections = (fn) => setForm((f) => ({ ...f, sections: fn(f.sections) }));
  const updateSection = (sid, patch) =>
    mapSections((secs) => secs.map((s) => (s.id === sid ? { ...s, ...patch } : s)));
  const updateItem = (sid, iid, patch) =>
    mapSections((secs) =>
      secs.map((s) =>
        s.id === sid
          ? { ...s, items: s.items.map((it) => (it.id === iid ? { ...it, ...patch } : it)) }
          : s
      )
    );
  const addItem = (sid) =>
    mapSections((secs) =>
      secs.map((s) => (s.id === sid ? { ...s, items: [...s.items, emptyIngredientRow()] } : s))
    );
  const removeItem = (sid, iid) =>
    mapSections((secs) =>
      secs.map((s) => (s.id === sid ? { ...s, items: s.items.filter((it) => it.id !== iid) } : s))
    );
  const moveItem = (sid, iid, dir) =>
    mapSections((secs) =>
      secs.map((s) => {
        if (s.id !== sid) return s;
        const items = [...s.items];
        const i = items.findIndex((it) => it.id === iid);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= items.length) return s;
        [items[i], items[j]] = [items[j], items[i]];
        return { ...s, items };
      })
    );
  const addSection = () =>
    mapSections((secs) => [...secs, emptySection(`Section ${secs.length + 1}`)]);
  const removeSection = (sid) =>
    mapSections((secs) => secs.filter((s) => s.id !== sid));
  const moveSection = (sid, dir) =>
    mapSections((secs) => {
      const next = [...secs];
      const i = next.findIndex((s) => s.id === sid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= next.length) return secs;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // Step operations
  const mapSteps = (fn) => setForm((f) => ({ ...f, steps: fn(f.steps) }));
  const updateStep = (id, patch) =>
    mapSteps((steps) => steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const addStep = () => mapSteps((steps) => [...steps, emptyStep()]);
  const removeStep = (id) => mapSteps((steps) => steps.filter((s) => s.id !== id));
  const moveStep = (id, dir) =>
    mapSteps((steps) => {
      const next = [...steps];
      const i = next.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= next.length) return steps;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // Meal-planning week / date synchronization
  const onWeekChange = (iso) => {
    const offset = Math.min(6, Math.max(0, dayOffset(form.planWeek, form.planDate) || 0));
    set({ planWeek: iso, planDate: toISODate(addDays(fromISODate(iso), offset)) });
  };
  const onDateChange = (dateISO) => {
    set({ planDate: dateISO, planWeek: dateISO ? toISODate(startOfWeek(fromISODate(dateISO))) : form.planWeek });
  };

  const totalMinutes = (parseInt(form.prepMinutes, 10) || 0) + (parseInt(form.cookMinutes, 10) || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Please enter a recipe title.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setError('');
    const prep = parseInt(form.prepMinutes, 10) || 0;
    const cook = parseInt(form.cookMinutes, 10) || 0;
    const sections = form.sections
      .map((s) => ({
        name: s.name.trim() || 'Ingredients',
        items: s.items
          .filter((it) => it.name.trim())
          .map((it) => ({
            ingredientId: it.ingredientId || '',
            name: it.name.trim(),
            quantity: parseFloat(it.quantity) || 0,
            unit: it.unit || '',
            notes: '',
            optional: !!it.optional,
          })),
      }))
      .filter((s) => s.items.length > 0);
    const steps = form.steps
      .filter((s) => s.instruction.trim())
      .map((s) => ({
        instruction: s.instruction.trim(),
        timerMinutes: parseInt(s.timerMinutes, 10) || 0,
      }));
    const recipe = {
      id: `u-${Date.now().toString(36)}`,
      title: form.title.trim(),
      shortDescription: '',
      sourceName: 'My kitchen',
      sourceUrl: form.sourceUrl.trim(),
      servings: Math.max(1, parseInt(form.servings, 10) || 1),
      prepMinutes: prep,
      cookMinutes: cook,
      totalMinutes: prep + cook,
      cuisineId: form.cuisineId,
      mealTypeId: form.mealTypeId,
      dietaryTagIds: form.dietaryTagIds,
      categoryIds: form.categoryIds,
      difficulty: 1,
      spiceLevel: Number(form.spiceLevel) || 0,
      accentColor: form.accentColor,
      coverImageUrl: form.coverImageUrl,
      includeInMealSuggestions: form.includeInSuggestions,
      sections,
      steps,
      isUser: true,
      createdAt: new Date().toISOString(),
      options: { ...form.options },
    };
    addRecipe(recipe);
    if (form.addNow && form.planDate && form.planSlot) {
      assignRecipe(form.planDate, form.planSlot, recipe.id, form.planTime || '');
    }
    onSaved(recipe.id);
  };

  return (
    <form className="page recipe-form" onSubmit={handleSubmit} noValidate>
      <header className="page-head">
        <div>
          <h1>Add recipe</h1>
          <p className="subtitle">Fill in the sections below. Only the title is required.</p>
        </div>
        <a className="btn" href="#/recipes">Cancel</a>
      </header>

      {error && <div className="error-banner" role="alert">{error}</div>}

      {/* --- Recipe details --- */}
      <fieldset className="panel form-section">
        <legend>Recipe details</legend>
        <div className="form-cols">
          <label className="field">
            <span>Recipe title <em className="req">required</em></span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="e.g. Weeknight Miso Noodles"
              required
            />
          </label>
          <label className="field">
            <span>Source link</span>
            <input
              type="url"
              value={form.sourceUrl}
              onChange={(e) => set({ sourceUrl: e.target.value })}
              placeholder="https://…"
            />
          </label>
          <label className="field">
            <span>Cuisine</span>
            <select value={form.cuisineId} onChange={(e) => set({ cuisineId: e.target.value })}>
              <option value="">Select cuisine…</option>
              {CUISINES.map((c) => (
                <option key={c.cuisine_id} value={c.cuisine_id}>{c.cuisine_name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Primary meal type</span>
            <select value={form.mealTypeId} onChange={(e) => set({ mealTypeId: e.target.value })}>
              <option value="">Select meal type…</option>
              {MEAL_TYPES.map((m) => (
                <option key={m.meal_type_id} value={m.meal_type_id}>{m.meal_type_name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="field">
          <span className="field-label">Dietary suitability (select any)</span>
          <div className="choice-chips" role="group" aria-label="Dietary suitability">
            {DIETARY_TAGS.map((d) => (
              <label
                key={d.dietary_tag_id}
                className={`choice-chip ${form.dietaryTagIds.includes(d.dietary_tag_id) ? 'on' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={form.dietaryTagIds.includes(d.dietary_tag_id)}
                  onChange={() => toggleIn('dietaryTagIds', d.dietary_tag_id)}
                />
                {d.dietary_tag_name}
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Recipe categories (select any)</span>
          <div className="choice-chips" role="group" aria-label="Recipe categories">
            {RECIPE_CATEGORIES.map((c) => (
              <label
                key={c.category_id}
                className={`choice-chip ${form.categoryIds.includes(c.category_id) ? 'on' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={form.categoryIds.includes(c.category_id)}
                  onChange={() => toggleIn('categoryIds', c.category_id)}
                />
                {c.category_name}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      {/* --- Timing and yield --- */}
      <fieldset className="panel form-section">
        <legend>Timing &amp; yield</legend>
        <div className="form-cols">
          <div className="field">
            <span className="field-label" id="servings-label">Servings</span>
            <div className="stepper" role="group" aria-labelledby="servings-label">
              <button
                type="button"
                onClick={() => set({ servings: Math.max(1, (parseInt(form.servings, 10) || 1) - 1) })}
                aria-label="Decrease servings"
              >−</button>
              <input
                type="number"
                min="1"
                value={form.servings}
                onChange={(e) => set({ servings: e.target.value })}
                aria-label="Servings"
              />
              <button
                type="button"
                onClick={() => set({ servings: Math.max(1, (parseInt(form.servings, 10) || 0) + 1) })}
                aria-label="Increase servings"
              >+</button>
            </div>
          </div>
          <label className="field">
            <span>Prep time (minutes)</span>
            <input
              type="number"
              min="0"
              value={form.prepMinutes}
              onChange={(e) => set({ prepMinutes: e.target.value })}
              placeholder="0"
            />
          </label>
          <label className="field">
            <span>Cook time (minutes)</span>
            <input
              type="number"
              min="0"
              value={form.cookMinutes}
              onChange={(e) => set({ cookMinutes: e.target.value })}
              placeholder="0"
            />
          </label>
          <div className="field">
            <span className="field-label">Total time (auto)</span>
            <div className="readonly-value">{totalMinutes > 0 ? `${totalMinutes} min` : '—'}</div>
          </div>
        </div>
        <div className="field">
          <span className="field-label" id="spice-label">
            Spice level — <strong>{SPICE_LABELS[form.spiceLevel]}</strong>
          </span>
          <input
            className="spice-range"
            type="range"
            min="0"
            max="5"
            step="1"
            value={form.spiceLevel}
            aria-labelledby="spice-label"
            onChange={(e) => set({ spiceLevel: Number(e.target.value) })}
          />
          <div className="range-ticks">
            <span>Mild</span><span>Medium</span><span>Spicy</span><span>Very spicy</span>
          </div>
        </div>
      </fieldset>

      {/* --- Image and appearance --- */}
      <fieldset className="panel form-section">
        <legend>Image &amp; appearance</legend>
        <div className="field">
          <span className="field-label">Cover image (choose from approved remote images)</span>
          <div className="image-picker" role="radiogroup" aria-label="Cover image">
            {APPROVED_COVER_IMAGES.map((img) => (
              <button
                type="button"
                key={img.url}
                role="radio"
                aria-checked={form.coverImageUrl === img.url}
                aria-label={img.label}
                title={img.label}
                className={`image-choice ${form.coverImageUrl === img.url ? 'on' : ''}`}
                onClick={() => set({ coverImageUrl: img.url })}
              >
                <img src={img.url} alt="" />
                {form.coverImageUrl === img.url && <span className="image-check">✓</span>}
              </button>
            ))}
          </div>
          <p className="fineprint">
            Images are limited to approved remote URLs; no files are uploaded or stored.
          </p>
        </div>
        <div className="field">
          <span className="field-label">Recipe card accent color</span>
          <div className="color-row">
            <input
              type="color"
              value={form.accentColor}
              onChange={(e) => set({ accentColor: e.target.value })}
              aria-label="Accent color"
            />
            <div className="swatches" role="group" aria-label="Accent color presets">
              {ACCENT_PRESETS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`swatch ${form.accentColor.toLowerCase() === c.toLowerCase() ? 'on' : ''}`}
                  style={{ background: c }}
                  aria-label={`Use color ${c}`}
                  onClick={() => set({ accentColor: c })}
                />
              ))}
            </div>
            <input
              className="hex-input"
              type="text"
              value={form.accentColor}
              onChange={(e) => set({ accentColor: e.target.value })}
              aria-label="Accent color hex value"
              spellCheck="false"
            />
          </div>
        </div>
      </fieldset>

      {/* --- Ingredients --- */}
      <fieldset className="panel form-section">
        <legend>Ingredients</legend>
        {form.sections.map((section, sIdx) => (
          <div className="ing-form-section" key={section.id}>
            <div className="ing-section-head">
              <input
                className="section-name"
                type="text"
                value={section.name}
                placeholder="Section name (e.g. Sauce)"
                aria-label={`Ingredient section ${sIdx + 1} name`}
                onChange={(e) => updateSection(section.id, { name: e.target.value })}
              />
              <div className="row-actions">
                <button type="button" className="btn tiny" disabled={sIdx === 0}
                  onClick={() => moveSection(section.id, -1)} aria-label="Move section up">↑</button>
                <button type="button" className="btn tiny" disabled={sIdx === form.sections.length - 1}
                  onClick={() => moveSection(section.id, 1)} aria-label="Move section down">↓</button>
                <button type="button" className="btn tiny danger"
                  onClick={() => removeSection(section.id)} aria-label={`Remove section ${section.name || sIdx + 1}`}>Remove section</button>
              </div>
            </div>
            {section.items.map((item, iIdx) => (
              <div className="ing-row" key={item.id}>
                <div className="ing-row-main">
                  <IngredientCombobox
                    value={item}
                    onChange={(patch) => updateItem(section.id, item.id, patch)}
                  />
                  <input
                    className="qty-input"
                    type="number"
                    min="0"
                    step="0.25"
                    value={item.quantity}
                    placeholder="Qty"
                    aria-label={`Quantity for ingredient ${iIdx + 1}`}
                    onChange={(e) => updateItem(section.id, item.id, { quantity: e.target.value })}
                  />
                  <select
                    className="unit-input"
                    value={item.unit}
                    aria-label={`Unit for ingredient ${iIdx + 1}`}
                    onChange={(e) => updateItem(section.id, item.id, { unit: e.target.value })}
                  >
                    <option value="">unit…</option>
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <label className="optional-check">
                    <input
                      type="checkbox"
                      checked={item.optional}
                      onChange={(e) => updateItem(section.id, item.id, { optional: e.target.checked })}
                    />
                    Optional
                  </label>
                </div>
                <div className="row-actions">
                  <button type="button" className="btn tiny" disabled={iIdx === 0}
                    onClick={() => moveItem(section.id, item.id, -1)} aria-label="Move ingredient up">↑</button>
                  <button type="button" className="btn tiny" disabled={iIdx === section.items.length - 1}
                    onClick={() => moveItem(section.id, item.id, 1)} aria-label="Move ingredient down">↓</button>
                  <button type="button" className="btn tiny danger"
                    onClick={() => removeItem(section.id, item.id)} aria-label="Remove ingredient">✕</button>
                </div>
              </div>
            ))}
            <button type="button" className="btn small" onClick={() => addItem(section.id)}>
              + Add ingredient
            </button>
          </div>
        ))}
        <button type="button" className="btn" onClick={addSection}>+ Add ingredient section</button>
      </fieldset>

      {/* --- Method --- */}
      <fieldset className="panel form-section">
        <legend>Method</legend>
        {form.steps.map((step, idx) => (
          <div className="step-row" key={step.id}>
            <span className="step-num" aria-hidden="true">{idx + 1}</span>
            <textarea
              rows="2"
              value={step.instruction}
              placeholder={`Step ${idx + 1} instruction…`}
              aria-label={`Step ${idx + 1} instruction`}
              onChange={(e) => updateStep(step.id, { instruction: e.target.value })}
            />
            <div className="step-timer">
              <input
                type="number"
                min="0"
                value={step.timerMinutes}
                placeholder="0"
                aria-label={`Step ${idx + 1} timer in minutes`}
                onChange={(e) => updateStep(step.id, { timerMinutes: e.target.value })}
              />
              <span>min</span>
            </div>
            <div className="row-actions">
              <button type="button" className="btn tiny" disabled={idx === 0}
                onClick={() => moveStep(step.id, -1)} aria-label="Move step up">↑</button>
              <button type="button" className="btn tiny" disabled={idx === form.steps.length - 1}
                onClick={() => moveStep(step.id, 1)} aria-label="Move step down">↓</button>
              <button type="button" className="btn tiny danger"
                onClick={() => removeStep(step.id)} aria-label={`Remove step ${idx + 1}`}>✕</button>
            </div>
          </div>
        ))}
        <button type="button" className="btn small" onClick={addStep}>+ Add step</button>
      </fieldset>

      {/* --- Meal planning options --- */}
      <fieldset className="panel form-section">
        <legend>Meal planning</legend>
        <label className="checkline">
          <input
            type="checkbox"
            checked={form.includeInSuggestions}
            onChange={(e) => set({ includeInSuggestions: e.target.checked })}
          />
          Make this recipe available in meal-plan suggestions
        </label>
        <label className="checkline">
          <input
            type="checkbox"
            checked={form.addNow}
            onChange={(e) => set({ addNow: e.target.checked })}
          />
          Add this recipe to my meal plan right away
        </label>
        {form.addNow && (
          <div className="form-cols plan-fields">
            <label className="field">
              <span>Meal-planning week</span>
              <select value={form.planWeek} onChange={(e) => onWeekChange(e.target.value)}>
                {weekChoices.map((w) => (
                  <option key={w.iso} value={w.iso}>{w.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Planned cooking date</span>
              <input type="date" value={form.planDate} onChange={(e) => onDateChange(e.target.value)} />
            </label>
            <label className="field">
              <span>Meal slot</span>
              <select value={form.planSlot} onChange={(e) => set({ planSlot: e.target.value })}>
                {PLANNER_SLOTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Planned serving time</span>
              <input type="time" value={form.planTime} onChange={(e) => set({ planTime: e.target.value })} />
            </label>
          </div>
        )}
      </fieldset>

      {/* --- Recipe options menu --- */}
      <fieldset className="panel form-section">
        <legend>Recipe options</legend>
        <p className="fineprint">
          These options are saved with the recipe and can be changed later from its detail page.
        </p>
        <OptionsMenu options={form.options} onChange={(options) => set({ options })} />
      </fieldset>

      <div className="form-actions">
        <a className="btn" href="#/recipes">Cancel</a>
        <button type="submit" className="btn primary big">Save recipe</button>
      </div>
    </form>
  );
}
