import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { PLANNER_SLOTS } from '../data/seed';
import {
  currentWeekISO,
  formatDayHeader,
  formatWeekLabel,
  shiftWeek,
  todayISO,
  weekDatesISO,
} from '../lib/dates';
import Thumb from './Thumb';
import RecipePicker from './RecipePicker';

export default function Planner() {
  const {
    mealPlan,
    getRecipe,
    removeAssignment,
    assignRecipe,
    weekStartISO,
    setWeekStartISO,
  } = useStore();
  const [picker, setPicker] = useState(null); // { dateISO, slot }
  const dates = useMemo(() => weekDatesISO(weekStartISO), [weekStartISO]);
  const today = todayISO();

  const plannedCount = dates.reduce((n, d) => n + Object.keys(mealPlan[d] || {}).length, 0);

  const handleSelect = (recipeId) => {
    if (picker) {
      assignRecipe(picker.dateISO, picker.slot, recipeId);
      setPicker(null);
    }
  };

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <h1>Meal planner</h1>
          <p className="subtitle">
            {plannedCount > 0
              ? `${plannedCount} meal${plannedCount === 1 ? '' : 's'} planned this week`
              : 'Nothing planned yet this week — pick a slot to get started'}
          </p>
        </div>
        <div className="week-nav">
          <button
            type="button"
            className="btn"
            onClick={() => setWeekStartISO(shiftWeek(weekStartISO, -1))}
            aria-label="Previous week"
          >‹</button>
          <button
            type="button"
            className="btn"
            onClick={() => setWeekStartISO(currentWeekISO())}
            aria-label="Go to current week"
          >Today</button>
          <button
            type="button"
            className="btn"
            onClick={() => setWeekStartISO(shiftWeek(weekStartISO, 1))}
            aria-label="Next week"
          >›</button>
          <span className="week-label">{formatWeekLabel(weekStartISO)}</span>
        </div>
      </header>

      <div className="planner-scroll">
        <div className="planner-grid" role="grid" aria-label={`Weekly meal plan for ${formatWeekLabel(weekStartISO)}`}>
          <div className="pg-cell pg-corner" role="columnheader" />
          {dates.map((d) => {
            const head = formatDayHeader(d);
            return (
              <div
                key={d}
                className={`pg-cell pg-day ${d === today ? 'is-today' : ''}`}
                role="columnheader"
              >
                <span className="pg-dow">{head.dow}</span>
                <span className="pg-date">{head.dateLabel}</span>
              </div>
            );
          })}

          {PLANNER_SLOTS.map((slot) => (
            <React.Fragment key={slot}>
              <div className="pg-cell pg-slot-label" role="rowheader">{slot}</div>
              {dates.map((d) => {
                const entry = (mealPlan[d] || {})[slot];
                const recipe = entry ? getRecipe(entry.recipeId) : null;
                return (
                  <div
                    key={`${d}-${slot}`}
                    className={`pg-cell pg-slot ${d === today ? 'is-today' : ''}`}
                    role="gridcell"
                  >
                    {recipe && entry ? (
                      <div className="slot-card" style={{ '--accent': recipe.accentColor || '#d97757' }}>
                        <a
                          className="slot-thumb"
                          href={`#/recipes/${encodeURIComponent(recipe.id)}`}
                          aria-label={`View ${recipe.title}`}
                        >
                          <Thumb src={recipe.coverImageUrl} alt="" />
                        </a>
                        <div className="slot-info">
                          <a href={`#/recipes/${encodeURIComponent(recipe.id)}`}>{recipe.title}</a>
                          {entry.time && <span className="slot-time">{entry.time}</span>}
                        </div>
                        <div className="slot-actions">
                          <button
                            type="button"
                            className="btn tiny"
                            onClick={() => setPicker({ dateISO: d, slot })}
                            aria-label={`Replace ${recipe.title} in ${slot} on ${d}`}
                          >Replace</button>
                          <button
                            type="button"
                            className="btn tiny danger"
                            onClick={() => removeAssignment(d, slot)}
                            aria-label={`Remove ${recipe.title} from ${slot} on ${d}`}
                          >✕</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="slot-empty"
                        onClick={() => setPicker({ dateISO: d, slot })}
                        aria-label={`Add a recipe to ${slot} on ${formatDayHeader(d).dow} ${formatDayHeader(d).dateLabel}`}
                      >
                        <span aria-hidden="true">+</span> Add
                      </button>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {picker && (
        <RecipePicker
          dateISO={picker.dateISO}
          slot={picker.slot}
          onSelect={handleSelect}
          onClose={() => setPicker(null)}
        />
      )}
    </section>
  );
}
