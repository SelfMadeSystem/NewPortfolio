import { usePointerPosition } from './usePointerPosition';
import { type SpringOptions, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useRef } from 'react';

interface Props {
  onlyInside?: boolean;
  keepLast?: boolean;
  force?: number | ((value: number) => number);
  spring?: SpringOptions;
}

/**
 * A hook that magnetizes an element to the pointer.
 */
export function useMagnet<T extends HTMLElement>({
  onlyInside = true,
  keepLast = false,
  force = 0.2,
  spring = undefined,
}: Props = {}) {
  const scope = useRef<T | null>(null);
  const pointerPos = usePointerPosition(scope, {
    onlyInside,
    keepLast,
  });

  const posX = useMotionValue(0);
  const posY = useMotionValue(0);

  const x = useSpring(posX, spring);
  const y = useSpring(posY, spring);

  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.current = mediaQuery.matches;

    const handleChange = () => {
      prefersReducedMotion.current = mediaQuery.matches;
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    if (!scope.current || prefersReducedMotion.current) return;

    if (!pointerPos) {
      posX.set(0);
      posY.set(0);
      return;
    }
    const rect = scope.current.getBoundingClientRect();
    const px = pointerPos.x - rect.width / 2;
    const py = pointerPos.y - rect.height / 2;

    posX.set(px);
    posY.set(py);
  }, [pointerPos, posX, posY]);

  useEffect(() => {
    const element = scope.current;
    if (!element || prefersReducedMotion.current) return;

    const update = () => {
      let vx = x.get();
      let vy = y.get();

      if (typeof force === 'function') {
        vx = force(vx);
        vy = force(vy);
      } else {
        vx = vx * force;
        vy = vy * force;
      }

      element.style.transform = `translate3d(${vx}px, ${vy}px, 0)`;
      element.style.willChange = 'transform';
      element.style.setProperty('--magnet-x', `${vx}`);
      element.style.setProperty('--magnet-y', `${vy}`);
    };

    const unsubscribeX = x.on('change', update);
    const unsubscribeY = y.on('change', update);

    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [force, x, y]);

  return scope;
}
