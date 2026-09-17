import React, { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { buildShoppingList } from '../lib/shopping.js'
import { INGREDIENTS } from '../lib/data.js'
import { fmtShort, weekDays, weekLabel } from '../lib/dates.js'

export default function ShoppingList({ onGoPlanner }) {
  const {
    assignments,
    getRecipe,
    currentWeekKey,
    checkedSet,
    toggleChecked,
    clearChecked,
    pantrySet,
    togglePantry,
    excludePantry,
    setExcludePantry,
    shoppingScope,
    setShoppingScope,
    shoppingUnitSystem,
    setShoppingUnitSystem,
  } = useStore()

  const [showPantryManager, setShowPantryManager] = useState(false)
  const [showExcluded, setShowExcluded] = useState(false)

  const scopedAssignments = useMemo(() => {
    if (shoppingScope === 'all') return assignments
    const keys = new Set(weekDays(currentWeekKey).map((d) => d.key))
    return assignments.filter((a) => keys.has(a.date))
  }, [assignments, shoppingScope, currentWeekKey])

  const plannedRecipes = useMemo(() => {
    const seen = new Set()
    const list = []
    for (const a of [...scopedAssignments].sort((x, y) => x.date.localeCompare(y.date))) {
      if (seen.has(a.id)) continue
      seen.add(a.id)
      const r = getRecipe(a.recipeId)
      if (r) list.push({ asg: a, recipe: r })
    }
    return list
  }, [scopedAssignments, getRecipe])

  const { categories, excludedItems } = useMemo(
    () =>
      buildShoppingList({
        assignments: scopedAssignments,
        getRecipe,
        displayUnitSystem: shoppingUnitSystem,
        pantrySet,
        excludePantry,
      }),
    [scopedAssignments, getRecipe, shoppingUnitSystem, pantrySet, excludePantry],
  )

  const allItems = categories.flatMap((c) => c.items)
  const checkedCount = allItems.filter((i) => checkedSet.has(i.key)).length
  const skippedRecipes = plannedRecipes.filter(
    ({ recipe }) => recipe.options?.includeInShoppingList === false,
  )

  return (
    <section className="view shopping-view">
      <div className="view-head">
        <div>
          <h2>Shopping list</h2>
          <p className="muted">
            {shoppingScope === 'week'
              ? `Auto-generated from the plan for the week of ${fmtShort(currentWeekKey)} (${weekLabel(currentWeekKey)}).`
              : 'Auto-generated from every meal currently in the plan.'}
          </p>
        </div>
        <div className="shopping-controls">
          <div className="segmented" role="group" aria-label="List scope">
            <button
              type="button"
              className={shoppingScope === 'week' ? 'selected' : ''}
              onClick={() => setShoppingScope('week')}
            >
              This week
            </button>
            <button
              type="button"
              className={shoppingScope === 'all' ? 'selected' : ''}
              onClick={() => setShoppingScope('all')}
            >
              All planned
            </button>
          </div>
          <div className="segmented" role="group" aria-label="Measurement units">
            <button
              type="button"
              className={shoppingUnitSystem === 'us' ? 'selected' : ''}
              onClick={() => setShoppingUnitSystem('us')}
            >
              US
            </button>
            <button
              type="button"
              className={shoppingUnitSystem === 'metric' ? 'selected' : ''}
              onClick={() => setShoppingUnitSystem('metric')}
            >
              Metric
            </button>
          </div>
        </div>
      </div>

      {plannedRecipes.length === 0 ? (
        <div className="empty-state card">
          <p>Nothing is planned{shoppingScope === 'week' ? ' for this week' : ''} yet.</p>
          <p className="muted small">
            Add recipes to the meal planner and the shopping list builds itself — repeated
            ingredients are combined and sorted into store sections.
          </p>
          <button type="button" className="btn btn-primary" onClick={onGoPlanner}>
            Open the meal planner
          </button>
        </div>
      ) : (
        <>
          <div className="card shopping-toolbar">
            <div className="shopping-progress">
              <div className="progress-track" aria-hidden="true">
                <div
                  className="progress-fill"
                  style={{ width: allItems.length ? `${(checkedCount / allItems.length) * 100}%` : '0%' }}
                />
              </div>
              <span className="muted small">
                {checkedCount} of {allItems.length} items checked
              </span>
            </div>
            <label className="switch-row switch-compact">
              <input
                type="checkbox"
                checked={excludePantry}
                onChange={(e) => setExcludePantry(e.target.checked)}
              />
              <span>Exclude ingredients I already have in my pantry</span>
            </label>
            <div className="toolbar-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowPantryManager((v) => !v)}
              >
                🥫 Manage pantry ({pantrySet.size})
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearChecked} disabled={checkedCount === 0}>
                Uncheck all
              </button>
            </div>
          </div>

          {showPantryManager && (
            <div className="card pantry-manager">
              <h3>My pantry</h3>
              <p className="muted small">
                Mark staples you always have at home. When “exclude pantry ingredients” is on,
                these never appear on the list.
              </p>
              <div className="chip-group">
                {INGREDIENTS.map((ing) => (
                  <button
                    key={ing.id}
                    type="button"
                    className={`tag-toggle ${pantrySet.has(ing.id) ? 'active' : ''}`}
                    aria-pressed={pantrySet.has(ing.id)}
                    onClick={() => togglePantry(ing.id)}
                  >
                    {pantrySet.has(ing.id) ? '✓ ' : ''}{ing.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {skippedRecipes.length > 0 && (
            <p className="notice">
              Not included (shopping-list option turned off in the recipe’s options menu):{' '}
              {skippedRecipes.map(({ recipe }) => recipe.title).join(', ')}
            </p>
          )}

          {allItems.length === 0 && excludedItems.length > 0 && (
            <p className="notice">
              Every planned ingredient is already in your pantry. Toggle the exclusion switch
              above to see the full list.
            </p>
          )}

          <div className="shopping-columns">
            {categories.map(({ category, items }) => (
              <div className="card shop-category" key={category}>
                <h3>
                  {category} <span className="muted small">({items.length})</span>
                </h3>
                <ul className="shop-list">
                  {items.map((item) => {
                    const checked = checkedSet.has(item.key)
                    return (
                      <li key={item.key} className={`shop-item ${checked ? 'checked' : ''}`}>
                        <label className="shop-item-main">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleChecked(item.key)}
                          />
                          <span className="shop-item-text">
                            <strong>{item.ingredientName}</strong>
                            {item.displayAmount && <span className="shop-amount">{item.displayAmount}</span>}
                            {item.optional && <span className="pill pill-outline pill-tiny">optional</span>}
                            {item.notes.length > 0 && (
                              <span className="muted small"> ({item.notes.join(', ')})</span>
                            )}
                            <span className="shop-sources muted small" title={item.sources.join('\n')}>
                              from {item.sources.length} planned meal{item.sources.length === 1 ? '' : 's'}
                            </span>
                          </span>
                        </label>
                        {item.ingredientId && (
                          <button
                            type="button"
                            className={`icon-btn ${item.inPantry ? 'pantry-on' : ''}`}
                            title={item.inPantry ? 'Remove from pantry' : 'Mark as already in pantry'}
                            onClick={() => togglePantry(item.ingredientId)}
                          >
                            🥫
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>

          {excludePantry && excludedItems.length > 0 && (
            <div className="card excluded-card">
              <button
                type="button"
                className="excluded-toggle"
                onClick={() => setShowExcluded((v) => !v)}
                aria-expanded={showExcluded}
              >
                {showExcluded ? '▾' : '▸'} In your pantry — excluded from the list ({excludedItems.length})
              </button>
              {showExcluded && (
                <ul className="excluded-list muted small">
                  {excludedItems.map((item) => (
                    <li key={item.key}>
                      {item.ingredientName} · {item.displayAmount}{' '}
                      <button type="button" className="link-btn" onClick={() => togglePantry(item.ingredientId)}>
                        remove from pantry
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
