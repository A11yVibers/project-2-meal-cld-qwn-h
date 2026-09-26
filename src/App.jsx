import React, { useEffect, useMemo, useState } from 'react'
import { StoreProvider, useStore } from './store.jsx'
import RecipeCatalog from './components/RecipeCatalog.jsx'
import RecipeDetail from './components/RecipeDetail.jsx'
import RecipeForm from './components/RecipeForm.jsx'
import Planner from './components/Planner.jsx'
import ShoppingList from './components/ShoppingList.jsx'
import { buildShoppingList } from './shopping.js'
import { startOfWeekISO, todayISO, weekDaysISO } from './dates.js'
import { PLAN_SLOT_NAMES } from './seedData.js'

function Shell() {
  const store = useStore()
  const [view, setView] = useState({ name: 'catalog' })
  const [weekStart, setWeekStart] = useState(() => startOfWeekISO(todayISO()))
  const [highlightId, setHighlightId] = useState(null)
  const [toast, setToast] = useState(null)

  function showToast(msg) {
    setToast(msg)
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast(null), 3400)
  }

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view.name, view.id])

  // Badge: meals planned in the current week
  const plannedCount = useMemo(() => {
    let n = 0
    for (const d of weekDaysISO(weekStart)) {
      for (const s of PLAN_SLOT_NAMES) if (store.plan[d]?.[s]?.recipeId) n++
    }
    return n
  }, [weekStart, store.plan])

  // Badge: unchecked, non-pantry shopping items for the current week
  const shoppingCount = useMemo(() => {
    const list = buildShoppingList(weekStart, store)
    const pantry = new Set(store.pantryKeys)
    const checked = new Set(store.checkedKeys)
    return list.items.filter((i) => !pantry.has(i.ingKey) && !checked.has(i.itemKey)).length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, store])

  const nav = [
    { name: 'catalog', label: 'Recipes' },
    { name: 'planner', label: 'Planner', badge: plannedCount },
    { name: 'shopping', label: 'Shopping list', badge: shoppingCount },
  ]

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <button type="button" className="brand" onClick={() => setView({ name: 'catalog' })}>
            <span className="brand-icon" aria-hidden="true">🍽</span> Meal Planner
          </button>
          <nav className="main-nav" aria-label="Main">
            {nav.map((t) => {
              const active =
                view.name === t.name ||
                (t.name === 'catalog' && (view.name === 'detail' || view.name === 'form'))
              return (
                <button
                  key={t.name}
                  type="button"
                  className={`nav-btn${active ? ' active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setView({ name: t.name })}
                >
                  {t.label}
                  {t.badge > 0 && <span className="nav-badge">{t.badge}</span>}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="container">
        {view.name === 'catalog' && (
          <RecipeCatalog
            onOpen={(id) => setView({ name: 'detail', id })}
            onAdd={() => setView({ name: 'form' })}
            highlightId={highlightId}
          />
        )}
        {view.name === 'detail' && (
          <RecipeDetail
            recipeId={view.id}
            onBack={() => setView({ name: 'catalog' })}
            onGoPlanner={() => setView({ name: 'planner' })}
            showToast={showToast}
          />
        )}
        {view.name === 'form' && (
          <RecipeForm
            onCancel={() => setView({ name: 'catalog' })}
            onSaved={(id) => {
              setHighlightId(id)
              setView({ name: 'catalog' })
            }}
            showToast={showToast}
          />
        )}
        {view.name === 'planner' && (
          <Planner
            weekStart={weekStart}
            setWeekStart={setWeekStart}
            onOpenRecipe={(id) => setView({ name: 'detail', id })}
            showToast={showToast}
          />
        )}
        {view.name === 'shopping' && (
          <ShoppingList
            weekStart={weekStart}
            setWeekStart={setWeekStart}
            onGoPlanner={() => setView({ name: 'planner' })}
          />
        )}
      </main>

      {toast && (
        <div className="toast" role="status">{toast}</div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
