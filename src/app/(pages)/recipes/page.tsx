/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Recipe } from "../../models/recipe";
import styles from "./recipe.module.css";

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(
    new Set(),
  );
  const [deleting, setDeleting] = useState(false);

  const handleDeleteSelected = async () => {
    if (selectedRecipes.size === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedRecipes.size} recipe(s)?`,
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch("/api/recipes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedRecipes) }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Failed to delete recipes");
      }

      // Refresh the recipes list
      setSelectedRecipes(new Set());
      setLoading(true);
      const r = await fetch(`/api/recipes?page=${currentPage}&limit=25`);
      const data = await r.json();
      const mappedRecipes = (data.recipes ?? []).map((dbRecipe: any) => ({
        id: dbRecipe.id,
        ...(dbRecipe.json as Omit<Recipe, "id">),
      }));
      setRecipes(mappedRecipes);
      setPagination(data.pagination);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setTimeout(() => setError(null), 3000);
    } finally {
      setDeleting(false);
    }
  };

  const toggleRecipeSelection = (id: string) => {
    setSelectedRecipes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRecipes.size === recipes.length) {
      setSelectedRecipes(new Set());
    } else {
      setSelectedRecipes(new Set(recipes.map((r) => r.id)));
    }
  };

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/recipes?page=${currentPage}&limit=25`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        // Map database records to Recipe type
        const mappedRecipes = (data.recipes ?? []).map((dbRecipe: any) => ({
          id: dbRecipe.id,
          ...(dbRecipe.json as Omit<Recipe, "id">),
        }));
        setRecipes(mappedRecipes);
        setPagination(data.pagination);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? String(err));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentPage]);

  return (
    <main className={styles.main}>
      <div className={styles.headerContainer}>
        <div className={styles.headerCentered}>
          <h1 className={styles.pageTitle}>Saved Recipes</h1>
          <p className={styles.pageSubtitle}>
            Recent parsed recipes from the service
          </p>
        </div>
      </div>

      {loading && <p className={styles.centerText}>Loading...</p>}
      {error && (
        <p className={`${styles.errorMessage} ${styles.centerText}`}>{error}</p>
      )}

      {recipes.length > 0 && (
        <div className={styles.selectionControlsContainer}>
          <label className={styles.selectAllLabel}>
            <input
              type="checkbox"
              checked={
                selectedRecipes.size === recipes.length && recipes.length > 0
              }
              onChange={toggleSelectAll}
              className={styles.selectAllCheckbox}
            />
            Select All
          </label>
          {selectedRecipes.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className={`${styles.deleteButton} ${
                deleting ? styles.deleteButtonDisabled : ""
              }`}
            >
              {deleting
                ? "Deleting..."
                : `Delete ${selectedRecipes.size} Selected`}
            </button>
          )}
        </div>
      )}

      {pagination && (
        <div className={styles.paginationInfoText}>
          Showing {recipes.length} of {pagination.total} recipes (Page{" "}
          {pagination.page} of {pagination.totalPages})
        </div>
      )}
      <div className={styles.compactRecipesGrid}>
        {recipes.length === 0 && !loading && (
          <p className={styles.noRecipesMessage}>No recipes found.</p>
        )}

        {recipes.map((r, idx) => (
          <div key={idx} className={styles.recipeCardWrapper}>
            <input
              type="checkbox"
              checked={selectedRecipes.has(r.id)}
              onChange={(e) => {
                e.stopPropagation();
                toggleRecipeSelection(r.id);
              }}
              onClick={(e) => e.stopPropagation()}
              className={styles.recipeCardCheckbox}
            />
            <Link
              href={`/recipes/${r.id}`}
              className={styles.compactRecipeLink}
            >
              <div className={styles.compactRecipeCard}>
                <h3 className={styles.compactRecipeTitle}>{r.title}</h3>

                {r.description && (
                  <p className={styles.compactRecipeDescription}>
                    {r.description}
                  </p>
                )}

                <div className={styles.compactRecipeTagsContainer}>
                  {r.tags?.slice(0, 3).map((t) => (
                    <span key={t} className={styles.compactRecipeTag}>
                      {t}
                    </span>
                  ))}
                  {(r.tags?.length ?? 0) > 3 && (
                    <span className={styles.compactRecipeTagMore}>
                      +{(r.tags?.length ?? 0) - 3}
                    </span>
                  )}
                </div>

                <div className={styles.compactRecipeMetricsFooter}>
                  {r.servings && (
                    <div className={styles.compactRecipeMetricItem}>
                      <div className={styles.compactRecipeMetricLabel}>
                        Servings
                      </div>
                      <div className={styles.compactRecipeMetricValue}>
                        {r.servings}
                      </div>
                    </div>
                  )}
                  {r.totalTimeMinutes && (
                    <div className={styles.compactRecipeMetricItem}>
                      <div className={styles.compactRecipeMetricLabel}>
                        Time
                      </div>
                      <div className={styles.compactRecipeMetricValue}>
                        {r.totalTimeMinutes}m
                      </div>
                    </div>
                  )}
                  {r.ingredients && (
                    <div className={styles.compactRecipeMetricItem}>
                      <div className={styles.compactRecipeMetricLabel}>
                        Items
                      </div>
                      <div className={styles.compactRecipeMetricValue}>
                        {r.ingredients.length}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className={styles.paginationContainer}>
          <button
            onClick={() => {
              setLoading(true);
              setCurrentPage((p) => Math.max(1, p - 1));
            }}
            disabled={!pagination.hasPrev || loading}
            className={`${styles.paginationButton} ${
              !pagination.hasPrev || loading
                ? styles.paginationButtonDisabled
                : ""
            }`}
          >
            ← Previous
          </button>

          <div className={styles.paginationPages}>
            {/* Show first page */}
            {currentPage > 3 && (
              <>
                <button
                  onClick={() => {
                    setLoading(true);
                    setCurrentPage(1);
                  }}
                  className={styles.paginationPageButton}
                >
                  1
                </button>
                {currentPage > 4 && <span>...</span>}
              </>
            )}

            {/* Show surrounding pages */}
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === currentPage ||
                  p === currentPage - 1 ||
                  p === currentPage + 1 ||
                  p === currentPage - 2 ||
                  p === currentPage + 2,
              )
              .filter((p) => p >= 1 && p <= pagination.totalPages)
              .map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => {
                    setLoading(true);
                    setCurrentPage(pageNum);
                  }}
                  disabled={loading}
                  className={`${
                    pageNum === currentPage
                      ? styles.paginationPageButtonActive
                      : styles.paginationPageButton
                  } ${loading ? styles.paginationPageButtonDisabled : ""}`}
                >
                  {pageNum}
                </button>
              ))}

            {/* Show last page */}
            {currentPage < pagination.totalPages - 2 && (
              <>
                {currentPage < pagination.totalPages - 3 && <span>...</span>}
                <button
                  onClick={() => {
                    setLoading(true);
                    setCurrentPage(pagination.totalPages);
                  }}
                  className={styles.paginationPageButton}
                >
                  {pagination.totalPages}
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => {
              setLoading(true);
              setCurrentPage((p) => Math.min(pagination.totalPages, p + 1));
            }}
            disabled={!pagination.hasNext || loading}
            className={`${styles.paginationButton} ${
              !pagination.hasNext || loading
                ? styles.paginationButtonDisabled
                : ""
            }`}
          >
            Next →
          </button>
        </div>
      )}
    </main>
  );
}
