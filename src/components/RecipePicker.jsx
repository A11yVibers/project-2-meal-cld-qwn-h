import React, { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import Thumbnail from './Thumbnail.jsx'
import { useStore } from '../store.jsx'
import { MEAL_TYPE_BY_ID, slotLabel } from '../lib/data.js'

// Modal used to choose a recipe for a meal-plan slot. Recipes flagged as
// "available in meal-plan suggestions" (and matching the slot's meal type)
// are shown first.
export default function RecipePicker({ date, slot, onPick, onClose }) {
  const { recipes } = useStore()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? recipes.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            (r.shortDescription || '').toLowerCase().includes(q),
        )
      : recipes
    return list
  }, [recipes, query])

  const slotMealType = slotLabel(slot)
  const allSuggested = filtered.filter((r) => r.includeInMealSuggestions)
  // Recipes whose primary meal type matches the slot sort first within the
  // suggested group.
  const suggestionList = [...allSuggested].sort((a, b) => {
    const aMatch = MEAL_TYPE_BY_ID[a.mealTypeId]?.name === slotMealType ? 0 : 1
    const bMatch = MEAL_TYPE_BY_ID[b.mealTypeId]?.name === slotMealType ? 0 : 1
    return aMatch - bMatch
  })
  const suggestionIdSet = new Set(suggestionList.map((r) => r.id))
  const rest = filtered.filter((r) => !suggestionIdSet.has(r.id))

  const renderRow = (r) => (
    <li key={r.id}>
      <button type="button" className="picker-row" onClick={() => onPick(r)}>
        <Thumbnail src={r.coverImageUrl} alt={r.title} className="picker-thumb" />
        <span className="picker-info">
          <span className="picker-title">{r.title}</span>
          <span className="picker-meta">
            {[MEAL_TYPE_BY_ID[r.mealTypeId]?.name, `${r.totalMinutes || (r.prepMinutes + r.cookMinutes)} min`, `Serves ${r.servings}`]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </span>
        {r.isUser && <span className="pill pill-user">Yours</span>}
      </button>
    </li>
  )

  return (
    <Modal
      title={`Choose a recipe · ${date ? new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : ''} ${slotLabel(slot)}`}
      onClose={onClose}
      wide
    >
      <input
        type="search"
        className="input picker-search"
        placeholder="Search recipes…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      {suggestionList.length > 0 && (
        <div className="picker-section">
          <div className="picker-section-label">Suggested for {slotLabel(slot)}</div>
          <ul className="picker-list">{suggestionList.map(renderRow)}</ul>
        </div>
      )}
      <div className="picker-section">
        <div className="picker-section-label">
          {suggestionList.length > 0 ? 'All recipes' : 'Recipes'}
        </div>
        <ul className="picker-list">
          {rest.map(renderRow)}
          {rest.length === 0 && suggestionList.length === 0 && (
            <li className="picker-empty">No recipes match “{query}”.</li>
          )}
        </ul>
      </div>
    </Modal>
  )
}
