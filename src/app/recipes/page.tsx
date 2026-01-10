/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { styles } from "../styles/recipe.styles";
import type { Recipe } from "../types/recipe";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data) => setRecipes(data.recipes ?? []))
      .catch((err) => setError(err?.message ?? String(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main style={styles.main}>
      <div style={styles.headerContainer}>
        <div>
          <h1 style={styles.pageTitle}>Saved Recipes</h1>
          <p style={styles.pageSubtitle}>
            Recent parsed recipes from the service
          </p>
        </div>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={styles.errorMessage}>{error}</p>}

      <div style={styles.recipesGrid}>
        {recipes.length === 0 && !loading && <p>No recipes found.</p>}

        {recipes.map((r, idx) => (
          <Link
            key={idx}
            href={`/recipes/${r.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <article style={styles.recipeCard}>
              <div style={styles.recipeCardContent}>
                <div style={styles.recipeCardMain}>
                  <h2 style={styles.recipeCardTitle}>{r.title}</h2>
                  {r.description && (
                    <p
                      style={{
                        marginTop: 8,
                        color:
                          (styles.description.color as string) ?? "#8b7355",
                      }}
                    >
                      {r.description}
                    </p>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      marginTop: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    {r.tags?.map((t) => (
                      <span key={t} style={styles.tag}>
                        {t}
                      </span>
                    ))}
                  </div>

                  <div style={styles.recipeCardMetrics}>
                    {r.servings && (
                      <div style={styles.metricCard}>
                        <div style={styles.metricLabel as any}>Servings</div>
                        <div style={styles.metricValue as any}>
                          {r.servings}
                        </div>
                      </div>
                    )}
                    {r.totalTimeMinutes && (
                      <div style={styles.metricCard}>
                        <div style={styles.metricLabel as any}>Total</div>
                        <div style={styles.metricValue as any}>
                          {r.totalTimeMinutes} min
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ width: 220 }}>
                  {r.sourceText ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#777",
                        maxHeight: 120,
                        overflow: "auto",
                      }}
                    >
                      {r.sourceText.substring(0, 800)}
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </main>
  );
}
