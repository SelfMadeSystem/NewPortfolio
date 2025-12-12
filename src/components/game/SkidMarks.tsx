import { Vector2 } from '../../utils/vec';
import { AnimatePresence, motion } from 'motion/react';

export type SkidMark = {
  id: number;
  pos: Vector2;
  angle: number;
  time: number;
};

interface SkidMarksProps {
  skidMarks: SkidMark[];
}

export function SkidMarks({ skidMarks }: SkidMarksProps) {
  return (
    <div className="opacity-70">
      <AnimatePresence>
        {skidMarks.map(mark => (
          <motion.div
            key={mark.id}
            className="pointer-events-none absolute"
            style={{
              width: '20px',
              height: '6px',
              left: `${mark.pos.x - 10}px`,
              top: `${mark.pos.y - 3}px`,
              transform: `rotate(${(mark.angle * 180) / Math.PI}deg)`,
              transformOrigin: 'center',
            }}
            exit={{ opacity: 0, transition: { duration: 1 } }}
          >
            <div className="absolute top-0 bottom-0 left-0 aspect-square h-full rounded-full bg-gray-500" />
            <div className="absolute top-0 right-0 bottom-0 aspect-square h-full rounded-full bg-gray-500" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
