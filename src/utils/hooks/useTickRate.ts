import { useAnimationLoop } from './useAnimationLoop';
import { useCallback, useRef } from 'react';

export function useTickRate(
  dt: number,
  tickCb: () => void,
  frameCb?: (dt: number, t: number) => void,
) {
  const lastT = useRef<number>(0);

  useAnimationLoop(
    useCallback(
      (_dt, t) => {
        const deltaT = t - lastT.current;
        if (deltaT / 1000 < dt) return;
        lastT.current = t;

        // Accumulate time and do fixed timestep ticks
        let acc = deltaT / 1000;
        let i = 0;

        while (acc > dt) {
          tickCb();
          acc -= dt;
          if (++i > 10) break; // prevent spiral of death
        }

        frameCb?.(deltaT, t);
      },
      [dt, frameCb, tickCb],
    ),
  );
}
