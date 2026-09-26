import React, { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { cuisineName, mealTypeName } from '../seedData.js'
import { Modal, Thumb } from './ui.jsx'

// Modal for choosing a recipe to place into a meal-plan slot.
// By default only recipes flagged "available in meal-plan suggestions" show.
export default function RecipePicker({ title, slotLabel, onSelect, onClose, excludeId }) {
  const store = useStore()
  const [query, setQuery] = useState('')
  const [suggestedOnly, setSuggestedOnly] = useState(true)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return store.allRecipes.filter((r) => {
      if (r.id === excludeId) return false
      if (suggestedOnly && !r.includeInMealSuggestions) return false
      if (!q) return true
      return (
        r.title.toLowerCase().includes(q) ||
        cuisineName(r.cuisineId).toLowerCase().includes(q) ||
        mealTypeName(r.mealTypeId).toLowerCase().includes(q)
      )
    })
  }, [store.allRecipes, query, suggestedOnly, excludeId])

  return (
    <Modal title={title || 'Choose a recipe'} onClose={onClose}>
      {slotLabel && <p className="picker-slot-label">Slot: <strong>{slotLabel}</strong></p>}
      <div className="picker-controls">
        <input
          type="search"
          className="input"
          placeholder="Search recipes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <label className="checkbox-inline">
          <input type="checkbox" checked={suggestedOnly} onChange={(e) => setSuggestedOnly(e.target.checked)} />
          Suggestions only
        </label>
      </div>
      <ul className="picker-list">
        {results.map((r) => (
          <li key={r.id}>
            <button type="button" className="picker-item" onClick={() => onSelect(r.id)}>
              <Thumb src={r.coverImageUrl} alt="" className="picker-thumb" />
              <span className="picker-info">
                <span className="picker-title">{r.title}</span>
                <span className="picker-meta">
                  {[cuisineName(r.cuisineId), mealTypeName(r.mealTypeId), r.totalMinutes ? `${r.totalMinutes} min` : '']
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            </button>
          </li>
        ))}
        {results.length === 0 && (
          <li className="picker-empty">
            No recipes match{suggestedOnly ? ' (try turning off “Suggestions only”)' : ''}.
          </li>
        )}
      </ul>
    </Modal>
  )
}
