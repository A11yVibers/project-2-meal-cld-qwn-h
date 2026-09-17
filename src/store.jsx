// Application store: keeps user-created recipes, meal-plan assignments and
// shopping-list state in React state, mirrored into localStorage so everything
// survives a page refresh. Seed recipes come from the immutable CSV data;
// option changes to seed recipes are stored as local overrides (the CSVs are
// never modified).
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { DEFAULT_RECIPE_OPTIONS, SEED_RECIPES } from './lib/data.js'
import { startOfWeekKey, todayKey } from './lib/dates.js'

const KEY_PREFIX = 'mealplanner.v1.'

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + key)
    if (raw == null) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  try {
    localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage may be unavailable (private mode / quota) — state still works
    // in-memory for the session.
  }
}

function usePersistentState(key, fallback) {
  const [state, setState] = useState(() => load(key, fallback))
  useEffect(() => {
    save(key, state)
  }, [key, state])
  return [state, setState]
}

const StoreContext = createContext(null)

let idCounter = 0
function makeId(prefix) {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`
}

export function StoreProvider({ children }) {
  // ---- Recipes -----------------------------------------------------------
  const [userRecipes, setUserRecipes] = usePersistentState('userRecipes', [])
  const [seedOptionOverrides, setSeedOptionOverrides] = usePersistentState(
    'seedOptionOverrides',
    {},
  )

  // ---- Meal plan ----------------------------------------------------------
  const [assignments, setAssignments] = usePersistentState('mealPlan', [])
  const [currentWeekKey, setCurrentWeekKey] = usePersistentState(
    'currentWeek',
    startOfWeekKey(todayKey()),
  )

  // ---- Shopping list state --------------------------------------------------
  const [checkedItems, setCheckedItems] = usePersistentState('shoppingChecked', [])
  const [pantry, setPantry] = usePersistentState('pantry', [])
  const [excludePantry, setExcludePantry] = usePersistentState('excludePantry', true)
  const [shoppingScope, setShoppingScope] = usePersistentState('shoppingScope', 'week') // 'week' | 'all'
  const [shoppingUnitSystem, setShoppingUnitSystem] = usePersistentState('shoppingUnits', 'us')

  const recipes = useMemo(() => {
    const mergedSeeds = SEED_RECIPES.map((r) => {
      const overrides = seedOptionOverrides[r.id]
      if (!overrides) return r
      return {
        ...r,
        options: { ...DEFAULT_RECIPE_OPTIONS, ...r.options, ...(overrides.options || {}) },
        includeInMealSuggestions:
          overrides.includeInMealSuggestions ?? r.includeInMealSuggestions,
      }
    })
    return [...mergedSeeds, ...userRecipes]
  }, [userRecipes, seedOptionOverrides])

  const getRecipe = useCallback((id) => recipes.find((r) => r.id === id) || null, [recipes])

  const saveUserRecipe = useCallback(
    (recipe) => {
      const id = recipe.id || makeId('user')
      const normalized = {
        ...recipe,
        id,
        options: { ...DEFAULT_RECIPE_OPTIONS, ...(recipe.options || {}) },
        isUser: true,
      }
      setUserRecipes((prev) => {
        const exists = prev.some((r) => r.id === id)
        if (exists) return prev.map((r) => (r.id === id ? normalized : r))
        return [...prev, { ...normalized, createdAt: Date.now() }]
      })
      return id
    },
    [setUserRecipes],
  )

  const deleteUserRecipe = useCallback(
    (id) => {
      setUserRecipes((prev) => prev.filter((r) => r.id !== id))
      setAssignments((prev) => prev.filter((a) => a.recipeId !== id))
    },
    [setUserRecipes, setAssignments],
  )

  const updateRecipeSettings = useCallback(
    (recipeId, patch) => {
      // patch: { options?, includeInMealSuggestions? }
      setUserRecipes((prev) =>
        prev.map((r) =>
          r.id === recipeId
            ? {
                ...r,
                ...(patch.includeInMealSuggestions !== undefined
                  ? { includeInMealSuggestions: patch.includeInMealSuggestions }
                  : {}),
                ...(patch.options ? { options: { ...r.options, ...patch.options } } : {}),
              }
            : r,
        ),
      )
      const isSeed = SEED_RECIPES.some((r) => r.id === recipeId)
      if (isSeed) {
        setSeedOptionOverrides((prev) => {
          const existing = prev[recipeId] || {}
          const next = { ...existing }
          if (patch.options) next.options = { ...(existing.options || {}), ...patch.options }
          if (patch.includeInMealSuggestions !== undefined) {
            next.includeInMealSuggestions = patch.includeInMealSuggestions
          }
          return { ...prev, [recipeId]: next }
        })
      }
    },
    [setUserRecipes, setSeedOptionOverrides],
  )

  const assignRecipe = useCallback(
    ({ date, slot, recipeId, at = '', servings = null }) => {
      setAssignments((prev) => {
        const others = prev.filter((a) => !(a.date === date && a.slot === slot))
        return [
          ...others,
          { id: makeId('asg'), date, slot, recipeId, at, servings, updatedAt: Date.now() },
        ]
      })
    },
    [setAssignments],
  )

  const removeAssignment = useCallback(
    (id) => {
      setAssignments((prev) => prev.filter((a) => a.id !== id))
    },
    [setAssignments],
  )

  const assignmentAt = useCallback(
    (date, slot) => assignments.find((a) => a.date === date && a.slot === slot) || null,
    [assignments],
  )

  const checkedSet = useMemo(() => new Set(checkedItems), [checkedItems])

  const toggleChecked = useCallback(
    (key) => {
      setCheckedItems((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
      )
    },
    [setCheckedItems],
  )

  const clearChecked = useCallback(() => setCheckedItems([]), [setCheckedItems])

  const pantrySet = useMemo(() => new Set(pantry), [pantry])

  const togglePantry = useCallback(
    (ingredientId) => {
      setPantry((prev) =>
        prev.includes(ingredientId)
          ? prev.filter((k) => k !== ingredientId)
          : [...prev, ingredientId],
      )
    },
    [setPantry],
  )

  const value = useMemo(
    () => ({
      recipes,
      userRecipes,
      getRecipe,
      saveUserRecipe,
      deleteUserRecipe,
      updateRecipeSettings,
      assignments,
      assignRecipe,
      removeAssignment,
      assignmentAt,
      currentWeekKey,
      setCurrentWeekKey,
      checkedSet,
      toggleChecked,
      clearChecked,
      pantrySet,
      togglePantry,
      excludePantry,
      setExcludePantry,
      shoppingScope,
      setShoppingScope,
      shoppingUnitSystem,
      setShoppingUnitSystem,
    }),
    [
      recipes, userRecipes, getRecipe, saveUserRecipe, deleteUserRecipe,
      updateRecipeSettings, assignments, assignRecipe, removeAssignment,
      assignmentAt, currentWeekKey, setCurrentWeekKey, checkedSet,
      toggleChecked, clearChecked, pantrySet, togglePantry, excludePantry,
      setExcludePantry, shoppingScope, setShoppingScope, shoppingUnitSystem,
      setShoppingUnitSystem,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
