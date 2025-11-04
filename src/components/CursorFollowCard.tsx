import { usePointerPosition } from '../utils/hooks/usePointerPosition';
import {
  type HTMLMotionProps,
  type SpringOptions,
  motion,
  useSpring,
} from 'motion/react';
import { useEffect, useRef } from 'react';

const spring: SpringOptions = {
  stiffness: 300,
  damping: 40,
  mass: 1,
  bounce: 0,
};

export default function CursorFollowCard({ ...props }: HTMLMotionProps<'div'>) {
  const cardRef = useRef<HTMLDivElement>(null);
  const pointer = usePointerPosition(cardRef, {
    onlyInside: true,
    keepLast: false,
  });

  const rotateX = useSpring(0, spring);
  const rotateY = useSpring(0, spring);
  const x = useSpring(0, spring);
  const y = useSpring(0, spring);
  const active = useSpring(0, spring);

  useEffect(() => {
    if (pointer) {
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
  }, [active, pointer, rotateX, rotateY, x, y]);

  return (
    <div
      ref={cardRef}
      style={{
        perspective: 600,
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
        {props.children}
      </motion.div>
    </div>
  );
}
