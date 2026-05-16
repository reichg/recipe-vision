import { afterEach, describe, expect, it, vi } from "vitest";

import { logger } from "./logger";

describe("logger", () => {
  afterEach(() => {
    logger.clearHistory();
    vi.restoreAllMocks();
  });

  it("emits pretty-printed JSON when structured data is provided", () => {
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {
      return undefined;
    });

    logger.info("LLM provider request telemetry", {
      provider: "gemini",
      rateLimit: {
        requestRemaining: 42,
      },
    });

    const output = consoleInfoSpy.mock.calls[0]?.[0];

    expect(output).toContain('\n  "timestamp": ');
    expect(output).toContain('\n  "data": {\n');

    const parsedOutput = JSON.parse(String(output));

    expect(parsedOutput).toMatchObject({
      level: "info",
      message: "LLM provider request telemetry",
      data: {
        provider: "gemini",
        rateLimit: {
          requestRemaining: 42,
        },
      },
    });
    expect(parsedOutput.timestamp).toEqual(expect.any(String));
  });

  it("omits the data field when no structured data is provided", () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      return undefined;
    });

    logger.warn("Parsing image with OCR.Space API");

    const output = consoleWarnSpy.mock.calls[0]?.[0];
    const parsedOutput = JSON.parse(String(output));

    expect(output).toContain(
      '\n  "message": "Parsing image with OCR.Space API"\n',
    );
    expect(parsedOutput).toMatchObject({
      level: "warn",
      message: "Parsing image with OCR.Space API",
    });
    expect(parsedOutput).not.toHaveProperty("data");
  });

  it("replaces circular data with an unserializable placeholder", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {
        return undefined;
      });
    const circularData: { self?: unknown } = {};

    circularData.self = circularData;

    logger.error("OCR request failed", circularData);

    const output = consoleErrorSpy.mock.calls[0]?.[0];
    const parsedOutput = JSON.parse(String(output));

    expect(parsedOutput).toMatchObject({
      level: "error",
      message: "OCR request failed",
      data: "[unserializable]",
    });
    expect(parsedOutput.timestamp).toEqual(expect.any(String));
  });

  it("replaces unsupported direct values with an unserializable placeholder", () => {
    const consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {
      return undefined;
    });

    logger.info("LLM provider request telemetry", Symbol("unsupported"));

    const output = consoleInfoSpy.mock.calls[0]?.[0];
    const parsedOutput = JSON.parse(String(output));

    expect(parsedOutput).toMatchObject({
      level: "info",
      message: "LLM provider request telemetry",
      data: "[unserializable]",
    });
    expect(parsedOutput.timestamp).toEqual(expect.any(String));
  });
});
