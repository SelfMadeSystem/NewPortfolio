import { isOverText } from '../utils/domUtils';
import { useViewportPointer } from '../utils/hooks/useViewportPointer';
import { animate } from 'motion';
import {
  type SpringOptions,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import { useEffect, useRef } from 'react';

function getParentOfType(elem: Element): Element | null {
  let current: Element = elem;
  while (current) {
    if (
      ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'].includes(current.tagName)
    ) {
      return current;
    }
    if (!current.parentElement) break;
    current = current.parentElement;
  }
  return null;
}

const defaultSize = 24;
const textSize = 8;
const boxGrow = 8;

const spring: SpringOptions = {
  stiffness: 800,
  damping: 50,
  mass: 0.5,
  bounce: 0,
};

const COLOR = '#ffffffa0';
const HOVER_COLOR = '#ffffff30';
const TEXT_COLOR = '#ff0000a0';

export default function FancyCursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);

  const pointerPos = useViewportPointer();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const boxX = useSpring(0, spring);
  const boxY = useSpring(0, spring);
  const pointerWidth = useSpring(0, spring);
  const pointerHeight = useSpring(0, spring);
  const hovering = useSpring(0, spring);
  const color = useSpring(1, {
    stiffness: 1000,
    damping: 100,
  });
  const bgColor = useTransform(
    color,
    [0, 1, 2],
    [HOVER_COLOR, COLOR, TEXT_COLOR],
  );

  useEffect(() => {
    if (!pointerPos) {
      pointerWidth.set(0);
      pointerHeight.set(0);
      return;
    }

    x.set(pointerPos.x);
    y.set(pointerPos.y);

    const recheck = () => {
      const defaultCase = () => {
        boxX.set(pointerPos.x);
        boxY.set(pointerPos.y);
        pointerWidth.set(defaultSize);
        pointerHeight.set(defaultSize);
        hovering.set(0);
        color.set(1);
      };

      const element = document.elementFromPoint(pointerPos.x, pointerPos.y);
      if (!element) {
        defaultCase();
        return;
      }

      const parentElem = getParentOfType(element) as HTMLElement;
      if (parentElem) {
        const rect = parentElem.getBoundingClientRect();
        pointerWidth.set(rect.width + boxGrow * 2);
        pointerHeight.set(rect.height + boxGrow * 2);

        const ptrX = pointerPos.x - rect.left - rect.width / 2;
        const ptrY = pointerPos.y - rect.top - rect.height / 2;

        boxX.set(rect.left + rect.width / 2 + ptrX * 0.1);
        boxY.set(rect.top + rect.height / 2 + ptrY * 0.1);

        hovering.set(1);
        color.set(0);
        return;
      }

      if (!isOverText(element, pointerPos.x, pointerPos.y)) {
        defaultCase();
        return;
      }

      const style = window.getComputedStyle(element);
      pointerWidth.set(textSize);
      const lineHeight = parseInt(style.lineHeight);
      pointerHeight.set(lineHeight);
      boxX.set(pointerPos.x);
      boxY.set(pointerPos.y);
      hovering.set(0);
      color.set(2);
    };

    recheck();

    window.addEventListener('scroll', recheck, false);
    return () => {
      window.removeEventListener('scroll', recheck, false);
    };
  }, [
    boxX,
    boxY,
    color,
    hovering,
    pointerHeight,
    pointerPos,
    pointerWidth,
    x,
    y,
  ]);

  return (
    <div className="pointer-events-none fixed inset-0 z-1000 overflow-hidden">
      <motion.div
        ref={cursorRef}
        className="shadow-lg"
        style={{
          position: 'absolute',
          backgroundColor: bgColor,
          width: useTransform(() => Math.abs(pointerWidth.get())),
          height: useTransform(() => Math.abs(pointerHeight.get())),
          borderRadius: defaultSize / 2,
          x: useTransform(
            () => x.get() * (1 - hovering.get()) + boxX.get() * hovering.get(),
          ),
          y: useTransform(
            () => y.get() * (1 - hovering.get()) + boxY.get() * hovering.get(),
          ),
          translateX: '-50%',
          translateY: '-50%',
        }}
      />
    </div>
  );
}
