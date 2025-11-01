/**
 * Checks if the provided element is of the specified HTML element type.
 * This method is generalized to work with any HTMLElement type (e.g., div, canvas, p, etc.).
 *
 * @param element - The element to check. Should be a valid HTMLElement.
 * @param type - The HTML element type to check against, e.g., HTMLDivElement, HTMLCanvasElement, HTMLParagraphElement, etc.
 * @returns `true` if the element is of the specified type, otherwise `false`.
 */
export function isElementOfType<T extends HTMLElement>(element: HTMLElement, type: { new (): T }): boolean {
  // Check for null or undefined elements
  if (!element) return false;

  // Check if the element is an instance of the specified type (e.g., HTMLDivElement, HTMLCanvasElement, HTMLParagraphElement)
  return element instanceof type;
}
