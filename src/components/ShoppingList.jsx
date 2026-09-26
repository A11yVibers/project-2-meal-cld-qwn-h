import React, { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { buildShoppingList, formatItemQty } from '../shopping.js'
import { WeekNav } from './ui.jsx'

export default function ShoppingList({ weekStart, setWeekStart, onGoPlanner }) {
  const store = useStore()
  const [showPantry, setShowPantry] = useState(false)

  const shopping = useMemo(
    () => buildShoppingList(weekStart, store),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekStart, store.plan, store.userRecipes, store.seedOptionOverrides]
  )

  const pantrySet = useMemo(() => new Set(store.pantryKeys), [store.pantryKeys])
  const checkedSet = useMemo(() => new Set(store.checkedKeys), [store.checkedKeys])

  const activeItems = shopping.items.filter((i) => !pantrySet.has(i.ingKey))
  const pantryItems = shopping.items.filter((i) => pantrySet.has(i.ingKey))
  const checkedCount = activeItems.filter((i) => checkedSet.has(i.itemKey)).length
  const progress = activeItems.length ? Math.round((checkedCount / activeItems.length) * 100) : 0

  // Groups excluding pantry items
  const groups = shopping.groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !pantrySet.has(i.ingKey)) }))
    .filter((g) => g.items.length > 0)

  function uncheckAll() {
    store.uncheckKeys(activeItems.map((i) => i.itemKey))
  }

  return (
    <section className="shopping">
      <div className="shopping-head">
        <div>
          <h2>Shopping list</h2>
          <p className="subtitle">
            {shopping.recipeCount === 0
              ? 'Generated from the recipes in this week’s meal plan.'
              : `From ${shopping.recipeCount} planned recipe${shopping.recipeCount === 1 ? '' : 's'} · ${activeItems.length} item${activeItems.length === 1 ? '' : 's'}`}
          </p>
        </div>
        {activeItems.length > 0 && (
          <button type="button" className="btn ghost" onClick={uncheckAll}>Uncheck all</button>
        )}
      </div>
      <WeekNav weekStart={weekStart} setWeekStart={setWeekStart} />

      {activeItems.length > 0 && (
        <div className="progress-wrap" aria-label={`${progress}% checked`}>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          <span className="progress-label">{checkedCount}/{activeItems.length} checked</span>
        </div>
      )}

      {shopping.items.length === 0 ? (
        <div className="empty-state">
          <p>Nothing planned this week — the shopping list builds itself from your meal plan.</p>
          <button type="button" className="btn primary" onClick={onGoPlanner}>Open the planner</button>
        </div>
      ) : activeItems.length === 0 ? (
        <p className="empty-note">Every ingredient this week is already in your pantry.</p>
      ) : (
        <div className="shop-groups">
          {groups.map((g) => (
            <div key={g.category} className="shop-group">
              <h3>{g.category} <span className="shop-count">{g.items.length}</span></h3>
              <ul className="shop-items">
                {g.items.map((item) => {
                  const checked = checkedSet.has(item.itemKey)
                  return (
                    <li key={item.itemKey} className={`shop-item${checked ? ' checked' : ''}`}>
                      <label className="shop-item-main">
                        <input type="checkbox" checked={checked}
                          onChange={() => store.toggleChecked(item.itemKey)}
                          aria-label={`Check off ${item.name}`} />
                        <span className="shop-qty">{formatItemQty(item)}</span>
                        <span className="shop-name">{item.name}</span>
                        {item.allOptional && <span className="mini-chip optional-chip">optional</span>}
                        {item.recipes.length > 1 && (
                          <span className="shop-src" title={item.recipes.join(', ')}>×{item.recipes.length} recipes</span>
                        )}
                        {item.recipes.length === 1 && <span className="shop-src">{item.recipes[0]}</span>}
                      </label>
                      <button type="button" className="link-btn pantry-btn" title="Exclude — I already have this"
                        onClick={() => store.togglePantry(item.ingKey)}>
                        In pantry
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {pantryItems.length > 0 && (
        <div className="pantry-section">
          <button type="button" className="btn ghost" aria-expanded={showPantry}
            onClick={() => setShowPantry((s) => !s)}>
            {showPantry ? '▾' : '▸'} Pantry — {pantryItems.length} excluded ingredient{pantryItems.length === 1 ? '' : 's'}
          </button>
          {showPantry && (
            <ul className="shop-items pantry-items">
              {pantryItems.map((item) => (
                <li key={item.itemKey} className="shop-item in-pantry">
                  <span className="shop-item-main">
                    <span className="shop-qty">{formatItemQty(item)}</span>
                    <span className="shop-name">{item.name}</span>
                  </span>
                  <button type="button" className="link-btn" onClick={() => store.togglePantry(item.ingKey)}>
                    Remove from pantry
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
