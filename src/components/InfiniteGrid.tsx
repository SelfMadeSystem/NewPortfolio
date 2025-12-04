import { mod, random, randomBool } from '../utils/mathUtils';
import { Vector2 } from '../utils/vec';
import type { ImageMetadata } from 'astro';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const cellSize = new Vector2(512, 288);
const padding = 16;
const widthPerCol = cellSize.x + padding;
const heightPerRow = cellSize.y + padding;

export type InfiniteImagesType = {
  name: string;
  images: ImageMetadata[];
  tech: string[];
  description: string;
  link: string;
};

type ImageCell = {
  name: string;
  image: ImageMetadata;
  tech: string[];
  description: string;
  link: string;
};

function mapImagesToCells(images: InfiniteImagesType[]): ImageCell[] {
  const cells: ImageCell[] = [];
  images.forEach(item => {
    item.images.forEach(img => {
      cells.push({
        name: item.name,
        image: img,
        tech: item.tech,
        description: item.description,
        link: item.link,
      });
    });
  });
  return cells;
}

// deterministic 2D -> int hash (returns unsigned 32-bit)
function hash2Ints(x: number, y: number): number {
  // combine coordinates into one seed
  let h = ((x | 0) * 0x9e3869b1) ^ (y | 0);
  // mix (Wang/Jenkins style) to spread bits
  h = h ^ 61 ^ (h >>> 16);
  h = h + (h << 3);
  h = h ^ (h >>> 4);
  h = Math.imul(h, 0x27d4eb3d);
  h = h ^ (h >>> 15);
  return h >>> 0;
}

// deterministic index in range [0, n)
function deterministicIndex(x: number, y: number, n: number): number {
  if (n <= 0) return 0;
  return hash2Ints(x, y) % n;
}

function GridCell({
  name,
  image,
  tech,
  description,
  link,
  startDelay,
  suppressClickRef,
}: ImageCell & {
  startDelay: number;
  suppressClickRef: React.RefObject<boolean>;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (performance.now() > startDelay) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoaded(true);
      return;
    }

    let timeoutId: number;

    timeoutId = window.setTimeout(
      () => {
        setLoaded(true);
      },
      startDelay - Math.random() * 1000,
    );

    return () => {
      clearTimeout(timeoutId);
    };
  }, [startDelay]);

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block overflow-hidden rounded select-none [user-drag:none]"
      draggable={false}
      style={{
        width: cellSize.x,
        height: cellSize.y,
        opacity: loaded ? 1 : 0,
        pointerEvents: loaded ? 'auto' : 'none',
        transition: 'opacity 0.5s ease',
      }}
      onClick={e => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <img
        src={image.src}
        alt={name}
        className="h-full w-full select-none [user-drag:none]"
        draggable={false}
      />
    </a>
  );
}

function GridColumn({
  col,
  images,
  scroll,
  startDelay,
  suppressClickRef,
}: {
  col: number;
  images: ImageCell[];
  scroll: Vector2;
  startDelay: number;
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

      // ramp up auto-scroll speed over 0.5 seconds after time has passed startDelay
      if (time > startDelay) {
        setAutoScrollSpeed(prev => {
          const target = realAutoScrollSpeed;
          const delta = (target / 0.5) * (dt / 1000); // linear ramp over 0.5s
          if (prev < target) {
            return Math.min(prev + delta, target);
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
  }, [autoScrollDirection, autoScrollSpeed, realAutoScrollSpeed, startDelay]);

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
              {...cell}
              startDelay={startDelay}
              suppressClickRef={suppressClickRef}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function InfiniteGrid({
  images,
}: {
  images: InfiniteImagesType[];
}) {
  const cells = useMemo(() => mapImagesToCells(images), [images]);
  const [scroll, setScroll] = useState(new Vector2(0, 0));
  const [startDelay] = useState(2000);

  const suppressNextClickRef = useRef(false);
  const startPointerRef = useRef<Vector2 | null>(null);
  const pointerDraggingRef = useRef(false);
  const touchDraggingRef = useRef(false);

  useEffect(() => {
    function onScroll(e: WheelEvent) {
      if (performance.now() < startDelay) return;
      const scrollSpeed = new Vector2(-1, 1);
      setScroll(prev =>
        prev.add(new Vector2(e.deltaX, e.deltaY).mult(scrollSpeed)),
      );
    }

    function onPointerDown(e: PointerEvent) {
      startPointerRef.current = new Vector2(e.clientX, e.clientY);
      pointerDraggingRef.current = false;
    }

    function onPointerMove(e: PointerEvent) {
      if (startPointerRef.current) {
        const curr = new Vector2(e.clientX, e.clientY);
        if (!pointerDraggingRef.current) {
          const dist = curr.sub(startPointerRef.current).length();
          if (dist > 6) pointerDraggingRef.current = true;
        }
      }

      if (e.buttons === 1 && performance.now() > startDelay) {
        const scrollSpeed = new Vector2(1, -1).div(window.devicePixelRatio);
        setScroll(prev =>
          prev.add(new Vector2(e.movementX, e.movementY).mult(scrollSpeed)),
        );
        e.preventDefault();
      }
    }

    function onPointerUp(_e: PointerEvent) {
      if (pointerDraggingRef.current) {
        suppressNextClickRef.current = true;
        setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 0);
      }
      startPointerRef.current = null;
      pointerDraggingRef.current = false;
    }

    let prevTouchPos: Vector2 | null = null;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        prevTouchPos = new Vector2(t.clientX, t.clientY);
        touchDraggingRef.current = false;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 1 && prevTouchPos) {
        const t = e.touches[0];
        const currTouchPos = new Vector2(t.clientX, t.clientY);

        if (performance.now() > startDelay) {
          const delta = currTouchPos.sub(prevTouchPos);
          const scrollSpeed = new Vector2(1, -1);
          setScroll(prev => prev.add(delta.mult(scrollSpeed)));
        }

        prevTouchPos = currTouchPos;
        e.preventDefault();

        if (
          !touchDraggingRef.current &&
          currTouchPos.sub(prevTouchPos).length() > 6
        ) {
          touchDraggingRef.current = true;
        }

        prevTouchPos = currTouchPos;
        e.preventDefault();
      }
    }

    function onTouchEnd(_e: TouchEvent) {
      if (touchDraggingRef.current) {
        suppressNextClickRef.current = true;
        setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 0);
      }
      prevTouchPos = null;
      touchDraggingRef.current = false;
    }

    window.addEventListener('wheel', onScroll);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('wheel', onScroll);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [startDelay]);

  useEffect(() => {
    const keys: Record<string, boolean> = {};
    const keysRef = { current: keys };
    let lastTime: number | null = null;
    let rafId = 0;

    function onKeyDown(e: KeyboardEvent) {
      // support arrows, WASD
      const k = e.key;
      const handled = [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'a',
        'd',
        'w',
        's',
      ].includes(k);
      if (handled) {
        e.preventDefault();
      }

      // directional keys: maintain held state for acceleration
      if (
        [
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
          'a',
          'd',
          'w',
          's',
        ].includes(k)
      ) {
        keysRef.current[k] = true;
        return;
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      delete keysRef.current[e.key];
    }

    // velocity (px/s) and queued page movement (px) stored in refs so the RAF loop can mutate
    const velocity = { current: new Vector2(0, 0) };

    function frame(time: number) {
      if (lastTime === null) lastTime = time;
      const dt = Math.min(64, time - lastTime); // ms, clamp
      lastTime = time;

      // physics params (tweak to taste)
      const accel = 3000; // px/s^2 for arrow keys
      const maxSpeed = 50000; // px/s
      const friction = 3; // damping per second

      let vx = velocity.current.x;
      let vy = velocity.current.y;

      const k = keysRef.current;
      // keep same directional sign mapping as before
      if (k['ArrowLeft'] || k['a']) vx += accel * (dt / 1000);
      if (k['ArrowRight'] || k['d']) vx -= accel * (dt / 1000);
      if (k['ArrowUp'] || k['w']) vy -= accel * (dt / 1000);
      if (k['ArrowDown'] || k['s']) vy += accel * (dt / 1000);

      // clamp speeds
      vx = Math.max(Math.min(vx, maxSpeed), -maxSpeed);
      vy = Math.max(Math.min(vy, maxSpeed), -maxSpeed);

      // exponential damping
      const damping = Math.exp(-friction * (dt / 1000));
      vx *= damping;
      vy *= damping;

      velocity.current = new Vector2(vx, vy);

      // displacement in CSS pixels (account for devicePixelRatio if desired)
      const dx = vx * (dt / 1000) * window.devicePixelRatio;
      const dy = vy * (dt / 1000) * window.devicePixelRatio;

      if (dx !== 0 || dy !== 0) {
        setScroll(prev => prev.add(new Vector2(dx, dy)));
      }

      rafId = requestAnimationFrame(frame);
    }

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    rafId = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const numCols =
    Math.ceil(
      ('window' in globalThis ? window.innerWidth : 1920) / widthPerCol,
    ) + 2;

  const startIndex = Math.ceil(-scroll.x / widthPerCol) - 1;

  const numRows =
    Math.ceil(
      ('window' in globalThis ? window.innerHeight : 1080) / heightPerRow,
    ) + 2;

  const colArr = [...Array(numCols).keys()];
  const rowArr = [...Array(numRows).keys()];

  return (
    <div className="fixed top-0 left-0 flex h-full w-full items-start justify-start overflow-hidden select-none">
      <div
        className="pointer-events-none flex"
        style={{
          gap: padding,
          transform: `translateX(${mod(scroll.x, widthPerCol) - widthPerCol - cellSize.x / 2 - padding / 2}px) translateY(${-cellSize.y / 2 - padding / 2}px)`,
        }}
      >
        {colArr.map(i => {
          const colIndex = startIndex + i;
          return (
            <div
              key={colIndex}
              style={{
                width: 512,
                pointerEvents: 'auto',
              }}
            >
              <GridColumn
                col={colIndex}
                images={cells}
                scroll={scroll}
                startDelay={startDelay}
                suppressClickRef={suppressNextClickRef}
              />
            </div>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-0">
        {colArr.map(i => (
          <motion.div
            key={i}
            className="absolute top-0 -translate-x-1/2 bg-white"
            style={{
              left: (i - 0.5) * widthPerCol - padding * 0.5,
              width: padding * 0.25,
            }}
            initial={{
              bottom: '100%',
            }}
            animate={{
              bottom: 0,
              opacity: 0,
              transition: {
                delay: 0.2 * i,
                duration: 0.5,
                opacity: { delay: 0.5 + 0.2 * i, duration: 1.0 },
              },
            }}
          />
        ))}
        {rowArr.map(i => (
          <motion.div
            key={i}
            className="absolute left-0 -translate-y-1/2 bg-white"
            style={{
              top: (i - 0.5) * heightPerRow - padding * 0.5,
              height: padding * 0.25,
            }}
            initial={{
              right: '100%',
            }}
            animate={{
              right: 0,
              opacity: 0,
              transition: {
                delay: 0.2 * i,
                duration: 0.5,
                opacity: { delay: 0.5 + 0.2 * i, duration: 1.0 },
              },
            }}
          />
        ))}
      </div>
    </div>
  );
}
