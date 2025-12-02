import { useMemo, useRef } from 'react';

/**
 * A custom hook to monitor and return the current frames per second (FPS) of a
 * canvas (requires manual calling of the frame counting function).
 */
export function useFps(historySize: number = 600) {
  const fpsRef = useRef(0);

  const countFrame = useMemo(() => {
    const times: number[] = [];
    // eslint-disable-next-line react-hooks/purity
    let prevTime = performance.now();

    return () => {
      const now = performance.now();
      const delta = now - prevTime;
      prevTime = now;

      const fps = 1000 / delta;
      times.push(fps);
      if (times.length > historySize) {
        times.shift();
      }
      const avgFps = times.reduce((acc, val) => acc + val, 0) / times.length;
      fpsRef.current = avgFps;
    };
  }, [historySize]);

  return { fps: fpsRef, countFrame };
}
