import { useEffect, useId, useRef, useState } from 'react'
import { MEASUREMENT_SYSTEMS } from '../lib/units.js'

const TOGGLE_OPTIONS = [
  { key: 'includeInShoppingList', label: 'Include in shopping lists' },
  { key: 'showNutrition', label: 'Show nutrition info' },
  { key: 'allowSubstitutions', label: 'Allow ingredient substitutions' },
]

// A compact "Recipe Options" popover: three independently toggleable options
// (buttons with aria-pressed) plus a mutually-exclusive US/metric measurement
// choice (a radio group). Selected states are shown with a check mark and
// conveyed to assistive tech via ARIA state.
export default function RecipeOptionsMenu({
  options,
  onToggleOption,
  measurementSystem,
  onMeasurementChange,
  idPrefix = 'opt',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="options-menu" ref={rootRef}>
      <button
        type="button"
        className="options-menu-trigger btn btn-ghost"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true">⚙️</span> Recipe Options
      </button>

      {open && (
        <div className="options-menu-panel" id={panelId} role="group" aria-label="Recipe options">
          <div className="options-menu-group">
            {TOGGLE_OPTIONS.map((opt) => {
              const checked = Boolean(options?.[opt.key])
              return (
                <button
                  type="button"
                  key={opt.key}
                  aria-pressed={checked}
                  className={`options-menu-item${checked ? ' is-on' : ''}`}
                  onClick={() => onToggleOption(opt.key, !checked)}
                >
                  <span className={`check-box${checked ? ' checked' : ''}`} aria-hidden="true">
                    {checked ? '✓' : ''}
                  </span>
                  <span className="options-menu-label">{opt.label}</span>
                </button>
              )
            })}
          </div>

          <div className="options-menu-separator" role="separator" />

          <div className="options-menu-group">
            <span className="options-menu-caption" id={`${idPrefix}-measure-label`}>
              Measurement units
            </span>
            <div
              className="segmented"
              role="radiogroup"
              aria-labelledby={`${idPrefix}-measure-label`}
            >
              {MEASUREMENT_SYSTEMS.map((sys) => {
                const active = measurementSystem === sys.id
                return (
                  <button
                    type="button"
                    key={sys.id}
                    role="radio"
                    aria-checked={active}
                    tabIndex={active ? 0 : -1}
                    className={`segmented-btn${active ? ' is-active' : ''}`}
                    onClick={() => onMeasurementChange(sys.id)}
                  >
                    {sys.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
