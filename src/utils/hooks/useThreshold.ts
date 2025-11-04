import { useEffect, useRef, useState } from 'react';

/**
 * Hook that returns a new unique value when the accumulated `add` value crosses the specified `threshold`.
 */
export function useThreshold(
  add: number,
  threshold: number,
  dep: unknown[],
): number {
  const [count, setCount] = useState(0);
  const accumulatedRef = useRef(0);

  useEffect(() => {
    accumulatedRef.current += add;
    if (Math.abs(accumulatedRef.current) >= threshold) {
      const delta = Math.floor(accumulatedRef.current / threshold);
      accumulatedRef.current -= delta * threshold;
      setCount(c => c + delta);
    }
  }, dep); // eslint-disable-line react-hooks/exhaustive-deps

  return count;
}
