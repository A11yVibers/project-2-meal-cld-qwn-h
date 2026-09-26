import React, { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import {
  CUISINES, MEAL_TYPES, DIETARY_TAGS, cuisineName, mealTypeName, tagNames, categoryNames, SPICE_LEVELS,
} from '../seedData.js'
import { Thumb, SpiceIndicator } from './ui.jsx'

function RecipeCard({ recipe, onOpen, isNew }) {
  return (
    <article className="recipe-card" style={{ '--accent': recipe.accentColor || '#D97757' }}>
      <button type="button" className="card-open" onClick={() => onOpen(recipe.id)}
        aria-label={`Open recipe ${recipe.title}`}>
        <div className="card-img-wrap">
          <Thumb src={recipe.coverImageUrl} alt={recipe.title} className="card-img" />
          {recipe.source === 'user' && <span className="badge homemade">Homemade</span>}
          {isNew && <span className="badge new">New</span>}
        </div>
        <div className="card-body">
          <h3 className="card-title">{recipe.title}</h3>
          {recipe.shortDescription && <p className="card-desc">{recipe.shortDescription}</p>}
          <div className="card-meta">
            <span className="meta-item" title="Total time">⏱ {recipe.totalMinutes || (recipe.prepMinutes + recipe.cookMinutes)} min</span>
            <span className="meta-item" title="Servings">🍽 {recipe.servings}</span>
            {cuisineName(recipe.cuisineId) && <span className="meta-item">{cuisineName(recipe.cuisineId)}</span>}
            {mealTypeName(recipe.mealTypeId) && <span className="meta-item tag">{mealTypeName(recipe.mealTypeId)}</span>}
          </div>
          <div className="card-foot">
            <SpiceIndicator level={recipe.spiceLevel} />
            <span className="spice-label">{SPICE_LEVELS[recipe.spiceLevel] || ''}</span>
            {tagNames(recipe.dietaryTagIds).slice(0, 2).map((t) => (
              <span key={t} className="mini-chip">{t}</span>
            ))}
          </div>
        </div>
      </button>
    </article>
  )
}

export default function RecipeCatalog({ onOpen, onAdd, highlightId }) {
  const store = useStore()
  const [query, setQuery] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [mealType, setMealType] = useState('')
  const [tag, setTag] = useState('')

  const recipes = useMemo(() => {
    const q = query.trim().toLowerCase()
    return store.allRecipes.filter((r) => {
      if (cuisine && r.cuisineId !== cuisine) return false
      if (mealType && r.mealTypeId !== mealType) return false
      if (tag && !(r.dietaryTagIds || []).includes(tag)) return false
      if (!q) return true
      return (
        r.title.toLowerCase().includes(q) ||
        (r.shortDescription || '').toLowerCase().includes(q) ||
        cuisineName(r.cuisineId).toLowerCase().includes(q) ||
        tagNames(r.dietaryTagIds).some((t) => t.toLowerCase().includes(q)) ||
        categoryNames(r.categoryIds).some((c) => c.toLowerCase().includes(q))
      )
    })
  }, [store.allRecipes, query, cuisine, mealType, tag])

  return (
    <section className="catalog">
      <div className="catalog-head">
        <div>
          <h2>Recipe catalog</h2>
          <p className="subtitle">{recipes.length} recipe{recipes.length === 1 ? '' : 's'}</p>
        </div>
        <button type="button" className="btn primary" onClick={onAdd}>＋ Add recipe</button>
      </div>

      <div className="filters">
        <input type="search" className="input grow" placeholder="Search recipes…" value={query}
          onChange={(e) => setQuery(e.target.value)} aria-label="Search recipes" />
        <select className="input" value={cuisine} onChange={(e) => setCuisine(e.target.value)} aria-label="Filter by cuisine">
          <option value="">All cuisines</option>
          {CUISINES.map((c) => <option key={c.cuisine_id} value={c.cuisine_id}>{c.cuisine_name}</option>)}
        </select>
        <select className="input" value={mealType} onChange={(e) => setMealType(e.target.value)} aria-label="Filter by meal type">
          <option value="">All meal types</option>
          {MEAL_TYPES.map((m) => <option key={m.meal_type_id} value={m.meal_type_id}>{m.meal_type_name}</option>)}
        </select>
        <select className="input" value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Filter by dietary tag">
          <option value="">All diets</option>
          {DIETARY_TAGS.map((t) => <option key={t.dietary_tag_id} value={t.dietary_tag_id}>{t.dietary_tag_name}</option>)}
        </select>
      </div>

      {recipes.length === 0 ? (
        <p className="empty-note">No recipes match your filters.</p>
      ) : (
        <div className="card-grid">
          {recipes.map((r) => (
            <div key={r.id} className={r.id === highlightId ? 'card-highlight' : ''}>
              <RecipeCard recipe={r} onOpen={onOpen} isNew={r.id === highlightId} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
