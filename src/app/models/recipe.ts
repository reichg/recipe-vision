export type RecipeIngredient = {
  name: string;
  quantity?: number; // parsed numeric when possible
  unit?: string; // "g", "tbsp", "cups", etc.
  notes?: string;
};

export type Recipe = {
  id: string; // database ID
  title: string;
  description?: string;

  servings?: number;

  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;

  ingredients: RecipeIngredient[];
  steps: string[];

  tags?: string[]; // e.g., ["vegetarian", "gluten-free"]
  allergens?: string[]; // e.g., ["milk", "peanuts"]

  sourceText?: string; // optional: keep original OCR text for debugging
};
