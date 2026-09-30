import React, { useMemo } from 'react';
import { useStore } from '../store';
import { cuisineName, dietaryTagName, mealTypeName } from '../data/seed';
import { formatMinutes, spiceLabel } from '../lib/units';
import Thumb from './Thumb';

function RecipeCard({ recipe }) {
  const accent = recipe.accentColor || '#d97757';
  return (
    <article className="recipe-card" style={{ '--accent': accent }}>
      <a className="card-link" href={`#/recipes/${encodeURIComponent(recipe.id)}`}>
        <div className="card-thumb">
          <Thumb src={recipe.coverImageUrl} alt={recipe.title} />
        </div>
        <div className="card-body">
          <div className="card-title-row">
            <h3>{recipe.title}</h3>
            {recipe.isUser && <span className="tag tag-user">Yours</span>}
          </div>
          {recipe.shortDescription ? (
            <p className="card-desc">{recipe.shortDescription}</p>
          ) : (
            <p className="card-desc muted">
              {[cuisineName(recipe.cuisineId), mealTypeName(recipe.mealTypeId)]
                .filter(Boolean)
                .join(' · ') || 'Home-made recipe'}
            </p>
          )}
          <div className="card-meta">
            <span>{formatMinutes(recipe.totalMinutes) || '—'}</span>
            <span>{recipe.servings} servings</span>
            {recipe.spiceLevel > 0 && <span>Spice: {spiceLabel(recipe.spiceLevel)}</span>}
          </div>
          <div className="chips">
            {cuisineName(recipe.cuisineId) && (
              <span className="chip">{cuisineName(recipe.cuisineId)}</span>
            )}
            {mealTypeName(recipe.mealTypeId) && (
              <span className="chip">{mealTypeName(recipe.mealTypeId)}</span>
            )}
            {recipe.dietaryTagIds.slice(0, 2).map((id) => (
              <span key={id} className="chip chip-soft">{dietaryTagName(id)}</span>
            ))}
            {recipe.dietaryTagIds.length > 2 && (
              <span className="chip chip-soft">+{recipe.dietaryTagIds.length - 2}</span>
            )}
          </div>
        </div>
      </a>
    </article>
  );
}

export default function Catalog() {
  const { recipes } = useStore();

  const ordered = useMemo(() => {
    const user = recipes.filter((r) => r.isUser).reverse();
    const seeds = recipes.filter((r) => !r.isUser);
    return [...user, ...seeds];
  }, [recipes]);

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <h1>Recipes</h1>
          <p className="subtitle">
            {recipes.length} recipe{recipes.length === 1 ? '' : 's'} — seed collection plus your own
          </p>
        </div>
        <a className="btn primary" href="#/new">Add recipe</a>
      </header>
      <div className="card-grid">
        {ordered.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
    </section>
  );
}
