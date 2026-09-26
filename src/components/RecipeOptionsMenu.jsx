import React, { useEffect, useRef, useState } from 'react'
import { RECIPE_OPTION_DEFS } from '../seedData.js'
import { Switch, SegmentedControl } from './ui.jsx'

// Compact "Recipe options" dropdown menu with independently toggleable options
// plus a mutually exclusive US customary / Metric measurement choice.
export default function RecipeOptionsMenu({ options, onChange, label = 'Recipe options' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const activeCount =
    RECIPE_OPTION_DEFS.filter((d) => options[d.key]).length + (options.unitSystem === 'metric' ? 1 : 0)

  function set(key, value) {
    onChange({ ...options, [key]: value })
  }

  return (
    <div className="options-menu" ref={ref}>
      <button type="button" className={`btn ghost options-menu-btn${open ? ' open' : ''}`}
        aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true">⚙</span> {label}
        {activeCount > 0 && <span className="options-badge">{activeCount}</span>}
      </button>
      {open && (
        <div className="options-panel" role="menu" aria-label={label}>
          <p className="options-hint">Settings apply to this recipe.</p>
          {RECIPE_OPTION_DEFS.map((def) => (
            <Switch key={def.key} checked={!!options[def.key]} onChange={(v) => set(def.key, v)} label={def.label} />
          ))}
          <div className="options-units">
            <span className="options-units-label" id="units-label">Measurements</span>
            <SegmentedControl
              ariaLabel="Measurement system"
              value={options.unitSystem || 'us'}
              onChange={(v) => set('unitSystem', v)}
              options={[
                { value: 'us', label: 'US customary' },
                { value: 'metric', label: 'Metric' },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  )
}
