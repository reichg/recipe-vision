import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ParsePage from "./page";

function getInitialUploadFieldAttributes(markup: string) {
  const labelForMatch = markup.match(/<label[^>]*for="([^"]+)"/);
  const inputIdMatch = markup.match(/<input[^>]*id="([^"]+)"[^>]*type="file"/);

  return {
    inputId: inputIdMatch?.[1],
    labelFor: labelForMatch?.[1],
  };
}

describe("upload page", () => {
  it("renders deterministic initial upload field ids", () => {
    const firstRender = getInitialUploadFieldAttributes(
      renderToStaticMarkup(createElement(ParsePage)),
    );
    const secondRender = getInitialUploadFieldAttributes(
      renderToStaticMarkup(createElement(ParsePage)),
    );

    expect(firstRender.inputId).toBeDefined();
    expect(firstRender.labelFor).toBe(firstRender.inputId);
    expect(secondRender).toEqual(firstRender);
  });

  it("describes OCR preprocessing instead of a hard 1024 KB upload cap", () => {
    const markup = renderToStaticMarkup(createElement(ParsePage));

    expect(markup).toContain(
      "Large photos are optimized into a black-and-white OCR image before parsing.",
    );
    expect(markup).not.toContain("up to 1024 KB each");
  });
});
