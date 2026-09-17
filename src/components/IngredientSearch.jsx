import React, { useEffect, useMemo, useRef, useState } from 'react'
import { INGREDIENTS } from '../lib/data.js'

// Searchable ingredient selection backed by the supplied ingredients.csv data.
export default function IngredientSearch({ value, onSelect, placeholder = 'Search ingredients…' }) {
  // value: { ingredientId, ingredientName }
  const [query, setQuery] = useState(value?.ingredientName || '')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    setQuery(value?.ingredientName || '')
  }, [value?.ingredientName])

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return INGREDIENTS
    return INGREDIENTS.filter((i) => i.name.toLowerCase().includes(q))
  }, [query])

  const pick = (ing) => {
    onSelect({ ingredientId: ing.id, ingredientName: ing.name })
    setQuery(ing.name)
    setOpen(false)
  }

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (matches[highlight]) pick(matches[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="ingredient-search" ref={ref}>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setHighlight(0)
          if (!e.target.value) onSelect({ ingredientId: null, ingredientName: '' })
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-controls="ingredient-listbox"
        aria-autocomplete="list"
      />
      {open && (
        <ul className="ingredient-dropdown" id="ingredient-listbox" role="listbox">
          {matches.length === 0 && <li className="ingredient-empty">No matching ingredients</li>}
          {matches.map((ing, idx) => (
            <li
              key={ing.id}
              role="option"
              aria-selected={idx === highlight}
              className={`ingredient-option ${idx === highlight ? 'highlighted' : ''} ${
                ing.id === value?.ingredientId ? 'selected' : ''
              }`}
              onMouseEnter={() => setHighlight(idx)}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(ing)
              }}
            >
              <span>{ing.name}</span>
              <span className="ingredient-cat">{ing.shoppingCategory}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
