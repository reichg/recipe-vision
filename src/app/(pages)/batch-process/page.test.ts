import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import BatchProcessPage, {
  clampSelectedLimit,
  formatRecipeGroupCount,
  getLimitTriggerLabel,
  getSelectableLimits,
} from "./page";

describe("batch process page", () => {
  it("renders a custom limit selector trigger instead of a native select", () => {
    const markup = renderToStaticMarkup(createElement(BatchProcessPage));

    expect(markup).toContain("Recipes To Extract");
    expect(markup).toContain('aria-haspopup="listbox"');
    expect(markup).toContain("Loading limits...");
    expect(markup).toContain("Extract up to 10 recipe groups per run.");
    expect(markup).not.toContain("<select");
  });

  it("clamps the selected limit to the available range", () => {
    expect(clampSelectedLimit(0, 5)).toBe(1);
    expect(clampSelectedLimit(3, 5)).toBe(3);
    expect(clampSelectedLimit(9, 5)).toBe(5);
    expect(clampSelectedLimit(9, 0)).toBe(1);
  });

  it("builds stylable limit options from the available process cap", () => {
    expect(getSelectableLimits(4)).toEqual([1, 2, 3, 4]);
    expect(getSelectableLimits(0)).toEqual([]);
  });

  it("formats recipe group copy for limit labels", () => {
    expect(formatRecipeGroupCount(1)).toBe("1 recipe group");
    expect(formatRecipeGroupCount(4)).toBe("4 recipe groups");
  });

  it("derives trigger copy for loading, empty, and active states", () => {
    expect(
      getLimitTriggerLabel({
        loadingSummary: true,
        maxProcessLimit: 0,
        selectedLimit: 10,
      }),
    ).toBe("Loading limits...");

    expect(
      getLimitTriggerLabel({
        loadingSummary: false,
        maxProcessLimit: 0,
        selectedLimit: 10,
      }),
    ).toBe("0 recipe groups");

    expect(
      getLimitTriggerLabel({
        loadingSummary: false,
        maxProcessLimit: 4,
        selectedLimit: 10,
      }),
    ).toBe("4 recipe groups");
  });
});
