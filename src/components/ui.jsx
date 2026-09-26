import React, { useEffect, useRef, useState } from 'react'
import { PLACEHOLDER_IMAGE } from '../seedData.js'
import { addWeeksISO, fmtWeekRange, todayISO, startOfWeekISO } from '../dates.js'

let uidCounter = 0
export function uid(prefix = 'x') {
  uidCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${uidCounter}`
}

// Image that falls back to the approved placeholder when no (or a broken) URL.
export function Thumb({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => { setFailed(false) }, [src])
  const url = src && !failed ? src : PLACEHOLDER_IMAGE
  return <img className={`thumb ${className}`.trim()} src={url} alt={alt || ''} loading="lazy" onError={() => setFailed(true)} />
}

// Searchable single-value select that also accepts custom free-text entries.
export function Combobox({ value, onChange, options, placeholder = '', className = '' }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const q = query.trim().toLowerCase()
  const filtered = q ? options.filter((o) => o.toLowerCase().includes(q)) : options
  const exact = options.some((o) => o.toLowerCase() === q)

  function pick(v) {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className={`combobox ${className}`.trim()} ref={ref}>
      <input
        type="text"
        className="combobox-input"
        value={open ? query : (value || '')}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setQuery(value || '') }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); if (e.target.value === '') onChange('') }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (q && !exact) pick(query.trim())
            else if (filtered[0]) pick(filtered[0])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        aria-expanded={open}
        role="combobox"
        aria-autocomplete="list"
      />
      {open && (
        <ul className="combobox-menu" role="listbox">
          {filtered.slice(0, 60).map((o) => (
            <li key={o} className="combobox-option" role="option" aria-selected={o === value}
              onMouseDown={(e) => { e.preventDefault(); pick(o) }}>
              {o === value && <span className="combobox-check" aria-hidden="true">✓ </span>}{o}
            </li>
          ))}
          {q && !exact && (
            <li className="combobox-option combobox-custom" onMouseDown={(e) => { e.preventDefault(); pick(query.trim()) }}>
              Use “{query.trim()}”
            </li>
          )}
          {!q && filtered.length === 0 && <li className="combobox-empty">No options</li>}
        </ul>
      )}
    </div>
  )
}

// Accessible on/off switch row.
export function Switch({ checked, onChange, label, description }) {
  return (
    <label className={`switch-row${checked ? ' on' : ''}`}>
      <span className="switch-text">
        <span className="switch-label">{label}</span>
        {description && <span className="switch-desc">{description}</span>}
      </span>
      <button type="button" role="switch" aria-checked={!!checked} className={`switch${checked ? ' on' : ''}`}
        onClick={(e) => { e.preventDefault(); onChange(!checked) }}>
        <span className="switch-knob" />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </label>
  )
}

// Mutually exclusive segmented control (used for US customary vs Metric).
export function SegmentedControl({ options, value, onChange, ariaLabel }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value}
          className={`segment${value === o.value ? ' active' : ''}`}
          onClick={() => onChange(o.value)}>
          {value === o.value && <span aria-hidden="true" className="segment-check">✓</span>} {o.label}
        </button>
      ))}
    </div>
  )
}

// Toggle chip (multi-select), used for dietary tags / categories.
export function Chip({ active, onClick, children, title }) {
  return (
    <button type="button" className={`chip${active ? ' active' : ''}`} onClick={onClick}
      aria-pressed={!!active} title={title || ''}>
      {active && <span aria-hidden="true" className="chip-check">✓</span>}{children}
    </button>
  )
}

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

// Shared week navigation used by the planner and the shopping list.
export function WeekNav({ weekStart, setWeekStart, right }) {
  return (
    <div className="week-nav">
      <div className="week-nav-controls">
        <button type="button" className="btn ghost" onClick={() => setWeekStart(addWeeksISO(weekStart, -1))} aria-label="Previous week">‹</button>
        <button type="button" className="btn ghost" onClick={() => setWeekStart(startOfWeekISO(todayISO()))}>This week</button>
        <button type="button" className="btn ghost" onClick={() => setWeekStart(addWeeksISO(weekStart, 1))} aria-label="Next week">›</button>
        <span className="week-range">{fmtWeekRange(weekStart)}</span>
      </div>
      {right}
    </div>
  )
}

export function SpiceIndicator({ level, max = 5 }) {
  const n = Math.max(0, Math.min(max, Number(level) || 0))
  return (
    <span className="spice" title={`Spice level ${n}/${max}`} aria-label={`Spice level ${n} of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`spice-dot${i < n ? ' on' : ''}`} aria-hidden="true" />
      ))}
    </span>
  )
}
