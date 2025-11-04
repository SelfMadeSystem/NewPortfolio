import '../styles/SlideInLoader.css';
import clsx from 'clsx';
import { useEffect, useState } from 'react';

export function SlideInLoader() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    window.scrollTo(0, 0);

    setTimeout(() => {
      document.body.classList.remove('unloaded');
    }, 1000);
  }, []);

  return (
    <div
      class={clsx(
        'z-50 flex items-center justify-center bg-white transition-all duration-1000 ease-in-out',
        isLoaded ? 'h-0 w-full' : 'fixed inset-0 h-screen',
      )}
    >
      <svg
        class={clsx(
          'loader transition-opacity duration-500 ease-in-out',
          isLoaded && 'opacity-0',
        )}
        viewBox="0 0 384 384"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className="active"
          pathLength="360"
          fill="transparent"
          stroke-width="32"
          cx="192"
          cy="192"
          r="176"
        ></circle>
        <circle
          className="track"
          pathLength="360"
          fill="transparent"
          stroke-width="32"
          cx="192"
          cy="192"
          r="176"
        ></circle>
      </svg>
    </div>
  );
}
