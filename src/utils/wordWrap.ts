/**
 * Wraps every word in the given element in a span. Assumes the element contains
 * only text nodes and no child elements.
 */
export function wrapText(element: HTMLElement): void {
  if (element.hasAttribute('data-wrapped')) return;
  const text = element.innerText;
  const words = text.split('');
  element.innerHTML = words
    .map(word => `<span class="wrapped-text">${word}</span>`)
    .join('');
  element.setAttribute('data-wrapped', 'true');
}

/**
 * Applies `wrapText` and then returns the lines as an array of strings.
 */
export function getLines(element: HTMLElement): string[] {
  wrapText(element);
  const spans = Array.from(
    element.querySelectorAll<HTMLElement>('span.wrapped-text'),
  );
  const lines: string[][] = [];
  let currentLineTop: number | null = null;
  let currentLine: string[] = [];

  spans.forEach(span => {
    const rect = span.getBoundingClientRect();
    if (currentLineTop === null || Math.abs(rect.top - currentLineTop) > 2) {
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      currentLineTop = rect.top;
      currentLine = [span.innerText];
    } else {
      currentLine.push(span.innerText);
    }
  });

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.map(line => line.join(''));
}
