import { useState } from 'react'
import RecipePickerModal from './RecipePickerModal.jsx'
import RecipeImage from './RecipeImage.jsx'
import { useStore } from '../store.jsx'
import { PLANNER_SLOTS } from '../lib/data.js'
import {
  weekDaysISO,
  weekRangeLabel,
  dayLabel,
  dayNumberLabel,
  isToday,
} from '../lib/dates.js'

// The weekly meal planner: seven days × four slots (Breakfast, Lunch, Dinner,
// Snack). Empty slots can be filled; filled slots can be replaced or removed.
export default function Planner({ onOpenRecipe, onGoShopping }) {
  const {
    currentWeekStart,
    navigateWeek,
    goToToday,
    getSlot,
    getRecipe,
    assignRecipe,
    unassignSlot,
  } = useStore()

  const [picker, setPicker] = useState(null) // {date, slot}
  const days = weekDaysISO(currentWeekStart)
  const activeSlot = picker
    ? PLANNER_SLOTS.find((s) => s.slot === picker.slot)
    : null

  function handlePick(recipeId) {
    if (!picker) return
    assignRecipe(picker.date, picker.slot, recipeId)
    setPicker(null)
  }

  return (
    <section className="planner" aria-labelledby="planner-heading">
      <div className="planner-head">
        <div>
          <h1 id="planner-heading" className="page-title">
            Weekly meal planner
          </h1>
          <p className="page-subtitle">Week of {weekRangeLabel(currentWeekStart)}</p>
        </div>
        <div className="planner-nav">
          <button
            type="button"
            className="btn btn-ghost"
            aria-label="Previous week"
            onClick={() => navigateWeek(-1)}
          >
            <span aria-hidden="true">←</span>
          </button>
          <button type="button" className="btn btn-outline" onClick={goToToday}>
            Today
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            aria-label="Next week"
            onClick={() => navigateWeek(1)}
          >
            <span aria-hidden="true">→</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={onGoShopping}>
            <span aria-hidden="true">🛒</span> Shopping list
          </button>
        </div>
      </div>

      <div className="planner-grid">
        {days.map((date) => {
          const today = isToday(date)
          const headingId = `planner-day-${date}`
          return (
            <section
              className={`planner-day${today ? ' is-today' : ''}`}
              key={date}
              aria-labelledby={headingId}
            >
              <h2 className="planner-day-head" id={headingId}>
                <span className="planner-dow">{dayLabel(date)}</span>
                <span className="planner-date">{dayNumberLabel(date)}</span>
                {today && <span className="planner-today-badge">Today</span>}
              </h2>
              <ul className="planner-slots">
                {PLANNER_SLOTS.map((s) => {
                  const recipeId = getSlot(date, s.slot)
                  const recipe = recipeId ? getRecipe(recipeId) : null
                  return (
                    <li className="planner-slot" key={s.slot}>
                      <span className="planner-slot-label">
                        <span aria-hidden="true">{s.icon}</span> {s.slot}
                      </span>
                      {recipe ? (
                        <div
                          className="slot-filled"
                          style={{ '--accent': recipe.accentColor }}
                        >
                          <button
                            type="button"
                            className="slot-recipe"
                            onClick={() => onOpenRecipe(recipe.id)}
                            aria-label={`Open recipe ${recipe.title}, planned for ${s.slot} on ${dayLabel(date)}`}
                          >
                            <RecipeImage
                              src={recipe.coverImageUrl}
                              alt=""
                              className="slot-thumb"
                              accentColor={recipe.accentColor}
                            />
                            <span className="slot-title">{recipe.title}</span>
                          </button>
                          <div className="slot-actions">
                            <button
                              type="button"
                              className="icon-btn"
                              aria-label={`Replace ${recipe.title} in ${s.slot} on ${dayLabel(date)} ${dayNumberLabel(date)}`}
                              title="Replace"
                              onClick={() => setPicker({ date, slot: s.slot })}
                            >
                              <span aria-hidden="true">⇄</span>
                            </button>
                            <button
                              type="button"
                              className="icon-btn danger"
                              aria-label={`Remove ${recipe.title} from ${s.slot} on ${dayLabel(date)} ${dayNumberLabel(date)}`}
                              title="Remove"
                              onClick={() => unassignSlot(date, s.slot)}
                            >
                              <span aria-hidden="true">✕</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="slot-empty"
                          onClick={() => setPicker({ date, slot: s.slot })}
                          aria-label={`Add a recipe to ${s.slot} on ${dayLabel(date)} ${dayNumberLabel(date)}`}
                        >
                          <span aria-hidden="true">＋</span> Add
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      {picker && (
        <RecipePickerModal
          slot={activeSlot}
          onClose={() => setPicker(null)}
          onSelect={handlePick}
        />
      )}
    </section>
  )
}
