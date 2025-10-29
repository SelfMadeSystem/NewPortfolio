export function getComputedColor(color: string, element: HTMLElement): string {
  if (color.startsWith('var(--')) {
    const resolvedColor = getComputedStyle(element)
      .getPropertyValue(color.slice(4, -1))
      .trim();
    return resolvedColor || color;
  }
  return color;
}
