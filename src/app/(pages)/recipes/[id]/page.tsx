"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Recipe } from "../../../models/recipe";
import shellStyles from "../../page-shell.module.css";
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
      <div className={shellStyles.headerContainer}>
        <div className={styles.detailHeader}>
          <p className={shellStyles.pageEyebrow}>Recipe dossier</p>
          <h1 className={shellStyles.pageTitle}>{recipe.title}</h1>
          {recipe.description && (
            <p className={shellStyles.pageSubtitle}>{recipe.description}</p>
          )}

          {showTagsOrAllergens && (
            <div className={styles.detailMetadata}>
              {recipe.tags && recipe.tags.length > 0 && (
                <div className={styles.detailMetaBlock}>
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
                <div className={styles.detailMetaBlock}>
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
        </div>

        <div className={styles.detailHeroRail}>
          <div className={styles.navButtons}>
            <Link
              href="/recipes"
              className={`${styles.plainLink} ${styles.navButton}`}
            >
              Back to Recipes
            </Link>
          </div>

          {showMetrics && (
            <div className={styles.detailMetricRail}>
              {hasPositiveNumber(recipe.servings) && (
                <div className={styles.detailMetricCard}>
                  <div className={styles.metricLabel}>Servings</div>
                  <div className={styles.metricValue}>{recipe.servings}</div>
                </div>
              )}
              {hasPositiveNumber(recipe.prepTimeMinutes) && (
                <div className={styles.detailMetricCard}>
                  <div className={styles.metricLabel}>Prep Time</div>
                  <div className={styles.metricValue}>
                    {recipe.prepTimeMinutes} min
                  </div>
                </div>
              )}
              {hasPositiveNumber(recipe.cookTimeMinutes) && (
                <div className={styles.detailMetricCard}>
                  <div className={styles.metricLabel}>Cook Time</div>
                  <div className={styles.metricValue}>
                    {recipe.cookTimeMinutes} min
                  </div>
                </div>
              )}
              {hasPositiveNumber(recipe.totalTimeMinutes) && (
                <div className={styles.detailMetricCard}>
                  <div className={styles.metricLabel}>Total Time</div>
                  <div className={styles.metricValue}>
                    {recipe.totalTimeMinutes} min
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.contentGrid}>
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
      <main className={shellStyles.main}>
        <p>Loading...</p>
      </main>
    );
  if (error)
    return (
      <main className={shellStyles.main}>
        <p className={shellStyles.errorMessage}>{error}</p>
      </main>
    );
  if (!recipe)
    return (
      <main className={shellStyles.main}>
        <p>Recipe not found</p>
      </main>
    );

  return (
    <main className={shellStyles.main}>
      <RecipeDetailContent recipe={recipe} />
    </main>
  );
}
