import RecipeImage from './RecipeImage.jsx'
import {
  cuisineById,
  mealTypeById,
  dietaryTagById,
  lookupName,
  spiceLabel,
} from '../lib/data.js'

// One tile in the recipe catalog: thumbnail, accent stripe, and at-a-glance info.
// The title is a heading whose button is stretched over the whole card so the
// entire tile is clickable while keeping a proper document outline.
export default function RecipeCard({ recipe, onOpen, plannedCount = 0 }) {
  const accent = recipe.accentColor || '#D97757'
  const tags = (recipe.dietaryTagIds || []).slice(0, 3)

  return (
    <article className="recipe-card" style={{ '--accent': accent }}>
      <div className="recipe-card-media">
        <RecipeImage
          src={recipe.coverImageUrl}
          alt=""
          className="recipe-card-thumb"
          accentColor={accent}
        />
        {plannedCount > 0 && (
          <span className="recipe-card-planned" title={`Planned ${plannedCount}× this week`}>
            📅 {plannedCount}
          </span>
        )}
      </div>
      <div className="recipe-card-body">
        <h2 className="recipe-card-title">
          <button
            type="button"
            className="recipe-card-open"
            onClick={() => onOpen(recipe.id)}
          >
            {recipe.title}
            <span className="visually-hidden"> — open recipe details</span>
          </button>
        </h2>
        <p className="recipe-card-desc">{recipe.shortDescription}</p>
        <div className="recipe-card-meta">
          <span className="chip">
            <span aria-hidden="true">🕒</span> {recipe.totalMinutes} min
          </span>
          <span className="chip">
            <span aria-hidden="true">🍽️</span> {recipe.servings} servings
          </span>
          {recipe.cuisineId && (
            <span className="chip">{lookupName(cuisineById, recipe.cuisineId)}</span>
          )}
          {recipe.mealTypeId && (
            <span className="chip chip-accent">
              {lookupName(mealTypeById, recipe.mealTypeId)}
            </span>
          )}
        </div>
        <div className="recipe-card-foot">
          {recipe.spiceLevel > 0 ? (
            <span className="spice" title={`Spice level: ${spiceLabel(recipe.spiceLevel)}`}>
              <span aria-hidden="true">{'🌶️'.repeat(Math.min(recipe.spiceLevel, 5))}</span>
              <span className="visually-hidden">
                Spice level: {spiceLabel(recipe.spiceLevel)}
              </span>
            </span>
          ) : (
            <span className="spice" />
          )}
          <span className="recipe-card-tags">
            {tags.map((t) => (
              <span key={t} className="tag-pill">
                {lookupName(dietaryTagById, t)}
              </span>
            ))}
          </span>
        </div>
      </div>
    </article>
  )
}
