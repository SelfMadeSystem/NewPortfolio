function isOverTextNode(node: ChildNode, x: number, y: number): boolean {
  if (node.nodeType !== node.TEXT_NODE) {
    return false;
  }

  const textNode = node as Text;
  const range = textNode.ownerDocument!.createRange();
  range.selectNodeContents(textNode);
  const rects = range.getClientRects();

  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    if (
      rect.left <= x &&
      rect.right >= x &&
      rect.top <= y &&
      rect.bottom >= y
    ) {
      range.detach();
      return true;
    }
  }

  range.detach();
  return false;
}

export function isOverText(elem: Element, x: number, y: number): boolean {
  if (elem.nodeType === elem.TEXT_NODE) {
    return isOverTextNode(elem, x, y);
  }

  for (let i = 0; i < elem.childNodes.length; i++) {
    const child = elem.childNodes[i];
    if (isOverTextNode(child, x, y)) {
      return true;
    }
  }

  return false;
}
