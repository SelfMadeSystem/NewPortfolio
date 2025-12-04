import { mod, random, randomBool } from '../utils/mathUtils';
import { Vector2 } from '../utils/vec';
import type { ImageMetadata } from 'astro';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

// deterministic 2D -> int hash (returns unsigned 32-bit)
function hash2Ints(x: number, y: number): number {
  // combine coordinates into one seed
  let h = ((x | 0) * 0x9e3769b1) ^ (y | 0);
  // mix (Wang/Jenkins style) to spread bits
  h = h ^ 61 ^ (h >>> 16);
  h = h + (h << 3);
  h = h ^ (h >>> 4);
  h = Math.imul(h, 0x27d4db3d);
  h = h ^ (h >>> 15);
  return h >>> 0;
}

// deterministic index in range [0, n)
function deterministicIndex(x: number, y: number, n: number): number {
  if (n <= 0) return 0;
  return hash2Ints(x, y) % n;
}

function GridCell({
  pos,
  image: imageT,
  loaded,
  paused,
  suppressClickRef,
  onClick,
}: {
  pos: Vector2;
  image: InfiniteImagesType;
  loaded: boolean;
  paused: boolean;
  suppressClickRef: React.RefObject<boolean>;
  onClick: (
    image: InfiniteImagesType,
    index: number,
    element: HTMLButtonElement,
  ) => void;
}) {
  const { name, images } = imageT;
  const [clicked, setClicked] = useState(false);
  const imgIndex = useMemo(
    () => deterministicIndex(pos.x, pos.y, images.length),
    [pos.x, pos.y, images.length],
  );
  const image = useMemo(() => images[imgIndex], [images, imgIndex]);
  const delay = useMemo(() => {
    const h = hash2Ints(pos.x, pos.y);
    return (h % 1000) / 1000; // [0, 1)
  }, [pos.x, pos.y]);

  useEffect(() => {
    if (!paused) {
      requestAnimationFrame(() => setClicked(false));
    }
  }, [paused]);

  return (
    <button
      className="relative block cursor-pointer overflow-hidden rounded select-none [user-drag:none]"
      draggable={false}
      style={{
        width: cellSize.x,
        height: cellSize.y,
        opacity: loaded ? 1 : 0,
        pointerEvents: loaded ? 'auto' : 'none',
        transition: `opacity 0.5s ${delay}s ease`,
        visibility: clicked ? 'hidden' : 'visible',
      }}
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
        } else {
          onClick(imageT, imgIndex, e.currentTarget);
          setClicked(true);
        }
      }}
    >
      <img
        src={image.src}
        alt={name}
        className="h-full w-full select-none [user-drag:none]"
        draggable={false}
      />
    </button>
  );
}

function GridColumn({
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

      if (k === ' ') {
        // spacebar: toggle pause
        setPaused(prev => !prev);
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

                  console.log('Animating to', {
                    targetX,
                    targetY,
                    scaleFactor,
                    targetWidth,
                    targetHeight,
                  });

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
          />
        )}
      </AnimatePresence>
    </div>
  );
}
function OpenedImage({
  openedImage,
  setOpenedImage,
  setPaused,
}: {
  openedImage: { image: InfiniteImagesType; index: number };
  setOpenedImage: React.Dispatch<
    React.SetStateAction<{ image: InfiniteImagesType; index: number } | null>
  >;
  setPaused: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { image, index: initialIndex } = openedImage;

  const [index, setIndex] = useState(initialIndex);

  const nextImage = useCallback(() => {
    setIndex(prev => (prev + 1) % image.images.length);
  }, [image.images.length]);

  const prevImage = useCallback(() => {
    setIndex(prev => (prev - 1 + image.images.length) % image.images.length);
  }, [image.images.length]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') {
        nextImage();
      } else if (e.key === 'ArrowLeft') {
        prevImage();
      } else if (e.key === 'Escape') {
        setOpenedImage(null);
        setPaused(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [nextImage, prevImage, setOpenedImage, setPaused]);

  return (
    <motion.div
      className="bg-opacity-80 fixed top-0 left-0 z-50 flex h-full w-full items-center justify-center bg-black p-8"
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { duration: 0.6 },
      }}
      exit={{ opacity: 0 }}
    >
      <div
        className="select-auto"
        onClick={e => {
          e.stopPropagation();
        }}
      >
        <button
          className="absolute top-0 right-0 z-50 cursor-pointer p-4 text-3xl font-bold text-white select-none"
          onClick={() => {
            setOpenedImage(null);
            setPaused(false);
          }}
        >
          &times;
        </button>
        <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2 text-center text-white">
          <a href={image.link} target="_blank" rel="noopener noreferrer">
            <h2 className="text-2xl font-bold hover:underline">{image.name}</h2>
          </a>
          <p className="mt-2 max-w-lg">{image.description}</p>
        </div>
        <button
          className="absolute top-1/4 bottom-1/4 left-0 z-50 cursor-pointer px-4 text-3xl font-bold text-white select-none"
          onClick={e => {
            e.stopPropagation();
            prevImage();
          }}
        >
          &#8249;
        </button>
        <button
          className="absolute top-1/4 right-0 bottom-1/4 z-50 cursor-pointer px-4 text-3xl font-bold text-white select-none"
          onClick={e => {
            e.stopPropagation();
            nextImage();
          }}
        >
          &#8250;
        </button>
        <div className="pointer-events-none absolute top-1/2 left-1/2 flex aspect-video h-screen max-h-[70vh] w-screen max-w-[80vw] -translate-x-1/2 -translate-y-1/2 items-center justify-center">
          <motion.img
            src={image.images[index].src}
            alt={image.name}
            className="h-full w-full object-contain"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              transition: { duration: 0, delay: 0.59 },
            }}
            exit={{ opacity: 0 }}
          />
        </div>
        <div className="absolute bottom-4 left-1/2 z-50 -translate-x-1/2 text-center text-white">
          <p>
            Image {index + 1} of {image.images.length}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
