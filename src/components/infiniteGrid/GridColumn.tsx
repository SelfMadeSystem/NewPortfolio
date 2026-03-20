import { mod, random, randomBool } from '../../utils/mathUtils';
import { Vector2 } from '../../utils/vec';
import { GridCell } from './GridCell';
import {
  type InfiniteImagesType,
  deterministicIndex,
  heightPerRow,
  padding,
} from './utils';
import { useEffect, useState } from 'react';

export function GridColumn({
  col,
  images,
  scroll,
  loaded,
  paused,
  onClick,
  suppressClickRef,
}: {
  col: number;
  images: InfiniteImagesType[];
  scroll: Vector2;
  loaded: boolean;
  paused: boolean;
  onClick: (
    image: InfiniteImagesType,
    index: number,
    element: HTMLButtonElement,
  ) => void;
  suppressClickRef: React.RefObject<boolean>;
}) {
  const [scrollSpeed] = useState(() => random(0.5, 1));
  const [realAutoScrollSpeed] = useState(() => random(10, 30));
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(0);
  const [autoScrollDirection] = useState(() => (randomBool() ? 1 : -1));
  const [autoScrollOffset, setAutoScrollOffset] = useState(0);

  useEffect(() => {
    let rafId = 0;
    let lastTime: number | null = null;

    function frame(time: number) {
      if (lastTime === null) lastTime = time;
      const dt = Math.min(64, time - lastTime); // ms, clamp

      if (loaded && !paused) {
        setAutoScrollSpeed(prev => {
          const target = realAutoScrollSpeed;
          const delta = (target / 0.5) * (dt / 1000); // linear ramp over 0.5s
          if (prev < target) {
            return Math.min(prev + delta, target);
          }
          return prev;
        });
      } else if (paused) {
        setAutoScrollSpeed(prev => {
          const target = 0;
          const delta = (realAutoScrollSpeed / 0.5) * (dt / 1000); // linear ramp over 0.5s
          if (prev > target) {
            return Math.max(prev - delta, target);
          }
          return prev;
        });
      }

      lastTime = time;

      setAutoScrollOffset(
        prev => prev + autoScrollDirection * autoScrollSpeed * (dt / 1000),
      );

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [
    autoScrollDirection,
    autoScrollSpeed,
    loaded,
    paused,
    realAutoScrollSpeed,
  ]);

  const offsetY = -scroll.y * scrollSpeed + autoScrollOffset;

  const numCells =
    Math.ceil(
      ('window' in globalThis ? window.innerHeight : 1080) / heightPerRow,
    ) + 2;
  const startIndex = Math.ceil(-offsetY / heightPerRow) - 1;

  return (
    <div
      className="flex flex-col"
      style={{
        gap: padding,
        transform: `translateY(${mod(offsetY, heightPerRow) - heightPerRow}px)`,
      }}
    >
      {[...Array(numCells).keys()].map(i => {
        const cellIndex = deterministicIndex(
          col,
          startIndex + i,
          images.length,
        );
        const cell = images[cellIndex];
        return (
          <div key={`${col}-${startIndex + i}`}>
            <GridCell
              pos={new Vector2(col, startIndex + i)}
              image={cell}
              loaded={loaded}
              paused={paused}
              onClick={onClick}
              suppressClickRef={suppressClickRef}
            />
          </div>
        );
      })}
    </div>
  );
}
