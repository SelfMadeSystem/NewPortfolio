import { usePointerPosition } from '../utils/hooks/usePointerPosition';
import { intervalAnimationFrame } from '../utils/intervalAnimationFrame';
import { randSubsetOfChars, textButRandom } from '../utils/textUtils';
import clsx from 'clsx';
import {
  type HTMLMotionProps,
  type SpringOptions,
  motion,
  useMotionValueEvent,
  useSpring,
} from 'motion/react';
import { useEffect, useRef, useState } from 'react';

const spring: SpringOptions = {
  stiffness: 300,
  damping: 40,
  mass: 1,
  bounce: 0,
};

export default function BackendCard({
  image,
  ...props
}: HTMLMotionProps<'div'> & { image: React.ReactNode }) {
  const [text, setText] = useState('Backend Development');
  const cardRef = useRef<HTMLDivElement>(null);
  const [clicked, setClicked] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const pointer = usePointerPosition(cardRef, {
    onlyInside: true,
    keepLast: false,
  });

  const rotateX = useSpring(0, spring);
  const rotateY = useSpring(0, spring);
  const x = useSpring(0, spring);
  const y = useSpring(0, spring);
  const active = useSpring(0, spring);

  const top = useSpring(0, spring);
  const left = useSpring(0, spring);
  const width = useSpring(0, spring);
  const height = useSpring(0, spring);

  useEffect(() => {
    if (!clicked && pointer) {
      const width = cardRef.current!.offsetWidth;
      const height = cardRef.current!.offsetHeight;
      rotateX.set(-((pointer.y / height) * 20 - 10));
      rotateY.set((pointer.x / width) * 20 - 10);
      x.set((pointer.x / width - 0.5) * 2);
      y.set((pointer.y / height - 0.5) * 2);
      active.set(1);
    } else {
      rotateX.set(0);
      rotateY.set(0);
      x.set(0);
      y.set(0);
      active.set(0);
    }
  }, [active, clicked, pointer, rotateX, rotateY, x, y]);

  return (
    <>
      {clicked && rect && (
        <div
          className="invisible"
          style={{
            width: rect.width,
            height: rect.height,
          }}
        ></div>
      )}
      <motion.div
        ref={cardRef}
        style={{
          perspective: 600,
          ...(clicked
            ? {
                position: 'fixed',
                top,
                left,
                width,
                height,
                zIndex: 1000,
              }
            : {}),
        }}
      >
        <motion.div
          style={
            {
              rotateX: rotateX,
              rotateY: rotateY,
              '--x': x,
              '--y': y,
              '--active': active,
              transformStyle: 'preserve-3d',
            } as React.CSSProperties
          }
          {...props}
        >
          <a
            href="/backend"
            className={clsx('goto-card h-full', clicked && 'clicked noscroll')}
            onClick={e => {
              e.preventDefault();
              if (clicked) {
                return;
              }
              const rect = cardRef.current!.getBoundingClientRect();
              setRect(rect);
              setClicked(true);

              top.jump(rect!.top);
              left.jump(rect!.left);
              width.jump(rect!.width);
              height.jump(rect!.height);

              top.set(0);
              left.set(0);
              width.set(window.innerWidth);
              height.set(window.innerHeight + 1);

              const text = 'Backend Development';
              const chars = randSubsetOfChars(3);
              let i1 = text.length;
              let i2 = text.length;

              intervalAnimationFrame(() => {
                const randText = textButRandom(text, chars);
                if (i1 > 0) {
                  i1 -= 1;
                } else if (i2 > 0) {
                  i2 -= 1;
                }
                setText(
                  text.slice(0, i1) +
                    randText.slice(i1, i2) +
                    '\u00A0'.repeat(text.length - i2),
                );
              }, 25);

              setTimeout(() => {
                window.location.href = '/backend';
              }, 950);
            }}
          >
            {text}
            <span className="invisible">{image}</span>
          </a>
          <div
            className={clsx(
              'pointer-events-none absolute top-14 bottom-6 left-6 flex translate-z-[calc(var(--active)*20px)] items-center transition-opacity',
              clicked && 'opacity-0',
            )}
          >
            {image}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
