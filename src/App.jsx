import { useEffect, useState } from 'react'
import { StoreProvider, useStore } from './store.jsx'
import RecipeCatalog from './components/RecipeCatalog.jsx'
import RecipeDetail from './components/RecipeDetail.jsx'
import RecipeForm from './components/RecipeForm.jsx'
import Planner from './components/Planner.jsx'
import ShoppingList from './components/ShoppingList.jsx'

const TABS = [
  { id: 'recipes', label: 'Recipes' },
  { id: 'planner', label: 'Planner' },
  { id: 'shopping', label: 'Shopping list' },
]

function Shell() {
  const { getRecipe } = useStore()
  // Top-level tab plus an in-recipes sub-view for detail/add/edit.
  const [tab, setTab] = useState('recipes')
  const [subView, setSubView] = useState('catalog') // catalog | detail | add | edit
  const [activeRecipeId, setActiveRecipeId] = useState(null)
  const [editingRecipe, setEditingRecipe] = useState(null)
  const [toast, setToast] = useState(null)

  // Keep the document title descriptive of the current view (WCAG 2.4.2).
  useEffect(() => {
    const base = 'Mealboard'
    let title = base
    if (tab === 'planner') title = `Weekly planner · ${base}`
    else if (tab === 'shopping') title = `Shopping list · ${base}`
    else if (subView === 'add') title = `Add recipe · ${base}`
    else if (subView === 'edit') title = `Edit recipe · ${base}`
    else if (subView === 'detail' && activeRecipeId) {
      const r = getRecipe(activeRecipeId)
      title = r ? `${r.title} · ${base}` : `Recipe · ${base}`
    } else title = `Recipes · ${base}`
    document.title = title
  }, [tab, subView, activeRecipeId, getRecipe])

  function showToast(message) {
    setToast(message)
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => setToast(null), 3500)
  }

  function openRecipe(id) {
    setActiveRecipeId(id)
    setTab('recipes')
    setSubView('detail')
    window.scrollTo({ top: 0 })
  }

  function openAdd() {
    setEditingRecipe(null)
    setTab('recipes')
    setSubView('add')
    window.scrollTo({ top: 0 })
  }

  function openEdit(id) {
    const r = getRecipe(id)
    setEditingRecipe(r)
    setTab('recipes')
    setSubView('edit')
    window.scrollTo({ top: 0 })
  }

  function goCatalog() {
    setSubView('catalog')
    setActiveRecipeId(null)
    window.scrollTo({ top: 0 })
  }

  function handleSaved(_id, { addedToPlan }) {
    setSubView('catalog')
    setActiveRecipeId(null)
    showToast(
      addedToPlan
        ? 'Recipe added to your collection and meal plan.'
        : 'Recipe added to your collection.',
    )
    window.scrollTo({ top: 0 })
  }

  function selectTab(id) {
    setTab(id)
    if (id === 'recipes') setSubView('catalog')
    window.scrollTo({ top: 0 })
  }

  let content
  if (tab === 'planner') {
    content = (
      <Planner
        onOpenRecipe={openRecipe}
        onGoShopping={() => selectTab('shopping')}
      />
    )
  } else if (tab === 'shopping') {
    content = <ShoppingList onGoPlanner={() => selectTab('planner')} />
  } else if (subView === 'detail') {
    content = (
      <RecipeDetail
        recipeId={activeRecipeId}
        onBack={goCatalog}
        onEdit={openEdit}
        onOpenPlanner={() => selectTab('planner')}
      />
    )
  } else if (subView === 'add' || subView === 'edit') {
    content = (
      <RecipeForm
        key={editingRecipe?.id ?? 'new'}
        existing={editingRecipe}
        onCancel={goCatalog}
        onSaved={handleSaved}
      />
    )
  } else {
    content = (
      <RecipeCatalog onOpenRecipe={openRecipe} onAddRecipe={openAdd} />
    )
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              🍲
            </span>
            <span className="brand-text">
              <strong>Mealboard</strong>
              <span className="brand-sub">plan · cook · shop</span>
            </span>
          </div>
          <nav className="app-nav" aria-label="Primary">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`nav-tab${tab === t.id ? ' is-active' : ''}`}
                aria-current={tab === t.id ? 'page' : undefined}
                onClick={() => selectTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main id="main" className="app-main">
        {content}
      </main>

      <footer className="app-footer">
        <p>
          Recipes and plans are saved in your browser. Seed recipes come from the
          supplied CSV data; your recipes are stored locally.
        </p>
      </footer>

      <div aria-live="polite" className="toast-region">
        {toast && <div className="toast">{toast}</div>}
      </div>
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
