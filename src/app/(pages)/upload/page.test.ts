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
});