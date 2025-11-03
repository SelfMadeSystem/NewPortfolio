/**
 * Wraps every character in the given element in a span. Recursively processes
 * child elements.
 */
export function wrapText(element: HTMLElement): void {
  if (element.querySelector(':scope > span.wrapped-text')) {
    // already wrapped
    return;
  }
  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      wrapText(child as HTMLElement);
    } else if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || '';
      const fragment = document.createDocumentFragment();
      for (const char of text) {
        const span = document.createElement('span');
        span.className = 'wrapped-text';
        span.textContent = char;
        fragment.appendChild(span);
      }
      element.replaceChild(fragment, child);
    }
  }
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
