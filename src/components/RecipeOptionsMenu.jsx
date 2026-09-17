import React, { useEffect, useRef, useState } from 'react'

// Compact "Recipe options" popover menu.
//  - Independently toggleable settings (checkbox-style rows)
//  - Mutually exclusive measurement system (radio-style segment)
// Selected states are visually indicated (checkmarks, filled radios, accent).
export default function RecipeOptionsMenu({
  options,
  includeInSuggestions,
  onChangeOptions, // (patch) => void  — partial options object
  onChangeSuggestions, // (bool) => void | undefined to hide the row
  align = 'right',
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onEsc = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  const toggles = [
    {
      key: 'includeInShoppingList',
      label: 'Include ingredients in shopping lists',
      hint: 'Added to the generated list when this recipe is planned',
    },
    { key: 'showNutrition', label: 'Show nutrition information', hint: 'Display estimated macros on the recipe' },
    { key: 'allowSubstitutions', label: 'Allow ingredient substitutions', hint: 'Suggest swaps next to ingredients' },
  ]

  return (
    <div className="options-menu" ref={ref}>
      <button
        type="button"
        className={`btn btn-ghost options-menu-trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span aria-hidden="true">⚙︎</span> Recipe options
        <span className="caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className={`options-popover popover-${align}`} role="menu">
          <div className="options-section-label">Settings</div>
          {typeof includeInSuggestions === 'boolean' && onChangeSuggestions && (
            <label className="option-row" role="menuitemcheckbox" aria-checked={includeInSuggestions}>
              <span className={`option-check ${includeInSuggestions ? 'checked' : ''}`} aria-hidden="true">
                {includeInSuggestions ? '✓' : ''}
              </span>
              <input
                type="checkbox"
                className="sr-only"
                checked={includeInSuggestions}
                onChange={(e) => onChangeSuggestions(e.target.checked)}
              />
              <span className="option-text">
                Available in meal-plan suggestions
                <span className="option-hint">Shown first when filling planner slots</span>
              </span>
            </label>
          )}
          {toggles.map((t) => {
            const checked = Boolean(options?.[t.key])
            return (
              <label key={t.key} className="option-row" role="menuitemcheckbox" aria-checked={checked}>
                <span className={`option-check ${checked ? 'checked' : ''}`} aria-hidden="true">
                  {checked ? '✓' : ''}
                </span>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={(e) => onChangeOptions({ [t.key]: e.target.checked })}
                />
                <span className="option-text">
                  {t.label}
                  <span className="option-hint">{t.hint}</span>
                </span>
              </label>
            )
          })}
          <div className="options-section-label">Measurements</div>
          <div className="unit-segment" role="radiogroup" aria-label="Measurement system">
            {[
              { value: 'us', label: 'US customary' },
              { value: 'metric', label: 'Metric' },
            ].map((opt) => {
              const selected = (options?.unitSystem || 'us') === opt.value
              return (
                <label
                  key={opt.value}
                  className={`unit-option ${selected ? 'selected' : ''}`}
                  role="radio"
                  aria-checked={selected}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name="unit-system"
                    value={opt.value}
                    checked={selected}
                    onChange={() => onChangeOptions({ unitSystem: opt.value })}
                  />
                  <span className={`unit-radio ${selected ? 'checked' : ''}`} aria-hidden="true" />
                  {opt.label}
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
