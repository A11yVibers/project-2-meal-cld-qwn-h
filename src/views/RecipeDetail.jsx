import React, { useMemo, useState } from 'react'
import Thumbnail from '../components/Thumbnail.jsx'
import RecipeOptionsMenu from '../components/RecipeOptionsMenu.jsx'
import AddToPlanModal from '../components/AddToPlanModal.jsx'
import { useStore } from '../store.jsx'
import {
  CATEGORY_BY_ID,
  CUISINE_BY_ID,
  DIETARY_TAG_BY_ID,
  MEAL_TYPE_BY_ID,
  spiceLabel,
  slotLabel,
} from '../lib/data.js'
import { formatQuantity } from '../lib/units.js'
import { estimateNutrition, substitutionsFor } from '../lib/nutrition.js'
import { fmtMedium, formatTime12 } from '../lib/dates.js'

function minutesLabel(min) {
  if (!min && min !== 0) return '—'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export default function RecipeDetail({ recipeId, onBack, onEdit }) {
  const { getRecipe, updateRecipeSettings, deleteUserRecipe, assignments } = useStore()
  const recipe = getRecipe(recipeId)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const nutrition = useMemo(
    () => (recipe?.options?.showNutrition ? estimateNutrition(recipe) : null),
    [recipe],
  )

  const plannedInstances = useMemo(
    () =>
      assignments
        .filter((a) => a.recipeId === recipeId)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [assignments, recipeId],
  )

  if (!recipe) {
    return (
      <section className="view">
        <div className="empty-state card">
          <p>Recipe not found.</p>
          <button type="button" className="btn btn-ghost" onClick={onBack}>Back to catalog</button>
        </div>
      </section>
    )
  }

  const unitSystem = recipe.options?.unitSystem || 'us'

  return (
    <section className="view detail-view" style={{ '--accent': recipe.accentColor }}>
      <button type="button" className="btn btn-ghost back-link" onClick={onBack}>
        ← Back to recipes
      </button>

      <div className="detail-hero card">
        <div className="detail-hero-media">
          <Thumbnail src={recipe.coverImageUrl} alt={recipe.title} className="detail-image" />
        </div>
        <div className="detail-hero-info">
          <div className="recipe-card-kicker">
            {CUISINE_BY_ID[recipe.cuisineId]?.name || 'Uncategorized'}
            {MEAL_TYPE_BY_ID[recipe.mealTypeId]?.name ? ` · ${MEAL_TYPE_BY_ID[recipe.mealTypeId].name}` : ''}
            {recipe.isUser ? ' · Your recipe' : ''}
          </div>
          <h2>{recipe.title}</h2>
          {recipe.shortDescription && <p className="detail-desc">{recipe.shortDescription}</p>}

          <div className="stat-row">
            <div className="stat">
              <span className="stat-label">Servings</span>
              <span className="stat-value">{recipe.servings}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Prep</span>
              <span className="stat-value">{minutesLabel(recipe.prepMinutes)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Cook</span>
              <span className="stat-value">{minutesLabel(recipe.cookMinutes)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Total</span>
              <span className="stat-value">
                {minutesLabel(recipe.totalMinutes || recipe.prepMinutes + recipe.cookMinutes)}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Spice level</span>
              <span className="stat-value">
                {'🌶'.repeat(Math.max(recipe.spiceLevel, 0)) || '–'} {spiceLabel(recipe.spiceLevel)}
              </span>
            </div>
            {recipe.difficulty > 0 && (
              <div className="stat">
                <span className="stat-label">Difficulty</span>
                <span className="stat-value">{recipe.difficulty}/5</span>
              </div>
            )}
          </div>

          <div className="pill-row">
            {(recipe.dietaryTagIds || []).map((id) => (
              <span key={id} className="pill">{DIETARY_TAG_BY_ID[id]?.name || id}</span>
            ))}
            {(recipe.categoryIds || []).map((id) => (
              <span key={id} className="pill pill-outline">{CATEGORY_BY_ID[id]?.name || id}</span>
            ))}
          </div>

          {(recipe.sourceName || recipe.sourceUrl) && (
            <p className="detail-source muted">
              Source:{' '}
              {recipe.sourceUrl ? (
                <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">
                  {recipe.sourceName || recipe.sourceUrl}
                </a>
              ) : (
                recipe.sourceName
              )}
            </p>
          )}

          <div className="detail-actions">
            <button type="button" className="btn btn-primary" onClick={() => setShowPlanModal(true)}>
              🗓 Add to meal plan
            </button>
            {recipe.isUser && (
              <>
                <button type="button" className="btn btn-ghost" onClick={() => onEdit(recipe.id)}>
                  ✎ Edit recipe
                </button>
                {confirmDelete ? (
                  <span className="confirm-inline">
                    Delete?
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => {
                        deleteUserRecipe(recipe.id)
                        onBack()
                      }}
                    >
                      Yes, delete
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
                      No
                    </button>
                  </span>
                ) : (
                  <button type="button" className="btn btn-ghost danger-text" onClick={() => setConfirmDelete(true)}>
                    🗑 Delete
                  </button>
                )}
              </>
            )}
            <RecipeOptionsMenu
              options={recipe.options}
              includeInSuggestions={Boolean(recipe.includeInMealSuggestions)}
              onChangeOptions={(patch) => updateRecipeSettings(recipe.id, { options: patch })}
              onChangeSuggestions={(v) =>
                updateRecipeSettings(recipe.id, { includeInMealSuggestions: v })
              }
            />
          </div>

          {plannedInstances.length > 0 && (
            <div className="planned-note">
              <strong>In the plan:</strong>{' '}
              {plannedInstances
                .map((a) => `${fmtMedium(a.date)} ${slotLabel(a.slot)}${a.at ? ` · ${formatTime12(a.at.split('T')[1])}` : ''}`)
                .join('; ')}
            </div>
          )}
        </div>
      </div>

      <div className="detail-columns">
        <div className="card detail-panel">
          <h3>Ingredients</h3>
          {recipe.options?.unitSystem === 'metric' && (
            <p className="muted small">Amounts shown in metric units.</p>
          )}
          {(recipe.ingredientSections || []).length === 0 && (
            <p className="muted">No ingredients listed.</p>
          )}
          {(recipe.ingredientSections || []).map((section, sIdx) => (
            <div className="ingredient-section" key={`${section.name}-${sIdx}`}>
              {section.name && <h4 className="section-name">{section.name}</h4>}
              <ul className="ingredient-list">
                {section.items.map((item, i) => {
                  const subs =
                    recipe.options?.allowSubstitutions && item.ingredientId
                      ? substitutionsFor(item.ingredientId)
                      : []
                  return (
                    <li key={i} className="ingredient-row">
                      <span className="ingredient-qty">
                        {formatQuantity(item.quantity, item.unit, unitSystem) || '—'}
                      </span>
                      <span className="ingredient-name">
                        {item.ingredientName}
                        {item.notes && <span className="muted"> · {item.notes}</span>}
                        {item.optional && <span className="pill pill-outline pill-tiny">optional</span>}
                        {subs.length > 0 && (
                          <span className="substitution" title="Allowed substitution">
                            ⇄ Try: {subs.join(' or ')}
                          </span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          {nutrition && (
            <div className="nutrition-panel">
              <h4>Estimated nutrition <span className="muted small">(per serving)</span></h4>
              <div className="nutrition-grid">
                <div><strong>{nutrition.perServing.kcal}</strong><span>kcal</span></div>
                <div><strong>{nutrition.perServing.protein} g</strong><span>protein</span></div>
                <div><strong>{nutrition.perServing.carbs} g</strong><span>carbs</span></div>
                <div><strong>{nutrition.perServing.fat} g</strong><span>fat</span></div>
              </div>
              <p className="muted small">
                Rough estimate computed from the listed ingredients
                {nutrition.coverage < 1 ? ' (some ingredients could not be estimated)' : ''}.
              </p>
            </div>
          )}
        </div>

        <div className="card detail-panel">
          <h3>Method</h3>
          {(recipe.steps || []).length === 0 && <p className="muted">No steps recorded.</p>}
          <ol className="steps-list">
            {(recipe.steps || []).map((step, i) => (
              <li key={i} className="step-row">
                <span className="step-number">{i + 1}</span>
                <div>
                  <p className="step-text">{step.instruction}</p>
                  {step.timerMinutes > 0 && (
                    <span className="step-timer">⏲ {step.timerMinutes} min</span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {showPlanModal && (
        <AddToPlanModal
          recipe={recipe}
          onDone={() => setShowPlanModal(false)}
          onClose={() => setShowPlanModal(false)}
        />
      )}
    </section>
  )
}
