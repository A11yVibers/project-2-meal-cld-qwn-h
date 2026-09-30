import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { buildShoppingList } from '../lib/shopping';
import { formatQty } from '../lib/units';
import {
  currentWeekISO,
  formatWeekLabel,
  shiftWeek,
  weekDatesISO,
} from '../lib/dates';

const CATEGORY_ICONS = {
  Produce: '🥬',
  'Meat & seafood': '🍗',
  'Dairy & eggs': '🥚',
  'Grains & pantry': '🌾',
  'Oils & condiments': '🫙',
  'Canned & jarred': '🥫',
  Spices: '🧂',
  Other: '🛒',
};

function itemQtyLabel(item) {
  if (item.hasQty) {
    const qty = formatQty(item.quantity);
    return item.unit ? `${qty} ${item.unit}` : qty;
  }
  return item.unit === 'to taste' ? 'to taste' : 'as needed';
}

export default function ShoppingList() {
  const {
    mealPlan,
    getRecipe,
    getOptions,
    checked,
    toggleChecked,
    clearChecked,
    pantry,
    togglePantry,
    weekStartISO,
    setWeekStartISO,
    shoppingScope,
    setShoppingScope,
  } = useStore();
  const [showPantry, setShowPantry] = useState(false);

  const { groups, items } = useMemo(() => {
    const inScope =
      shoppingScope === 'week'
        ? (iso) => weekDatesISO(weekStartISO).includes(iso)
        : null;
    return buildShoppingList({ mealPlan, getRecipe, getOptions, dateFilter: inScope });
  }, [mealPlan, getRecipe, getOptions, shoppingScope, weekStartISO]);

  const visible = items.filter((i) => !pantry[i.ingredientKey]);
  const excluded = items.filter((i) => pantry[i.ingredientKey]);
  const checkedCount = visible.filter((i) => checked[i.itemKey]).length;
  const totalPlanned = Object.values(mealPlan).reduce(
    (n, slots) => n + Object.keys(slots || {}).length,
    0
  );

  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => !pantry[i.ingredientKey]) }))
    .filter((g) => g.items.length > 0);

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <h1>Shopping list</h1>
          <p className="subtitle">
            {shoppingScope === 'week'
              ? `Auto-generated from the week of ${formatWeekLabel(weekStartISO)}`
              : `Auto-generated from all ${totalPlanned} planned meal${totalPlanned === 1 ? '' : 's'}`}
          </p>
        </div>
        <div className="week-nav">
          <div className="segmented" role="radiogroup" aria-label="Shopping list scope">
            <button
              type="button"
              role="radio"
              aria-checked={shoppingScope === 'week'}
              className={`seg ${shoppingScope === 'week' ? 'active' : ''}`}
              onClick={() => setShoppingScope('week')}
            >This week</button>
            <button
              type="button"
              role="radio"
              aria-checked={shoppingScope === 'all'}
              className={`seg ${shoppingScope === 'all' ? 'active' : ''}`}
              onClick={() => setShoppingScope('all')}
            >All planned</button>
          </div>
          {shoppingScope === 'week' && (
            <>
              <button type="button" className="btn" aria-label="Previous week"
                onClick={() => setWeekStartISO(shiftWeek(weekStartISO, -1))}>‹</button>
              <button type="button" className="btn" aria-label="Go to current week"
                onClick={() => setWeekStartISO(currentWeekISO())}>Today</button>
              <button type="button" className="btn" aria-label="Next week"
                onClick={() => setWeekStartISO(shiftWeek(weekStartISO, 1))}>›</button>
            </>
          )}
        </div>
      </header>

      {items.length === 0 && (
        <div className="panel empty-state">
          <h2>Nothing to shop for yet</h2>
          <p className="subtitle">
            Add recipes to your meal plan and the shopping list will build itself here.
          </p>
          <a className="btn primary" href="#/planner">Open the planner</a>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="panel list-progress">
            <div className="progress-text">
              <strong>{checkedCount}</strong> of <strong>{visible.length}</strong> items checked
              {excluded.length > 0 && (
                <span className="muted"> · {excluded.length} excluded as pantry staples</span>
              )}
            </div>
            <div className="progress-bar" aria-hidden="true">
              <div
                className="progress-fill"
                style={{ width: visible.length ? `${(checkedCount / visible.length) * 100}%` : '0%' }}
              />
            </div>
            {checkedCount > 0 && (
              <button type="button" className="btn small" onClick={clearChecked}>Uncheck all</button>
            )}
          </div>

          {visibleGroups.map((group) => (
            <div className="panel shop-group" key={group.category}>
              <h2>
                <span aria-hidden="true">{CATEGORY_ICONS[group.category] || '🛒'}</span>{' '}
                {group.category}
                <span className="group-count">{group.items.length}</span>
              </h2>
              <ul className="shop-items">
                {group.items.map((item) => (
                  <li key={item.itemKey} className={checked[item.itemKey] ? 'checked' : ''}>
                    <label className="shop-item">
                      <input
                        type="checkbox"
                        checked={!!checked[item.itemKey]}
                        onChange={() => toggleChecked(item.itemKey)}
                      />
                      <span className="item-text">
                        <span className="item-name">{item.name}</span>
                        <span className="item-qty">{itemQtyLabel(item)}</span>
                        {item.optional && <span className="tag tag-soft">optional</span>}
                        <span className="item-src" title={item.recipes.join(', ')}>
                          {item.recipes.length === 1
                            ? item.recipes[0]
                            : `in ${item.recipes.length} recipes`}
                        </span>
                      </span>
                    </label>
                    <button
                      type="button"
                      className="btn tiny"
                      onClick={() => togglePantry(item.ingredientKey)}
                      title="Exclude this ingredient — I already have it"
                    >In pantry</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {excluded.length > 0 && (
            <div className="panel shop-group pantry-group">
              <h2>
                <button
                  type="button"
                  className="pantry-toggle"
                  aria-expanded={showPantry}
                  onClick={() => setShowPantry((s) => !s)}
                >
                  <span className={`caret ${showPantry ? 'up' : ''}`} aria-hidden="true" />
                  Pantry staples — excluded ({excluded.length})
                </button>
              </h2>
              {showPantry && (
                <ul className="shop-items pantry-items">
                  {excluded.map((item) => (
                    <li key={item.itemKey}>
                      <span className="item-text">
                        <span className="item-name">{item.name}</span>
                        <span className="item-qty">{itemQtyLabel(item)}</span>
                      </span>
                      <button
                        type="button"
                        className="btn tiny"
                        onClick={() => togglePantry(item.ingredientKey)}
                      >Put back on list</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
