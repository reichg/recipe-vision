/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Recipe } from "../../../models/recipe";
import { styles } from "../../../styles/recipe.styles";

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
      <main style={styles.main}>
        <p>Loading...</p>
      </main>
    );
  if (error)
    return (
      <main style={styles.main}>
        <p style={styles.errorMessage}>{error}</p>
      </main>
    );
  if (!recipe)
    return (
      <main style={styles.main}>
        <p>Recipe not found</p>
      </main>
    );

  return (
    <main style={styles.main}>
      <div style={styles.headerContainer}>
        <div>
          <h1 style={styles.pageTitle}>{recipe.title}</h1>
          {recipe.description && (
            <p style={styles.pageSubtitle}>{recipe.description}</p>
          )}
        </div>
        <div style={styles.navButtons}>
          <Link href="/recipes" style={{ textDecoration: "none" }}>
            <button
              style={styles.navButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#d4a574";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.color = "#d4a574";
              }}
            >
              ← Back to Recipes
            </button>
          </Link>
        </div>
      </div>

      {recipe.description && (
        <p style={styles.description}>{recipe.description}</p>
      )}

      {/* Metrics */}
      {(recipe.servings ||
        recipe.prepTimeMinutes ||
        recipe.cookTimeMinutes ||
        recipe.totalTimeMinutes) && (
        <div style={styles.metricsGrid}>
          {recipe.servings && (
            <div style={styles.metricCard}>
              <div style={styles.metricLabel as any}>Servings</div>
              <div style={styles.metricValue as any}>{recipe.servings}</div>
            </div>
          )}
          {recipe.prepTimeMinutes && (
            <div style={styles.metricCard}>
              <div style={styles.metricLabel as any}>Prep Time</div>
              <div style={styles.metricValue as any}>
                {recipe.prepTimeMinutes} min
              </div>
            </div>
          )}
          {recipe.cookTimeMinutes && (
            <div style={styles.metricCard}>
              <div style={styles.metricLabel as any}>Cook Time</div>
              <div style={styles.metricValue as any}>
                {recipe.cookTimeMinutes} min
              </div>
            </div>
          )}
          {recipe.totalTimeMinutes && (
            <div style={styles.metricCard}>
              <div style={styles.metricLabel as any}>Total Time</div>
              <div style={styles.metricValue as any}>
                {recipe.totalTimeMinutes} min
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tags and Allergens */}
      {(recipe.tags?.length || recipe.allergens?.length) && (
        <div style={styles.tagsAllergenSection}>
          {recipe.tags && recipe.tags.length > 0 && (
            <div style={styles.allergenDivider}>
              <p style={styles.sectionLabel}>Tags</p>
              <div style={styles.tagContainer}>
                {recipe.tags.map((tag) => (
                  <span key={tag} style={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {recipe.allergens && recipe.allergens.length > 0 && (
            <div style={styles.allergenDivider}>
              <p style={styles.sectionLabel}>Allergens</p>
              <div style={styles.tagContainer}>
                {recipe.allergens.map((allergen) => (
                  <span key={allergen} style={styles.allergen}>
                    {allergen}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ingredients and Steps */}
      <div style={styles.contentGrid}>
        {/* Ingredients */}
        <div>
          <h2 style={styles.sectionTitle}>Ingredients</h2>
          <ul style={styles.ingredientList}>
            {recipe.ingredients.map((ingredient, idx) => (
              <li key={idx} style={styles.ingredientItem}>
                <span style={styles.ingredientName}>{ingredient.name}</span>
                {ingredient.quantity && (
                  <span style={styles.ingredientQuantity}>
                    {ingredient.quantity}
                    {ingredient.unit && ` ${ingredient.unit}`}
                  </span>
                )}
                {ingredient.notes && (
                  <p style={styles.ingredientNotes}>{ingredient.notes}</p>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Steps */}
        <div>
          <h2 style={styles.sectionTitle}>Instructions</h2>
          <ol style={styles.stepsList}>
            {recipe.steps.map((step, idx) => (
              <li key={idx} style={styles.stepItem}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </main>
  );
}
