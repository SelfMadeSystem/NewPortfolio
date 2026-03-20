import type { Vector2 } from '../../utils/vec';
import {
  type InfiniteImagesType,
  cellSize,
  deterministicIndex,
  hash2Ints,
} from './utils';
import { useEffect, useMemo, useState } from 'react';

export function GridCell({
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
      className="group relative block cursor-pointer overflow-hidden rounded select-none [user-drag:none]"
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
      <div className="absolute top-0 right-0 left-0 z-10 bg-black/50 py-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <p className="text-center text-sm text-white">{name}</p>
      </div>
      <img
        src={image.small}
        alt={name}
        className="h-full w-full select-none [user-drag:none]"
        draggable={false}
      />
    </button>
  );
}
