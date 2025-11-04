import { useEffect, useRef } from 'react';

/**
 * Gets the previous value of a state or prop.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  // disabled because it's rerendering anyways when value changes
  // eslint-disable-next-line react-hooks/refs
  return ref.current;
}
