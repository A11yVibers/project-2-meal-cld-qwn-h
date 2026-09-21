import { useEffect, useId, useMemo, useRef, useState } from 'react'

// Accessible searchable single-select combobox. `items` are {value, label, hint?}.
// Supports free text (allowCustom) so users can type ingredients not in the CSV.
export default function SearchSelect({
  items,
  value,
  onChange,
  placeholder = 'Search…',
  allowCustom = false,
  ariaLabel,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef(null)
  const listId = useId()

  const selected = useMemo(
    () => items.find((i) => i.value === value) || null,
    [items, value],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => i.label.toLowerCase().includes(q))
  }, [items, query])

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query, open])

  const displayText = open ? query : selected?.label ?? ''

  function choose(item) {
    onChange(item.value)
    setQuery('')
    setOpen(false)
  }

  function chooseCustom(text) {
    onChange(text)
    setQuery('')
    setOpen(false)
  }

  function onKeyDown(e) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      setOpen(true)
      setQuery('')
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1 + (allowCustom && query ? 1 : 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (allowCustom && query.trim() && activeIndex >= filtered.length) {
        chooseCustom(query.trim())
      } else if (filtered[activeIndex]) {
        choose(filtered[activeIndex])
      } else if (allowCustom && query.trim()) {
        chooseCustom(query.trim())
      }
    }
  }

  const showCustomOption = allowCustom && query.trim() && !filtered.some(
    (i) => i.label.toLowerCase() === query.trim().toLowerCase(),
  )

  const activeOptionId = open
    ? showCustomOption && activeIndex === filtered.length
      ? `${listId}-custom`
      : filtered[activeIndex]
        ? `${listId}-opt-${activeIndex}`
        : undefined
    : undefined

  return (
    <div className={`search-select${open ? ' is-open' : ''} ${className}`} ref={rootRef}>
      <input
        type="text"
        className="search-select-input"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        autoComplete="off"
        placeholder={selected ? selected.label : placeholder}
        value={displayText}
        onFocus={() => {
          setOpen(true)
          setQuery('')
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          if (allowCustom && !e.target.value) onChange('')
        }}
        onKeyDown={onKeyDown}
      />
      <span className="search-select-caret" aria-hidden="true">
        ▾
      </span>
      {open && (filtered.length > 0 || showCustomOption) && (
        <ul className="search-select-list" id={listId} role="listbox" aria-label={ariaLabel}>
          {filtered.map((item, idx) => (
            <li
              key={item.value}
              id={`${listId}-opt-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              className={`search-select-option${idx === activeIndex ? ' is-active' : ''}${
                item.value === value ? ' is-selected' : ''
              }`}
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseDown={(e) => {
                e.preventDefault()
                choose(item)
              }}
            >
              <span className="search-select-label">{item.label}</span>
              {item.hint && <span className="search-select-hint">{item.hint}</span>}
            </li>
          ))}
          {showCustomOption && (
            <li
              id={`${listId}-custom`}
              role="option"
              aria-selected={activeIndex === filtered.length}
              className={`search-select-option is-custom${
                activeIndex === filtered.length ? ' is-active' : ''
              }`}
              onMouseEnter={() => setActiveIndex(filtered.length)}
              onMouseDown={(e) => {
                e.preventDefault()
                chooseCustom(query.trim())
              }}
            >
              Use “{query.trim()}”
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
