// Small, defensive localStorage wrapper. All app-generated state lives here so
// user recipes, meal-plan changes, and shopping-list state survive a refresh.
// The original CSV files in project-assets/ are never modified.
const PREFIX = 'mealplanner:v1:'

export function loadJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

export function saveJSON(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage may be full or unavailable (private mode); fail silently.
  }
}

export const STORAGE_KEYS = {
  userRecipes: 'userRecipes',
  seedOverrides: 'seedOverrides',
  assignments: 'assignments',
  checkedItems: 'checkedItems',
  pantry: 'pantry',
  settings: 'settings',
  currentWeek: 'currentWeek',
}

export function makeId(prefix = 'u') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
