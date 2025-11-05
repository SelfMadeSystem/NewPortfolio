export function isOverText(elem: Element, x: number, y: number): boolean {
  if (elem.nodeType === elem.TEXT_NODE) {
    const range = elem.ownerDocument.createRange();
    range.selectNodeContents(elem);
    const rect = range.getBoundingClientRect();
    range.detach();

    return (
      rect.left <= x && rect.right >= x && rect.top <= y && rect.bottom >= y
    );
  }

  for (let i = 0; i < elem.childNodes.length; i++) {
    const child = elem.childNodes[i];
    if (!child.ownerDocument) continue;
    const range = child.ownerDocument.createRange();
    range.selectNodeContents(child);
    const rect = range.getBoundingClientRect();

    if (
      rect.left <= x &&
      rect.right >= x &&
      rect.top <= y &&
      rect.bottom >= y
    ) {
      range.detach();
      return isOverText(child as Element, x, y);
    }
    range.detach();
  }

  return false;
}
