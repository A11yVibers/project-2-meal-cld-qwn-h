import React, { useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { useStore } from '../store.jsx'
import { MEAL_SLOTS, slotLabel } from '../lib/data.js'
import {
  dayShortName,
  fmtShort,
  fmtMedium,
  startOfWeekKey,
  toKey,
  todayKey,
  weekDays,
  weekOptions,
} from '../lib/dates.js'

// Lets the user place a recipe into a specific meal-plan slot: choose the
// planning week, the cooking date, the serving slot, and (optionally) an
// exact date & time.
export default function AddToPlanModal({ recipe, defaultDate = null, onDone, onClose }) {
  const { assignRecipe, setCurrentWeekKey, assignmentAt } = useStore()
  const thisWeek = startOfWeekKey(todayKey())
  const [weekKey, setWeekKey] = useState(
    defaultDate ? startOfWeekKey(defaultDate) : thisWeek,
  )
  const [date, setDate] = useState(defaultDate || todayKey())
  const [slot, setSlot] = useState('dinner')
  const [specificTime, setSpecificTime] = useState('')

  const weeks = useMemo(() => weekOptions(2, 12), [])
  const days = useMemo(() => weekDays(weekKey), [weekKey])
  const existing = assignmentAt(date, slot)

  const onWeekChange = (key) => {
    setWeekKey(key)
    // Keep the same weekday when switching weeks.
    const prevStart = startOfWeekKey(date)
    const offsetDays = Math.round(
      (new Date(date + 'T00:00:00') - new Date(prevStart + 'T00:00:00')) / 86400000,
    )
    const newDate = new Date(key + 'T00:00:00')
    newDate.setDate(newDate.getDate() + (Number.isFinite(offsetDays) ? offsetDays : 0))
    setDate(toKey(newDate))
  }

  const confirm = () => {
    assignRecipe({ date, slot, recipeId: recipe.id, at: specificTime || '' })
    setCurrentWeekKey(startOfWeekKey(date))
    onDone?.({ date, slot })
  }

  return (
    <Modal title={`Add “${recipe.title}” to the meal plan`} onClose={onClose}>
      <div className="plan-form">
        <label className="field">
          <span className="field-label">Meal-planning week</span>
          <select className="input" value={weekKey} onChange={(e) => onWeekChange(e.target.value)}>
            {weeks.map((w) => (
              <option key={w.key} value={w.key}>
                {w.label}
              </option>
            ))}
          </select>
        </label>

        <div className="field">
          <span className="field-label">Planned cooking date</span>
          <div className="day-strip">
            {days.map((d) => (
              <button
                key={d.key}
                type="button"
                className={`day-chip ${d.key === date ? 'selected' : ''} ${
                  d.key === todayKey() ? 'today' : ''
                }`}
                onClick={() => setDate(d.key)}
              >
                <span>{dayShortName(d.key)}</span>
                <strong>{fmtShort(d.key)}</strong>
              </button>
            ))}
          </div>
          <input
            type="date"
            className="input"
            value={date}
            min={days[0].key}
            max={days[6].key}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </div>

        <div className="field">
          <span className="field-label">Planned serving time (meal slot)</span>
          <div className="slot-row">
            {MEAL_SLOTS.map((s) => (
              <button
                key={s}
                type="button"
                className={`slot-chip ${s === slot ? 'selected' : ''}`}
                onClick={() => setSlot(s)}
              >
                {slotLabel(s)}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="field-label">
            Specific date &amp; time <span className="muted">(optional)</span>
          </span>
          <input
            type="datetime-local"
            className="input"
            value={specificTime}
            onChange={(e) => setSpecificTime(e.target.value)}
          />
        </label>

        {existing && existing.recipeId !== recipe.id && (
          <p className="notice warn">
            {fmtMedium(date)} · {slotLabel(slot)} is already taken — adding will replace the
            current recipe in that slot.
          </p>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={confirm}>
            Add to {slotLabel(slot)} · {fmtShort(date)}
          </button>
        </div>
      </div>
    </Modal>
  )
}
