import React, { useMemo, useState } from 'react'
import Thumbnail from '../components/Thumbnail.jsx'
import RecipePicker from '../components/RecipePicker.jsx'
import { useStore } from '../store.jsx'
import { MEAL_SLOTS, slotLabel } from '../lib/data.js'
import {
  dayShortName,
  fmtShort,
  formatTime12,
  shiftWeek,
  startOfWeekKey,
  todayKey,
  weekDays,
  weekLabel,
} from '../lib/dates.js'

export default function Planner({ onOpenRecipe, onBrowseRecipes }) {
  const {
    assignments,
    assignmentAt,
    assignRecipe,
    removeAssignment,
    getRecipe,
    currentWeekKey,
    setCurrentWeekKey,
  } = useStore()

  const [picker, setPicker] = useState(null) // { date, slot }
  const days = useMemo(() => weekDays(currentWeekKey), [currentWeekKey])
  const today = todayKey()

  const weekAssignments = useMemo(() => {
    const keys = new Set(days.map((d) => d.key))
    return assignments.filter((a) => keys.has(a.date))
  }, [assignments, days])

  const openPicker = (date, slot, existing = null) => {
    setPicker({ date, slot, replacing: existing })
  }

  return (
    <section className="view planner-view">
      <div className="view-head">
        <div>
          <h2>Weekly meal planner</h2>
          <p className="muted">
            {weekAssignments.length === 0
              ? 'No meals planned this week — select a slot to add a recipe.'
              : `${weekAssignments.length} meal${weekAssignments.length === 1 ? '' : 's'} planned this week.`}
          </p>
        </div>
        <div className="week-nav">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setCurrentWeekKey(shiftWeek(currentWeekKey, -1))}
            aria-label="Previous week"
          >
            ←
          </button>
          <div className="week-label">
            <strong>Week of {fmtShort(currentWeekKey)}</strong>
            <span className="muted small">{weekLabel(currentWeekKey)}</span>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setCurrentWeekKey(shiftWeek(currentWeekKey, 1))}
            aria-label="Next week"
          >
            →
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setCurrentWeekKey(startOfWeekKey(todayKey()))}
          >
            Today
          </button>
        </div>
      </div>

      <div className="planner-scroll">
        <div className="planner-grid" role="grid" aria-label={`Meal plan for ${weekLabel(currentWeekKey)}`}>
          <div className="planner-corner" role="columnheader" />
          {days.map((d) => (
            <div key={d.key} className={`planner-dayhead ${d.key === today ? 'today' : ''}`} role="columnheader">
              <span className="day-name">{dayShortName(d.key)}</span>
              <span className="day-date">{fmtShort(d.key)}</span>
            </div>
          ))}

          {MEAL_SLOTS.map((slot) => (
            <React.Fragment key={slot}>
              <div className="planner-slothead" role="rowheader">
                {slotLabel(slot)}
              </div>
              {days.map((d) => {
                const asg = assignmentAt(d.key, slot)
                const recipe = asg ? getRecipe(asg.recipeId) : null
                return (
                  <div
                    key={`${d.key}-${slot}`}
                    className={`planner-cell ${d.key === today ? 'today' : ''} ${asg && !recipe ? 'missing' : ''}`}
                    role="gridcell"
                  >
                    {recipe ? (
                      <div className="plan-card" style={{ '--accent': recipe.accentColor }}>
                        <button
                          type="button"
                          className="plan-card-main"
                          onClick={() => onOpenRecipe(recipe.id)}
                          title={`Open ${recipe.title}`}
                        >
                          <Thumbnail src={recipe.coverImageUrl} alt="" className="plan-thumb" />
                          <span className="plan-title">{recipe.title}</span>
                          {asg.at && (
                            <span className="plan-time">🕒 {formatTime12(asg.at.split('T')[1])}</span>
                          )}
                        </button>
                        <div className="plan-card-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            title="Replace recipe"
                            onClick={() => openPicker(d.key, slot, asg)}
                          >
                            ⇄
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger-text"
                            title="Remove from plan"
                            onClick={() => removeAssignment(asg.id)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="plan-empty"
                        onClick={() => openPicker(d.key, slot)}
                        aria-label={`Add a recipe to ${dayShortName(d.key)} ${slotLabel(slot)}`}
                      >
                        ＋
                      </button>
                    )}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <p className="muted small planner-hint">
        Tip: click an empty slot to browse recipes (suggestions first), or ⇄ / ✕ on a planned
        card to replace or remove it. The plan is saved in your browser and feeds the shopping
        list. <button type="button" className="link-btn" onClick={onBrowseRecipes}>Browse the recipe catalog</button>.
      </p>

      {picker && (
        <RecipePicker
          date={picker.date}
          slot={picker.slot}
          onPick={(recipe) => {
            const prev = picker.replacing
            assignRecipe({
              date: picker.date,
              slot: picker.slot,
              recipeId: recipe.id,
              at: prev?.at || '',
              servings: prev?.servings || null,
            })
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </section>
  )
}
