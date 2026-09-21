import { useMemo, useState } from 'react'
import RecipeCard from './RecipeCard.jsx'
import { useStore } from '../store.jsx'
import {
  CUISINES,
  MEAL_TYPES,
  DIETARY_TAGS,
} from '../lib/data.js'
import { weekDaysISO } from '../lib/dates.js'

// The recipe catalog: browse the collection (seed + user recipes), filter it,
// and open any recipe's detail view.
export default function RecipeCatalog({ onOpenRecipe, onAddRecipe }) {
  const { recipes, assignments, currentWeekStart } = useStore()
  const [query, setQuery] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [mealType, setMealType] = useState('')
  const [tag, setTag] = useState('')

  // Count how many times each recipe is planned in the currently viewed week,
  // so the catalog can surface that at a glance.
  const plannedCounts = useMemo(() => {
    const counts = {}
    const days = new Set(weekDaysISO(currentWeekStart))
    for (const [date, slots] of Object.entries(assignments)) {
      if (!days.has(date)) continue
      for (const rid of Object.values(slots)) {
        if (rid) counts[rid] = (counts[rid] || 0) + 1
      }
    }
    return counts
  }, [assignments, currentWeekStart])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return recipes.filter((r) => {
      if (q && !r.title.toLowerCase().includes(q) && !(r.shortDescription || '').toLowerCase().includes(q))
        return false
      if (cuisine && r.cuisineId !== cuisine) return false
      if (mealType && r.mealTypeId !== mealType) return false
      if (tag && !(r.dietaryTagIds || []).includes(tag)) return false
      return true
    })
  }, [recipes, query, cuisine, mealType, tag])

  return (
    <section className="catalog" aria-labelledby="catalog-heading">
      <div className="catalog-head">
        <div>
          <h1 id="catalog-heading" className="page-title">
            Recipes
          </h1>
          <p className="page-subtitle">
            {recipes.length} recipe{recipes.length === 1 ? '' : 's'} in your collection
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onAddRecipe}>
          <span aria-hidden="true">＋</span> Add recipe
        </button>
      </div>

      <div className="catalog-controls">
        <div className="field-search">
          <label className="visually-hidden" htmlFor="catalog-search">
            Search recipes
          </label>
          <input
            id="catalog-search"
            type="search"
            placeholder="Search recipes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="field-inline">
          <label htmlFor="filter-cuisine">Cuisine</label>
          <select
            id="filter-cuisine"
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
          >
            <option value="">All</option>
            {CUISINES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field-inline">
          <label htmlFor="filter-meal">Meal type</label>
          <select
            id="filter-meal"
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
          >
            <option value="">All</option>
            {MEAL_TYPES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field-inline">
          <label htmlFor="filter-tag">Dietary</label>
          <select id="filter-tag" value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">All</option>
            {DIETARY_TAGS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        {(query || cuisine || mealType || tag) && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setQuery('')
              setCuisine('')
              setMealType('')
              setTag('')
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No recipes match your filters.</p>
        </div>
      ) : (
        <div className="recipe-grid">
          {filtered.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              onOpen={onOpenRecipe}
              plannedCount={plannedCounts[r.id] || 0}
            />
          ))}
        </div>
      )}
    </section>
  )
}
