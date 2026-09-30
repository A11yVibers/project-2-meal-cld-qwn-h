import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { SEED_RECIPES } from './data/seed';
import { currentWeekISO } from './lib/dates';

const StoreContext = createContext(null);

const KEYS = {
  userRecipes: 'mp.userRecipes.v1',
  seedOverrides: 'mp.recipeOptions.v1',
  mealPlan: 'mp.mealPlan.v1',
  checked: 'mp.shoppingChecked.v1',
  pantry: 'mp.pantry.v1',
  weekStart: 'mp.weekStart.v1',
  shoppingScope: 'mp.shoppingScope.v1',
};

export const DEFAULT_OPTIONS = Object.freeze({
  includeInShoppingList: true,
  showNutrition: false,
  allowSubstitutions: false,
  unitSystem: 'us',
});

function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage may be unavailable (private mode); state still works in-memory
    }
  }, [key, value]);
  return [value, setValue];
}

export function StoreProvider({ children }) {
  const [userRecipes, setUserRecipes] = usePersistentState(KEYS.userRecipes, []);
  const [seedOverrides, setSeedOverrides] = usePersistentState(KEYS.seedOverrides, {});
  const [mealPlan, setMealPlan] = usePersistentState(KEYS.mealPlan, {});
  const [checked, setChecked] = usePersistentState(KEYS.checked, {});
  const [pantry, setPantry] = usePersistentState(KEYS.pantry, {});
  const [weekStartISO, setWeekStartISO] = usePersistentState(KEYS.weekStart, currentWeekISO());
  const [shoppingScope, setShoppingScope] = usePersistentState(KEYS.shoppingScope, 'week');

  // Seed recipes (from CSV, immutable) merged with locally stored option overrides,
  // followed by user-created recipes (fully stored in localStorage).
  const recipes = useMemo(() => {
    const seeds = SEED_RECIPES.map((r) =>
      seedOverrides[r.id]
        ? { ...r, options: { ...DEFAULT_OPTIONS, ...seedOverrides[r.id] } }
        : r
    );
    return [...seeds, ...userRecipes];
  }, [seedOverrides, userRecipes]);

  const recipesById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  const getRecipe = useCallback((id) => recipesById.get(id) || null, [recipesById]);

  const getOptions = useCallback(
    (recipe) => (recipe && recipe.options) || DEFAULT_OPTIONS,
    []
  );

  const updateOptions = useCallback((recipeId, options) => {
    // A recipe is either user-created (stored inline) or a seed recipe
    // (stored as a local override); each updater guards independently.
    setUserRecipes((prev) => {
      const idx = prev.findIndex((r) => r.id === recipeId);
      if (idx < 0) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], options };
      return next;
    });
    setSeedOverrides((prev) => {
      if (!SEED_RECIPES.some((r) => r.id === recipeId)) return prev;
      return { ...prev, [recipeId]: options };
    });
  }, []);

  const addRecipe = useCallback((recipe) => {
    setUserRecipes((prev) => [...prev, recipe]);
  }, []);

  const assignRecipe = useCallback((dateISO, slot, recipeId, time = '') => {
    setMealPlan((prev) => ({
      ...prev,
      [dateISO]: { ...(prev[dateISO] || {}), [slot]: { recipeId, time: time || '' } },
    }));
  }, []);

  const removeAssignment = useCallback((dateISO, slot) => {
    setMealPlan((prev) => {
      const day = { ...(prev[dateISO] || {}) };
      delete day[slot];
      const next = { ...prev };
      if (Object.keys(day).length > 0) next[dateISO] = day;
      else delete next[dateISO];
      return next;
    });
  }, []);

  const toggleChecked = useCallback((itemKey) => {
    setChecked((prev) => {
      const next = { ...prev };
      if (next[itemKey]) delete next[itemKey];
      else next[itemKey] = true;
      return next;
    });
  }, []);

  const clearChecked = useCallback(() => setChecked({}), []);

  const togglePantry = useCallback((ingredientKey) => {
    setPantry((prev) => {
      const next = { ...prev };
      if (next[ingredientKey]) delete next[ingredientKey];
      else next[ingredientKey] = true;
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      recipes,
      getRecipe,
      getOptions,
      updateOptions,
      addRecipe,
      mealPlan,
      assignRecipe,
      removeAssignment,
      checked,
      toggleChecked,
      clearChecked,
      pantry,
      togglePantry,
      weekStartISO,
      setWeekStartISO,
      shoppingScope,
      setShoppingScope,
    }),
    [
      recipes, getRecipe, getOptions, updateOptions, addRecipe,
      mealPlan, assignRecipe, removeAssignment,
      checked, toggleChecked, clearChecked,
      pantry, togglePantry,
      weekStartISO, shoppingScope,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
