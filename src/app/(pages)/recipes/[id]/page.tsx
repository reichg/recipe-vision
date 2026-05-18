"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Recipe } from "../../../models/recipe";
import styles from "../recipe.module.css";

function hasPositiveNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && value > 0;
}

export function hasRecipeMetrics(recipe: Recipe) {
  return [
    recipe.servings,
    recipe.prepTimeMinutes,
    recipe.cookTimeMinutes,
    recipe.totalTimeMinutes,
  ].some(hasPositiveNumber);
}

export function hasRecipeTagsOrAllergens(recipe: Recipe) {
  return (recipe.tags?.length ?? 0) > 0 || (recipe.allergens?.length ?? 0) > 0;
}

export function RecipeDetailContent({ recipe }: { recipe: Recipe }) {
  const showMetrics = hasRecipeMetrics(recipe);
  const showTagsOrAllergens = hasRecipeTagsOrAllergens(recipe);

  return (
    <>
      <div className={styles.headerContainer}>
        <div>
          <h1 className={styles.pageTitle}>{recipe.title}</h1>
          {recipe.description && (
            <p className={styles.pageSubtitle}>{recipe.description}</p>
          )}
        </div>
        <div className={styles.navButtons}>
          <Link href="/recipes" className={styles.plainLink}>
            <button className={styles.navButton}>← Back to Recipes</button>
          </Link>
        </div>
      </div>

      {recipe.description && (
        <p className={styles.description}>{recipe.description}</p>
      )}

      {/* Metrics */}
      {showMetrics && (
        <div className={styles.metricsGrid}>
          {hasPositiveNumber(recipe.servings) && (
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Servings</div>
              <div className={styles.metricValue}>{recipe.servings}</div>
            </div>
          )}
          {hasPositiveNumber(recipe.prepTimeMinutes) && (
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Prep Time</div>
              <div className={styles.metricValue}>
                {recipe.prepTimeMinutes} min
              </div>
            </div>
          )}
          {hasPositiveNumber(recipe.cookTimeMinutes) && (
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Cook Time</div>
              <div className={styles.metricValue}>
                {recipe.cookTimeMinutes} min
              </div>
            </div>
          )}
          {hasPositiveNumber(recipe.totalTimeMinutes) && (
            <div className={styles.metricCard}>
              <div className={styles.metricLabel}>Total Time</div>
              <div className={styles.metricValue}>
                {recipe.totalTimeMinutes} min
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tags and Allergens */}
      {showTagsOrAllergens && (
        <div className={styles.tagsAllergenSection}>
          {recipe.tags && recipe.tags.length > 0 && (
            <div className={styles.allergenDivider}>
              <p className={styles.sectionLabel}>Tags</p>
              <div className={styles.tagContainer}>
                {recipe.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {recipe.allergens && recipe.allergens.length > 0 && (
            <div className={styles.allergenDivider}>
              <p className={styles.sectionLabel}>Allergens</p>
              <div className={styles.tagContainer}>
                {recipe.allergens.map((allergen) => (
                  <span key={allergen} className={styles.allergen}>
                    {allergen}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ingredients and Steps */}
      <div className={styles.contentGrid}>
        {/* Ingredients */}
        <div>
          <h2 className={styles.sectionTitle}>Ingredients</h2>
          <ul className={styles.ingredientList}>
            {recipe.ingredients.map((ingredient, idx) => (
              <li key={idx} className={styles.ingredientItem}>
                <span className={styles.ingredientName}>{ingredient.name}</span>
                {hasPositiveNumber(ingredient.quantity) && (
                  <span className={styles.ingredientQuantity}>
                    {ingredient.quantity}
                    {ingredient.unit && ` ${ingredient.unit}`}
                  </span>
                )}
                {ingredient.notes && (
                  <p className={styles.ingredientNotes}>{ingredient.notes}</p>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Steps */}
        <div>
          <h2 className={styles.sectionTitle}>Instructions</h2>
          <ol className={styles.stepsList}>
            {recipe.steps.map((step, idx) => (
              <li key={idx} className={styles.stepItem}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}

export default function RecipeDetailPage() {
  const params = useParams();
  const recipeId = params.id as string;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recipeId) return;

    fetch(`/api/recipes/${recipeId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch recipe");
        return r.json();
      })
      .then((data) => setRecipe(data.recipe as Recipe))
      .catch((err) => setError(err?.message ?? "Unknown error"))
      .finally(() => setLoading(false));
  }, [recipeId]);

  if (loading)
    return (
      <main className={styles.main}>
        <p>Loading...</p>
      </main>
    );
  if (error)
    return (
      <main className={styles.main}>
        <p className={styles.errorMessage}>{error}</p>
      </main>
    );
  if (!recipe)
    return (
      <main className={styles.main}>
        <p>Recipe not found</p>
      </main>
    );

  return (
    <main className={styles.main}>
      <RecipeDetailContent recipe={recipe} />
    </main>
  );
}
