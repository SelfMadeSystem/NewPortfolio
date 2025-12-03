import { mod, random } from '../utils/mathUtils';
import { Vector2 } from '../utils/vec';
import type { ImageMetadata } from 'astro';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  let h = ((x | 0) * 0x9e3769b1) ^ (y | 0);
  // mix (Wang/Jenkins style) to spread bits
  h = h ^ 61 ^ (h >>> 16);
  h = h + (h << 3);
  h = h ^ (h >>> 4);
  h = Math.imul(h, 0x27d4eb2d);
  h = h ^ (h >>> 15);
  return h >>> 0;
}

// deterministic index in range [0, n)
function deterministicIndex(x: number, y: number, n: number): number {
  if (n <= 0) return 0;
  return hash2Ints(x, y) % n;
}

function GridCell({ name, image, tech, description, link }: ImageCell) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className="relative block aspect-video w-128"
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
}: {
  col: number;
  images: ImageCell[];
  scroll: Vector2;
}) {
  const [scrollSpeed] = useState(random(0.5, 1));

  const offsetY = -scroll.y * scrollSpeed;

  const heightPerCell = 288 + 16;

  const numCells =
    Math.ceil(
      ('window' in globalThis ? window.innerHeight : 1080) / heightPerCell,
    ) + 2;
  const startIndex = Math.floor(-offsetY / heightPerCell);

  return (
    <div
      className="flex flex-col gap-4"
      style={{
        transform: `translateY(${mod(offsetY, heightPerCell) - heightPerCell * 2}px)`,
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
            <GridCell {...cell} />
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
  const [scroll, setScroll] = useState(new Vector2(-1000, -1000));

  useEffect(() => {
    function onScroll(e: WheelEvent) {
      const scrollSpeed = new Vector2(-1, 1);
      setScroll(prev =>
        prev.add(new Vector2(e.deltaX, e.deltaY).mult(scrollSpeed)),
      );
    }

    function onPointerMove(e: PointerEvent) {
      if (e.buttons === 1) {
        const scrollSpeed = new Vector2(1, -1).div(window.devicePixelRatio);
        setScroll(prev =>
          prev.add(new Vector2(e.movementX, e.movementY).mult(scrollSpeed)),
        );
        e.preventDefault();
      }
    }

    window.addEventListener('wheel', onScroll);
    window.addEventListener('pointermove', onPointerMove);

    return () => {
      window.removeEventListener('wheel', onScroll);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  const widthPerColumn = 512 + 16;
  const numColumns =
    Math.ceil(
      ('window' in globalThis ? window.innerWidth : 1920) / widthPerColumn,
    ) + 2;

  const startIndex = Math.floor(-scroll.x / widthPerColumn);

  return (
    <div className="fixed top-0 left-0 flex h-full w-full items-start justify-start overflow-hidden px-8 py-8 select-none">
      <div
        className="pointer-events-none flex"
        style={{
          transform: `translateX(${mod(scroll.x, widthPerColumn) - widthPerColumn * 2}px)`,
        }}
      >
        {[...Array(numColumns).keys()].map(i => {
          const colIndex = startIndex + i;
          return (
            <div
              key={colIndex}
              className="mr-4 last:mr-0"
              style={{
                width: 512,
                pointerEvents: 'auto',
              }}
            >
              <GridColumn col={colIndex} images={cells} scroll={scroll} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
