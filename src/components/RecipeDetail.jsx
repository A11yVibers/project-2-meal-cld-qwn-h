import { useMemo, useState } from 'react'
import RecipeImage from './RecipeImage.jsx'
import RecipeOptionsMenu from './RecipeOptionsMenu.jsx'
import { useStore } from '../store.jsx'
import {
  cuisineById,
  mealTypeById,
  dietaryTagById,
  categoryById,
  lookupName,
  spiceLabel,
  substitutionsFor,
  PLANNER_SLOTS,
} from '../lib/data.js'
import { formatMeasure } from '../lib/units.js'
import { estimateNutrition } from '../lib/nutrition.js'
import { todayISO, weekDaysISO, weekStartISO, longDateLabel, dayLabel } from '../lib/dates.js'

function MetaItem({ label, value }) {
  if (!value) return null
  return (
    <div className="meta-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export default function RecipeDetail({ recipeId, onBack, onEdit, onOpenPlanner }) {
  const store = useStore()
  const recipe = store.getRecipe(recipeId)
  const {
    measurementSystem,
    setMeasurementSystem,
    setRecipeOptions,
    deleteUserRecipe,
    assignRecipe,
    currentWeekStart,
    setCurrentWeekStart,
  } = store

  const [planOpen, setPlanOpen] = useState(false)
  const [planDate, setPlanDate] = useState(() => {
    const days = weekDaysISO(currentWeekStart)
    const today = todayISO()
    return days.includes(today) ? today : days[0]
  })
  const [planSlot, setPlanSlot] = useState('Dinner')
  const [justAdded, setJustAdded] = useState(false)

  const nutrition = useMemo(() => (recipe ? estimateNutrition(recipe) : null), [recipe])

  if (!recipe) {
    return (
      <section className="detail">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back to recipes
        </button>
        <div className="empty-state">
          <p>Recipe not found.</p>
        </div>
      </section>
    )
  }

  const accent = recipe.accentColor || '#D97757'
  const options = recipe.options || {}
  const isUser = recipe.origin === 'user'

  function handleToggleOption(key, nextValue) {
    setRecipeOptions(recipe.id, { [key]: nextValue })
  }

  function handleAddToPlan(e) {
    e.preventDefault()
    assignRecipe(planDate, planSlot, recipe.id)
    // ensure the planner opens on the week we just added to
    setCurrentWeekStart(weekStartISO(planDate))
    setJustAdded(true)
    setPlanOpen(false)
    window.setTimeout(() => setJustAdded(false), 4000)
  }

  const dietTags = recipe.dietaryTagIds || []
  const cats = recipe.categoryIds || []

  return (
    <section className="detail" style={{ '--accent': accent }} aria-labelledby="detail-title">
      <div className="detail-topbar">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back to recipes
        </button>
        <div className="detail-actions">
          {isUser && (
            <>
              <button type="button" className="btn btn-ghost" onClick={() => onEdit(recipe.id)}>
                Edit
              </button>
              <button
                type="button"
                className="btn btn-danger-ghost"
                onClick={() => {
                  if (window.confirm(`Delete “${recipe.title}”? This cannot be undone.`)) {
                    deleteUserRecipe(recipe.id)
                    onBack()
                  }
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="detail-hero">
        <RecipeImage
          src={recipe.coverImageUrl}
          alt={`Photo of ${recipe.title}`}
          className="detail-image"
          accentColor={accent}
        />
        <div className="detail-hero-text">
          <h1 id="detail-title" className="detail-title">
            {recipe.title}
          </h1>
          {recipe.shortDescription && (
            <p className="detail-desc">{recipe.shortDescription}</p>
          )}
          <div className="detail-chips">
            {recipe.cuisineId && (
              <span className="chip">{lookupName(cuisineById, recipe.cuisineId)}</span>
            )}
            {recipe.mealTypeId && (
              <span className="chip chip-accent">
                {lookupName(mealTypeById, recipe.mealTypeId)}
              </span>
            )}
            {recipe.spiceLevel > 0 && (
              <span className="chip" title="Spice level">
                {'🌶️'.repeat(Math.min(recipe.spiceLevel, 5))} {spiceLabel(recipe.spiceLevel)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="detail-toolbar">
        <div className="detail-plan">
          {!planOpen ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setPlanOpen(true)}
            >
              📅 Add to meal plan
            </button>
          ) : (
            <form className="plan-inline" onSubmit={handleAddToPlan}>
              <label className="visually-hidden" htmlFor="plan-date">
                Planned date
              </label>
              <input
                id="plan-date"
                type="date"
                value={planDate}
                min={weekDaysISO(currentWeekStart)[0]}
                onChange={(e) => setPlanDate(e.target.value)}
              />
              <label className="visually-hidden" htmlFor="plan-slot">
                Meal slot
              </label>
              <select
                id="plan-slot"
                value={planSlot}
                onChange={(e) => setPlanSlot(e.target.value)}
              >
                {PLANNER_SLOTS.map((s) => (
                  <option key={s.slot} value={s.slot}>
                    {s.icon} {s.slot}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary btn-sm">
                Add
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPlanOpen(false)}
              >
                Cancel
              </button>
            </form>
          )}
          {justAdded && (
            <button
              type="button"
              className="added-note"
              onClick={() => onOpenPlanner()}
            >
              ✓ Added to plan — view planner →
            </button>
          )}
        </div>

        <RecipeOptionsMenu
          options={options}
          onToggleOption={handleToggleOption}
          measurementSystem={measurementSystem}
          onMeasurementChange={setMeasurementSystem}
          idPrefix={`detail-${recipe.id}`}
        />
      </div>

      <dl className="detail-meta">
        <MetaItem label="Servings" value={recipe.servings} />
        <MetaItem label="Prep" value={`${recipe.prepMinutes} min`} />
        <MetaItem label="Cook" value={`${recipe.cookMinutes} min`} />
        <MetaItem label="Total" value={`${recipe.totalMinutes} min`} />
        <MetaItem label="Difficulty" value={`${recipe.difficulty}/5`} />
        {recipe.sourceName || recipe.sourceUrl ? (
          <div className="meta-item">
            <dt>Source</dt>
            <dd>
              {recipe.sourceUrl ? (
                <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {recipe.sourceName || recipe.sourceUrl}
                </a>
              ) : (
                recipe.sourceName
              )}
            </dd>
          </div>
        ) : null}
      </dl>

      {(dietTags.length > 0 || cats.length > 0) && (
        <div className="detail-tags">
          {dietTags.map((t) => (
            <span key={t} className="tag-pill tag-diet">
              {lookupName(dietaryTagById, t)}
            </span>
          ))}
          {cats.map((c) => (
            <span key={c} className="tag-pill">
              {lookupName(categoryById, c)}
            </span>
          ))}
        </div>
      )}

      {options.showNutrition && nutrition && (
        <div className="nutrition-card" aria-label="Estimated nutrition per serving">
          <h2 className="section-subtitle">Nutrition (per serving, estimated)</h2>
          <div className="nutrition-grid">
            <div>
              <strong>{nutrition.perServing.calories}</strong>
              <span>kcal</span>
            </div>
            <div>
              <strong>{nutrition.perServing.protein}g</strong>
              <span>protein</span>
            </div>
            <div>
              <strong>{nutrition.perServing.carbs}g</strong>
              <span>carbs</span>
            </div>
            <div>
              <strong>{nutrition.perServing.fat}g</strong>
              <span>fat</span>
            </div>
          </div>
          <p className="nutrition-note">
            Approximate values estimated from ingredients; not a substitute for
            professional nutrition data.
          </p>
        </div>
      )}

      <div className="detail-columns">
        <div className="detail-ingredients">
          <h2 className="section-subtitle">Ingredients</h2>
          {(recipe.sections || []).map((section) => (
            <div className="ing-section" key={section.name}>
              <h3 className="ing-section-name">{section.name}</h3>
              <ul className="ing-list">
                {section.ingredients.map((ing) => {
                  const subs = options.allowSubstitutions
                    ? substitutionsFor(ing.ingredientId)
                    : []
                  return (
                    <li className="ing-row" key={ing.key}>
                      <span className="ing-qty">
                        {formatMeasure(ing.quantity, ing.unit, measurementSystem) || '—'}
                      </span>
                      <span className="ing-name">
                        {ing.name}
                        {ing.optional && <em className="ing-optional"> (optional)</em>}
                        {ing.notes && <span className="ing-notes"> — {ing.notes}</span>}
                        {subs.length > 0 && (
                          <span className="ing-sub">↔ sub: {subs.join(', ')}</span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="detail-method">
          <h2 className="section-subtitle">Method</h2>
          <ol className="step-list">
            {(recipe.steps || []).map((step, i) => (
              <li className="step-row" key={step.key}>
                <span className="step-num">{i + 1}</span>
                <div className="step-body">
                  <p>{step.instruction}</p>
                  {step.timerMinutes > 0 && (
                    <span className="step-timer">⏱ {step.timerMinutes} min</span>
                  )}
                </div>
              </li>
            ))}
          </ol>
          {recipe.steps?.length === 0 && (
            <p className="muted">No method steps recorded.</p>
          )}
        </div>
      </div>

      <p className="detail-week-hint muted">
        Planning for the week of {longDateLabel(currentWeekStart)} ·{' '}
        {dayLabel(planDate)} selected
      </p>
    </section>
  )
}
