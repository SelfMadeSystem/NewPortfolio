import { Vector2 } from '../vec';
import { useWindowEvent } from './useWindowEvent';
import { useState } from 'react';

/**
 * Custom React hook that tracks the current pointer (mouse or touch) position
 * on the current viewport.
 */
export function useViewportPointer(options?: { keepLast?: boolean }) {
  const { keepLast = false } = options || {};
  const [pos, setPos] = useState<Vector2 | null>(null);

  useWindowEvent('pointermove', e => {
    setPos(new Vector2(e.clientX, e.clientY));
  });

  useWindowEvent('touchmove', e => {
    if (e.touches.length > 0) {
      setPos(new Vector2(e.touches[0].clientX, e.touches[0].clientY));
    }
  });

  useWindowEvent('pointerleave', () => {
    if (keepLast) return;
    setPos(null);
  });

  useWindowEvent('touchend', () => {
    if (keepLast) return;
    setPos(null);
  });

  return pos;
}
