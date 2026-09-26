// App state + localStorage persistence. Seed recipes always come from the CSVs
// in project-assets/ and are never written back; user-created recipes, meal-plan
// assignments, shopping-list checks, pantry exclusions and seed-recipe option
// overrides persist in the browser.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { SEED_RECIPES, SEED_RECIPE_BY_ID, DEFAULT_RECIPE_OPTIONS } from './seedData.js'

const KEYS = {
  userRecipes: 'mealplanner.userRecipes.v1',
  plan: 'mealplanner.plan.v1',
  checked: 'mealplanner.shopping.checked.v1',
  pantry: 'mealplanner.pantry.v1',
  seedOverrides: 'mealplanner.seedOptionOverrides.v1',
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

const StoreContext = createContext(null)

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}

export function StoreProvider({ children }) {
  const [userRecipes, setUserRecipes] = useState(() => loadJSON(KEYS.userRecipes, []))
  const [plan, setPlan] = useState(() => loadJSON(KEYS.plan, {}))
  const [checkedKeys, setCheckedKeys] = useState(() => loadJSON(KEYS.checked, []))
  const [pantryKeys, setPantryKeys] = useState(() => loadJSON(KEYS.pantry, []))
  const [seedOptionOverrides, setSeedOptionOverrides] = useState(() => loadJSON(KEYS.seedOverrides, {}))

  useEffect(() => { localStorage.setItem(KEYS.userRecipes, JSON.stringify(userRecipes)) }, [userRecipes])
  useEffect(() => { localStorage.setItem(KEYS.plan, JSON.stringify(plan)) }, [plan])
  useEffect(() => { localStorage.setItem(KEYS.checked, JSON.stringify(checkedKeys)) }, [checkedKeys])
  useEffect(() => { localStorage.setItem(KEYS.pantry, JSON.stringify(pantryKeys)) }, [pantryKeys])
  useEffect(() => { localStorage.setItem(KEYS.seedOverrides, JSON.stringify(seedOptionOverrides)) }, [seedOptionOverrides])

  const store = useMemo(() => {
    const allRecipes = [
      ...[...userRecipes].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
      ...SEED_RECIPES,
    ]
    const userRecipeById = Object.fromEntries(userRecipes.map((r) => [r.id, r]))

    function getRecipe(id) {
      return userRecipeById[id] || SEED_RECIPE_BY_ID[id] || null
    }

    function optionsFor(recipe) {
      if (!recipe) return { ...DEFAULT_RECIPE_OPTIONS }
      const base = recipe.source === 'seed' ? (seedOptionOverrides[recipe.id] || {}) : (recipe.options || {})
      return { ...DEFAULT_RECIPE_OPTIONS, ...base }
    }

    function setRecipeOptions(recipeId, options) {
      if (userRecipeById[recipeId]) {
        setUserRecipes((prev) =>
          prev.map((r) => (r.id === recipeId ? { ...r, options: { ...DEFAULT_RECIPE_OPTIONS, ...options } } : r))
        )
      } else if (SEED_RECIPE_BY_ID[recipeId]) {
        setSeedOptionOverrides((prev) => ({ ...prev, [recipeId]: { ...DEFAULT_RECIPE_OPTIONS, ...options } }))
      }
    }

    function addUserRecipe(recipe) {
      setUserRecipes((prev) => [...prev, recipe])
    }

    function assignMeal(date, slot, recipeId, servingTime = '') {
      setPlan((prev) => ({
        ...prev,
        [date]: { ...(prev[date] || {}), [slot]: { recipeId, servingTime: servingTime || '' } },
      }))
    }

    function removeMeal(date, slot) {
      setPlan((prev) => {
        const day = { ...(prev[date] || {}) }
        delete day[slot]
        const next = { ...prev }
        if (Object.keys(day).length === 0) delete next[date]
        else next[date] = day
        return next
      })
    }

    function updateServingTime(date, slot, time) {
      setPlan((prev) => {
        const assignment = prev[date]?.[slot]
        if (!assignment) return prev
        return { ...prev, [date]: { ...prev[date], [slot]: { ...assignment, servingTime: time } } }
      })
    }

    function toggleChecked(itemKey) {
      setCheckedKeys((prev) =>
        prev.includes(itemKey) ? prev.filter((k) => k !== itemKey) : [...prev, itemKey]
      )
    }

    function uncheckKeys(keys) {
      const set = new Set(keys)
      setCheckedKeys((prev) => prev.filter((k) => !set.has(k)))
    }

    function togglePantry(ingKey) {
      setPantryKeys((prev) =>
        prev.includes(ingKey) ? prev.filter((k) => k !== ingKey) : [...prev, ingKey]
      )
    }

    return {
      userRecipes,
      allRecipes,
      seedRecipes: SEED_RECIPES,
      plan,
      checkedKeys,
      pantryKeys,
      seedOptionOverrides,
      getRecipe,
      optionsFor,
      setRecipeOptions,
      addUserRecipe,
      assignMeal,
      removeMeal,
      updateServingTime,
      toggleChecked,
      uncheckKeys,
      togglePantry,
    }
  }, [userRecipes, plan, checkedKeys, pantryKeys, seedOptionOverrides])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
