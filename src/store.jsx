import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  SEED_RECIPES,
  DEFAULT_OPTIONS,
} from './lib/data.js'
import {
  loadJSON,
  saveJSON,
  STORAGE_KEYS,
  makeId,
} from './lib/storage.js'
import {
  todayISO,
  weekStartISO,
  addWeeksISO,
  weekDaysISO,
} from './lib/dates.js'

const StoreContext = createContext(null)

function usePersistedState(key, fallback) {
  const [value, setValue] = useState(() => loadJSON(key, fallback))
  useEffect(() => {
    saveJSON(key, value)
  }, [key, value])
  return [value, setValue]
}

export function StoreProvider({ children }) {
  // User-created recipes (full objects). Seed recipes stay read-only; only their
  // user-editable options are persisted as overrides so the CSVs are never touched.
  const [userRecipes, setUserRecipes] = usePersistedState(STORAGE_KEYS.userRecipes, [])
  const [seedOverrides, setSeedOverrides] = usePersistedState(STORAGE_KEYS.seedOverrides, {})

  // Meal plan: { [dateISO]: { [slot]: recipeId } }
  const [assignments, setAssignments] = usePersistedState(STORAGE_KEYS.assignments, {})

  // Shopping-list check-off state, keyed by week so each week is independent.
  const [checkedByWeek, setCheckedByWeek] = usePersistedState(STORAGE_KEYS.checkedItems, {})

  // Pantry items the user already has (excluded when the toggle is on).
  const [pantry, setPantry] = usePersistedState(STORAGE_KEYS.pantry, [])

  const [settings, setSettings] = usePersistedState(STORAGE_KEYS.settings, {
    measurementSystem: 'us',
    excludePantry: false,
  })

  const [currentWeekStart, setCurrentWeekStart] = usePersistedState(
    STORAGE_KEYS.currentWeek,
    weekStartISO(todayISO()),
  )

  // ---- Derived recipe collections ---------------------------------------
  const recipes = useMemo(() => {
    const seeds = SEED_RECIPES.map((r) => {
      const ov = seedOverrides[r.id]
      if (!ov) return r
      return {
        ...r,
        includeInSuggestions:
          ov.includeInSuggestions !== undefined ? ov.includeInSuggestions : r.includeInSuggestions,
        options: { ...DEFAULT_OPTIONS, ...r.options, ...(ov.options || {}) },
      }
    })
    return [...seeds, ...userRecipes]
  }, [seedOverrides, userRecipes])

  const recipeMap = useMemo(() => {
    const map = new Map()
    for (const r of recipes) map.set(r.id, r)
    return map
  }, [recipes])

  const getRecipe = useCallback((id) => recipeMap.get(id) ?? null, [recipeMap])

  // ---- Recipe actions ----------------------------------------------------
  const addUserRecipe = useCallback((draft) => {
    const id = draft.id || makeId('u')
    const recipe = {
      ...draft,
      id,
      origin: 'user',
      options: { ...DEFAULT_OPTIONS, ...(draft.options || {}) },
    }
    setUserRecipes((prev) => [...prev, recipe])
    return id
  }, [setUserRecipes])

  const updateUserRecipe = useCallback((id, patch) => {
    setUserRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }, [setUserRecipes])

  const deleteUserRecipe = useCallback((id) => {
    setUserRecipes((prev) => prev.filter((r) => r.id !== id))
    // Remove any plan assignments pointing at it.
    setAssignments((prev) => {
      const next = {}
      for (const [date, slots] of Object.entries(prev)) {
        const cleaned = {}
        for (const [slot, rid] of Object.entries(slots)) {
          if (rid === id) continue
          cleaned[slot] = rid
        }
        if (Object.keys(cleaned).length > 0) next[date] = cleaned
      }
      return next
    })
  }, [setUserRecipes, setAssignments])

  // Toggle an option on any recipe (seed -> override, user -> in place).
  const setRecipeOptions = useCallback((id, optionsPatch) => {
    const isSeed = SEED_RECIPES.some((r) => r.id === id)
    if (isSeed) {
      setSeedOverrides((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), options: { ...(prev[id]?.options || {}), ...optionsPatch } },
      }))
    } else {
      setUserRecipes((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, options: { ...r.options, ...optionsPatch } } : r,
        ),
      )
    }
  }, [setSeedOverrides, setUserRecipes])

  const setRecipeSuggestions = useCallback((id, includeInSuggestions) => {
    const isSeed = SEED_RECIPES.some((r) => r.id === id)
    if (isSeed) {
      setSeedOverrides((prev) => ({
        ...prev,
        [id]: { ...(prev[id] || {}), includeInSuggestions },
      }))
    } else {
      setUserRecipes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, includeInSuggestions } : r)),
      )
    }
  }, [setSeedOverrides, setUserRecipes])

  // ---- Meal-plan actions -------------------------------------------------
  const assignRecipe = useCallback((dateISO, slot, recipeId) => {
    setAssignments((prev) => ({
      ...prev,
      [dateISO]: { ...(prev[dateISO] || {}), [slot]: recipeId },
    }))
  }, [setAssignments])

  const unassignSlot = useCallback((dateISO, slot) => {
    setAssignments((prev) => {
      const daySlots = { ...(prev[dateISO] || {}) }
      delete daySlots[slot]
      const next = { ...prev }
      if (Object.keys(daySlots).length === 0) delete next[dateISO]
      else next[dateISO] = daySlots
      return next
    })
  }, [setAssignments])

  const getSlot = useCallback(
    (dateISO, slot) => assignments[dateISO]?.[slot] ?? null,
    [assignments],
  )

  const assignmentsForWeek = useCallback(
    (weekStart) => {
      const days = weekDaysISO(weekStart)
      const out = []
      for (const date of days) {
        const daySlots = assignments[date]
        if (!daySlots) continue
        for (const [slot, recipeId] of Object.entries(daySlots)) {
          if (recipeId) out.push({ date, slot, recipeId })
        }
      }
      return out
    },
    [assignments],
  )

  const weekHasAssignments = useMemo(
    () => assignmentsForWeek(currentWeekStart).length > 0,
    [assignmentsForWeek, currentWeekStart],
  )

  // ---- Week navigation ---------------------------------------------------
  const navigateWeek = useCallback((deltaWeeks) => {
    setCurrentWeekStart((prev) => addWeeksISO(prev, deltaWeeks))
  }, [setCurrentWeekStart])

  const goToToday = useCallback(() => {
    setCurrentWeekStart(weekStartISO(todayISO()))
  }, [setCurrentWeekStart])

  // ---- Shopping-list state ----------------------------------------------
  const checkedSetForWeek = useCallback(
    (weekStart) => checkedByWeek[weekStart] || {},
    [checkedByWeek],
  )

  const toggleChecked = useCallback((weekStart, compositeKey) => {
    setCheckedByWeek((prev) => {
      const week = { ...(prev[weekStart] || {}) }
      if (week[compositeKey]) delete week[compositeKey]
      else week[compositeKey] = true
      return { ...prev, [weekStart]: week }
    })
  }, [setCheckedByWeek])

  const setChecked = useCallback((weekStart, compositeKey, checked) => {
    setCheckedByWeek((prev) => {
      const week = { ...(prev[weekStart] || {}) }
      if (checked) week[compositeKey] = true
      else delete week[compositeKey]
      return { ...prev, [weekStart]: week }
    })
  }, [setCheckedByWeek])

  const clearChecked = useCallback((weekStart) => {
    setCheckedByWeek((prev) => ({ ...prev, [weekStart]: {} }))
  }, [setCheckedByWeek])

  const togglePantry = useCallback((key) => {
    setPantry((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }, [setPantry])

  const isInPantry = useCallback((key) => pantry.includes(key), [pantry])

  // ---- Settings ----------------------------------------------------------
  const setMeasurementSystem = useCallback((system) => {
    setSettings((prev) => ({ ...prev, measurementSystem: system }))
  }, [setSettings])

  const setExcludePantry = useCallback((value) => {
    setSettings((prev) => ({ ...prev, excludePantry: Boolean(value) }))
  }, [setSettings])

  const value = {
    // data
    recipes,
    recipeMap,
    getRecipe,
    seedRecipes: SEED_RECIPES,
    // recipes actions
    addUserRecipe,
    updateUserRecipe,
    deleteUserRecipe,
    setRecipeOptions,
    setRecipeSuggestions,
    // plan
    assignments,
    assignRecipe,
    unassignSlot,
    getSlot,
    assignmentsForWeek,
    weekHasAssignments,
    // week
    currentWeekStart,
    setCurrentWeekStart,
    navigateWeek,
    goToToday,
    // shopping
    checkedSetForWeek,
    toggleChecked,
    setChecked,
    clearChecked,
    pantry,
    togglePantry,
    isInPantry,
    // settings
    settings,
    measurementSystem: settings.measurementSystem,
    setMeasurementSystem,
    excludePantry: Boolean(settings.excludePantry),
    setExcludePantry,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
}
