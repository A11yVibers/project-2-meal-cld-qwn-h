import { useMemo } from 'react'
import { useStore } from '../store.jsx'
import { generateShoppingItems, groupItemsByCategory, ingredientKey } from '../lib/shopping.js'
import { formatMeasure } from '../lib/units.js'
import { weekRangeLabel } from '../lib/dates.js'

// The shopping list is derived from the recipes in the currently viewed week of
// the meal plan. It re-computes whenever the plan changes, combines repeated
// ingredients, groups them into shopping categories, supports check-off (kept in
// localStorage per week) and can exclude pantry items.
export default function ShoppingList({ onGoPlanner }) {
  const {
    currentWeekStart,
    assignmentsForWeek,
    getRecipe,
    checkedSetForWeek,
    toggleChecked,
    clearChecked,
    measurementSystem,
    excludePantry,
    setExcludePantry,
    isInPantry,
    togglePantry,
    pantry,
  } = useStore()

  const allItems = useMemo(
    () => generateShoppingItems(assignmentsForWeek(currentWeekStart), getRecipe),
    [assignmentsForWeek, currentWeekStart, getRecipe],
  )

  const items = useMemo(() => {
    if (!excludePantry) return allItems
    return allItems.filter((it) => !isInPantry(it.key))
  }, [allItems, excludePantry, isInPantry])

  const groups = useMemo(() => groupItemsByCategory(items), [items])
  const checkedSet = checkedSetForWeek(currentWeekStart)

  const total = items.length
  const checkedCount = items.filter((it) => checkedSet[it.compositeKey]).length
  const excludedByPantry = allItems.length - items.length

  return (
    <section className="shopping" aria-labelledby="shopping-heading">
      <div className="shopping-head">
        <div>
          <h1 id="shopping-heading" className="page-title">
            Shopping list
          </h1>
          <p className="page-subtitle">
            Auto-generated from the week of {weekRangeLabel(currentWeekStart)}
            {total > 0 && ` · ${checkedCount}/${total} checked`}
          </p>
        </div>
        <div className="planner-nav">
          <button type="button" className="btn btn-outline" onClick={onGoPlanner}>
            ← Back to planner
          </button>
        </div>
      </div>

      <div className="shopping-controls">
        <label className="check-inline">
          <input
            type="checkbox"
            checked={excludePantry}
            onChange={(e) => setExcludePantry(e.target.checked)}
          />
          <span>
            Exclude items already in my pantry
            {excludedByPantry > 0 && ` (${excludedByPantry} hidden)`}
          </span>
        </label>
        {checkedCount > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => clearChecked(currentWeekStart)}
          >
            Uncheck all
          </button>
        )}
      </div>

      {total > 0 && (
        <div
          className="progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={checkedCount}
          aria-label="Shopping progress"
        >
          <div
            className="progress-bar"
            style={{ width: `${total ? (checkedCount / total) * 100 : 0}%` }}
          />
        </div>
      )}

      {allItems.length === 0 ? (
        <div className="empty-state">
          <p>Your shopping list is empty.</p>
          <p className="muted">
            Add recipes to the meal plan for this week and they'll appear here.
          </p>
          <button type="button" className="btn btn-primary" onClick={onGoPlanner}>
            Go to planner
          </button>
        </div>
      ) : (
        <div className="shopping-groups">
          {groups.map(([category, list]) => (
            <div className="shopping-category" key={category}>
              <h2 className="shopping-cat-name">
                {category} <span className="shopping-cat-count">{list.length}</span>
              </h2>
              <ul className="shopping-items">
                {list.map((it) => {
                  const checked = Boolean(checkedSet[it.compositeKey])
                  const inPantry = isInPantry(it.key)
                  return (
                    <li
                      className={`shopping-item${checked ? ' is-checked' : ''}`}
                      key={it.compositeKey}
                    >
                      <label className="shopping-item-check">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleChecked(currentWeekStart, it.compositeKey)}
                        />
                        <span className="shopping-item-main">
                          <span className="shopping-item-name">
                            <span className="shopping-item-qty">
                              {formatMeasure(it.quantity, it.unit, measurementSystem) || '—'}
                            </span>
                            {it.name}
                            {it.optional && <em className="ing-optional"> (optional)</em>}
                          </span>
                          {it.notes && <span className="shopping-item-notes">{it.notes}</span>}
                          <span className="shopping-item-src">
                            {it.recipes.join(', ')}
                          </span>
                        </span>
                      </label>
                      <button
                        type="button"
                        className={`pantry-btn${inPantry ? ' is-on' : ''}`}
                        aria-pressed={inPantry}
                        title={
                          inPantry
                            ? 'Remove from pantry'
                            : 'Mark as already in pantry (hides it when exclusion is on)'
                        }
                        onClick={() => togglePantry(ingredientKey(it.ingredientId, it.name))}
                      >
                        {inPantry ? '✓ In pantry' : 'Have it'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {pantry.length > 0 && (
        <p className="pantry-note muted">
          {pantry.length} ingredient{pantry.length === 1 ? '' : 's'} marked as in your
          pantry. Use “Have it” on items to manage this.
        </p>
      )}
    </section>
  )
}
