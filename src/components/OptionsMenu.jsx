import React, { useEffect, useRef, useState } from 'react';

const TOGGLES = [
  { key: 'includeInShoppingList', label: 'Include ingredients in shopping lists' },
  { key: 'showNutrition', label: 'Show nutrition information' },
  { key: 'allowSubstitutions', label: 'Allow ingredient substitutions' },
];

// Compact "Recipe options" menu with independently toggleable settings and a
// mutually exclusive US customary / metric choice. Selected states are shown
// with checkmarks and an active segment.
export default function OptionsMenu({ options, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const enabledCount = TOGGLES.filter((t) => options[t.key]).length;
  const isMetric = options.unitSystem === 'metric';

  const toggle = (key) => onChange({ ...options, [key]: !options[key] });
  const setUnitSystem = (unitSystem) => onChange({ ...options, unitSystem });

  return (
    <div className="options-menu" ref={rootRef}>
      <button
        type="button"
        className="btn ghost options-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        Recipe options
        {enabledCount > 0 && <span className="pill-count">{enabledCount}</span>}
        <span className={`caret ${open ? 'up' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="options-pop" role="group" aria-label="Recipe options">
          {TOGGLES.map((t) => (
            <label key={t.key} className={`opt-row ${options[t.key] ? 'on' : ''}`}>
              <input
                type="checkbox"
                checked={!!options[t.key]}
                onChange={() => toggle(t.key)}
              />
              <span className="opt-check" aria-hidden="true">✓</span>
              <span className="opt-text">{t.label}</span>
            </label>
          ))}
          <div className="opt-divider" />
          <div className="opt-caption" id="unit-system-label">Measurements</div>
          <div className="segmented" role="radiogroup" aria-labelledby="unit-system-label">
            <button
              type="button"
              role="radio"
              aria-checked={!isMetric}
              className={`seg ${!isMetric ? 'active' : ''}`}
              onClick={() => setUnitSystem('us')}
            >
              {!isMetric && <span aria-hidden="true">✓ </span>}US customary
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={isMetric}
              className={`seg ${isMetric ? 'active' : ''}`}
              onClick={() => setUnitSystem('metric')}
            >
              {isMetric && <span aria-hidden="true">✓ </span>}Metric
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
