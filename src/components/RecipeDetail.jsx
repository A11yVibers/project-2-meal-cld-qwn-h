import React, { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import {
  cuisineName, mealTypeName, tagNames, categoryNames, SPICE_LEVELS, PLAN_SLOT_NAMES, substitutesFor,
} from '../seedData.js'
import { displayQuantity } from '../units.js'
import { estimateNutrition } from '../nutrition.js'
import { todayISO, fmtDateShort, fmtWeekdayShort } from '../dates.js'
import RecipeOptionsMenu from './RecipeOptionsMenu.jsx'
import { Thumb, SpiceIndicator } from './ui.jsx'

function groupSections(ingredients) {
  const groups = []
  for (const ing of ingredients) {
    const name = ing.sectionName || 'Main'
    const last = groups[groups.length - 1]
    if (last && last.name === name) last.items.push(ing)
    else groups.push({ name, items: [ing] })
  }
  return groups
}

function IngredientRow({ ing, unitSystem, allowSubstitutions }) {
  const [showSubs, setShowSubs] = useState(false)
  const subs = useMemo(
    () => (allowSubstitutions && ing.ingredientId ? substitutesFor(ing.ingredientId) : []),
    [allowSubstitutions, ing.ingredientId]
  )
  return (
    <li className="ingredient-row">
      <div className="ingredient-main">
        <span className="ingredient-qty">{displayQuantity(ing.quantity, ing.unit, unitSystem) || '—'}</span>
        <span className="ingredient-name">
          {ing.ingredientName}
          {ing.optional && <span className="mini-chip optional-chip">optional</span>}
        </span>
        {ing.notes && <span className="ingredient-notes">({ing.notes})</span>}
        {subs.length > 0 && (
          <button type="button" className="link-btn sub-btn" onClick={() => setShowSubs((s) => !s)}
            aria-expanded={showSubs}>
            {showSubs ? 'Hide substitutes' : 'Substitutes'}
          </button>
        )}
      </div>
      {showSubs && subs.length > 0 && (
        <div className="sub-list">Try: {subs.map((s) => <span key={s} className="mini-chip">{s}</span>)}</div>
      )}
    </li>
  )
}

export default function RecipeDetail({ recipeId, onBack, onGoPlanner, showToast }) {
  const store = useStore()
  const recipe = store.getRecipe(recipeId)

  const [planDate, setPlanDate] = useState(todayISO())
  const [planSlot, setPlanSlot] = useState('Dinner')
  const [planTime, setPlanTime] = useState('')

  const nutrition = useMemo(() => (recipe ? estimateNutrition(recipe) : null), [recipe])

  if (!recipe) {
    return (
      <section className="detail">
        <button type="button" className="btn ghost" onClick={onBack}>← Back to recipes</button>
        <p className="empty-note">Recipe not found.</p>
      </section>
    )
  }

  const options = store.optionsFor(recipe)
  const sections = groupSections(recipe.ingredients || [])

  function addToPlan() {
    store.assignMeal(planDate, planSlot, recipe.id, planTime)
    showToast(`Added “${recipe.title}” to ${planSlot} on ${fmtWeekdayShort(planDate)} ${fmtDateShort(planDate)}`)
  }

  return (
    <section className="detail" style={{ '--accent': recipe.accentColor || '#D97757' }}>
      <button type="button" className="btn ghost back-btn" onClick={onBack}>← Back to recipes</button>

      <div className="detail-hero">
        <Thumb src={recipe.coverImageUrl} alt={recipe.title} className="detail-img" />
        <div className="detail-hero-overlay">
          {recipe.source === 'user' && <span className="badge homemade">Homemade</span>}
          <h2>{recipe.title}</h2>
          {recipe.shortDescription && <p className="detail-desc">{recipe.shortDescription}</p>}
        </div>
      </div>

      <div className="detail-badges">
        {cuisineName(recipe.cuisineId) && <span className="chip static accent-chip">{cuisineName(recipe.cuisineId)}</span>}
        {mealTypeName(recipe.mealTypeId) && <span className="chip static">{mealTypeName(recipe.mealTypeId)}</span>}
        {tagNames(recipe.dietaryTagIds).map((t) => <span key={t} className="chip static">{t}</span>)}
        {categoryNames(recipe.categoryIds).map((c) => <span key={c} className="mini-chip">{c}</span>)}
      </div>

      {(recipe.sourceName || recipe.sourceUrl) && (
        <p className="detail-source">
          Source:{' '}
          {recipe.sourceUrl
            ? <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">{recipe.sourceName || recipe.sourceUrl} ↗</a>
            : <span>{recipe.sourceName}</span>}
        </p>
      )}

      <div className="detail-meta-grid" role="list">
        <div className="meta-cell" role="listitem"><span className="meta-k">Servings</span><span className="meta-v">{recipe.servings}</span></div>
        <div className="meta-cell" role="listitem"><span className="meta-k">Prep</span><span className="meta-v">{recipe.prepMinutes} min</span></div>
        <div className="meta-cell" role="listitem"><span className="meta-k">Cook</span><span className="meta-v">{recipe.cookMinutes} min</span></div>
        <div className="meta-cell" role="listitem"><span className="meta-k">Total</span><span className="meta-v">{recipe.totalMinutes || recipe.prepMinutes + recipe.cookMinutes} min</span></div>
        <div className="meta-cell" role="listitem">
          <span className="meta-k">Spice</span>
          <span className="meta-v"><SpiceIndicator level={recipe.spiceLevel} /> {SPICE_LEVELS[recipe.spiceLevel] || '—'}</span>
        </div>
        {recipe.difficulty != null && (
          <div className="meta-cell" role="listitem"><span className="meta-k">Difficulty</span><span className="meta-v">{recipe.difficulty}/5</span></div>
        )}
      </div>

      <div className="detail-actions">
        <RecipeOptionsMenu options={options} onChange={(o) => store.setRecipeOptions(recipe.id, o)} />
      </div>

      <div className="plan-panel">
        <h3>Add to meal plan</h3>
        <div className="plan-panel-row">
          <label className="field">
            <span>Date</span>
            <input type="date" className="input" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
          </label>
          <label className="field">
            <span>Meal slot</span>
            <select className="input" value={planSlot} onChange={(e) => setPlanSlot(e.target.value)}>
              {PLAN_SLOT_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Serving time <em>(optional)</em></span>
            <input type="time" className="input" value={planTime} onChange={(e) => setPlanTime(e.target.value)} />
          </label>
          <div className="field plan-panel-btns">
            <button type="button" className="btn primary" onClick={addToPlan}>Add to plan</button>
            <button type="button" className="btn ghost" onClick={onGoPlanner}>Open planner</button>
          </div>
        </div>
      </div>

      <div className="detail-columns">
        <div className="detail-col">
          <h3>Ingredients</h3>
          {sections.length === 0 && <p className="empty-note">No ingredients yet.</p>}
          {sections.map((sec) => (
            <div key={sec.name} className="ingredient-section">
              <h4>{sec.name}</h4>
              <ul className="ingredient-list">
                {sec.items.map((ing, i) => (
                  <IngredientRow key={`${sec.name}-${i}`} ing={ing}
                    unitSystem={options.unitSystem} allowSubstitutions={options.allowSubstitutions} />
                ))}
              </ul>
            </div>
          ))}

          {options.showNutrition && nutrition && (
            <div className="nutrition-panel">
              <h4>Nutrition (estimated, per serving)</h4>
              <div className="nutrition-grid">
                <span><strong>{nutrition.perServing.kcal}</strong> kcal</span>
                <span><strong>{nutrition.perServing.protein} g</strong> protein</span>
                <span><strong>{nutrition.perServing.carbs} g</strong> carbs</span>
                <span><strong>{nutrition.perServing.fat} g</strong> fat</span>
              </div>
              {!nutrition.complete && <p className="hint">Some ingredients could not be estimated and are not included.</p>}
              <p className="hint">Estimates based on catalog ingredient data.</p>
            </div>
          )}
        </div>

        <div className="detail-col">
          <h3>Method</h3>
          {(recipe.steps || []).length === 0 && <p className="empty-note">No steps yet.</p>}
          <ol className="steps-list">
            {(recipe.steps || []).map((step, i) => (
              <li key={i} className="step-row">
                <span className="step-num" aria-hidden="true">{i + 1}</span>
                <div className="step-body">
                  <p>{step.instruction}</p>
                  {step.timerMinutes > 0 && <span className="timer-chip">⏱ {step.timerMinutes} min</span>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
