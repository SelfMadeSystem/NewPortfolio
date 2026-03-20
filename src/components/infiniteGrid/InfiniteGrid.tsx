import { mod } from '../../utils/mathUtils';
import { Vector2 } from '../../utils/vec';
import { Magnetized } from '../Magnetized';
import { GridColumn } from './GridColumn';
import { OpenedImage } from './OpenedImage';
import {
  type InfiniteImagesType,
  cellSize,
  heightPerRow,
  padding,
  widthPerCol,
} from './utils';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function InfiniteGrid({
  images,
}: {
  images: InfiniteImagesType[];
}) {
  const [scroll, setScroll] = useState(new Vector2(0, 0));
  const [loaded, setLoaded] = useState(false);
  const [paused, setPaused] = useState(false);
  const [openedImage, setOpenedImage] = useState<{
    image: InfiniteImagesType;
    index: number;
  } | null>(null);
  const [animating, setAnimating] = useState(false);

  const suppressNextClickRef = useRef(false);
  const startPointerRef = useRef<Vector2 | null>(null);
  const pointerDraggingRef = useRef(false);
  const touchDraggingRef = useRef(false);

  useEffect(() => {
    let loadTimeout = setTimeout(() => {
      setLoaded(true);
    }, 1000);

    return () => {
      clearTimeout(loadTimeout);
    };
  }, []);

  useEffect(() => {
    function onScroll(e: WheelEvent) {
      if (!loaded || paused) return;
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

      if (e.buttons === 1 && loaded && !paused) {
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

        if (loaded && !paused) {
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
  }, [loaded, paused]);

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

      if (!loaded || paused) {
        // reset velocity when paused
        velocity.current = new Vector2(0, 0);
        rafId = requestAnimationFrame(frame);
        return;
      }

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
  }, [loaded, paused]);

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
      <Magnetized class="absolute top-4 left-4 z-50">
        <motion.a
          href="/"
          className="rounded bg-black/50 p-2 text-blue-400 hover:underline"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: { duration: 0.6, delay: 1 },
          }}
        >
          ← Back
        </motion.a>
      </Magnetized>
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
                images={images}
                scroll={scroll}
                loaded={loaded}
                paused={paused}
                onClick={(image, index, elem) => {
                  setPaused(true);
                  setOpenedImage({
                    image,
                    index,
                  });
                  setAnimating(true);

                  const dupe = elem.cloneNode(true) as HTMLButtonElement;
                  const rect = elem.getBoundingClientRect();
                  dupe.style.position = 'fixed';
                  dupe.style.left = `${rect.left}px`;
                  dupe.style.top = `${rect.top}px`;
                  dupe.style.margin = '0';
                  dupe.style.zIndex = '1000';
                  dupe.style.pointerEvents = 'none';
                  document.body.appendChild(dupe);

                  const aspectRatio = 16 / 9;
                  const maxWidth = window.innerWidth * 0.8;
                  const maxHeight = window.innerHeight * 0.7;
                  let targetWidth = maxWidth;
                  let targetHeight = maxHeight;

                  if (targetWidth / targetHeight > aspectRatio) {
                    targetWidth = targetHeight * aspectRatio;
                  } else {
                    targetHeight = targetWidth / aspectRatio;
                  }

                  const targetX = window.innerWidth / 2 - targetWidth / 2;
                  const targetY = window.innerHeight / 2 - targetHeight / 2;

                  const scaleFactor = targetWidth / rect.width;

                  dupe.animate(
                    [
                      {
                        transform: 'translate(0, 0) scale(1)',
                        left: `${rect.left}px`,
                        top: `${rect.top}px`,
                      },
                      {
                        left: `50%`,
                        top: `50%`,
                        transform: `translate(-50%, -50%) scale(${scaleFactor})`,
                      },
                    ],
                    {
                      duration: 600,
                      easing: 'ease-in-out',
                      fill: 'forwards',
                    },
                  );

                  setTimeout(() => {
                    document.body.removeChild(dupe);
                    setAnimating(false);
                  }, 600);
                }}
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
      <AnimatePresence>
        {openedImage && (
          <OpenedImage
            openedImage={openedImage}
            setOpenedImage={setOpenedImage}
            setPaused={setPaused}
            animating={animating}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
