"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import type { Recipe } from "../../models/recipe";
import shellStyles from "../page-shell.module.css";
import styles from "./recipe.module.css";

type RecipeRecord = {
  id: string;
  json: Omit<Recipe, "id">;
};

type RecipesResponse = {
  recipes?: RecipeRecord[];
  pagination?: PaginationInfo;
  error?: string;
};

const RECIPES_PER_PAGE = 25;

type RealtimeSearchState = {
  nextPage: number;
  nextQuery: string;
};

type RecipesRequestTransition = RealtimeSearchState & {
  shouldLoad: boolean;
};

function mapRecipeRecord(record: RecipeRecord): Recipe {
  return {
    id: record.id,
    ...record.json,
  };
}

export function buildRecipesRequestUrl(page: number, query: string) {
  const normalizedQuery = normalizeRecipeSearchInput(query);
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(RECIPES_PER_PAGE),
  });

  if (normalizedQuery) {
    searchParams.set("query", normalizedQuery);
  }

  return `/api/recipes?${searchParams.toString()}`;
}

export function normalizeRecipeSearchInput(searchInput: string) {
  return searchInput.trim().replace(/\s+/g, " ");
}

export function getRealtimeSearchState(
  searchInput: string,
): RealtimeSearchState {
  const nextQuery = normalizeRecipeSearchInput(searchInput);

  return {
    nextPage: 1,
    nextQuery,
  };
}

export function getRecipesRequestTransition(
  currentPage: number,
  currentQuery: string,
  nextPage: number,
  nextQuery: string,
): RecipesRequestTransition {
  const normalizedCurrentQuery = normalizeRecipeSearchInput(currentQuery);
  const normalizedNextQuery = normalizeRecipeSearchInput(nextQuery);

  return {
    nextPage,
    nextQuery: normalizedNextQuery,
    shouldLoad:
      currentPage !== nextPage ||
      normalizedCurrentQuery !== normalizedNextQuery,
  };
}

export function getNoRecipesMessage(query: string) {
  if (!query) {
    return "No recipes found.";
  }

  return `No recipes match "${query}". Try a different title or ingredient.`;
}

export async function fetchRecipesPage(page: number, query: string) {
  const response = await fetch(buildRecipesRequestUrl(page, query));
  const data = (await response.json()) as RecipesResponse;

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to load recipes");
  }

  return {
    recipes: (data.recipes ?? []).map(mapRecipeRecord),
    pagination: data.pagination ?? null,
  };
}

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
  const [searchInput, setSearchInput] = useState("");
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(
    new Set(),
  );
  const [deleting, setDeleting] = useState(false);
  const { nextQuery: activeQuery } = getRealtimeSearchState(searchInput);
  const hasActiveQuery = activeQuery.length > 0;

  const rangeStart =
    pagination && recipes.length > 0
      ? (pagination.page - 1) * pagination.limit + 1
      : 0;
  const rangeEnd =
    pagination && recipes.length > 0 ? rangeStart + recipes.length - 1 : 0;

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
      const refreshedRecipes = await fetchRecipesPage(currentPage, activeQuery);

      setRecipes(refreshedRecipes.recipes);
      setPagination(refreshedRecipes.pagination);
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

  const navigateToPage = (nextPage: number) => {
    const transition = getRecipesRequestTransition(
      currentPage,
      activeQuery,
      nextPage,
      activeQuery,
    );

    if (!transition.shouldLoad) {
      return;
    }

    setLoading(true);
    setCurrentPage(transition.nextPage);
  };

  const handleSearchInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextSearchInput = event.target.value;
    const transition = getRecipesRequestTransition(
      currentPage,
      activeQuery,
      1,
      nextSearchInput,
    );

    setError(null);
    setSelectedRecipes(new Set());
    setSearchInput(nextSearchInput);

    if (transition.shouldLoad) {
      setLoading(true);
    }

    if (transition.nextPage !== currentPage) {
      setCurrentPage(transition.nextPage);
    }
  };

  const handleClearSearch = () => {
    if (searchInput.length === 0) {
      return;
    }

    const transition = getRecipesRequestTransition(
      currentPage,
      activeQuery,
      1,
      "",
    );

    setError(null);
    setSelectedRecipes(new Set());
    setSearchInput("");

    if (transition.shouldLoad) {
      setLoading(true);
    }

    if (transition.nextPage !== currentPage) {
      setCurrentPage(transition.nextPage);
    }
  };

  useEffect(() => {
    let cancelled = false;

    fetchRecipesPage(currentPage, activeQuery)
      .then((data) => {
        if (cancelled) return;
        setRecipes(data.recipes);
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
  }, [currentPage, activeQuery]);

  return (
    <main className={shellStyles.main}>
      <section className={shellStyles.pageHero}>
        <div className={shellStyles.headerCentered}>
          <p className={shellStyles.pageEyebrow}>Recipe Library</p>
          <h1 className={shellStyles.pageTitle}>Saved Recipes</h1>
          <p className={shellStyles.pageSubtitle}>
            Browse parsed recipes, review what is ready for cooking, and manage
            the batches you want to keep.
          </p>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.heroStatCard}>
            <span className={styles.heroStatLabel}>Total recipes</span>
            <strong className={styles.heroStatValue}>
              {pagination?.total ?? recipes.length}
            </strong>
          </div>
          <div className={styles.heroStatCard}>
            <span className={styles.heroStatLabel}>Selected</span>
            <strong className={styles.heroStatValue}>
              {selectedRecipes.size}
            </strong>
          </div>
          <div className={styles.heroStatCard}>
            <span className={styles.heroStatLabel}>This page</span>
            <strong className={styles.heroStatValue}>{recipes.length}</strong>
          </div>
        </div>
      </section>

      <section className={styles.searchPanel} aria-label="Recipe filters">
        <div className={styles.searchForm}>
          <div className={styles.searchFieldCopy}>
            <label htmlFor="recipe-search" className={styles.searchLabel}>
              Search recipes
            </label>
            <p id="recipe-search-help" className={styles.searchHelpText}>
              Search by title or ingredient. Results update as you type.
            </p>
          </div>

          <div className={styles.searchInputRow}>
            <input
              id="recipe-search"
              type="search"
              value={searchInput}
              onChange={handleSearchInputChange}
              placeholder="Try tomato, garlic, or pasta"
              aria-describedby="recipe-search-help"
              className={styles.searchInput}
            />
            {(hasActiveQuery || searchInput.length > 0) && (
              <button
                type="button"
                onClick={handleClearSearch}
                className={styles.paginationPageButton}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>
      {error && (
        <p className={`${styles.errorMessage} ${styles.centerText}`}>{error}</p>
      )}

      {recipes.length > 0 && (
        <section className={styles.selectionControlsContainer}>
          <div className={styles.toolbarSummary}>
            {pagination ? (
              <>
                Showing {rangeStart}-{rangeEnd} of {pagination.total}{" "}
                {hasActiveQuery
                  ? `match${pagination.total === 1 ? "" : "es"}`
                  : "recipes"}
              </>
            ) : (
              <>
                Showing {recipes.length}{" "}
                {hasActiveQuery
                  ? `match${recipes.length === 1 ? "" : "es"}`
                  : "recipes"}
              </>
            )}
          </div>
          <div className={styles.toolbarActions}>
            <label className={styles.selectAllLabel}>
              <input
                type="checkbox"
                checked={
                  selectedRecipes.size === recipes.length && recipes.length > 0
                }
                onChange={toggleSelectAll}
                className={styles.selectAllCheckbox}
              />
              Select all on page
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
        </section>
      )}

      {pagination && (
        <div className={styles.paginationInfoText}>
          Showing {recipes.length} of {pagination.total}{" "}
          {hasActiveQuery ? "matches" : "recipes"} (Page {pagination.page} of{" "}
          {pagination.totalPages})
        </div>
      )}

      <div className={styles.compactRecipesGrid}>
        {recipes.length === 0 && !loading && (
          <p className={styles.noRecipesMessage}>
            {getNoRecipesMessage(activeQuery)}
          </p>
        )}

        {recipes.map((recipe, index) => {
          const recipeNumber =
            pagination && pagination.limit > 0
              ? (pagination.page - 1) * pagination.limit + index + 1
              : index + 1;

          return (
            <article key={recipe.id} className={styles.recipeCardWrapper}>
              <div className={styles.recipeCardSelectionRow}>
                <label className={styles.recipeCardCheckboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedRecipes.has(recipe.id)}
                    onChange={(event) => {
                      event.stopPropagation();
                      toggleRecipeSelection(recipe.id);
                    }}
                    onClick={(event) => event.stopPropagation()}
                    className={styles.recipeCardCheckbox}
                  />
                  Select
                </label>
                <span className={styles.recipeCardNumber}>#{recipeNumber}</span>
              </div>

              <Link
                href={`/recipes/${recipe.id}`}
                className={styles.compactRecipeLink}
              >
                <div className={styles.compactRecipeCard}>
                  <div className={styles.recipeCardHeader}>
                    <p className={styles.recipeCardEyebrow}>Saved recipe</p>
                    <h3 className={styles.compactRecipeTitle}>
                      {recipe.title}
                    </h3>
                    <p className={styles.compactRecipeDescription}>
                      {recipe.description ||
                        "Structured ingredients, timing, and steps are ready to review."}
                    </p>
                  </div>

                  <div className={styles.compactRecipeTagsContainer}>
                    {recipe.tags?.slice(0, 3).map((tag) => (
                      <span key={tag} className={styles.compactRecipeTag}>
                        {tag}
                      </span>
                    ))}
                    {(recipe.tags?.length ?? 0) > 3 && (
                      <span className={styles.compactRecipeTagMore}>
                        +{(recipe.tags?.length ?? 0) - 3} more
                      </span>
                    )}
                    {!recipe.tags?.length && (
                      <span className={styles.compactRecipeTagMuted}>
                        Ready for review
                      </span>
                    )}
                  </div>

                  <div className={styles.recipeHighlights}>
                    <span className={styles.recipeHighlight}>
                      {recipe.ingredients.length} ingredient
                      {recipe.ingredients.length === 1 ? "" : "s"}
                    </span>
                    <span className={styles.recipeHighlight}>
                      {recipe.steps.length} step
                      {recipe.steps.length === 1 ? "" : "s"}
                    </span>
                    {recipe.allergens?.length ? (
                      <span className={styles.recipeHighlightMuted}>
                        {recipe.allergens.length} allergen flag
                        {recipe.allergens.length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>

                  <div className={styles.compactRecipeMetricsFooter}>
                    <div className={styles.compactRecipeMetricItem}>
                      <div className={styles.compactRecipeMetricLabel}>
                        Servings
                      </div>
                      <div className={styles.compactRecipeMetricValue}>
                        {recipe.servings ?? "-"}
                      </div>
                    </div>
                    <div className={styles.compactRecipeMetricItem}>
                      <div className={styles.compactRecipeMetricLabel}>
                        Time
                      </div>
                      <div className={styles.compactRecipeMetricValue}>
                        {recipe.totalTimeMinutes
                          ? `${recipe.totalTimeMinutes}m`
                          : "-"}
                      </div>
                    </div>
                    <div className={styles.compactRecipeMetricItem}>
                      <div className={styles.compactRecipeMetricLabel}>
                        Items
                      </div>
                      <div className={styles.compactRecipeMetricValue}>
                        {recipe.ingredients.length}
                      </div>
                    </div>
                  </div>

                  <div className={styles.recipeCardAction}>Open recipe</div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className={styles.paginationContainer}>
          <button
            onClick={() => navigateToPage(Math.max(1, currentPage - 1))}
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
                  onClick={() => navigateToPage(1)}
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
                  onClick={() => navigateToPage(pageNum)}
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
                  onClick={() => navigateToPage(pagination.totalPages)}
                  className={styles.paginationPageButton}
                >
                  {pagination.totalPages}
                </button>
              </>
            )}
          </div>

          <button
            onClick={() =>
              navigateToPage(Math.min(pagination.totalPages, currentPage + 1))
            }
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
