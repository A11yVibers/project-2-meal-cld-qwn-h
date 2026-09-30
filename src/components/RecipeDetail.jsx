import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import {
  categoryName,
  cuisineName,
  dietaryTagName,
  mealTypeName,
  PLANNER_SLOTS,
} from '../data/seed';
import { formatAmount, formatMinutes, spiceLabel } from '../lib/units';
import { estimateCalories, substitutionFor } from '../lib/nutrition';
import { formatFullDate, todayISO } from '../lib/dates';
import Thumb from './Thumb';
import OptionsMenu from './OptionsMenu';

const DEFAULT_TIMES = { Breakfast: '08:00', Lunch: '12:30', Dinner: '18:30', Snack: '16:00' };

export default function RecipeDetail({ id }) {
  const {
    getRecipe,
    getOptions,
    updateOptions,
    mealPlan,
    assignRecipe,
    removeAssignment,
  } = useStore();
  const recipe = getRecipe(id);

  const planned = useMemo(() => {
    if (!recipe) return [];
    const found = [];
    for (const [dateISO, slots] of Object.entries(mealPlan)) {
      for (const [slot, entry] of Object.entries(slots || {})) {
        if (entry && entry.recipeId === recipe.id) found.push({ dateISO, slot, time: entry.time });
      }
    }
    return found.sort((a, b) => (a.dateISO < b.dateISO ? -1 : a.dateISO > b.dateISO ? 1 : 0));
  }, [mealPlan, recipe]);

  const defaultSlot = useMemo(() => {
    if (!recipe) return PLANNER_SLOTS[2] || 'Dinner';
    const name = mealTypeName(recipe.mealTypeId);
    return PLANNER_SLOTS.includes(name) ? name : PLANNER_SLOTS[2] || 'Dinner';
  }, [recipe]);

  const [planDate, setPlanDate] = useState(todayISO());
  const [planSlot, setPlanSlot] = useState(defaultSlot);
  const [planTime, setPlanTime] = useState(DEFAULT_TIMES[defaultSlot] || '');
  const [justAdded, setJustAdded] = useState(null);

  if (!recipe) {
    return (
      <section className="page">
        <p className="subtitle">Recipe not found.</p>
        <a className="btn" href="#/recipes">Back to recipes</a>
      </section>
    );
  }

  const options = getOptions(recipe);
  const accent = recipe.accentColor || '#d97757';
  const nutrition = options.showNutrition ? estimateCalories(recipe) : null;

  const handleAddToPlan = (e) => {
    e.preventDefault();
    assignRecipe(planDate, planSlot, recipe.id, planTime);
    setJustAdded({ dateISO: planDate, slot: planSlot, time: planTime });
  };

  return (
    <section className="page detail-page">
      <a className="back-link" href="#/recipes">← All recipes</a>

      <div className="detail-hero" style={{ '--accent': accent }}>
        <Thumb src={recipe.coverImageUrl} alt={recipe.title} className="hero-img" />
      </div>

      <div className="detail-head">
        <div>
          <h1>{recipe.title}</h1>
          {recipe.shortDescription && <p className="subtitle">{recipe.shortDescription}</p>}
          <div className="chips">
            {cuisineName(recipe.cuisineId) && <span className="chip">{cuisineName(recipe.cuisineId)}</span>}
            {mealTypeName(recipe.mealTypeId) && <span className="chip">{mealTypeName(recipe.mealTypeId)}</span>}
            {recipe.dietaryTagIds.map((t) => (
              <span key={t} className="chip chip-soft">{dietaryTagName(t)}</span>
            ))}
            {recipe.categoryIds.map((c) => (
              <span key={c} className="chip chip-outline">{categoryName(c)}</span>
            ))}
            {recipe.isUser && <span className="tag tag-user">Your recipe</span>}
          </div>
          {recipe.sourceUrl && (
            <p className="source-line">
              Source:{' '}
              <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">
                {recipe.sourceName || recipe.sourceUrl}
              </a>
            </p>
          )}
        </div>
        <OptionsMenu options={options} onChange={(o) => updateOptions(recipe.id, o)} />
      </div>

      <div className="fact-strip">
        <div className="fact"><span className="fact-label">Servings</span><span className="fact-value">{recipe.servings}</span></div>
        <div className="fact"><span className="fact-label">Prep</span><span className="fact-value">{formatMinutes(recipe.prepMinutes) || '—'}</span></div>
        <div className="fact"><span className="fact-label">Cook</span><span className="fact-value">{formatMinutes(recipe.cookMinutes) || '—'}</span></div>
        <div className="fact"><span className="fact-label">Total</span><span className="fact-value">{formatMinutes(recipe.totalMinutes) || '—'}</span></div>
        <div className="fact">
          <span className="fact-label">Spice level</span>
          <span className="fact-value">{recipe.spiceLevel > 0 ? spiceLabel(recipe.spiceLevel) : 'No heat'}</span>
        </div>
      </div>

      {nutrition && (
        <div className="panel nutrition-panel">
          <h2>Nutrition (estimated)</h2>
          <div className="nutrition-grid">
            <div><strong>{nutrition.perServingKcal}</strong><span>kcal / serving</span></div>
            <div><strong>{nutrition.totalKcal}</strong><span>kcal / recipe</span></div>
          </div>
          <p className="fineprint">
            Rough estimate based on {nutrition.known} of {nutrition.all} known ingredients.
          </p>
        </div>
      )}
      {options.showNutrition && !nutrition && (
        <div className="panel nutrition-panel">
          <h2>Nutrition</h2>
          <p className="fineprint">No nutrition estimate available for these ingredients yet.</p>
        </div>
      )}

      <div className="detail-grid">
        <div className="panel">
          <h2>Ingredients</h2>
          {options.unitSystem === 'metric' && (
            <p className="fineprint">Shown in metric measurements.</p>
          )}
          {recipe.sections.map((section) => (
            <div className="ing-section" key={section.name}>
              <h3>{section.name}</h3>
              <ul className="ing-list">
                {section.items.map((ing, i) => {
                  const sub = options.allowSubstitutions ? substitutionFor(ing) : null;
                  return (
                    <li key={`${ing.name}-${i}`}>
                      <div className="ing-main">
                        <span className="ing-qty">
                          {formatAmount(ing.quantity, ing.unit, options.unitSystem) || '—'}
                        </span>
                        <span className="ing-name">{ing.name}</span>
                        {ing.notes && <span className="ing-notes">({ing.notes})</span>}
                        {ing.optional && <span className="tag tag-soft">optional</span>}
                      </div>
                      {sub && <div className="ing-sub">Substitute: {sub}</div>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {recipe.sections.length === 0 && <p className="subtitle">No ingredients listed.</p>}
        </div>

        <div className="panel">
          <h2>Method</h2>
          <ol className="steps">
            {recipe.steps.map((step, i) => (
              <li key={i}>
                <div className="step-body">
                  <p>{step.instruction}</p>
                  {step.timerMinutes > 0 && (
                    <span className="timer-pill" title="Timer">
                      {formatMinutes(step.timerMinutes)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
          {recipe.steps.length === 0 && <p className="subtitle">No steps listed.</p>}
        </div>
      </div>

      <div className="panel plan-panel">
        <h2>Add to meal plan</h2>
        <form className="plan-form" onSubmit={handleAddToPlan}>
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={planDate}
              onChange={(e) => setPlanDate(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Meal slot</span>
            <select value={planSlot} onChange={(e) => setPlanSlot(e.target.value)}>
              {PLANNER_SLOTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Serving time (optional)</span>
            <input type="time" value={planTime} onChange={(e) => setPlanTime(e.target.value)} />
          </label>
          <button className="btn primary" type="submit">Add to plan</button>
        </form>
        {justAdded && (
          <p className="success-note" role="status">
            Added to {justAdded.slot} on {formatFullDate(justAdded.dateISO)}
            {justAdded.time ? ` at ${justAdded.time}` : ''}.{' '}
            <a href="#/planner">Open planner</a>
          </p>
        )}
        {planned.length > 0 && (
          <div className="planned-list">
            <h3>Currently planned</h3>
            <ul>
              {planned.map((p) => (
                <li key={`${p.dateISO}-${p.slot}`}>
                  <span>
                    {formatFullDate(p.dateISO)} · {p.slot}
                    {p.time ? ` · ${p.time}` : ''}
                  </span>
                  <button
                    type="button"
                    className="btn tiny"
                    onClick={() => removeAssignment(p.dateISO, p.slot)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
