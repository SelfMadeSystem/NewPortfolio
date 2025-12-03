import { Vector2 } from '../vec';
import { useWindowEvent } from './useWindowEvent';
import type { RefObject } from 'react';
import { useState } from 'react';

function getEl(element: RefObject<HTMLElement | null> | HTMLElement | null) {
  if (element && 'current' in element) {
    return element.current;
  }
  return element;
}

function boundingBoxUnTransformed(el: HTMLElement) {
  let rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  const transform = style.transform;

  if (transform && transform !== 'none') {
    // For now, assume just `translate3d(x, y, z)` transforms
    const match = transform.match(
      /translate3d\((-?\d+\.?\d*)px,\s*(-?\d+\.?\d*)px,\s*(-?\d+\.?\d*)px\)/,
    );
    if (match) {
      const tx = parseFloat(match[1]);
      const ty = parseFloat(match[2]);
      rect = new DOMRect(
        rect.left - tx,
        rect.top - ty,
        rect.width,
        rect.height,
      );
    }
  }

  return rect;
}

/**
 * Custom React hook that tracks the current pointer (mouse or touch) position
 * on the screen relative to a given element.
 */
export function usePointerPosition(
  element: RefObject<HTMLElement | null> | HTMLElement | null,
  options?: {
    onlyInside?: boolean;
    keepLast?: boolean;
  },
) {
  const { onlyInside = false, keepLast = onlyInside } = options || {};
  const [pos, setPos] = useState<Vector2 | null>(null);

  useWindowEvent('pointermove', e => {
    const el = getEl(element);
    if (!el) return;
    const rect = boundingBoxUnTransformed(el);
    if (
      onlyInside &&
      (e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom)
    ) {
      if (keepLast) return;
      setPos(null);
      return;
    }
    setPos(new Vector2(e.clientX - rect.left, e.clientY - rect.top));
  });

  useWindowEvent('touchmove', e => {
    const el = getEl(element);
    if (!el) return;
    const rect = boundingBoxUnTransformed(el);
    if (onlyInside) {
      let inside = false;
      for (let i = 0; i < e.touches.length; i++) {
        if (
          e.touches[i].clientX >= rect.left &&
          e.touches[i].clientX <= rect.right &&
          e.touches[i].clientY >= rect.top &&
          e.touches[i].clientY <= rect.bottom
        ) {
          inside = true;
          break;
        }
      }
      if (!inside) {
        if (keepLast) return;
        setPos(null);
        return;
      }
    }
    if (e.touches.length > 0) {
      setPos(
        new Vector2(
          e.touches[0].clientX - rect.left,
          e.touches[0].clientY - rect.top,
        ),
      );
    }
  });

  useWindowEvent('pointerleave', () => {
    if (keepLast) return;
    setPos(null);
  });

  return pos;
}
