import React, { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { PLAN_SLOT_NAMES } from '../seedData.js'
import { weekDaysISO, todayISO, fmtWeekdayShort, fmtDateShort } from '../dates.js'
import RecipePicker from './RecipePicker.jsx'
import { Modal, Thumb, WeekNav } from './ui.jsx'

const SLOT_ICONS = { Breakfast: '🌅', Lunch: '🥗', Dinner: '🍲', Snack: '🍎' }

export default function Planner({ weekStart, setWeekStart, onOpenRecipe, showToast }) {
  const store = useStore()
  const [picker, setPicker] = useState(null) // { date, slot }
  const [slotDialog, setSlotDialog] = useState(null) // { date, slot, assignment }

  const days = useMemo(() => weekDaysISO(weekStart), [weekStart])
  const today = todayISO()

  const plannedCount = useMemo(() => {
    let n = 0
    for (const d of days) {
      const day = store.plan[d]
      if (!day) continue
      for (const slot of PLAN_SLOT_NAMES) if (day[slot]?.recipeId) n++
    }
    return n
  }, [days, store.plan])

  function handlePick(recipeId) {
    const { date, slot, replacing } = picker
    store.assignMeal(date, slot, recipeId, replacing ? (store.plan[date]?.[slot]?.servingTime || '') : '')
    const recipe = store.getRecipe(recipeId)
    setPicker(null)
    setSlotDialog(null)
    showToast(replacing ? `Replaced ${slot} on ${fmtDateShort(date)} with “${recipe?.title}”` : `Planned “${recipe?.title}” for ${slot} on ${fmtDateShort(date)}`)
  }

  function handleRemove(date, slot) {
    store.removeMeal(date, slot)
    setSlotDialog(null)
    showToast(`Removed ${slot} on ${fmtDateShort(date)}`)
  }

  return (
    <section className="planner">
      <div className="planner-head">
        <div>
          <h2>Weekly meal planner</h2>
          <p className="subtitle">
            {plannedCount === 0 ? 'No meals planned this week yet.' : `${plannedCount} meal${plannedCount === 1 ? '' : 's'} planned this week.`}
          </p>
        </div>
      </div>
      <WeekNav weekStart={weekStart} setWeekStart={setWeekStart} />

      <div className="planner-scroll">
        <div className="planner-grid" role="grid" aria-label="Weekly meal plan">
          <div className="pg-corner" role="columnheader" />
          {days.map((d) => (
            <div key={d} className={`pg-dayhead${d === today ? ' today' : ''}`} role="columnheader">
              <span className="pg-weekday">{fmtWeekdayShort(d)}</span>
              <span className="pg-date">{fmtDateShort(d)}</span>
            </div>
          ))}

          {PLAN_SLOT_NAMES.map((slot) => (
            <React.Fragment key={slot}>
              <div className="pg-slothead" role="rowheader">
                <span aria-hidden="true">{SLOT_ICONS[slot] || '🍴'}</span> {slot}
              </div>
              {days.map((d) => {
                const assignment = store.plan[d]?.[slot]
                const recipe = assignment ? store.getRecipe(assignment.recipeId) : null
                return (
                  <div key={`${d}-${slot}`} className={`pg-cell${d === today ? ' today' : ''}`} role="gridcell">
                    {recipe ? (
                      <button type="button" className="plan-card" style={{ '--accent': recipe.accentColor || '#D97757' }}
                        onClick={() => setSlotDialog({ date: d, slot, assignment })}
                        aria-label={`${slot} ${fmtDateShort(d)}: ${recipe.title}. Open options.`}>
                        <Thumb src={recipe.coverImageUrl} alt="" className="plan-card-img" />
                        <span className="plan-card-title">{recipe.title}</span>
                        {assignment.servingTime && <span className="plan-card-time">🕒 {assignment.servingTime}</span>}
                      </button>
                    ) : (
                      <button type="button" className="plan-empty" onClick={() => setPicker({ date: d, slot })}
                        aria-label={`Add a recipe to ${slot} on ${fmtDateShort(d)}`}>
                        <span aria-hidden="true">＋</span>
                      </button>
                    )}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {picker && (
        <RecipePicker
          title={picker.replacing ? 'Replace with…' : 'Add a recipe'}
          slotLabel={`${picker.slot} · ${fmtWeekdayShort(picker.date)} ${fmtDateShort(picker.date)}`}
          excludeId={picker.replacing ? picker.assignment?.recipeId : undefined}
          onSelect={handlePick}
          onClose={() => {
            if (picker.replacing && slotDialog) setPicker(null)
            else { setPicker(null); setSlotDialog(null) }
          }}
        />
      )}

      {slotDialog && !picker && (
        <SlotDialog
          date={slotDialog.date}
          slot={slotDialog.slot}
          assignment={slotDialog.assignment}
          onClose={() => setSlotDialog(null)}
          onViewRecipe={() => { onOpenRecipe(slotDialog.assignment.recipeId) }}
          onReplace={() => setPicker({ ...slotDialog, replacing: true })}
          onRemove={() => handleRemove(slotDialog.date, slotDialog.slot)}
          onTimeChange={(t) => {
            store.updateServingTime(slotDialog.date, slotDialog.slot, t)
            setSlotDialog({ ...slotDialog, assignment: { ...slotDialog.assignment, servingTime: t } })
          }}
        />
      )}
    </section>
  )
}

function SlotDialog({ date, slot, assignment, onClose, onViewRecipe, onReplace, onRemove, onTimeChange }) {
  const store = useStore()
  const recipe = store.getRecipe(assignment.recipeId)
  if (!recipe) return null
  return (
    <Modal title={`${slot} · ${fmtWeekdayShort(date)} ${fmtDateShort(date)}`} onClose={onClose}>
      <div className="slot-dialog">
        <div className="slot-recipe">
          <Thumb src={recipe.coverImageUrl} alt="" className="slot-thumb" />
          <div>
            <p className="slot-title">{recipe.title}</p>
            <p className="hint">{recipe.totalMinutes || recipe.prepMinutes + recipe.cookMinutes} min · serves {recipe.servings}</p>
          </div>
        </div>
        <label className="field">
          <span>Serving time</span>
          <input type="time" className="input" value={assignment.servingTime || ''}
            onChange={(e) => onTimeChange(e.target.value)} />
        </label>
        <div className="slot-actions">
          <button type="button" className="btn ghost" onClick={onViewRecipe}>View recipe</button>
          <button type="button" className="btn ghost" onClick={onReplace}>Replace…</button>
          <button type="button" className="btn danger" onClick={onRemove}>Remove</button>
        </div>
      </div>
    </Modal>
  )
}
