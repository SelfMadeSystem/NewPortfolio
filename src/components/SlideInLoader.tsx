import clsx from "clsx";
import { useEffect, useState } from "preact/hooks";
import "../styles/SlideInLoader.css";

export function SlideInLoader() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    window.scrollTo(0, 0);

    setTimeout(() => {
      document.body.classList.remove("unloaded");
    }, 1000);
  }, []);

  return (
    <div
      class={clsx(
        "bg-white flex items-center justify-center transition-all duration-1000 ease-in-out z-50",
        isLoaded ? "w-full h-0" : "fixed inset-0 h-screen"
      )}
    >
      <svg
        class={clsx(
          "loader transition-opacity duration-500 ease-in-out",
          isLoaded && "opacity-0"
        )}
        viewBox="0 0 384 384"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          class="active"
          pathLength="360"
          fill="transparent"
          stroke-width="32"
          cx="192"
          cy="192"
          r="176"
        ></circle>
        <circle
          class="track"
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
