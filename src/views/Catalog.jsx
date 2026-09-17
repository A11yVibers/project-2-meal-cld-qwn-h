import React, { useMemo, useState } from 'react'
import Thumbnail from '../components/Thumbnail.jsx'
import { useStore } from '../store.jsx'
import {
  CATEGORIES,
  CATEGORY_BY_ID,
  CUISINES,
  CUISINE_BY_ID,
  DIETARY_TAGS,
  DIETARY_TAG_BY_ID,
  MEAL_TYPES,
  MEAL_TYPE_BY_ID,
} from '../lib/data.js'
import { weekDays } from '../lib/dates.js'

export default function Catalog({ onOpen, onAdd, onGoPlanner }) {
  const { recipes, assignments, currentWeekKey } = useStore()
  const [query, setQuery] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [mealType, setMealType] = useState('')
  const [activeTags, setActiveTags] = useState([])

  const plannedCounts = useMemo(() => {
    const weekKeys = new Set(weekDays(currentWeekKey).map((d) => d.key))
    const counts = new Map()
    for (const a of assignments) {
      if (!weekKeys.has(a.date)) continue
      counts.set(a.recipeId, (counts.get(a.recipeId) || 0) + 1)
    }
    return counts
  }, [assignments, currentWeekKey])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return recipes.filter((r) => {
      if (q && !(r.title + ' ' + (r.shortDescription || '')).toLowerCase().includes(q)) return false
      if (cuisine && r.cuisineId !== cuisine) return false
      if (mealType && r.mealTypeId !== mealType) return false
      if (activeTags.length && !activeTags.every((t) => r.dietaryTagIds?.includes(t))) return false
      return true
    })
  }, [recipes, query, cuisine, mealType, activeTags])

  const toggleTag = (id) =>
    setActiveTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))

  return (
    <section className="view catalog-view">
      <div className="view-head">
        <div>
          <h2>Recipe catalog</h2>
          <p className="muted">
            {recipes.length} recipes · {recipes.filter((r) => r.isUser).length} created by you
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          ＋ Add recipe
        </button>
      </div>

      <div className="filters card">
        <input
          type="search"
          className="input"
          placeholder="Search recipes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search recipes"
        />
        <select className="input" value={cuisine} onChange={(e) => setCuisine(e.target.value)} aria-label="Filter by cuisine">
          <option value="">All cuisines</option>
          {CUISINES.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="input" value={mealType} onChange={(e) => setMealType(e.target.value)} aria-label="Filter by meal type">
          <option value="">All meal types</option>
          {MEAL_TYPES.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <div className="filter-tags">
          {DIETARY_TAGS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tag-toggle ${activeTags.includes(t.id) ? 'active' : ''}`}
              onClick={() => toggleTag(t.id)}
              aria-pressed={activeTags.includes(t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <p>No recipes match your filters.</p>
          <button type="button" className="btn btn-ghost" onClick={onAdd}>
            Create the first one
          </button>
        </div>
      ) : (
        <div className="recipe-grid">
          {filtered.map((r) => {
            const planned = plannedCounts.get(r.id) || 0
            return (
              <article
                key={r.id}
                className="recipe-card card"
                style={{ '--accent': r.accentColor }}
                onClick={() => onOpen(r.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOpen(r.id)
                  }
                }}
                aria-label={`Open recipe ${r.title}`}
              >
                <div className="recipe-card-media">
                  <Thumbnail src={r.coverImageUrl} alt={r.title} />
                  {planned > 0 && (
                    <button
                      type="button"
                      className="badge badge-planned"
                      title="Planned this week — open the planner"
                      onClick={(e) => {
                        e.stopPropagation()
                        onGoPlanner()
                      }}
                    >
                      🗓 {planned}× this week
                    </button>
                  )}
                </div>
                <div className="recipe-card-body">
                  <div className="recipe-card-kicker">
                    {CUISINE_BY_ID[r.cuisineId]?.name || 'Uncategorized'}
                    {MEAL_TYPE_BY_ID[r.mealTypeId]?.name ? ` · ${MEAL_TYPE_BY_ID[r.mealTypeId].name}` : ''}
                  </div>
                  <h3 className="recipe-card-title">{r.title}</h3>
                  <p className="recipe-card-desc">{r.shortDescription}</p>
                  <div className="recipe-card-meta">
                    <span title="Total time">⏱ {r.totalMinutes || r.prepMinutes + r.cookMinutes} min</span>
                    <span title="Servings">🍽 {r.servings} servings</span>
                    {r.spiceLevel >= 3 && <span title="Spicy">🌶 {r.spiceLevel >= 5 ? '🌶' : ''}</span>}
                  </div>
                  <div className="pill-row">
                    {(r.dietaryTagIds || []).slice(0, 3).map((id) => (
                      <span key={id} className="pill">{DIETARY_TAG_BY_ID[id]?.name || id}</span>
                    ))}
                    {(r.categoryIds || []).slice(0, 2).map((id) => (
                      <span key={id} className="pill pill-outline">{CATEGORY_BY_ID[id]?.name || id}</span>
                    ))}
                    {r.isUser && <span className="pill pill-user">Yours</span>}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
      <p className="muted catalog-footnote">
        {CATEGORIES.length} recipe categories · {DIETARY_TAGS.length} dietary tags available when creating recipes
      </p>
    </section>
  )
}
