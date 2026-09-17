import React, { useEffect, useState } from 'react'
import { StoreProvider, useStore } from './store.jsx'
import Catalog from './views/Catalog.jsx'
import RecipeDetail from './views/RecipeDetail.jsx'
import RecipeForm from './views/RecipeForm.jsx'
import Planner from './views/Planner.jsx'
import ShoppingList from './views/ShoppingList.jsx'

const TABS = [
  { name: 'catalog', label: 'Recipes', icon: '📖' },
  { name: 'planner', label: 'Meal planner', icon: '🗓' },
  { name: 'shopping', label: 'Shopping list', icon: '🛒' },
]

function Shell() {
  const { assignments } = useStore()
  const [view, setView] = useState({ name: 'catalog' })

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view])

  const goCatalog = () => setView({ name: 'catalog' })
  const goPlanner = () => setView({ name: 'planner' })
  const openRecipe = (id) => setView({ name: 'detail', recipeId: id })

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <button type="button" className="brand" onClick={goCatalog}>
            <span className="brand-mark" aria-hidden="true">🍽</span>
            <span className="brand-text">
              Mealplan<strong>Studio</strong>
            </span>
          </button>
          <nav className="main-nav" aria-label="Main">
            {TABS.map((t) => {
              const active =
                view.name === t.name ||
                (t.name === 'catalog' && (view.name === 'detail' || view.name === 'form'))
              return (
                <button
                  key={t.name}
                  type="button"
                  className={`nav-btn ${active ? 'active' : ''}`}
                  onClick={() => setView({ name: t.name })}
                >
                  <span aria-hidden="true">{t.icon}</span> {t.label}
                  {t.name === 'planner' && assignments.length > 0 && (
                    <span className="nav-count">{assignments.length}</span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="app-main">
        {view.name === 'catalog' && (
          <Catalog
            onOpen={openRecipe}
            onAdd={() => setView({ name: 'form' })}
            onGoPlanner={goPlanner}
          />
        )}
        {view.name === 'detail' && (
          <RecipeDetail
            recipeId={view.recipeId}
            onBack={goCatalog}
            onEdit={(id) => setView({ name: 'form', editingId: id })}
          />
        )}
        {view.name === 'form' && (
          <RecipeForm
            editingId={view.editingId || null}
            onSaved={(id) => openRecipe(id)}
            onCancel={() => (view.editingId ? openRecipe(view.editingId) : goCatalog())}
          />
        )}
        {view.name === 'planner' && (
          <Planner onOpenRecipe={openRecipe} onBrowseRecipes={goCatalog} />
        )}
        {view.name === 'shopping' && <ShoppingList onGoPlanner={goPlanner} />}
      </main>

      <footer className="app-footer">
        <p>
          Recipes seeded from the supplied project data · Your recipes, plan and list are saved
          locally in this browser.
        </p>
      </footer>
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
