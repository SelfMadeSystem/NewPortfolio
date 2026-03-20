import { Magnetized } from '../Magnetized';
import type { InfiniteImagesType } from './utils';
import { motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';

export function OpenedImage({
  openedImage,
  setOpenedImage,
  setPaused,
  animating,
}: {
  openedImage: { image: InfiniteImagesType; index: number };
  setOpenedImage: React.Dispatch<
    React.SetStateAction<{ image: InfiniteImagesType; index: number } | null>
  >;
  setPaused: React.Dispatch<React.SetStateAction<boolean>>;
  animating: boolean;
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

  useEffect(() => {
    // Prefetch all images
    image.images.forEach(img => {
      const prefetch = new Image();
      prefetch.src = img.big;
    });
  }, [image.images]);

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
        <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2 text-center text-white max-sm:w-full">
          <a href={image.link} target="_blank" rel="noopener noreferrer">
            <h2 className="text-2xl font-bold hover:underline">{image.name}</h2>
          </a>
          <p className="mt-2 sm:max-w-lg">{image.description}</p>
        </div>
        <div className="absolute top-1/2 left-1/2 flex aspect-video h-screen max-h-[70vh] w-screen -translate-x-1/2 -translate-y-1/2 items-center justify-center sm:max-w-[80vw]">
          <Magnetized className="relative h-full" force={animating ? 0 : 0.05}>
            <motion.img
              src={image.images[index].big}
              alt={image.name}
              className="h-full w-full cursor-pointer object-contain"
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                transition: { duration: 0, delay: 0.59 },
              }}
              exit={{ opacity: 0 }}
              onClick={e => {
                e.stopPropagation();
                nextImage();
              }}
            />

            <button
              className="absolute top-0 bottom-0 -left-1 z-50 cursor-pointer bg-linear-90 from-black/80 to-transparent pr-18 pl-6 text-3xl font-bold text-white opacity-0 transition-all duration-300 select-none hover:opacity-100"
              onClick={e => {
                e.stopPropagation();
                prevImage();
              }}
            >
              &#8249;
            </button>
          </Magnetized>
        </div>
        <div className="absolute bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2 text-center text-white">
          <Magnetized>
            <a
              href={image.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-md rounded-lg bg-blue-700 px-4 py-2 font-bold hover:underline"
            >
              Visit project
            </a>
          </Magnetized>
          <p>
            Image {index + 1} of {image.images.length}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
