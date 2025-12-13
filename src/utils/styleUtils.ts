export function getComputedColor(color: string, element: HTMLElement): string {
  if (color.startsWith('var(--')) {
    const resolvedColor = getComputedStyle(element)
      .getPropertyValue(color.slice(4, -1))
      .trim();
    return resolvedColor || color;
  }
  return color;
}

export function parseNumOrPercent(value: string): number {
  if (value.endsWith('%')) {
    const percent = parseFloat(value.slice(0, -1));
    if (isNaN(percent)) return 0;
    return percent / 100;
  } else {
    const num = parseFloat(value);
    if (isNaN(num)) return 0;
    return num;
  }
}
