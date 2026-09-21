import { useEffect, useMemo, useRef, useState } from 'react'
import RecipeImage from './RecipeImage.jsx'
import { useStore } from '../store.jsx'
import { mealTypeById, lookupName } from '../lib/data.js'

// Modal used by the planner to pick a recipe for a slot. Suggested recipes
// (includeInSuggestions) are listed first; the list is searchable.
export default function RecipePickerModal({ slot, onClose, onSelect }) {
  const { recipes } = useStore()
  const [query, setQuery] = useState('')
  const closeRef = useRef(null)
  const dialogRef = useRef(null)
  const previouslyFocused = useRef(null)

  useEffect(() => {
    previouslyFocused.current = document.activeElement
    closeRef.current?.focus()

    const FOCUSABLE =
      'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

    function onKey(e) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const nodes = Array.from(dialogRef.current.querySelectorAll(FOCUSABLE)).filter(
          (el) => el.offsetParent !== null || el === document.activeElement,
        )
        if (nodes.length === 0) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocused.current?.focus?.()
    }
  }, [onClose])

  const slotMealTypeId = slot?.mealTypeId

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = recipes.filter(
      (r) => !q || r.title.toLowerCase().includes(q),
    )
    return filtered.sort((a, b) => {
      // Meal-type match first, then suggested, then title.
      const aMatch = slotMealTypeId && a.mealTypeId === slotMealTypeId ? 0 : 1
      const bMatch = slotMealTypeId && b.mealTypeId === slotMealTypeId ? 0 : 1
      if (aMatch !== bMatch) return aMatch - bMatch
      const aSug = a.includeInSuggestions ? 0 : 1
      const bSug = b.includeInSuggestions ? 0 : 1
      if (aSug !== bSug) return aSug - bSug
      return a.title.localeCompare(b.title)
    })
  }, [recipes, query, slotMealTypeId])

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
        ref={dialogRef}
      >
        <div className="modal-head">
          <h2 id="picker-title">
            Choose a recipe{slot ? ` · ${slot.slot}` : ''}
          </h2>
          <button
            type="button"
            ref={closeRef}
            className="icon-btn"
            aria-label="Close recipe picker"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="modal-search">
          <label className="visually-hidden" htmlFor="picker-search">
            Search recipes
          </label>
          <input
            id="picker-search"
            type="search"
            placeholder="Search recipes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <ul className="picker-list">
          {list.length === 0 && (
            <li className="picker-empty">No recipes found.</li>
          )}
          {list.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="picker-item"
                onClick={() => onSelect(r.id)}
              >
                <RecipeImage
                  src={r.coverImageUrl}
                  alt=""
                  className="picker-thumb"
                  accentColor={r.accentColor}
                />
                <span className="picker-info">
                  <span className="picker-name">{r.title}</span>
                  <span className="picker-meta">
                    {r.mealTypeId && lookupName(mealTypeById, r.mealTypeId)} ·{' '}
                    {r.totalMinutes} min
                    {r.includeInSuggestions && (
                      <span className="picker-suggested"> · Suggested</span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
