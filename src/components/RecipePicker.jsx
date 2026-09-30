import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { cuisineName, mealTypeName } from '../data/seed';
import { formatMinutes } from '../lib/units';
import { formatFullDate } from '../lib/dates';
import Thumb from './Thumb';

export default function RecipePicker({ dateISO, slot, onSelect, onClose }) {
  const { recipes } = useStore();
  const [query, setQuery] = useState('');
  const [onlySuggested, setOnlySuggested] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = recipes.filter((r) => {
      if (onlySuggested && !r.includeInMealSuggestions) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        cuisineName(r.cuisineId).toLowerCase().includes(q) ||
        mealTypeName(r.mealTypeId).toLowerCase().includes(q)
      );
    });
    const rank = (r) => {
      let score = 0;
      if (r.includeInMealSuggestions) score += 2;
      if (mealTypeName(r.mealTypeId) === slot) score += 1;
      return -score;
    };
    return [...list].sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
  }, [recipes, query, onlySuggested, slot]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Choose a recipe for ${slot}`}>
        <div className="modal-head">
          <div>
            <h2>Choose a recipe</h2>
            <p className="subtitle">
              {slot} · {formatFullDate(dateISO)}
            </p>
          </div>
          <button type="button" className="btn tiny" onClick={onClose} aria-label="Close recipe picker">✕</button>
        </div>
        <div className="modal-controls">
          <input
            type="search"
            value={query}
            placeholder="Search recipes…"
            aria-label="Search recipes"
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <label className="checkline inline">
            <input
              type="checkbox"
              checked={onlySuggested}
              onChange={(e) => setOnlySuggested(e.target.checked)}
            />
            Suggestions only
          </label>
        </div>
        <ul className="picker-list">
          {filtered.map((r) => (
            <li key={r.id}>
              <button type="button" className="picker-row" onClick={() => onSelect(r.id)}>
                <Thumb className="picker-thumb" src={r.coverImageUrl} alt="" />
                <span className="picker-info">
                  <span className="picker-title">
                    {r.title}
                    {r.includeInMealSuggestions && <span className="tag tag-suggest">Suggested</span>}
                  </span>
                  <span className="picker-meta">
                    {[cuisineName(r.cuisineId), formatMinutes(r.totalMinutes), `${r.servings} servings`]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="picker-empty">No recipes match your search.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
