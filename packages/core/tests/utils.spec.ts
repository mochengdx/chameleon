import { describe, it, expect } from "vitest";

/**
 * Checks if the provided element is of the specified HTML element type.
 * This method is generalized to work with any HTMLElement type (e.g., div, canvas, p, etc.).
 *
 * @param element - The element to check. Should be a valid HTMLElement.
 * @param type - The HTML element type to check against, e.g., HTMLDivElement, HTMLCanvasElement, HTMLParagraphElement, etc.
 * @returns `true` if the element is of the specified type, otherwise `false`.
 */
function isElementOfType<T extends HTMLElement>(element: HTMLElement | null, type: { new (): T }): boolean {
  // Check for null or undefined elements
  if (!element) return false;

  // Check if the element is an instance of the specified type (e.g., HTMLDivElement, HTMLCanvasElement, HTMLParagraphElement)
  return element instanceof type;
}

describe("isElementOfType utility", () => {
  it("returns true for matching element type", () => {
    const divElement = document.createElement("div");
    expect(isElementOfType(divElement, HTMLDivElement)).toBe(true);
  });

  it("returns false for non-matching element type", () => {
    const divElement = document.createElement("div");
    expect(isElementOfType(divElement, HTMLCanvasElement)).toBe(false);
  });

  it("returns false for null element", () => {
    expect(isElementOfType(null, HTMLDivElement)).toBe(false);
  });

  it("works with canvas elements", () => {
    const canvasElement = document.createElement("canvas");
    expect(isElementOfType(canvasElement, HTMLCanvasElement)).toBe(true);
    expect(isElementOfType(canvasElement, HTMLDivElement)).toBe(false);
  });
});
